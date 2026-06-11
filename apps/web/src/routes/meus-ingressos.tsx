import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Chip, Divider, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "../lib/api";
import { authClient } from "../lib/auth";
import type { TicketResponse } from "@ticket-demo/schemas";

export const Route = createFileRoute("/meus-ingressos")({
  component: MeusIngressosPage,
});

function MeusIngressosPage() {
  const { data: session, isPending: sessionLoading } =
    authClient.useSession();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => apiFetch<TicketResponse[]>("/me/tickets"),
    enabled: !!session,
  });

  if (sessionLoading || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20 text-foreground/40">
        <Icon
          icon="solar:lock-password-bold-duotone"
          className="text-5xl mx-auto mb-4"
        />
        <p>Faça login para ver seus ingressos</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meus Ingressos</h1>
        <p className="text-foreground/50 mt-1">
          Apresente o QR Code na entrada do evento
        </p>
      </div>

      {!tickets || tickets.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <Icon
            icon="solar:ticket-bold-duotone"
            className="text-5xl mx-auto mb-4 opacity-50"
          />
          <p className="text-lg mb-1">Nenhum ingresso encontrado</p>
          <p className="text-sm">Compre ingressos para vê-los aqui</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketResponse }) {
  const date = new Date(ticket.eventDate);

  return (
    <Card className="glass-card overflow-hidden">
      <CardBody className="p-0">
        {/* Ticket top strip */}
        <div className="bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-blue-600/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{ticket.eventName}</h3>
              <p className="text-sm text-foreground/50">
                {ticket.ticketTypeName}
              </p>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={ticket.status === "valid" ? "success" : "default"}
            >
              {ticket.status === "valid" ? "Válido" : "Usado"}
            </Chip>
          </div>
        </div>

        {/* Dotted divider simulating a tear line */}
        <div className="border-t-2 border-dashed border-white/10 relative">
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-background" />
          <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-background" />
        </div>

        {/* QR + Info */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG
              value={ticket.code}
              size={160}
              level="M"
              bgColor="#ffffff"
              fgColor="#18181b"
            />
          </div>
          <p className="font-mono text-sm text-foreground/60 tracking-widest">
            {ticket.code}
          </p>
          <Divider className="bg-white/5" />
          <div className="w-full space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground/50">
              <Icon
                icon="solar:calendar-bold-duotone"
                className="flex-shrink-0"
              />
              {date.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              às{" "}
              {date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-2 text-foreground/50">
              <Icon
                icon="solar:map-point-bold-duotone"
                className="flex-shrink-0"
              />
              {ticket.eventVenue}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
