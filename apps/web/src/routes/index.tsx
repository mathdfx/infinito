import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardFooter, Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiFetch } from "../lib/api";
import type { EventResponse } from "@ticket-demo/schemas";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<EventResponse[]>("/events"),
  });

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-16 sm:py-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
          <Icon icon="solar:fire-bold-duotone" className="text-purple-400" />
          <span className="text-sm font-medium text-purple-300">
            Eventos imperdíveis
          </span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
          Seus ingressos,{" "}
          <span className="gradient-text">sem complicação</span>
        </h1>
        <p className="text-lg text-foreground/50 max-w-2xl mx-auto mb-8">
          Encontre os melhores eventos, compre com segurança e acesse seus
          ingressos digitais direto do celular.
        </p>
        <Button
          as={Link}
          to="/eventos"
          size="lg"
          color="secondary"
          variant="shadow"
          endContent={
            <Icon icon="solar:arrow-right-bold" className="text-lg" />
          }
        >
          Ver Eventos
        </Button>
      </section>

      {/* Featured Events */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Próximos Eventos</h2>
          <Link
            to="/eventos"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            Ver todos
            <Icon icon="solar:arrow-right-linear" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events?.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({ event }: { event: EventResponse }) {
  const date = new Date(event.date);
  const day = date.getDate();
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase();

  return (
    <Card
      as={Link}
      to="/eventos/$slug"
      params={{ slug: event.slug }}
      isPressable
      className="glass-card hover-lift overflow-hidden group"
    >
      <CardBody className="p-0">
        <div className="h-40 bg-gradient-to-br from-purple-600/30 via-pink-600/20 to-blue-600/30 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.15),transparent_70%)]" />
          <Icon
            icon="solar:music-notes-bold-duotone"
            className="text-6xl text-white/20 group-hover:text-white/30 transition-colors"
          />
          <div className="absolute top-3 right-3">
            <div className="bg-black/40 backdrop-blur-md rounded-lg px-3 py-2 text-center">
              <div className="text-xl font-bold leading-none">{day}</div>
              <div className="text-[10px] font-semibold text-foreground/60 uppercase">
                {month}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-lg line-clamp-1">{event.name}</h3>
          <div className="flex items-center gap-1.5 text-sm text-foreground/50">
            <Icon icon="solar:map-point-bold-duotone" className="text-base flex-shrink-0" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
        </div>
      </CardBody>
      <CardFooter className="px-4 pb-4 pt-0">
        <Chip size="sm" variant="flat" color="secondary">
          <span className="flex items-center gap-1">
            <Icon icon="solar:calendar-bold-duotone" className="text-sm" />
            {date.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </Chip>
      </CardFooter>
    </Card>
  );
}
