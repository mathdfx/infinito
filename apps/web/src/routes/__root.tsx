import { createRootRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { authClient } from "../lib/auth";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        maxWidth="xl"
        classNames={{
          base: "bg-background/60 backdrop-blur-xl border-b border-white/5",
          wrapper: "px-4 sm:px-6",
        }}
      >
        <NavbarBrand>
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Icon
              icon="solar:ticket-bold-duotone"
              className="text-2xl text-purple-500"
            />
            <span className="font-extrabold text-xl gradient-text">
              TicketDemo
            </span>
          </Link>
        </NavbarBrand>

        <NavbarContent className="hidden sm:flex gap-6" justify="center">
          <NavbarItem>
            <Link
              to="/eventos"
              className="text-foreground/70 hover:text-foreground transition-colors text-sm font-medium"
            >
              Eventos
            </Link>
          </NavbarItem>
          {session && (
            <NavbarItem>
              <Link
                to="/meus-ingressos"
                className="text-foreground/70 hover:text-foreground transition-colors text-sm font-medium"
              >
                Meus Ingressos
              </Link>
            </NavbarItem>
          )}
        </NavbarContent>

        <NavbarContent justify="end">
          {isPending ? null : session ? (
            <NavbarItem className="flex items-center gap-3">
              <span className="text-sm text-foreground/60 hidden sm:inline">
                {session.user.name}
              </span>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                onPress={handleSignOut}
                startContent={
                  <Icon icon="solar:logout-2-bold-duotone" className="text-lg" />
                }
              >
                Sair
              </Button>
            </NavbarItem>
          ) : (
            <NavbarItem>
              <Button
                as={Link}
                to="/login"
                size="sm"
                color="secondary"
                variant="flat"
                startContent={
                  <Icon icon="solar:login-2-bold-duotone" className="text-lg" />
                }
              >
                Entrar
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>
      </Navbar>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-foreground/40">
          TicketDemo © {new Date().getFullYear()} — Projeto demonstrativo
        </div>
      </footer>
    </div>
  );
}
