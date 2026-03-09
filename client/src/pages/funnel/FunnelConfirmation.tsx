import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Check, Calendar, Phone, MessageCircle } from "lucide-react";

export default function FunnelConfirmation() {
  const { slug, token } = useParams<{ slug: string; token: string }>();

  const { data: appointment } = trpc.appointments.getByToken.useQuery(
    { sessionToken: token ?? "" },
    { enabled: !!token }
  );

  const { data: clinic } = trpc.clinic.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const scheduledDate = appointment?.scheduledAt ? new Date(appointment.scheduledAt) : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Consulta agendada!</h1>
        <p className="text-muted-foreground mb-8">
          Sua consulta foi confirmada com sucesso. Aguardamos você!
        </p>

        {/* Appointment details */}
        {scheduledDate && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{clinic?.name ?? "Clínica"}</p>
                <p className="text-xs text-muted-foreground">{clinic?.city}/{clinic?.state}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {scheduledDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <span className="font-medium">
                  {scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">Consulta de avaliação</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-amber-500 font-medium">Aguardando confirmação</span>
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {clinic?.whatsapp && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6">
            <p className="text-sm font-medium text-emerald-600 mb-1">Dúvidas? Fale conosco!</p>
            <p className="text-xs text-muted-foreground mb-3">
              Nossa equipe está disponível para responder qualquer pergunta.
            </p>
            <a
              href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar no WhatsApp
              </Button>
            </a>
          </div>
        )}

        {/* Next steps */}
        <div className="bg-card border border-border rounded-2xl p-4 text-left">
          <p className="font-semibold text-sm mb-3">Próximos passos:</p>
          <div className="space-y-2">
            {[
              "Você receberá uma confirmação da clínica em breve",
              "Chegue com 10 minutos de antecedência",
              "Traga documento de identidade",
              "A consulta é gratuita e sem compromisso",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
                  {i + 1}
                </div>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
