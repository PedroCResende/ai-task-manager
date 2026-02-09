import { invokeLLM } from "./_core/llm";
import { Task } from "../drizzle/schema";

export interface AITaskAnalysis {
  priority: "low" | "medium" | "high" | "urgent";
  category: "work" | "personal" | "health" | "finance" | "learning" | "social" | "other";
  suggestedTime: string | null;
  reasoning: string;
  tips: string[];
}

/**
 * Analyzes a task using LLM to determine priority, category, and suggestions
 */
export async function analyzeTask(
  title: string,
  description: string | null,
  dueDate: Date | null,
  existingTasks: Pick<Task, "title" | "priority" | "category" | "status">[]
): Promise<AITaskAnalysis> {
  const now = new Date();
  const dueDateStr = dueDate ? dueDate.toISOString() : "No due date specified";
  
  const existingTasksContext = existingTasks.length > 0
    ? `\nUser's existing tasks:\n${existingTasks.slice(0, 10).map(t => 
        `- "${t.title}" (${t.priority} priority, ${t.category}, ${t.status})`
      ).join("\n")}`
    : "";

  const prompt = `You are an intelligent task management assistant. Analyze the following task and provide recommendations.

Current date/time: ${now.toISOString()}

Task to analyze:
- Title: "${title}"
- Description: "${description || "No description provided"}"
- Due date: ${dueDateStr}
${existingTasksContext}

Based on the task details, context, and any patterns from existing tasks, provide:
1. Priority level (low, medium, high, urgent) - consider urgency, impact, and deadlines
2. Category (work, personal, health, finance, learning, social, other) - based on task nature
3. Suggested best time to work on this task (ISO 8601 format or null if not applicable)
4. Brief reasoning for your recommendations (1-2 sentences)
5. 2-3 actionable tips for completing this task effectively

Respond in JSON format only.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a productivity expert AI that helps users manage their tasks efficiently. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              priority: { 
                type: "string", 
                enum: ["low", "medium", "high", "urgent"],
                description: "Task priority level" 
              },
              category: { 
                type: "string", 
                enum: ["work", "personal", "health", "finance", "learning", "social", "other"],
                description: "Task category" 
              },
              suggestedTime: { 
                type: ["string", "null"],
                description: "ISO 8601 datetime for best time to work on task, or null" 
              },
              reasoning: { 
                type: "string",
                description: "Brief explanation for the recommendations" 
              },
              tips: { 
                type: "array",
                items: { type: "string" },
                description: "Actionable tips for completing the task"
              }
            },
            required: ["priority", "category", "suggestedTime", "reasoning", "tips"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content)) as AITaskAnalysis;
    return analysis;
  } catch (error) {
    console.error("[AI Service] Failed to analyze task:", error);
    // Return default values if AI fails
    return {
      priority: "medium",
      category: "other",
      suggestedTime: null,
      reasoning: "Unable to analyze task automatically. Default values applied.",
      tips: ["Break down the task into smaller steps", "Set a specific deadline if not already set"]
    };
  }
}

/**
 * Get AI suggestions for task prioritization across all tasks
 */
export async function getTaskSuggestions(
  tasks: Pick<Task, "id" | "title" | "description" | "priority" | "category" | "status" | "dueDate">[]
): Promise<{
  focusTask: number | null;
  suggestions: string[];
  dailyPlan: string;
}> {
  if (tasks.length === 0) {
    return {
      focusTask: null,
      suggestions: ["Start by adding your first task!"],
      dailyPlan: "No tasks to plan. Add some tasks to get started."
    };
  }

  const pendingTasks = tasks.filter(t => t.status !== "completed");
  
  if (pendingTasks.length === 0) {
    return {
      focusTask: null,
      suggestions: ["Great job! All tasks completed. Time to add new goals."],
      dailyPlan: "All tasks completed! Consider planning ahead for tomorrow."
    };
  }

  const now = new Date();
  const tasksContext = pendingTasks.slice(0, 15).map(t => ({
    id: t.id,
    title: t.title,
    description: t.description?.substring(0, 100),
    priority: t.priority,
    category: t.category,
    dueDate: t.dueDate?.toISOString() || "No deadline"
  }));

  const prompt = `You are a productivity coach. Based on the user's pending tasks, provide personalized recommendations.

Current date/time: ${now.toISOString()}

Pending tasks:
${JSON.stringify(tasksContext, null, 2)}

Provide:
1. The ID of the task the user should focus on first (consider urgency, priority, and deadlines)
2. 3-4 specific, actionable suggestions for improving productivity today
3. A brief daily plan (2-3 sentences) organizing how to approach these tasks

Respond in JSON format only.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a productivity expert. Provide practical, actionable advice. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              focusTaskId: { 
                type: ["integer", "null"],
                description: "ID of the task to focus on first" 
              },
              suggestions: { 
                type: "array",
                items: { type: "string" },
                description: "Productivity suggestions"
              },
              dailyPlan: { 
                type: "string",
                description: "Brief daily plan for approaching tasks" 
              }
            },
            required: ["focusTaskId", "suggestions", "dailyPlan"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    return {
      focusTask: result.focusTaskId,
      suggestions: result.suggestions,
      dailyPlan: result.dailyPlan
    };
  } catch (error) {
    console.error("[AI Service] Failed to get suggestions:", error);
    // Return default suggestions
    const highPriorityTask = pendingTasks.find(t => t.priority === "urgent" || t.priority === "high");
    return {
      focusTask: highPriorityTask?.id || pendingTasks[0]?.id || null,
      suggestions: [
        "Focus on high-priority tasks first",
        "Take regular breaks to maintain productivity",
        "Review and update task deadlines as needed"
      ],
      dailyPlan: "Start with your most urgent tasks, then work through medium priority items."
    };
  }
}

/**
 * Re-analyze and update priorities for all pending tasks
 */
export async function reanalyzePriorities(
  tasks: Pick<Task, "id" | "title" | "description" | "priority" | "category" | "status" | "dueDate">[]
): Promise<Map<number, { priority: Task["priority"]; reasoning: string }>> {
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const results = new Map<number, { priority: Task["priority"]; reasoning: string }>();

  if (pendingTasks.length === 0) {
    return results;
  }

  const now = new Date();
  const tasksContext = pendingTasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description?.substring(0, 100),
    currentPriority: t.priority,
    category: t.category,
    dueDate: t.dueDate?.toISOString() || "No deadline"
  }));

  const prompt = `Analyze these tasks and suggest updated priorities based on current date, deadlines, and task nature.

Current date/time: ${now.toISOString()}

Tasks to analyze:
${JSON.stringify(tasksContext, null, 2)}

For each task, provide the recommended priority (low, medium, high, urgent) and brief reasoning.
Consider: deadline proximity, task importance, dependencies, and workload balance.

Respond in JSON format only.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a task prioritization expert. Analyze tasks objectively and provide clear reasoning. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "priority_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    reasoning: { type: "string" }
                  },
                  required: ["id", "priority", "reasoning"],
                  additionalProperties: false
                }
              }
            },
            required: ["tasks"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    for (const task of result.tasks) {
      results.set(task.id, {
        priority: task.priority as Task["priority"],
        reasoning: task.reasoning
      });
    }
  } catch (error) {
    console.error("[AI Service] Failed to reanalyze priorities:", error);
  }

  return results;
}
