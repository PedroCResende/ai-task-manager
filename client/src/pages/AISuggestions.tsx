import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Sparkles,
  Brain,
  Target,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

export default function AISuggestions() {
  const utils = trpc.useUtils();

  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = trpc.ai.getSuggestions.useQuery();
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery({});
  const { data: metrics } = trpc.stats.metrics.useQuery();

  const reanalyzeMutation = trpc.ai.reanalyzePriorities.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      utils.ai.getSuggestions.invalidate();
      toast.success(`${data.updated} tarefas reanalisadas!`, {
        description: "As prioridades foram atualizadas com base no contexto atual.",
      });
    },
    onError: (error) => {
      toast.error("Erro ao reanalisar tarefas", { description: error.message });
    },
  });

  const focusTask = suggestions?.focusTask
    ? tasks?.find((t) => t.id === suggestions.focusTask)
    : null;

  const pendingTasks = tasks?.filter((t) => t.status !== "completed") || [];
  const urgentTasks = pendingTasks.filter((t) => t.priority === "urgent" || t.priority === "high");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Sugestões da IA
          </h1>
          <p className="text-muted-foreground">
            Recomendações personalizadas para maximizar sua produtividade
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => reanalyzeMutation.mutate()}
          disabled={reanalyzeMutation.isPending || pendingTasks.length === 0}
        >
          {reanalyzeMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          Reanalisar Todas
        </Button>
      </div>

      {/* Focus Task Card */}
      <Card className="glass glow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Foco Recomendado</CardTitle>
              <CardDescription>A tarefa que você deveria priorizar agora</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {suggestionsLoading || tasksLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : focusTask ? (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{focusTask.title}</h3>
                  {focusTask.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {focusTask.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border priority-${focusTask.priority}`}>
                      {focusTask.priority === "urgent" ? "Urgente" :
                       focusTask.priority === "high" ? "Alta" :
                       focusTask.priority === "medium" ? "Média" : "Baixa"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border category-${focusTask.category}`}>
                      {focusTask.category === "work" ? "Trabalho" :
                       focusTask.category === "personal" ? "Pessoal" :
                       focusTask.category === "health" ? "Saúde" :
                       focusTask.category === "finance" ? "Finanças" :
                       focusTask.category === "learning" ? "Aprendizado" :
                       focusTask.category === "social" ? "Social" : "Outro"}
                    </span>
                  </div>
                </div>
                <Link href="/tasks">
                  <Button size="sm">
                    Ir para Tarefa
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">
                {pendingTasks.length === 0
                  ? "Todas as tarefas concluídas! Hora de adicionar novas metas."
                  : "Nenhuma tarefa prioritária no momento."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Plan */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <Clock className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle>Plano do Dia</CardTitle>
              <CardDescription>Estratégia sugerida pela IA para hoje</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {suggestionsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : suggestions?.dailyPlan ? (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm leading-relaxed">{suggestions.dailyPlan}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Adicione tarefas para receber um plano personalizado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Suggestions */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <div>
                <CardTitle>Dicas de Produtividade</CardTitle>
                <CardDescription>Sugestões personalizadas para você</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {suggestionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : suggestions?.suggestions && suggestions.suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Adicione tarefas para receber sugestões personalizadas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Visão Rápida</CardTitle>
                <CardDescription>Status atual das suas tarefas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Tarefas Pendentes</span>
                </div>
                <span className="font-semibold">{pendingTasks.length}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Alta Prioridade</span>
                </div>
                <span className="font-semibold text-red-500">{urgentTasks.length}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Concluídas</span>
                </div>
                <span className="font-semibold text-green-500">{metrics?.completed || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Taxa de Conclusão</span>
                </div>
                <span className="font-bold text-primary">
                  {metrics?.total ? Math.round((metrics.completed / metrics.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Tasks Alert */}
      {urgentTasks.length > 0 && (
        <Card className="glass border-red-500/20 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" />
              <div>
                <CardTitle className="text-red-500">Tarefas Urgentes</CardTitle>
                <CardDescription>
                  {urgentTasks.length} tarefa{urgentTasks.length > 1 ? "s" : ""} requer{urgentTasks.length > 1 ? "em" : ""} atenção imediata
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      task.priority === "urgent" ? "bg-red-500" : "bg-orange-500"
                    }`} />
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border priority-${task.priority}`}>
                    {task.priority === "urgent" ? "Urgente" : "Alta"}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/tasks">
              <Button variant="outline" size="sm" className="w-full mt-4 border-red-500/20 hover:bg-red-500/10">
                Ver Todas as Tarefas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* How AI Works */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Como a IA Funciona</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <h4 className="font-medium mb-1">Análise de Contexto</h4>
              <p className="text-sm text-muted-foreground">
                A IA analisa o título, descrição e prazo de cada tarefa para entender seu contexto.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <h4 className="font-medium mb-1">Priorização Inteligente</h4>
              <p className="text-sm text-muted-foreground">
                Com base na urgência e impacto, a IA sugere a prioridade ideal para cada tarefa.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <h4 className="font-medium mb-1">Categorização Automática</h4>
              <p className="text-sm text-muted-foreground">
                As tarefas são automaticamente categorizadas para melhor organização.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
