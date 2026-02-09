import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChartIcon,
  Activity,
} from "lucide-react";

const PRIORITY_COLORS = {
  urgent: "oklch(0.65 0.22 25)",
  high: "oklch(0.72 0.18 45)",
  medium: "oklch(0.78 0.15 85)",
  low: "oklch(0.72 0.12 160)",
};

const CATEGORY_COLORS = {
  work: "oklch(0.70 0.15 250)",
  personal: "oklch(0.72 0.18 280)",
  health: "oklch(0.72 0.15 150)",
  finance: "oklch(0.72 0.15 85)",
  learning: "oklch(0.70 0.15 200)",
  social: "oklch(0.70 0.15 330)",
  other: "oklch(0.60 0.05 285)",
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const categoryLabels: Record<string, string> = {
  work: "Trabalho",
  personal: "Pessoal",
  health: "Saúde",
  finance: "Finanças",
  learning: "Aprendizado",
  social: "Social",
  other: "Outro",
};

export default function Stats() {
  const { data: metrics, isLoading: metricsLoading } = trpc.stats.metrics.useQuery();
  const { data: dailyStats, isLoading: dailyLoading } = trpc.stats.daily.useQuery({ days: 30 });

  const completionRate = metrics?.total ? Math.round((metrics.completed / metrics.total) * 100) : 0;

  // Prepare data for charts
  const priorityData = metrics?.byPriority
    ? Object.entries(metrics.byPriority).map(([key, value]) => ({
        name: priorityLabels[key] || key,
        value: value as number,
        fill: PRIORITY_COLORS[key as keyof typeof PRIORITY_COLORS] || "#888",
      }))
    : [];

  const categoryData = metrics?.byCategory
    ? Object.entries(metrics.byCategory).map(([key, value]) => ({
        name: categoryLabels[key] || key,
        value: value as number,
        fill: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] || "#888",
      }))
    : [];

  // Daily stats for line chart
  const dailyChartData = dailyStats
    ? [...dailyStats].reverse().map((stat) => ({
        date: new Date(stat.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        criadas: stat.tasksCreated,
        concluidas: stat.tasksCompleted,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Estatísticas</h1>
        <p className="text-muted-foreground">
          Acompanhe sua produtividade e desempenho
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conclusão
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </>
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
                <p className="text-xs text-muted-foreground mt-1">
                  de {metrics?.total || 0} tarefas
                </p>
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

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Atividade dos Últimos 30 Dias</CardTitle>
                <CardDescription>Tarefas criadas e concluídas por dia</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.18 280)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.18 280)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.15 150)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.15 150)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 285)" />
                  <XAxis
                    dataKey="date"
                    stroke="oklch(0.65 0.02 285)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis stroke="oklch(0.65 0.02 285)" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.17 0.008 285)",
                      border: "1px solid oklch(0.26 0.01 285)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="criadas"
                    name="Criadas"
                    stroke="oklch(0.72 0.18 280)"
                    fillOpacity={1}
                    fill="url(#colorCriadas)"
                  />
                  <Area
                    type="monotone"
                    dataKey="concluidas"
                    name="Concluídas"
                    stroke="oklch(0.72 0.15 150)"
                    fillOpacity={1}
                    fill="url(#colorConcluidas)"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de atividade ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Por Prioridade</CardTitle>
                <CardDescription>Distribuição de tarefas por prioridade</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priorityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.01 285)" />
                  <XAxis type="number" stroke="oklch(0.65 0.02 285)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="oklch(0.65 0.02 285)"
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.17 0.008 285)",
                      border: "1px solid oklch(0.26 0.01 285)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" name="Tarefas" radius={[0, 4, 4, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de prioridade ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Por Categoria</CardTitle>
                <CardDescription>Distribuição de tarefas por categoria</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.17 0.008 285)",
                      border: "1px solid oklch(0.26 0.01 285)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de categoria ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Productivity Tips */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Resumo de Produtividade</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium mb-1">Total de Tarefas</p>
              <p className="text-3xl font-bold">{metrics?.total || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium mb-1">Taxa de Sucesso</p>
              <p className="text-3xl font-bold text-green-500">{completionRate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm font-medium mb-1">Aguardando Ação</p>
              <p className="text-3xl font-bold text-yellow-500">{metrics?.pending || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
