import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { analyzeTask, getTaskSuggestions, reanalyzePriorities } from "./aiService";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  tasks: router({
    // List all tasks with optional filters
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        category: z.enum(["work", "personal", "health", "finance", "learning", "social", "other"]).optional(),
        search: z.string().optional(),
        dueDateFrom: z.date().optional(),
        dueDateTo: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserTasks(ctx.user.id, input);
      }),

    // Get single task by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.id, ctx.user.id);
        if (!task) {
          throw new Error("Task not found");
        }
        return task;
      }),

    // Create new task with AI analysis
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        useAI: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        let priority: "low" | "medium" | "high" | "urgent" = "medium";
        let category: "work" | "personal" | "health" | "finance" | "learning" | "social" | "other" = "other";
        let suggestedTime: Date | null = null;
        let aiAnalysis: string | null = null;

        if (input.useAI) {
          // Get existing tasks for context
          const existingTasks = await db.getUserTasks(ctx.user.id);
          const analysis = await analyzeTask(
            input.title,
            input.description || null,
            input.dueDate || null,
            existingTasks.map(t => ({
              title: t.title,
              priority: t.priority,
              category: t.category,
              status: t.status
            }))
          );

          priority = analysis.priority;
          category = analysis.category;
          suggestedTime = analysis.suggestedTime ? new Date(analysis.suggestedTime) : null;
          aiAnalysis = JSON.stringify({
            reasoning: analysis.reasoning,
            tips: analysis.tips
          });
        }

        const task = await db.createTask({
          userId: ctx.user.id,
          title: input.title,
          description: input.description || null,
          dueDate: input.dueDate || null,
          priority,
          category,
          suggestedTime,
          aiAnalysis,
        });

        // Update daily stats
        await db.updateDailyStats(ctx.user.id);

        return task;
      }),

    // Update existing task
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        dueDate: z.date().nullable().optional(),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        category: z.enum(["work", "personal", "health", "finance", "learning", "social", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        
        // If completing task, set completedAt
        if (updates.status === "completed") {
          (updates as any).completedAt = new Date();
        }

        const task = await db.updateTask(id, ctx.user.id, updates);
        if (!task) {
          throw new Error("Task not found");
        }

        // Update daily stats if status changed
        if (updates.status) {
          await db.updateDailyStats(ctx.user.id);
        }

        return task;
      }),

    // Delete task
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteTask(input.id, ctx.user.id);
        if (!success) {
          throw new Error("Task not found");
        }
        return { success: true };
      }),

    // Complete task (shorthand)
    complete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.completeTask(input.id, ctx.user.id);
        if (!task) {
          throw new Error("Task not found");
        }
        await db.updateDailyStats(ctx.user.id);
        return task;
      }),

    // Re-analyze task with AI
    reanalyze: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.id, ctx.user.id);
        if (!task) {
          throw new Error("Task not found");
        }

        const existingTasks = await db.getUserTasks(ctx.user.id);
        const analysis = await analyzeTask(
          task.title,
          task.description,
          task.dueDate,
          existingTasks.filter(t => t.id !== task.id).map(t => ({
            title: t.title,
            priority: t.priority,
            category: t.category,
            status: t.status
          }))
        );

        const updated = await db.updateTask(input.id, ctx.user.id, {
          priority: analysis.priority,
          category: analysis.category,
          suggestedTime: analysis.suggestedTime ? new Date(analysis.suggestedTime) : null,
          aiAnalysis: JSON.stringify({
            reasoning: analysis.reasoning,
            tips: analysis.tips
          }),
        });

        return updated;
      }),
  }),

  ai: router({
    // Get AI suggestions for task management
    getSuggestions: protectedProcedure
      .query(async ({ ctx }) => {
        const tasks = await db.getUserTasks(ctx.user.id);
        return getTaskSuggestions(tasks);
      }),

    // Re-analyze all task priorities
    reanalyzePriorities: protectedProcedure
      .mutation(async ({ ctx }) => {
        const tasks = await db.getUserTasks(ctx.user.id);
        const updates = await reanalyzePriorities(tasks);
        
        // Apply updates to database
        const results: { id: number; priority: string; reasoning: string }[] = [];
        for (const taskId of Array.from(updates.keys())) {
          const update = updates.get(taskId)!;
          await db.updateTask(taskId, ctx.user.id, { priority: update.priority });
          results.push({ id: taskId, ...update });
        }

        return { updated: results.length, results };
      }),
  }),

  stats: router({
    // Get productivity metrics
    metrics: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getProductivityMetrics(ctx.user.id);
      }),

    // Get daily stats for charts
    daily: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTaskStats(ctx.user.id, input?.days || 30);
      }),
  }),
});

export type AppRouter = typeof appRouter;
