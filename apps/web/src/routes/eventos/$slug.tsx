import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  Button,
  Chip,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { authClient } from "../../lib/auth";
import type { EventDetailResponse } from "@ticket-demo/schemas";

export const Route = createFileRoute("/eventos/$slug")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => apiFetch<EventDetailResponse>(`/events/${slug}`),
  });

  const [selectedItems, setSelectedItems] = useState<
    Record<string, number>
  >({});

  const createOrder = useMutation({
    mutationFn: (items: Array<{ ticketTypeId: string; quantity: number }>) =>
      apiFetch<{ id: string }>("/orders", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    onSuccess: (data) => {
      navigate({ to: "/checkout/$orderId", params: { orderId: data.id } });
    },
    onError: (err) => {
      addToast?.({
        title: "Erro ao criar pedido",
        description: err.message,
        color: "danger",
      });
    },
  });

  const handleCheckout = () => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    const items = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    if (items.length === 0) return;
    createOrder.mutate(items);
  };

  const totalCents = event
    ? Object.entries(selectedItems).reduce((sum, [ttId, qty]) => {
        const tt = event.ticketTypes.find((t) => t.id === ttId);
        return sum + (tt?.priceCents ?? 0) * qty;
      }, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Icon
          icon="solar:loading-bold-duotone"
          className="text-4xl animate-spin text-purple-500"
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-foreground/40">
        <Icon icon="solar:ghost-bold-duotone" className="text-5xl mx-auto mb-4" />
        <p>Evento não encontrado</p>
      </div>
    );
  }

  const date = new Date(event.date);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Event Header */}
      <div className="glass-card overflow-hidden mb-8">
        <div className="h-48 sm:h-64 bg-gradient-to-br from-purple-600/40 via-pink-600/30 to-blue-600/40 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.2),transparent_70%)]" />
          <Icon
            icon="solar:music-notes-bold-duotone"
            className="text-8xl text-white/15"
          />
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {event.name}
          </h1>
          <p className="text-foreground/50 mb-6 leading-relaxed">
            {event.description}
          </p>
          <div className="flex flex-wrap gap-4">
            <Chip
              variant="flat"
              color="secondary"
              startContent={
                <Icon icon="solar:calendar-bold-duotone" className="text-sm" />
              }
            >
              {date.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Chip>
            <Chip
              variant="flat"
              color="secondary"
              startContent={
                <Icon icon="solar:clock-circle-bold-duotone" className="text-sm" />
              }
            >
              {date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Chip>
            <Chip
              variant="flat"
              color="secondary"
              startContent={
                <Icon icon="solar:map-point-bold-duotone" className="text-sm" />
              }
            >
              {event.venue}
            </Chip>
          </div>
        </div>
      </div>

      {/* Ticket Types */}
      <h2 className="text-xl font-bold mb-4">Selecione seus ingressos</h2>
      <div className="space-y-4 mb-8">
        {event.ticketTypes.map((tt) => {
          const qty = selectedItems[tt.id] ?? 0;
          const soldOut = tt.quantityAvailable === 0;

          return (
            <Card key={tt.id} className="glass-card">
              <CardBody className="flex flex-row items-center justify-between gap-4 p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{tt.name}</h3>
                    {soldOut && (
                      <Chip size="sm" color="danger" variant="flat">
                        Esgotado
                      </Chip>
                    )}
                  </div>
                  <p className="text-foreground/50 text-sm">
                    {tt.quantityAvailable} disponíveis de {tt.quantityTotal}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="text-xl font-bold text-purple-400">
                    R${" "}
                    {(tt.priceCents / 100).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      isDisabled={qty === 0}
                      onPress={() =>
                        setSelectedItems((prev) => ({
                          ...prev,
                          [tt.id]: Math.max(0, (prev[tt.id] ?? 0) - 1),
                        }))
                      }
                    >
                      <Icon icon="solar:minus-circle-bold" />
                    </Button>
                    <span className="w-6 text-center font-semibold">
                      {qty}
                    </span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      color="secondary"
                      isDisabled={soldOut || qty >= Math.min(10, tt.quantityAvailable)}
                      onPress={() =>
                        setSelectedItems((prev) => ({
                          ...prev,
                          [tt.id]: Math.min(
                            Math.min(10, tt.quantityAvailable),
                            (prev[tt.id] ?? 0) + 1
                          ),
                        }))
                      }
                    >
                      <Icon icon="solar:add-circle-bold" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Checkout Bar */}
      {totalCents > 0 && (
        <div className="glass-card p-5 sticky bottom-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground/50">Total</p>
            <p className="text-2xl font-bold gradient-text">
              R${" "}
              {(totalCents / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <Button
            size="lg"
            color="secondary"
            variant="shadow"
            isLoading={createOrder.isPending}
            onPress={handleCheckout}
            endContent={
              <Icon icon="solar:cart-check-bold" className="text-lg" />
            }
          >
            Comprar
          </Button>
        </div>
      )}
    </div>
  );
}
