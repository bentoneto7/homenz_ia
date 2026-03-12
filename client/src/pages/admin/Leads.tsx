import { useClinicAuth } from "@/hooks/useClinicAuth";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronRight, ArrowLeft, TrendingUp, Phone } from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  landing: "Landing",
  chat_started: "Chat iniciado",
  chat_completed: "Chat completo",
  photos_started: "Fotos iniciadas",
  photos_done: "Fotos enviadas",
  ai_processing: "IA processando",
  ai_done: "IA concluída",
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  abandoned: "Abandonado",
};

const STEP_COLORS: Record<string, string> = {
  landing: "bg-muted text-muted-foreground",
  chat_started: "bg-blue-500/20 text-blue-600",
  chat_completed: "bg-blue-500/20 text-blue-600",
  photos_started: "bg-amber-500/20 text-amber-600",
  photos_done: "bg-amber-500/20 text-amber-600",
  ai_processing: "bg-purple-500/20 text-purple-600",
  ai_done: "bg-purple-500/20 text-purple-600",
  scheduled: "bg-emerald-500/20 text-emerald-600",
  confirmed: "bg-emerald-500/20 text-emerald-600",
  completed: "bg-emerald-500/20 text-emerald-600",
  abandoned: "bg-red-500/20 text-red-600",
};

export default function AdminLeads() {
  const { isAuthenticated } = useClinicAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [stepFilter, setStepFilter] = useState<string>("");

  const { data: clinic } = trpc.clinic.mine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: leads, isLoading } = trpc.leads.list.useQuery(
    { limit: 100 },
    { enabled: !!clinic }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button className="gradient-gold text-white border-0" onClick={() => window.location.href = '/login-clinica'}>Entrar</Button>
      </div>
    );
  }

  const filtered = (leads ?? []).filter((l) => {
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStep = !stepFilter || l.funnelStep === stepFilter;
    return matchSearch && matchStep;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/painel")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-4 h-4 text-primary" />
            <h1 className="font-bold">Leads</h1>
            <span className="text-xs text-muted-foreground ml-1">({filtered.length})</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={stepFilter}
            onChange={(e) => setStepFilter(e.target.value)}
            className="border border-border rounded-lg px-3 text-sm bg-background text-foreground"
          >
            <option value="">Todos</option>
            {Object.entries(STEP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((lead) => (
              <Link key={lead.id} href={`/painel/leads/${lead.id}`}>
                <a className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STEP_COLORS[lead.funnelStep] ?? "bg-muted text-muted-foreground"}`}>
                        {STEP_LABELS[lead.funnelStep] ?? lead.funnelStep}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                      {lead.utmSource && (
                        <span className="text-primary">📊 {lead.utmSource}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {lead.leadScore !== null && lead.leadScore !== undefined && (
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <TrendingUp className={`w-3 h-3 ${lead.leadScore >= 70 ? "text-emerald-500" : lead.leadScore >= 40 ? "text-amber-500" : "text-red-500"}`} />
                        <span className={`text-xs font-bold ${lead.leadScore >= 70 ? "text-emerald-500" : lead.leadScore >= 40 ? "text-amber-500" : "text-red-500"}`}>
                          {lead.leadScore}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
