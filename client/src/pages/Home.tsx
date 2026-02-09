import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ListTodo, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  Brain
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: metrics, isLoading: metricsLoading } = trpc.stats.metrics.useQuery();
  const { data: suggestions, isLoading: suggestionsLoading } = trpc.ai.getSuggestions.useQuery();
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery({});

  const recentTasks = tasks?.slice(0, 5) || [];
  const pendingTasks = tasks?.filter(t => t.status === "pending") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas tarefas e produtividade
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Tarefas
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.completed || 0}</div>
                {metrics?.total && metrics.total > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((metrics.completed / metrics.total) * 100)}% do total
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.pending || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasadas
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-500">{metrics?.overdue || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Suggestions Card */}
        <Card className="glass glow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Sugestões da IA</CardTitle>
                <CardDescription>Recomendações personalizadas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : suggestions ? (
              <>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium mb-1">Plano do Dia</p>
                  <p className="text-sm text-muted-foreground">{suggestions.dailyPlan}</p>
                </div>
                <div className="space-y-2">
                  {suggestions.suggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{suggestion}</span>
                    </div>
                  ))}
                </div>
                <Link href="/ai-suggestions">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver todas as sugestões
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Adicione tarefas para receber sugestões personalizadas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks Card */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <ListTodo className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
                  <CardDescription>Últimas tarefas adicionadas</CardDescription>
                </div>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        task.status === "completed"
                          ? "bg-green-500"
                          : task.priority === "urgent"
                          ? "bg-red-500"
                          : task.priority === "high"
                          ? "bg-orange-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <span
                      className={`flex-1 text-sm truncate ${
                        task.status === "completed" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border category-${task.category}`}>
                      {task.category}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ListTodo className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda</p>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="mt-3">
                    Criar primeira tarefa
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats by Priority */}
      {metrics && Object.keys(metrics.byPriority).length > 0 && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Distribuição por Prioridade</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["urgent", "high", "medium", "low"].map(priority => (
                <div
                  key={priority}
                  className={`p-3 rounded-lg border priority-${priority}`}
                >
                  <p className="text-xs font-medium capitalize mb-1">
                    {priority === "urgent" ? "Urgente" : 
                     priority === "high" ? "Alta" :
                     priority === "medium" ? "Média" : "Baixa"}
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.byPriority[priority] || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
