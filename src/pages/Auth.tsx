import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Compass, Building2, Loader2, MapPin, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/types";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, profile } = useAuth();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const initialRole = (searchParams.get("role") as AppRole) === "admin" ? "admin" : "citizen";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [selectedRole, setSelectedRole] = useState<AppRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (profile && !profile.onboarding_completed) navigate("/app/onboarding", { replace: true });
      else navigate("/app/discover", { replace: true });
    }
  }, [user, role, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              display_name: displayName || email.split("@")[0],
              role: selectedRole,
            },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada!", { description: "Bienvenido/a a Cultura a Medida." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("¡Hola de nuevo!");
      }
    } catch (err: any) {
      toast.error("No se pudo completar", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="font-display text-sm font-semibold">Cultura a Medida</span>
        </div>
      </div>

      <div className="container flex justify-center py-8 md:py-16">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {mode === "signup" ? "Crear cuenta" : "Bienvenido/a de vuelta"}
            </CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "Elige cómo quieres usar la plataforma."
                : "Accede para continuar tu experiencia cultural."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "signup" && (
              <div className="mb-6 space-y-2">
                <Label>¿Quién eres?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("citizen")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      selectedRole === "citizen"
                        ? "border-accent bg-accent-soft"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <Compass className="mb-1 h-5 w-5 text-accent" />
                    <p className="text-sm font-medium">Ciudadano</p>
                    <p className="text-xs text-muted-foreground">Descubrir cultura</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("admin")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      selectedRole === "admin"
                        ? "border-accent bg-accent-soft"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <Building2 className="mb-1 h-5 w-5 text-accent" />
                    <p className="text-sm font-medium">Administración</p>
                    <p className="text-xs text-muted-foreground">Planificar</p>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Cómo te llamamos"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" required placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Crear cuenta" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
