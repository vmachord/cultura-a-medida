import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Compass, Map, Sparkles, Building2, BarChart3, Lightbulb, ArrowRight, MapPin,
} from "lucide-react";
import heroImage from "@/assets/hero-cultura.jpg";

export default function Landing() {
  const { user, role } = useAuth();
  const myArea = user ? (role === "admin" ? "/admin" : "/app/discover") : "/auth";

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
            <Sparkles className="h-3 w-3" /> Cátedra Espacios · Hackathon
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
            La cultura de València, <span className="text-accent">a tu medida</span>.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Un sistema inteligente que recomienda equipamientos culturales según tu perfil
            y, a la vez, ayuda a las administraciones a planificar dónde crear los próximos.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/auth?mode=signup&role=citizen">
                <Compass className="mr-2 h-4 w-4" /> Soy ciudadano
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-primary/20">
              <Link to="/auth?mode=signup&role=admin">
                <Building2 className="mr-2 h-4 w-4" /> Soy administración
              </Link>
            </Button>
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

      {/* Two paths */}
      <section className="container grid gap-6 py-16 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Compass className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Para ciudadanos</h2>
          <p className="mt-2 text-muted-foreground">
            Descubre equipamientos culturales adaptados a tu perfil — familia, investigador,
            turista o local — con filtros de confort reales: accesibilidad, silencio, lockers, zonas
            infantiles.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3"><Map className="mt-0.5 h-4 w-4 text-accent" /> Mapa Discovery con isocronas</li>
            <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-accent" /> Recomendaciones que aprenden de ti</li>
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-accent" /> Datos reales del Ayuntamiento</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-gradient-earth p-8 text-primary-foreground shadow-elegant">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Para administraciones</h2>
          <p className="mt-2 text-primary-foreground/75">
            Detecta dónde la oferta cultural no llega. Ve los patrones de demanda de la ciudadanía
            y obtén sugerencias justificadas sobre qué tipo de equipamiento crear y dónde ubicarlo.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-primary-foreground/85">
            <li className="flex gap-3"><BarChart3 className="mt-0.5 h-4 w-4 text-accent" /> Mapa de calor de demanda</li>
            <li className="flex gap-3"><Lightbulb className="mt-0.5 h-4 w-4 text-accent" /> Recomendador de ubicación</li>
            <li className="flex gap-3"><BarChart3 className="mt-0.5 h-4 w-4 text-accent" /> Patrones por distrito y perfil</li>
          </ul>
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>
          Cultura a Medida (CAM) · Retos 5 + 6 · Ámbito: <strong>València</strong> · Datos:{" "}
          <a href="https://opendata.vlci.valencia.es" target="_blank" rel="noopener noreferrer" className="underline">
            opendata.vlci.valencia.es
          </a>
        </p>
      </footer>
    </div>
  );
}
