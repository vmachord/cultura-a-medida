
# Cultura a Medida (CAM) — Plan del MVP

App web que conecta los **Retos 5 y 6** del hackathon en una única solución para el ámbito de **Valencia**: recomendaciones culturales personalizadas para ciudadanos y panel de planificación territorial para administraciones.

## 🎨 Dirección de diseño

- **Paleta mediterránea**: verde oliva profundo `#1a3c2a` (primario), terracota `#c4654a` (acento cálido), arena `#e8a87c` (suave), crema `#f5f0e8` (fondo). Sensación cultural, valenciana, terrosa.
- **Tipografía**: Space Grotesk para titulares (carácter moderno y geométrico), DM Sans para cuerpo (legible, neutra).
- **Estilo**: superficies tipo papel, bordes redondeados moderados, sombras suaves; mapas con tiles claros para no competir con la UI; iconos Lucide finos.
- **Motivo recurrente**: tarjetas de equipamiento con foto + chips de "confort" (acústica, accesibilidad, lockers, familias…), badges de tipología en color terracota.

## 👥 Dos perfiles de usuario (login separado)

Al registrarse, el usuario elige rol:

1. **Ciudadano** → entra a la experiencia "Discovery"
2. **Administración** → entra al panel de planificación territorial

Auth por email + contraseña + Google. Datos de perfil (intereses, tipo de visitante, historial de interacciones) almacenados de forma segura, con permisos por rol.

## 👤 Lado Ciudadano — "Deep Experience" (Reto 5)

### Onboarding inteligente
Al primer login, mini-cuestionario para clasificar el perfil dinámico:
- **Familia con niños** (zonas descanso, baja sensibilidad acústica)
- **Investigador/Estudiante** (silencio, bibliografía)
- **Turista ocasional**
- **Público local recurrente**
- Intereses culturales (arte, música, teatro, ciencia, historia, lectura…)

### Pantalla principal: Mapa "Discovery"
- Mapa de Valencia (Leaflet + OpenStreetMap) con todos los equipamientos culturales reales del portal de datos abiertos.
- Marcadores diferenciados por tipología (museo, biblioteca, teatro, centro cultural…).
- **Filtro de cercanía/tiempo** (proxy de isocronas): radios de 10/20/30 min andando o transporte público.
- Filtros de **confort**: accesibilidad ♿, zona infantil 👶, lockers 🎒, silencio 🤫, climatización ❄️.
- Capa de "contexto dinámico": hora del día y clima influyen en sugerencias (ej: museos cubiertos cuando llueve).

### Sección "Para ti"
- Carrusel horizontal de **recomendaciones personalizadas** según perfil + comportamiento (visitas, favoritos, búsquedas).
- Tarjetas con foto, tipología, distancia, valoración de confort y por qué se recomienda ("Bueno para familias", "Silencioso").
- Sistema de **favoritos** y **"ya he ido"** que retroalimenta el algoritmo.

### Detalle de equipamiento
- Foto, descripción, dirección, horarios (cuando estén disponibles en el dataset).
- **Indicadores de confort** valorados por la comunidad (acústica, atención del personal, accesibilidad…).
- Botón "Cómo llegar" → enlace a navegación.
- "Planes similares cerca" para fomentar exploración.

### Mi perfil
- Visitas registradas, favoritos, intereses editables, evolución del perfil dinámico.

## 🏛️ Lado Administración — Planificación territorial (Reto 6)

Panel separado con visión estratégica basada en datos agregados y anonimizados de los ciudadanos.

### Dashboard principal
- KPIs: nº equipamientos, nº usuarios activos, búsquedas totales por tipología, zonas con mayor demanda no satisfecha.
- Gráficos de tendencias (Recharts): demanda por tipología, evolución temporal, perfiles más activos.

### Mapa de calor de demanda
- Mapa de Valencia con **heatmap** de búsquedas e interacciones agregadas por barrio/distrito.
- Capa superpuesta con equipamientos existentes para visualizar cobertura.
- Filtro por tipología (¿dónde se buscan actividades infantiles? ¿bibliotecas?).

### Detección de demanda no cubierta
- **Algoritmo de gap analysis**: zonas con alta demanda + baja oferta = oportunidades.
- Lista priorizada de "zonas calientes" con justificación: nº búsquedas, perfil predominante, equipamientos existentes y por qué no cubren la necesidad.

### Recomendador de ubicación
- Para cada zona detectada, el sistema sugiere:
  - **Tipología recomendada** (biblioteca, espacio infantil, sala polivalente…).
  - **Ubicación óptima** (punto en mapa basado en centroide ponderado por demanda y población isocrónica).
  - **Justificación**: quién se beneficiaría, impacto estimado, equipamientos competidores.
- Posibilidad de exportar el informe en PDF para llevarlo a comisiones.

### Patrones por zona y perfil
- Tabla cruzada: distrito × perfil × tipología más demandada.
- Útil para entender qué necesita cada barrio.

## 📊 Datos

- **Equipamientos culturales reales** del portal de datos abiertos del Ayuntamiento de Valencia (`valencia.opendatasoft.com`), dataset de equipamientos municipales filtrado por categoría cultural (museos, bibliotecas, centros culturales, teatros, salas de exposición). Sin necesidad de API key.
- **Comportamiento de usuarios** (búsquedas, favoritos, visitas marcadas) almacenado en la base de datos del proyecto, con anonimización para el panel administrativo.
- **Datos de Valencia divididos por barrios/distritos** para el análisis territorial (geometrías oficiales del mismo portal).

## 🗺️ Estructura de páginas

**Públicas**
- `/` — landing con explicación del proyecto y CTAs (Soy ciudadano / Soy institución)
- `/auth` — login/registro con elección de rol

**Ciudadano** (`/app/...`)
- `/app/discover` — mapa principal con filtros
- `/app/for-you` — recomendaciones personalizadas
- `/app/place/:id` — detalle equipamiento
- `/app/profile` — perfil y favoritos

**Admin** (`/admin/...`)
- `/admin` — dashboard con KPIs
- `/admin/heatmap` — mapa de calor de demanda
- `/admin/gaps` — demanda no cubierta y recomendaciones de ubicación
- `/admin/insights` — patrones por zona/perfil

## 🚀 Enfoque de construcción

Construiré el MVP en una primera iteración completa: backend con tablas (perfiles, roles, equipamientos cacheados, interacciones), sincronización inicial con la API de datos abiertos de Valencia, las dos experiencias (ciudadano + admin) con sus mapas y, como semilla del lado admin, generaré algunos datos de interacción simulados realistas para que el panel territorial muestre insights desde el primer momento (a medida que haya usuarios reales, los datos sintéticos se diluirán).

Después podremos iterar afinando el algoritmo de recomendación, añadiendo isocronas reales (vía OpenRouteService si más adelante quieres una API key gratuita), valoraciones comunitarias de confort, exportación de informes PDF, etc.
