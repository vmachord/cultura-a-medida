import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Compass, Map, Sparkles, Building2, BarChart3, Lightbulb, ArrowRight, MapPin,
} from "lucide-react";
import heroImage from "@/assets/hero-cultura.jpg";

export default function Landing() {
  const { user, role } = useAuth();
  const myArea = user ? (role === "admin" ? "/admin" : "/app/discover") : "/auth";
  const [facilityCount, setFacilityCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("cultural_facilities")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setFacilityCount(count ?? 0));
  }, []);


  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-warm">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold leading-none">Cultura a Medida</p>
            <p className="text-[11px] text-muted-foreground">València</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link to={myArea}>Ir a mi espacio <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth?mode=signup">Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div className="space-y-6 animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" /> Cátedra Espacios
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
            La cultura de València, <span className="text-accent">a tu medida</span>.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Descubre equipamientos culturales adaptados a tu perfil — familia, investigador,
            turista o local — con filtros de confort reales y recomendaciones inteligentes.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button asChild size="lg" className="w-fit rounded-full">
              <Link to="/auth?mode=signup&role=citizen">
                <Compass className="mr-2 h-4 w-4" /> Explorar cultura
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Trabajas en una administración?{" "}
              <Link to="/auth?mode=signup&role=admin" className="text-accent underline hover:no-underline">
                Planificar cultura
              </Link>
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-elegant">
            <img
              src={heroImage}
              alt="Interior de un equipamiento cultural valenciano bañado por luz dorada"
              width={1600}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-4 shadow-warm md:block">
            <p className="text-xs text-muted-foreground">Equipamientos cargados</p>
            <p className="font-display text-3xl font-semibold text-accent">436</p>
            <p className="text-xs">museos, bibliotecas, teatros…</p>
          </div>
        </div>
      </section>

      {/* Explorar cultura — full width feature */}
      <section className="container py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-soft md:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="font-display text-3xl font-semibold">Explorar cultura</h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Encuentra el equipamiento cultural perfecto para ti. Filtros de confort reales
                que importan: accesibilidad, silencio, lockers, zonas infantiles y más.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex gap-3"><Map className="mt-0.5 h-4 w-4 text-accent" /> Mapa Discovery con isocronas</li>
                <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-accent" /> Recomendaciones que aprenden de ti</li>
                <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-accent" /> Datos reales del Ayuntamiento</li>
              </ul>
              <div className="mt-8">
                <Button asChild className="rounded-full">
                  <Link to="/auth?mode=signup&role=citizen">
                    <Compass className="mr-2 h-4 w-4" /> Empezar a explorar
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <img
                  src={heroImage}
                  alt="Equipamiento cultural en València"
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planificar cultura — compact secondary */}
      <section className="container py-8">
        <div className="rounded-2xl border border-primary/20 bg-gradient-earth p-6 text-primary-foreground shadow-elegant md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">Planificar cultura</h3>
              <p className="mt-1 max-w-lg text-sm text-primary-foreground/75">
                Herramientas para administraciones: detecta dónde la oferta no llega,
                visualiza patrones de demanda y obtén sugerencias de ubicación.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
            <Button asChild variant="secondary" className="rounded-full bg-accent-foreground text-primary hover:bg-accent-foreground/90">
              <Link to="/auth?mode=signup&role=admin">
                <Building2 className="mr-2 h-4 w-4" /> Acceder
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>
          Cultura a Medida (CAM) · Ámbito: <strong>València</strong> · Datos:{" "}
          <a href="https://opendata.vlci.valencia.es" target="_blank" rel="noopener noreferrer" className="underline">
            opendata.vlci.valencia.es
          </a>
        </p>
      </footer>
    </div>
  );
}
