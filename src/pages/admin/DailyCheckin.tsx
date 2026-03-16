import { useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, ClipboardList, TrendingUp, Users, Calendar, Camera, Brain, Smile, AlertCircle, ChevronRight, ChevronLeft, Star } from "lucide-react";

type Step = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
};

const STEPS: Step[] = [
  { id: "leads", icon: <Users className="w-6 h-6" />, title: "Leads de Hoje", subtitle: "Quantos leads chegaram e como foram?", color: "from-blue-500 to-blue-600" },
  { id: "photos", icon: <Camera className="w-6 h-6" />, title: "Fotos e IA", subtitle: "Leads que completaram o diagnóstico visual", color: "from-purple-500 to-purple-600" },
  { id: "appointments", icon: <Calendar className="w-6 h-6" />, title: "Agendamentos", subtitle: "Como foi a agenda de hoje?", color: "from-green-500 to-green-600" },
  { id: "insights", icon: <Brain className="w-6 h-6" />, title: "Insights do Dia", subtitle: "O que funcionou? O que pode melhorar?", color: "from-orange-500 to-orange-600" },
  { id: "mood", icon: <Smile className="w-6 h-6" />, title: "Clima da Equipe", subtitle: "Como está o time hoje?", color: "from-pink-500 to-pink-600" },
];

export default function DailyCheckin() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    leadsReceivedToday: 0,
    leadsContactedToday: 0,
    leadsQualifiedToday: 0,
    leadsNotQualified: 0,
    leadsWithPhotosToday: 0,
    leadsWithAiResultToday: 0,
    appointmentsScheduledToday: 0,
    appointmentsAttendedToday: 0,
    appointmentsNoShowToday: 0,
    appointmentsCancelledToday: 0,
    mainChallengesToday: "",
    bestLeadToday: "",
    teamMoodScore: 3,
    notes: "",
  });

  const [todayCheckin, setTodayCheckin] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase.from("health_checkins").select("*").eq("date", today).maybeSingle()
      .then(({ data }) => setTodayCheckin(data));
  }, []);
  const submitCheckin = { mutate: async (payload: Record<string, unknown>) => { await supabase.from("health_checkins").upsert({ ...payload, date: new Date().toISOString().split("T")[0] }); toast.success("Check-in registrado!"); }, isPending: false };

  const setField = (key: keyof typeof form, value: number | string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  if (todayCheckin && !submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check-in já realizado hoje!</h1>
          <p className="text-gray-500 mb-8">Você enviou o relatório de hoje. Volte amanhã para continuar acompanhando a saúde da clínica.</p>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Resumo do check-in de hoje</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Leads recebidos", value: todayCheckin.leadsReceivedToday },
                { label: "Leads qualificados", value: todayCheckin.leadsQualifiedToday },
                { label: "Agendamentos", value: todayCheckin.appointmentsScheduledToday },
                { label: "Atendimentos", value: todayCheckin.appointmentsAttendedToday },
                { label: "No-show", value: todayCheckin.appointmentsNoShowToday },
                { label: "Humor da equipe", value: `${todayCheckin.teamMoodScore ?? "—"}/5` },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="text-xl font-bold text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-12 h-12 text-[#0A2540]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Check-in enviado! 🎉</h1>
          <p className="text-gray-500 mb-2">Seus dados foram registrados e o health score da clínica foi atualizado.</p>
          <p className="text-sm text-gray-400 mb-8">Consistência é o segredo do sucesso. Volte amanhã!</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: <Users className="w-5 h-5 text-blue-500" />, label: "Leads qualificados", value: form.leadsQualifiedToday },
              { icon: <Calendar className="w-5 h-5 text-green-500" />, label: "Atendimentos", value: form.appointmentsAttendedToday },
              { icon: <Star className="w-5 h-5 text-yellow-500" />, label: "Humor da equipe", value: `${form.teamMoodScore}/5` },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                <div className="flex justify-center mb-2">{item.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          <Button onClick={() => window.location.href = "/painel/health"} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-xl font-semibold">
            Ver Health Score
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const step = STEPS[currentStep]!;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Check-in Diário</h1>
              <p className="text-sm text-gray-500">Etapa {currentStep + 1} de {STEPS.length}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-md`}>
              {step.icon}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`w-2 h-2 rounded-full transition-all ${i <= currentStep ? "bg-amber-500" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className={`bg-gradient-to-r ${step.color} px-6 py-4`}>
            <h2 className="text-xl font-bold text-[#0A2540]">{step.title}</h2>
            <p className="text-white/80 text-sm mt-1">{step.subtitle}</p>
          </div>

          <div className="p-6 space-y-5">
            {/* STEP 0: Leads */}
            {currentStep === 0 && (
              <>
                <NumberField label="Quantos leads chegaram hoje?" hint="Total de leads que entraram no funil" value={form.leadsReceivedToday} onChange={v => setField("leadsReceivedToday", v)} />
                <NumberField label="Quantos você conseguiu contatar?" hint="Leads que você ligou ou mandou mensagem" value={form.leadsContactedToday} onChange={v => setField("leadsContactedToday", v)} />
                <NumberField label="Quantos eram qualificados?" hint="Leads com real interesse no procedimento" value={form.leadsQualifiedToday} onChange={v => setField("leadsQualifiedToday", v)} />
                <NumberField label="Quantos não eram qualificados?" hint="Leads fora do perfil ou sem interesse" value={form.leadsNotQualified} onChange={v => setField("leadsNotQualified", v)} />
                {form.leadsReceivedToday > 0 && form.leadsQualifiedToday > form.leadsReceivedToday && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Leads qualificados não pode ser maior que leads recebidos.</p>
                  </div>
                )}
              </>
            )}

            {/* STEP 1: Fotos e IA */}
            {currentStep === 1 && (
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-2">
                  <p className="text-sm text-purple-800 font-medium">💡 Dica de conversão</p>
                  <p className="text-xs text-purple-600 mt-1">Leads que completam o diagnóstico 3D têm <strong>3x mais chance</strong> de agendar. Incentive sempre!</p>
                </div>
                <NumberField label="Quantos leads enviaram as fotos?" hint="Completaram a etapa de captura de fotos no funil" value={form.leadsWithPhotosToday} onChange={v => setField("leadsWithPhotosToday", v)} />
                <NumberField label="Quantos receberam o resultado da IA?" hint="Visualizaram o diagnóstico 3D do preenchimento" value={form.leadsWithAiResultToday} onChange={v => setField("leadsWithAiResultToday", v)} />
              </>
            )}

            {/* STEP 2: Agendamentos */}
            {currentStep === 2 && (
              <>
                <NumberField label="Agendamentos realizados hoje" hint="Consultas marcadas para datas futuras" value={form.appointmentsScheduledToday} onChange={v => setField("appointmentsScheduledToday", v)} />
                <NumberField label="Atendimentos presenciais realizados" hint="Clientes que vieram à clínica hoje" value={form.appointmentsAttendedToday} onChange={v => setField("appointmentsAttendedToday", v)} />
                <NumberField label="No-show (faltaram sem avisar)" hint="Agendamentos que não compareceram" value={form.appointmentsNoShowToday} onChange={v => setField("appointmentsNoShowToday", v)} />
                <NumberField label="Cancelamentos" hint="Agendamentos cancelados com aviso" value={form.appointmentsCancelledToday} onChange={v => setField("appointmentsCancelledToday", v)} />
                {form.appointmentsAttendedToday + form.appointmentsNoShowToday > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs text-green-700">
                      Taxa de comparecimento: <strong>{Math.round(form.appointmentsAttendedToday / (form.appointmentsAttendedToday + form.appointmentsNoShowToday) * 100)}%</strong>
                      {form.appointmentsAttendedToday / (form.appointmentsAttendedToday + form.appointmentsNoShowToday) >= 0.8 ? " 🎉 Excelente!" : form.appointmentsAttendedToday / (form.appointmentsAttendedToday + form.appointmentsNoShowToday) >= 0.6 ? " 👍 Bom" : " ⚠️ Precisa melhorar"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* STEP 3: Insights */}
            {currentStep === 3 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Qual foi o melhor lead do dia?</label>
                  <p className="text-xs text-gray-500 mb-2">Descreva brevemente o perfil do lead mais promissor (ex: "Homem 35 anos, calvície grau 3, muito interessado")</p>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    rows={3}
                    placeholder="Ex: Lead chamado João, 38 anos, calvície avançada, veio pelo Instagram, muito motivado para fazer o procedimento..."
                    value={form.bestLeadToday}
                    onChange={e => setField("bestLeadToday", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Principais desafios de hoje</label>
                  <p className="text-xs text-gray-500 mb-2">O que dificultou as conversões? Isso nos ajuda a melhorar o sistema.</p>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    rows={3}
                    placeholder="Ex: Muitos leads não atenderam o telefone, leads chegando fora do horário comercial, dificuldade com o app de fotos..."
                    value={form.mainChallengesToday}
                    onChange={e => setField("mainChallengesToday", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Observações gerais</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    rows={2}
                    placeholder="Qualquer outra informação relevante sobre o dia..."
                    value={form.notes}
                    onChange={e => setField("notes", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* STEP 4: Mood */}
            {currentStep === 4 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-4">Como está o clima da equipe hoje?</label>
                  <div className="flex gap-3 justify-center">
                    {[
                      { score: 1, emoji: "😞", label: "Difícil" },
                      { score: 2, emoji: "😐", label: "Regular" },
                      { score: 3, emoji: "🙂", label: "Bom" },
                      { score: 4, emoji: "😊", label: "Ótimo" },
                      { score: 5, emoji: "🚀", label: "Incrível" },
                    ].map(item => (
                      <button
                        key={item.score}
                        onClick={() => setField("teamMoodScore", item.score)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          form.teamMoodScore === item.score
                            ? "border-amber-500 bg-amber-50 scale-110"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-3xl">{item.emoji}</span>
                        <span className="text-xs text-gray-600 font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resumo final */}
                <div className="bg-gray-50 rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Resumo do seu check-in
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Leads recebidos", value: form.leadsReceivedToday },
                      { label: "Leads qualificados", value: form.leadsQualifiedToday },
                      { label: "Enviaram fotos", value: form.leadsWithPhotosToday },
                      { label: "Agendamentos", value: form.appointmentsScheduledToday },
                      { label: "Atendimentos", value: form.appointmentsAttendedToday },
                      { label: "No-show", value: form.appointmentsNoShowToday },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-semibold text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border-gray-200"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[#0A2540] font-semibold"
            >
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => submitCheckin.mutate(form)}
              disabled={submitCheckin.isPending}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-[#0A2540] font-semibold"
            >
              {submitCheckin.isPending ? "Enviando..." : "Enviar Check-in 🎯"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function NumberField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
        >−</button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="flex-1 text-center border border-gray-200 rounded-xl py-2 text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
        >+</button>
      </div>
    </div>
  );
}
