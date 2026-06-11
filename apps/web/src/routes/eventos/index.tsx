import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Input, Card, CardBody, CardFooter, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { apiFetch } from "../../lib/api";
import type { EventResponse } from "@ticket-demo/schemas";

export const Route = createFileRoute("/eventos/")({
  component: EventosPage,
});

function EventosPage() {
  const [search, setSearch] = useState("");
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<EventResponse[]>(`/events${params}`);
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-foreground/50 mt-1">
            Encontre o evento perfeito para você
          </p>
        </div>
        <Input
          placeholder="Buscar eventos..."
          value={search}
          onValueChange={setSearch}
          startContent={
            <Icon
              icon="solar:magnifer-bold-duotone"
              className="text-foreground/40"
            />
          }
          classNames={{
            base: "max-w-xs",
            inputWrapper: "bg-white/5 border-white/10",
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="glass-card h-64 animate-pulse" />
          ))}
        </div>
      ) : events?.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <Icon
            icon="solar:ghost-bold-duotone"
            className="text-5xl mx-auto mb-4"
          />
          <p>Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events?.map((event) => {
            const date = new Date(event.date);
            const day = date.getDate();
            const month = date
              .toLocaleDateString("pt-BR", { month: "short" })
              .toUpperCase();

            return (
              <Link
                key={event.id}
                to="/eventos/$slug"
                params={{ slug: event.slug }}
                className="block no-underline"
              >
                <Card
                  isPressable
                  className="glass-card hover-lift overflow-hidden group w-full h-full"
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
                          <div className="text-xl font-bold leading-none">
                            {day}
                          </div>
                          <div className="text-[10px] font-semibold text-foreground/60 uppercase">
                            {month}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-1">
                        {event.name}
                      </h3>
                      <p className="text-sm text-foreground/40 line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-sm text-foreground/50">
                        <Icon
                          icon="solar:map-point-bold-duotone"
                          className="text-base flex-shrink-0"
                        />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    </div>
                  </CardBody>
                  <CardFooter className="px-4 pb-4 pt-0">
                    <Chip size="sm" variant="flat" color="secondary">
                      <span className="flex items-center gap-1">
                        <Icon
                          icon="solar:calendar-bold-duotone"
                          className="text-sm"
                        />
                        {date.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </Chip>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
