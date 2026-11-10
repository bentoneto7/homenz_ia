import { useMemo, useState } from "react";
import {
  Flame,
  Thermometer,
  Snowflake,
  Clock,
  Calendar,
  Users,
  Target,
} from "lucide-react";
import type { ActionTemperature } from "@/lib/leadTemperature";

// ── Tipos do que o backend (franchiseeStats) entrega ──────────────────────────
// allLeads = TODOS os leads da franquia (não só os 20 da aba Leads), já com a
// temperatura por AÇÃO e o vendedor responsável (assigned_to).
export type KanbanLead = {
  id: string;
  name: string;
  phone: string;
  hair_problem: string | null;
  lead_score: number;
  temperature: ActionTemperature;
  funnel_step: string;
  attendance_status: string | null;
  appointment_at: string | null;
  assigned_to: string | null;
  last_activity_at: string;
  created_at: string;
};

export type KanbanSeller = { id: string; name: string };

// ── Coluna do kanban derivada do status de atendimento ────────────────────────
// Mesma régua do kanban do vendedor (SellerDashboard) para consistência total.
type ColKey = "open" | "in_progress" | "scheduled" | "done";

function columnOf(l: KanbanLead): ColKey {
  const a = l.attendance_status;
  if (a === "resolved" || a === "closed_sale" || a === "closed_no_sale") return "done";
  if (l.appointment_at || l.funnel_step === "scheduled") return "scheduled";
  if (a === "in_progress") return "in_progress";
  return "open";
}

const COLUMNS: { key: ColKey; label: string; accent: string; dot: string }[] = [
  { key: "open", label: "Em aberto", accent: "text-[#5A667A]", dot: "bg-[#94A3B8]" },
  { key: "in_progress", label: "Em atendimento", accent: "text-[#004A9D]", dot: "bg-[#004A9D]" },
  { key: "scheduled", label: "Agendados", accent: "text-emerald-600", dot: "bg-emerald-500" },
  { key: "done", label: "Concluídos", accent: "text-[#0A2540]", dot: "bg-[#0A2540]" },
];

// ── Temperatura (por ação) — ícone + cor ──────────────────────────────────────
const HEAT: Record<ActionTemperature, { Icon: typeof Flame; cls: string; label: string }> = {
  hot: { Icon: Flame, cls: "text-orange-500 bg-orange-500/10", label: "Quente" },
  warm: { Icon: Thermometer, cls: "text-amber-500 bg-amber-500/10", label: "Morno" },
  cold: { Icon: Snowflake, cls: "text-blue-500 bg-blue-500/10", label: "Frio" },
};

// Cor estável por vendedor (avatar/realce) — deriva do índice na lista.
const SELLER_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-[#004A9D]",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(iso: string): string {
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 1) return "agora";
  if (min < 60) return `${Math.floor(min)}min`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

// ── Card de lead no board da franquia (mostra o vendedor responsável) ─────────
function LeadCard({
  lead,
  sellerName,
  sellerColor,
}: {
  lead: KanbanLead;
  sellerName: string;
  sellerColor: string;
}) {
  const heat = HEAT[lead.temperature] ?? HEAT.cold;
  const HeatIcon = heat.Icon;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 hover:border-[#004A9D]/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-[#0A2540] truncate">{lead.name}</p>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${heat.cls}`}>
          <HeatIcon className="w-3 h-3" />
          {heat.label}
        </span>
      </div>
      <p className="text-xs text-[#5A667A] mt-0.5 truncate">{lead.hair_problem ?? "Sem detalhe"}</p>

      {/* Vendedor responsável — o diferencial do board da franquia */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${sellerColor}`}>
          {sellerName === "Não atribuído" ? "?" : initials(sellerName)}
        </span>
        <span className="text-[11px] font-medium text-[#5A667A] truncate">{sellerName}</span>
      </div>

      {/* Agendamento ou tempo desde a última atividade */}
      {lead.appointment_at ? (
        <p className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1.5">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          {new Date(lead.appointment_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          {" às "}
          {new Date(lead.appointment_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      ) : (
        <p className="flex items-center gap-1 text-[11px] text-[#94A3B8] mt-1.5">
          <Clock className="w-3 h-3 flex-shrink-0" />
          {timeAgo(lead.last_activity_at ?? lead.created_at)} atrás
        </p>
      )}
    </div>
  );
}

// ── Board completo ────────────────────────────────────────────────────────────
export function FranchiseeKanbanTab({
  leads,
  sellers,
}: {
  leads: KanbanLead[];
  sellers: KanbanSeller[];
}) {
  // Mapa id → { nome, cor } com cor estável por vendedor
  const sellerInfo = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    sellers.forEach((s, i) => {
      map.set(s.id, { name: s.name, color: SELLER_COLORS[i % SELLER_COLORS.length] });
    });
    return map;
  }, [sellers]);

  const resolveSeller = (id: string | null) =>
    (id && sellerInfo.get(id)) || { name: "Não atribuído", color: "bg-[#EEF2F6] text-[#94A3B8]" };

  // Filtro por vendedor — a franquia consegue isolar "os leads do fulano".
  const [sellerFilter, setSellerFilter] = useState<string>("all");

  const visibleLeads = useMemo(
    () => (sellerFilter === "all" ? leads : leads.filter((l) => (l.assigned_to ?? "none") === sellerFilter)),
    [leads, sellerFilter],
  );

  const byColumn = useMemo(() => {
    const acc: Record<ColKey, KanbanLead[]> = { open: [], in_progress: [], scheduled: [], done: [] };
    for (const l of visibleLeads) acc[columnOf(l)].push(l);
    return acc;
  }, [visibleLeads]);

  // Contadores de leads SEM atribuição (a franquia precisa enxergar gargalo)
  const unassignedCount = leads.filter((l) => !l.assigned_to).length;

  return (
    <div>
      {/* Resumo + filtro por vendedor */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00C1B8]" />
            <p className="text-[#0A2540] font-bold text-sm">Acompanhamento de leads em tempo real</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#5A667A]">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
              {byColumn.open.length} em aberto
            </span>
            <span className="flex items-center gap-1.5 text-[#5A667A]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {byColumn.scheduled.length} agendados
            </span>
          </div>
        </div>

        {/* Chips de vendedor */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSellerFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              sellerFilter === "all" ? "bg-[#004A9D] text-white" : "bg-white text-[#5A667A] border border-[#E2E8F0] hover:border-[#004A9D]/40"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Todos ({leads.length})
          </button>
          {sellers.map((s, i) => {
            const count = leads.filter((l) => l.assigned_to === s.id).length;
            const active = sellerFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSellerFilter(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? "bg-[#004A9D] text-white" : "bg-white text-[#5A667A] border border-[#E2E8F0] hover:border-[#004A9D]/40"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${active ? "bg-white/20 text-white" : SELLER_COLORS[i % SELLER_COLORS.length]}`}>
                  {initials(s.name)}
                </span>
                {s.name.split(" ")[0]} ({count})
              </button>
            );
          })}
          {unassignedCount > 0 && (
            <button
              onClick={() => setSellerFilter("none")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sellerFilter === "none" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-400"
              }`}
            >
              Não atribuídos ({unassignedCount})
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const items = byColumn[col.key];
          return (
            <div key={col.key} className="rounded-2xl p-3 border bg-[#F8FAFC] border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="flex items-center gap-2 text-sm font-bold text-[#0A2540]">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  {col.label}
                </span>
                <span className="text-xs font-bold text-[#5A667A] bg-white rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[40px]">
                {items.map((l) => {
                  const info = resolveSeller(l.assigned_to);
                  return <LeadCard key={l.id} lead={l} sellerName={info.name} sellerColor={info.color} />;
                })}
                {items.length === 0 && (
                  <p className="text-xs text-[#C0CADB] px-1 py-3 text-center">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
