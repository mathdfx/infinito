import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiFetch } from "../../lib/api";
import { authClient } from "../../lib/auth";
import type { OrderResponse } from "@ticket-demo/schemas";

export const Route = createFileRoute("/checkout/$orderId")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<OrderResponse>(`/orders/${orderId}`),
    enabled: !!session,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "pending" ? 2000 : false;
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ orderId: string; status: string }>(
        `/orders/${orderId}/pay`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-foreground/40">
        <Icon
          icon="solar:ghost-bold-duotone"
          className="text-5xl mx-auto mb-4"
        />
        <p>Pedido não encontrado</p>
      </div>
    );
  }

  const isPaid = order.status === "paid";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        {isPaid ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Icon
                icon="solar:check-circle-bold-duotone"
                className="text-4xl text-green-400"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2">Pagamento confirmado!</h1>
            <p className="text-foreground/50">
              Seus ingressos já estão disponíveis
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Icon
                icon="solar:cart-large-2-bold-duotone"
                className="text-4xl text-purple-400"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2">Finalizar compra</h1>
            <p className="text-foreground/50">Revise seu pedido e pague</p>
          </>
        )}
      </div>

      <Card className="glass-card mb-6">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Resumo do pedido</h2>
            <Chip
              variant="flat"
              color={isPaid ? "success" : "warning"}
              size="sm"
            >
              {isPaid ? "Pago" : "Pendente"}
            </Chip>
          </div>
          <Divider className="mb-4 bg-white/5" />
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{item.eventName}</span>
                  <span className="text-foreground/40 ml-2">
                    — {item.ticketTypeName} x{item.quantity}
                  </span>
                </div>
                <span className="font-semibold">
                  R${" "}
                  {((item.unitPriceCents * item.quantity) / 100).toLocaleString(
                    "pt-BR",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>
            ))}
          </div>
          <Divider className="my-4 bg-white/5" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-bold gradient-text">
              R${" "}
              {(order.totalCents / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </CardBody>
      </Card>

      {isPaid ? (
        <Button
          fullWidth
          size="lg"
          color="secondary"
          variant="shadow"
          onPress={() => navigate({ to: "/meus-ingressos" })}
          endContent={
            <Icon icon="solar:ticket-bold" className="text-lg" />
          }
        >
          Ver meus ingressos
        </Button>
      ) : (
        <Button
          fullWidth
          size="lg"
          color="secondary"
          variant="shadow"
          isLoading={payMutation.isPending}
          onPress={() => payMutation.mutate()}
          startContent={
            !payMutation.isPending && (
              <Icon
                icon="solar:card-bold-duotone"
                className="text-lg"
              />
            )
          }
        >
          {payMutation.isPending
            ? "Processando pagamento..."
            : "Pagar agora"}
        </Button>
      )}
    </div>
  );
}
