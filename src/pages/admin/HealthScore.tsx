import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { TrendingUp, Users, Calendar, MapPin, Camera, Zap, ClipboardList, Trophy, Star, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string; message: string }> = {
  S: { label: "S", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-300", emoji: "🏆", message: "Clínica de elite! Performance excepcional em todas as dimensões." },
  A: { label: "A", color: "text-green-600", bg: "bg-green-50", border: "border-green-300", emoji: "🥇", message: "Excelente! Você está entre as melhores clínicas da rede." },
  B: { label: "B", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-300", emoji: "🥈", message: "Bom desempenho. Pequenos ajustes podem te levar ao próximo nível." },
  C: { label: "C", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-300", emoji: "⚡", message: "Desempenho médio. Foque nas dimensões com menor pontuação." },
  D: { label: "D", color: "text-red-500", bg: "bg-red-50", border: "border-red-300", emoji: "⚠️", message: "Atenção necessária. Revise o processo de atendimento e follow-up." },
  F: { label: "F", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", emoji: "🔴", message: "Dados insuficientes ou performance crítica. Comece fazendo o check-in diário." },
};

const DIMENSIONS = [
  { key: "leadQualityScore", label: "Qualidade do Lead", max: 25, icon: <Users className="w-4 h-4" />, color: "bg-blue-500", tip: "Leads que enviam fotos e recebem análise de IA têm maior qualidade." },
  { key: "schedulingScore", label: "Taxa de Agendamento", max: 25, icon: <Calendar className="w-4 h-4" />, color: "bg-green-500", tip: "Quantos leads chegam a marcar uma consulta." },
  { key: "attendanceScore", label: "Comparecimento Presencial", max: 25, icon: <MapPin className="w-4 h-4" />, color: "bg-purple-500", tip: "Clientes que aparecem na clínica após agendar." },
  { key: "responseScore", label: "Velocidade de Resposta", max: 15, icon: <Zap className="w-4 h-4" />, color: "bg-yellow-500", tip: "Tempo médio para contatar um novo lead. Ideal: menos de 15 minutos." },
  { key: "operationalScore", label: "Engajamento Operacional", max: 10, icon: <ClipboardList className="w-4 h-4" />, color: "bg-pink-500", tip: "Consistência no check-in diário. Clínicas que reportam têm dados melhores." },
];

export default function HealthScore() {
  const { data: score, isLoading } = trpc.health.getMyScore.useQuery();
  const { data: checkinHistory } = trpc.health.checkinHistory.useQuery({ days: 7 });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Calculando health score...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!score) return null;

  const grade = GRADE_CONFIG[score.grade] ?? GRADE_CONFIG["F"]!;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Score</h1>
            <p className="text-sm text-gray-500">Últimos 30 dias · Atualizado em tempo real</p>
          </div>
          <Link href="/painel/checkin">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm px-4 py-2">
              Check-in Diário <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Score principal */}
        <div className={`rounded-2xl border-2 ${grade.border} ${grade.bg} p-6`}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-7xl font-black ${grade.color}`}>{score.grade}</div>
              <div className="text-xs text-gray-500 mt-1">Nota</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">{grade.emoji}</span>
                <span className="text-4xl font-bold text-gray-900">{score.totalScore.toFixed(1)}</span>
                <span className="text-gray-400 text-lg">/100</span>
              </div>
              <p className={`text-sm font-medium ${grade.color} mb-3`}>{grade.message}</p>
              {/* Mini progress bar */}
              <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${score.totalScore}%`,
                    background: score.totalScore >= 80 ? "linear-gradient(90deg, #22c55e, #16a34a)" :
                      score.totalScore >= 60 ? "linear-gradient(90deg, #f59e0b, #d97706)" :
                      "linear-gradient(90deg, #ef4444, #dc2626)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5 Dimensões */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            As 5 Dimensões do Health Score
          </h2>
          <div className="space-y-4">
            {DIMENSIONS.map(dim => {
              const value = (score as any)[dim.key] as number ?? 0;
              const pct = Math.min((value / dim.max) * 100, 100);
              const status = pct >= 80 ? "excellent" : pct >= 60 ? "good" : pct >= 40 ? "average" : "poor";
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{dim.icon}</span>
                      <span className="text-sm font-medium text-gray-800">{dim.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{value.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">/{dim.max}</span>
                      {status === "excellent" && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                      {status === "poor" && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${dim.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {status === "poor" && (
                    <p className="text-xs text-gray-400 mt-1 italic">💡 {dim.tip}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Leads (30d)", value: score.leadsTotal, icon: <Users className="w-4 h-4" />, color: "text-blue-600" },
            { label: "Enviaram fotos", value: score.leadsWithPhoto, icon: <Camera className="w-4 h-4" />, color: "text-purple-600" },
            { label: "Agendados", value: score.leadsScheduled, icon: <Calendar className="w-4 h-4" />, color: "text-green-600" },
            { label: "Atendidos", value: score.appointmentsAttended, icon: <MapPin className="w-4 h-4" />, color: "text-emerald-600" },
            { label: "No-show", value: score.appointmentsNoShow, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500" },
            { label: "Check-ins", value: score.checkinsThisMonth, icon: <ClipboardList className="w-4 h-4" />, color: "text-amber-600" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`flex items-center gap-1.5 mb-1 ${kpi.color}`}>{kpi.icon}<span className="text-xs font-medium">{kpi.label}</span></div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Histórico de check-ins */}
        {checkinHistory && checkinHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Últimos Check-ins
            </h2>
            <div className="space-y-3">
              {checkinHistory.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{c.checkinDate}</div>
                    <div className="text-xs text-gray-500">
                      {c.leadsQualifiedToday} qualificados · {c.appointmentsAttendedToday} atendimentos
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.teamMoodScore && (
                      <span className="text-lg">
                        {c.teamMoodScore >= 5 ? "🚀" : c.teamMoodScore >= 4 ? "😊" : c.teamMoodScore >= 3 ? "🙂" : c.teamMoodScore >= 2 ? "😐" : "😞"}
                      </span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${c.appointmentsAttendedToday > 0 ? "bg-green-400" : "bg-gray-300"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA check-in */}
        {score.checkinsThisMonth === 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white text-center">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-lg font-bold mb-2">Comece a fazer check-ins diários!</h3>
            <p className="text-sm opacity-80 mb-4">Clínicas que fazem check-in diário têm score 40% maior e convertem mais leads.</p>
            <Link href="/painel/checkin">
              <Button className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-6 py-2 rounded-xl">
                Fazer meu primeiro check-in
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
