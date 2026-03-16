import { useClinicAuth } from "@/hooks/useClinicAuth";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Star, Users, Calendar, MapPin, Camera, TrendingUp, TrendingDown, Minus, Crown, AlertCircle } from "lucide-react";


const GRADE_COLORS: Record<string, string> = {
  S: "bg-yellow-100 text-yellow-700 border-yellow-300",
  A: "bg-green-100 text-green-700 border-green-300",
  B: "bg-blue-100 text-blue-700 border-blue-300",
  C: "bg-orange-100 text-orange-700 border-orange-300",
  D: "bg-red-100 text-red-700 border-red-300",
  F: "bg-gray-100 text-gray-600 border-gray-200",
};

const PERIOD_LABELS: Record<string, string> = {
  today: "Hoje",
  week: "Últimos 7 dias",
  month: "Últimos 30 dias",
};

export default function NetworkRanking() {
  const { isAuthenticated } = useClinicAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [selectedBrandId] = useState(1); // Homenz = brand ID 1

  const [ranking, setRanking] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(true);
    supabase.from("franchises").select("id, name, city, state, active").order("name")
      .then(({ data }) => { setRanking(data ?? []); setIsLoading(false); });
  }, []);

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Acesso restrito</h2>
          <p className="text-gray-500">O ranking da rede é visível apenas para administradores da plataforma.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">Ranking Homenz</h1>
            </div>
            <p className="text-sm text-gray-500">Performance das franquias · {PERIOD_LABELS[period]}</p>
          </div>
          {/* Period selector */}
          <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
            {(["today", "week", "month"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 podium */}
        {ranking && ranking.length >= 3 && (
          <div className="grid grid-cols-3 gap-4">
            {/* 2nd place */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center mt-6">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Medal className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-xs text-gray-400 font-medium mb-1">2º lugar</div>
              <div className="text-sm font-bold text-gray-800 truncate">{ranking[1]?.clinicName}</div>
              <div className="text-xs text-gray-500">{ranking[1]?.city}</div>
              <div className="text-2xl font-black text-gray-700 mt-2">{ranking[1]?.totalScore.toFixed(0)}</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border mt-1 ${GRADE_COLORS[ranking[1]?.grade ?? "F"]}`}>
                {ranking[1]?.grade}
              </div>
            </div>
            {/* 1st place */}
            <div className="bg-gradient-to-b from-yellow-50 to-white rounded-2xl border-2 border-yellow-300 p-4 text-center shadow-md">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-xs text-yellow-600 font-bold mb-1">🏆 1º lugar</div>
              <div className="text-sm font-bold text-gray-900 truncate">{ranking[0]?.clinicName}</div>
              <div className="text-xs text-gray-500">{ranking[0]?.city}</div>
              <div className="text-3xl font-black text-yellow-600 mt-2">{ranking[0]?.totalScore.toFixed(0)}</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border mt-1 ${GRADE_COLORS[ranking[0]?.grade ?? "F"]}`}>
                {ranking[0]?.grade}
              </div>
            </div>
            {/* 3rd place */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center mt-10">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-xs text-gray-400 font-medium mb-1">3º lugar</div>
              <div className="text-sm font-bold text-gray-800 truncate">{ranking[2]?.clinicName}</div>
              <div className="text-xs text-gray-500">{ranking[2]?.city}</div>
              <div className="text-2xl font-black text-gray-700 mt-2">{ranking[2]?.totalScore.toFixed(0)}</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border mt-1 ${GRADE_COLORS[ranking[2]?.grade ?? "F"]}`}>
                {ranking[2]?.grade}
              </div>
            </div>
          </div>
        )}

        {/* Tabela completa */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Ranking Completo</h2>
            <p className="text-xs text-gray-500 mt-0.5">{ranking?.length ?? 0} franquias ativas</p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Calculando scores...</p>
            </div>
          ) : !ranking || ranking.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma franquia encontrada para esta rede.</p>
              <p className="text-gray-400 text-xs mt-1">Vincule clínicas à rede Homenz para ver o ranking.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ranking.map((clinic, idx) => (
                <div key={clinic.clinicId} className={`px-6 py-4 hover:bg-gray-50 transition-colors ${idx === 0 ? "bg-yellow-50/30" : ""}`}>
                  <div className="flex items-center gap-4">
                    {/* Posição */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-gray-50 text-gray-400"
                    }`}>
                      {clinic.rankPosition}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">{clinic.clinicName}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[clinic.grade]}`}>
                          {clinic.grade}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{clinic.city}, {clinic.state}</div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-black text-gray-900">{clinic.totalScore.toFixed(0)}</div>
                      <div className="text-xs text-gray-400">pts</div>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-4 gap-3 mt-3 ml-12">
                    <MetricPill icon={<Users className="w-3 h-3" />} label="Leads" value={clinic.leadsTotal} color="text-blue-600" />
                    <MetricPill icon={<Camera className="w-3 h-3" />} label="Fotos" value={`${clinic.leadsWithPhoto}`} color="text-purple-600" />
                    <MetricPill icon={<Calendar className="w-3 h-3" />} label="Agendados" value={clinic.leadsScheduled} color="text-green-600" />
                    <MetricPill icon={<MapPin className="w-3 h-3" />} label="Atendidos" value={clinic.appointmentsAttended} color="text-emerald-600" />
                  </div>

                  {/* Taxas */}
                  <div className="flex gap-4 mt-2 ml-12 text-xs text-gray-500">
                    <span>Agendamento: <strong className={clinic.schedulingRate >= 30 ? "text-green-600" : "text-orange-500"}>{clinic.schedulingRate.toFixed(0)}%</strong></span>
                    <span>Comparecimento: <strong className={clinic.attendanceRate >= 80 ? "text-green-600" : clinic.attendanceRate >= 60 ? "text-orange-500" : "text-red-500"}>{clinic.attendanceRate.toFixed(0)}%</strong></span>
                    <span>Score médio lead: <strong className="text-gray-700">{clinic.avgLeadScore.toFixed(0)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legenda de notas */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Legenda de Notas</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { grade: "S", label: "Elite", desc: "≥90 pts" },
              { grade: "A", label: "Excelente", desc: "≥80 pts" },
              { grade: "B", label: "Bom", desc: "≥70 pts" },
              { grade: "C", label: "Médio", desc: "≥60 pts" },
              { grade: "D", label: "Atenção", desc: "≥50 pts" },
              { grade: "F", label: "Crítico", desc: "<50 pts" },
            ].map(g => (
              <div key={g.grade} className={`rounded-xl border p-2 text-center ${GRADE_COLORS[g.grade]}`}>
                <div className="text-lg font-black">{g.grade}</div>
                <div className="text-xs font-medium">{g.label}</div>
                <div className="text-xs opacity-70">{g.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Score calculado em 5 dimensões: Qualidade do Lead (25pts) + Taxa de Agendamento (25pts) + Comparecimento Presencial (25pts) + Velocidade de Resposta (15pts) + Engajamento Operacional (10pts)
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={color}>{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}
