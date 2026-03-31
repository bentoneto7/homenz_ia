import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Clock, Save, Plus, Trash2, CalendarX, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DAYS = [
  { label: "Domingo", short: "Dom", value: 0 },
  { label: "Segunda-feira", short: "Seg", value: 1 },
  { label: "Terça-feira", short: "Ter", value: 2 },
  { label: "Quarta-feira", short: "Qua", value: 3 },
  { label: "Quinta-feira", short: "Qui", value: 4 },
  { label: "Sexta-feira", short: "Sex", value: 5 },
  { label: "Sábado", short: "Sáb", value: 6 },
];

type DayConfig = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  breakBetweenMinutes: number;
  maxConcurrentAppointments: number;
  active: boolean;
};

const DEFAULT_CONFIG: Omit<DayConfig, "dayOfWeek"> = {
  startTime: "09:00",
  endTime: "18:00",
  slotDurationMinutes: 60,
  breakBetweenMinutes: 0,
  maxConcurrentAppointments: 1,
  active: true,
};

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Availability() {
  const [configs, setConfigs] = useState<DayConfig[]>([]);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  const { data: availData, isLoading } = trpc.availability.list.useQuery();
  const { data: blockedDates, refetch: refetchBlocked } = trpc.availability.blockedDates.useQuery();

  const saveMutation = trpc.availability.save.useMutation({
    onSuccess: () => toast.success("Disponibilidade salva com sucesso!"),
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const blockDateMutation = trpc.availability.blockDate.useMutation({
    onSuccess: () => {
      toast.success("Data bloqueada!");
      setNewBlockDate("");
      setNewBlockReason("");
      refetchBlocked();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const unblockDateMutation = trpc.availability.unblockDate.useMutation({
    onSuccess: () => {
      toast.success("Data desbloqueada!");
      refetchBlocked();
    },
  });

  // Inicializar configs com dados do banco
  useEffect(() => {
    if (availData) {
      const loaded = availData.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        slotDurationMinutes: a.slotDurationMinutes,
        breakBetweenMinutes: a.breakBetweenMinutes,
        maxConcurrentAppointments: a.maxConcurrentAppointments,
        active: a.active,
      }));
      setConfigs(loaded);
    }
  }, [availData]);

  const toggleDay = (dayOfWeek: number) => {
    const exists = configs.find(c => c.dayOfWeek === dayOfWeek);
    if (exists) {
      setConfigs(prev => prev.map(c => c.dayOfWeek === dayOfWeek ? { ...c, active: !c.active } : c));
    } else {
      setConfigs(prev => [...prev, { dayOfWeek, ...DEFAULT_CONFIG }]);
    }
  };

  const updateConfig = (dayOfWeek: number, field: keyof Omit<DayConfig, "dayOfWeek">, value: string | number | boolean) => {
    setConfigs(prev => {
      const exists = prev.find(c => c.dayOfWeek === dayOfWeek);
      if (exists) {
        return prev.map(c => c.dayOfWeek === dayOfWeek ? { ...c, [field]: value } : c);
      }
      return [...prev, { dayOfWeek, ...DEFAULT_CONFIG, [field]: value }];
    });
  };

  const getConfig = (dayOfWeek: number): DayConfig | undefined =>
    configs.find(c => c.dayOfWeek === dayOfWeek);

  const handleSave = () => {
    const activeConfigs = configs.filter(c => c.active);
    saveMutation.mutate(activeConfigs);
  };

  // Calcular quantos slots serão gerados
  const calcSlots = (cfg: DayConfig) => {
    const [sh, sm] = cfg.startTime.split(":").map(Number);
    const [eh, em] = cfg.endTime.split(":").map(Number);
    const start = sh! * 60 + sm!;
    const end = eh! * 60 + em!;
    const total = end - start;
    const slotTotal = cfg.slotDurationMinutes + cfg.breakBetweenMinutes;
    return slotTotal > 0 ? Math.floor(total / slotTotal) : 0;
  };

  const today = formatDate(new Date());

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              Disponibilidade
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure os dias e horários em que sua clínica atende
            </p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Configuração por dia */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Horários por dia da semana
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS.map(day => {
                const cfg = getConfig(day.value);
                const isActive = cfg?.active ?? false;

                return (
                  <div
                    key={day.value}
                    className={`border rounded-xl transition-all duration-200 ${
                      isActive ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
                    }`}
                  >
                    {/* Cabeçalho do dia */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isActive ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground"
                        }`}>
                          {day.short}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{day.label}</p>
                          {isActive && cfg && (
                            <p className="text-xs text-muted-foreground">
                              {cfg.startTime} – {cfg.endTime} · {calcSlots(cfg)} slot{calcSlots(cfg) !== 1 ? "s" : ""}
                            </p>
                          )}
                          {!isActive && <p className="text-xs text-muted-foreground">Fechado</p>}
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                    </div>

                    {/* Configurações expandidas */}
                    {isActive && cfg && (
                      <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Início</Label>
                          <Input
                            type="time"
                            value={cfg.startTime}
                            onChange={e => updateConfig(day.value, "startTime", e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fim</Label>
                          <Input
                            type="time"
                            value={cfg.endTime}
                            onChange={e => updateConfig(day.value, "endTime", e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duração do slot (min)</Label>
                          <Input
                            type="number"
                            min={15}
                            max={240}
                            step={15}
                            value={cfg.slotDurationMinutes}
                            onChange={e => updateConfig(day.value, "slotDurationMinutes", parseInt(e.target.value) || 60)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Intervalo entre slots (min)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            step={5}
                            value={cfg.breakBetweenMinutes}
                            onChange={e => updateConfig(day.value, "breakBetweenMinutes", parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="col-span-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{calcSlots(cfg)} consultas</span> serão geradas neste dia
                          {cfg.slotDurationMinutes > 0 && ` (${cfg.slotDurationMinutes}min cada)`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Datas bloqueadas */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <CalendarX className="w-4 h-4" />
            Datas bloqueadas (feriados, férias, etc.)
          </h2>

          {/* Adicionar data bloqueada */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Bloquear uma data</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  min={today}
                  value={newBlockDate}
                  onChange={e => setNewBlockDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motivo (opcional)</Label>
                <Input
                  placeholder="Ex: Feriado"
                  value={newBlockReason}
                  onChange={e => setNewBlockReason(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!newBlockDate || blockDateMutation.isPending}
              onClick={() => blockDateMutation.mutate({ date: newBlockDate, reason: newBlockReason || undefined })}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Bloquear data
            </Button>
          </div>

          {/* Lista de datas bloqueadas */}
          {blockedDates && blockedDates.length > 0 ? (
            <div className="space-y-2">
              {blockedDates.map(bd => (
                <div key={bd.id} className="flex items-center justify-between border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <CalendarX className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(bd.blockedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {bd.reason && <p className="text-xs text-muted-foreground">{bd.reason}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unblockDateMutation.mutate({ id: bd.id })}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-6 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma data bloqueada</p>
            </div>
          )}
        </div>

        {/* Salvar novamente no final */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar disponibilidade"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
