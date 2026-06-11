import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Tabs,
  Tab,
  Divider,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { authClient } from "../lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<string>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: loginEmail,
        password: loginPassword,
      });
      if (result.error) {
        addToast?.({
          title: "Erro ao entrar",
          description: result.error.message ?? "Verifique suas credenciais",
          color: "danger",
        });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      addToast?.({
        title: "Erro",
        description: "Falha na conexão",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });
      if (result.error) {
        addToast?.({
          title: "Erro ao cadastrar",
          description: result.error.message ?? "Tente novamente",
          color: "danger",
        });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      addToast?.({
        title: "Erro",
        description: "Falha na conexão",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="glass-card w-full max-w-md">
        <CardBody className="p-8">
          <div className="text-center mb-6">
            <Icon
              icon="solar:ticket-bold-duotone"
              className="text-4xl text-purple-500 mx-auto mb-2"
            />
            <h1 className="text-2xl font-bold">
              Bem-vindo ao <span className="gradient-text">TicketDemo</span>
            </h1>
          </div>

          <Tabs
            fullWidth
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(String(key))}
            classNames={{
              tabList: "bg-white/5",
            }}
          >
            <Tab key="login" title="Entrar">
              <form
                className="space-y-4 pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
              >
                <Input
                  label="Email"
                  type="email"
                  value={loginEmail}
                  onValueChange={setLoginEmail}
                  startContent={
                    <Icon
                      icon="solar:letter-bold-duotone"
                      className="text-foreground/40"
                    />
                  }
                  classNames={{
                    inputWrapper: "bg-white/5 border-white/10",
                  }}
                />
                <Input
                  label="Senha"
                  type="password"
                  value={loginPassword}
                  onValueChange={setLoginPassword}
                  startContent={
                    <Icon
                      icon="solar:lock-password-bold-duotone"
                      className="text-foreground/40"
                    />
                  }
                  classNames={{
                    inputWrapper: "bg-white/5 border-white/10",
                  }}
                />
                <Button
                  fullWidth
                  color="secondary"
                  variant="shadow"
                  type="submit"
                  isLoading={isLoading}
                >
                  Entrar
                </Button>
              </form>
            </Tab>

            <Tab key="register" title="Criar conta">
              <form
                className="space-y-4 pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRegister();
                }}
              >
                <Input
                  label="Nome"
                  value={registerName}
                  onValueChange={setRegisterName}
                  startContent={
                    <Icon
                      icon="solar:user-bold-duotone"
                      className="text-foreground/40"
                    />
                  }
                  classNames={{
                    inputWrapper: "bg-white/5 border-white/10",
                  }}
                />
                <Input
                  label="Email"
                  type="email"
                  value={registerEmail}
                  onValueChange={setRegisterEmail}
                  startContent={
                    <Icon
                      icon="solar:letter-bold-duotone"
                      className="text-foreground/40"
                    />
                  }
                  classNames={{
                    inputWrapper: "bg-white/5 border-white/10",
                  }}
                />
                <Input
                  label="Senha"
                  type="password"
                  value={registerPassword}
                  onValueChange={setRegisterPassword}
                  startContent={
                    <Icon
                      icon="solar:lock-password-bold-duotone"
                      className="text-foreground/40"
                    />
                  }
                  classNames={{
                    inputWrapper: "bg-white/5 border-white/10",
                  }}
                />
                <Button
                  fullWidth
                  color="secondary"
                  variant="shadow"
                  type="submit"
                  isLoading={isLoading}
                >
                  Criar conta
                </Button>
              </form>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}
