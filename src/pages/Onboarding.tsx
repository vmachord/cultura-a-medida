import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CULTURAL_PROFILE_LABELS, CULTURAL_PROFILE_DESCRIPTIONS, INTEREST_OPTIONS, COMFORT_PRIORITY_OPTIONS } from "@/lib/types";
import type { CulturalProfile } from "@/lib/types";
import { ArrowRight, ArrowLeft, Loader2, Check, Users, BookOpen, Camera, Heart, Accessibility, Baby, Backpack, VolumeX, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

const PROFILE_ICONS: Record<CulturalProfile, any> = {
  family: Users,
  researcher: BookOpen,
  tourist: Camera,
  local_recurrent: Heart,
  undefined: Users,
};

const PRIORITY_ICONS: Record<string, any> = {
  accessibility: Accessibility,
  family_zone: Baby,
  lockers: Backpack,
  quiet: VolumeX,
  climate: Snowflake,
};

const PROFILES: CulturalProfile[] = ["family", "researcher", "tourist", "local_recurrent"];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!profile?.onboarding_completed;
  const [step, setStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<CulturalProfile | null>(
    profile && profile.cultural_profile !== "undefined" ? profile.cultural_profile : null
  );
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [priorities, setPriorities] = useState<string[]>(profile?.comfort_priorities ?? []);
  const [saving, setSaving] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const handleFinish = async () => {
    if (!user || !selectedProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        cultural_profile: selectedProfile,
        interests,
        comfort_priorities: priorities,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Error al guardar", { description: error.message });
      setSaving(false);
      return;
    }
    await refreshProfile();
    toast.success("¡Perfecto! Vamos a descubrir cultura.");
    navigate("/app/discover");
  };

  const canNext = step === 0 ? !!selectedProfile : step === 1 ? interests.length > 0 : true;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-2xl py-8 md:py-16">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-accent" : "bg-muted"
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="font-display text-3xl font-semibold">¿Cómo vives la cultura?</h1>
              <p className="mt-2 text-muted-foreground">
                {isEditing
                  ? "Esta es tu selección actual. Puedes cambiarla cuando quieras."
                  : "Esto nos ayuda a recomendarte equipamientos que encajen contigo. Podrás cambiarlo cuando quieras."}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PROFILES.map((p) => {
                const Icon = PROFILE_ICONS[p];
                const active = selectedProfile === p;
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedProfile(p)}
                    className={cn(
                      "rounded-2xl border-2 p-5 text-left transition-all",
                      active ? "border-accent bg-accent-soft shadow-warm" : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className={cn("mb-3 h-6 w-6", active ? "text-accent" : "text-muted-foreground")} />
                    <p className="font-display font-semibold">{CULTURAL_PROFILE_LABELS[p]}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{CULTURAL_PROFILE_DESCRIPTIONS[p]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="font-display text-3xl font-semibold">¿Qué te interesa?</h1>
              <p className="mt-2 text-muted-foreground">Elige todo lo que te llame la atención.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((i) => {
                const active = interests.includes(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggle(interests, setInterests, i.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm transition-all",
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-card text-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {i.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="font-display text-3xl font-semibold">¿Qué necesitas para sentirte cómodo/a?</h1>
              <p className="mt-2 text-muted-foreground">
                Filtraremos por estos servicios. Opcional — puedes dejarlo en blanco.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {COMFORT_PRIORITY_OPTIONS.map((c) => {
                const active = priorities.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(priorities, setPriorities, c.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                      active ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className="font-medium">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving || !selectedProfile}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Empezar a descubrir"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
