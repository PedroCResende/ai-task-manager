import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Calendar,
  Filter,
  X,
  ListTodo,
  Brain,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TaskStatus = "pending" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskCategory = "work" | "personal" | "health" | "finance" | "learning" | "social" | "other";

const priorityLabels: Record<TaskPriority, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const categoryLabels: Record<TaskCategory, string> = {
  work: "Trabalho",
  personal: "Pessoal",
  health: "Saúde",
  finance: "Finanças",
  learning: "Aprendizado",
  social: "Social",
  other: "Outro",
};

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em Progresso",
  completed: "Concluída",
};

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: searchQuery || undefined,
  });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.stats.metrics.invalidate();
      setIsCreateOpen(false);
      toast.success("Tarefa criada com sucesso!", {
        description: "A IA analisou e categorizou sua tarefa automaticamente.",
      });
    },
    onError: (error) => {
      toast.error("Erro ao criar tarefa", { description: error.message });
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.stats.metrics.invalidate();
      setEditingTask(null);
      toast.success("Tarefa atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tarefa", { description: error.message });
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.stats.metrics.invalidate();
      setDeletingTaskId(null);
      toast.success("Tarefa excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir tarefa", { description: error.message });
    },
  });

  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.stats.metrics.invalidate();
      toast.success("Tarefa concluída!");
    },
    onError: (error) => {
      toast.error("Erro ao concluir tarefa", { description: error.message });
    },
  });

  const reanalyzeMutation = trpc.tasks.reanalyze.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Tarefa reanalisada pela IA!");
    },
    onError: (error) => {
      toast.error("Erro ao reanalisar tarefa", { description: error.message });
    },
  });

  const hasFilters = statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || searchQuery;

  const clearFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie suas tarefas com inteligência artificial
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="glow">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <TaskFormDialog
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter selects */}
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="work">Trabalho</SelectItem>
                  <SelectItem value="personal">Pessoal</SelectItem>
                  <SelectItem value="health">Saúde</SelectItem>
                  <SelectItem value="finance">Finanças</SelectItem>
                  <SelectItem value="learning">Aprendizado</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => completeMutation.mutate({ id: task.id })}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeletingTaskId(task.id)}
              onReanalyze={() => reanalyzeMutation.mutate({ id: task.id })}
              isCompleting={completeMutation.isPending}
              isReanalyzing={reanalyzeMutation.isPending}
            />
          ))
        ) : (
          <Card className="glass">
            <CardContent className="py-12">
              <div className="text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasFilters
                    ? "Tente ajustar os filtros ou criar uma nova tarefa."
                    : "Comece criando sua primeira tarefa!"}
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        {editingTask && (
          <TaskFormDialog
            task={editingTask}
            onSubmit={(data) =>
              updateMutation.mutate({
                id: editingTask.id,
                ...data,
              })
            }
            isLoading={updateMutation.isPending}
          />
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTaskId} onOpenChange={(open) => !open && setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTaskId && deleteMutation.mutate({ id: deletingTaskId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onReanalyze,
  isCompleting,
  isReanalyzing,
}: {
  task: any;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReanalyze: () => void;
  isCompleting: boolean;
  isReanalyzing: boolean;
}) {
  const isCompleted = task.status === "completed";
  const aiAnalysis = task.aiAnalysis ? JSON.parse(task.aiAnalysis) : null;

  return (
    <Card className={`glass transition-all hover:border-primary/20 ${isCompleted ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => !isCompleted && onComplete()}
            disabled={isCompleted || isCompleting}
            className="mt-1"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onReanalyze} disabled={isReanalyzing}>
                    <Brain className="h-4 w-4 mr-2" />
                    Reanalisar com IA
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Badges and metadata */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border priority-${task.priority}`}>
                {priorityLabels[task.priority as TaskPriority]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border category-${task.category}`}>
                {categoryLabels[task.category as TaskCategory]}
              </span>
              {task.dueDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                </span>
              )}
              {task.suggestedTime && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Sugerido: {format(new Date(task.suggestedTime), "dd MMM HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>

            {/* AI Analysis */}
            {aiAnalysis && aiAnalysis.reasoning && (
              <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-1 text-xs text-primary mb-1">
                  <Brain className="h-3 w-3" />
                  <span className="font-medium">Análise da IA</span>
                </div>
                <p className="text-xs text-muted-foreground">{aiAnalysis.reasoning}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskFormDialog({
  task,
  onSubmit,
  isLoading,
}: {
  task?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [status, setStatus] = useState<TaskStatus>(task?.status || "pending");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [category, setCategory] = useState<TaskCategory>(task?.category || "other");
  const [useAI, setUseAI] = useState(!task);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    if (task) {
      // Edit mode - include all fields
      data.status = status;
      data.priority = priority;
      data.category = category;
    } else {
      // Create mode
      data.useAI = useAI;
      if (!useAI) {
        data.priority = priority;
        data.category = category;
      }
    }

    onSubmit(data);
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Atualize os detalhes da sua tarefa."
              : "Crie uma nova tarefa. A IA irá analisar e sugerir prioridade e categoria automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Preparar apresentação do projeto"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre a tarefa..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Data Limite</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {task && (
            <>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgente</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Trabalho</SelectItem>
                      <SelectItem value="personal">Pessoal</SelectItem>
                      <SelectItem value="health">Saúde</SelectItem>
                      <SelectItem value="finance">Finanças</SelectItem>
                      <SelectItem value="learning">Aprendizado</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {!task && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Checkbox
                id="useAI"
                checked={useAI}
                onCheckedChange={(checked) => setUseAI(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="useAI" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Usar IA para analisar
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A IA irá sugerir prioridade, categoria e melhor horário
                </p>
              </div>
            </div>
          )}

          {!task && !useAI && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Trabalho</SelectItem>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    <SelectItem value="health">Saúde</SelectItem>
                    <SelectItem value="finance">Finanças</SelectItem>
                    <SelectItem value="learning">Aprendizado</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading || !title.trim()}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {task ? "Salvando..." : "Criando..."}
              </>
            ) : task ? (
              "Salvar"
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar Tarefa
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
