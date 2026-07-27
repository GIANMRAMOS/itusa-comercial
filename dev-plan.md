# Micro-plan — Scaffold inicial Vue 3 + Vite + Supabase (ITUSA Comercial)

## Patrón arquitectónico detectado

Proyecto **nuevo** (greenfield). No hay código Vue previo del cual detectar un patrón —
solo existe `appscript/` como referencia histórica (Apps Script + DOM manual, NO tocar, NO copiar).
Se propone la estructura desde cero siguiendo el stack de referencia decidido:
**Vue 3 Composition API (`<script setup>`) + Vite + Pinia + vue-router + cliente Supabase directo (sin backend Node intermedio)**.

Patrón a seguir (capas):

- **`src/lib/`** — infraestructura sin estado: cliente Supabase singleton, funciones puras de métricas/analytics.
- **`src/composables/`** — lógica reutilizable con reactividad (fechas GMT-5, etc.).
- **`src/stores/`** — estado global Pinia (auth, leads). Los stores hablan con Supabase vía el singleton; NO calculan métricas inline (delegan a `lib/`).
- **`src/router/`** — rutas lazy + guard de autenticación.
- **`src/views/`** — una vista por ruta (Login, Dashboard, Gestión), delgadas, orquestan componentes.
- **`src/components/`** — presentacionales, agrupados por dominio (`dashboard/`, `gestion/`, `shared/`). Reciben props, emiten eventos; sin acceso directo a Supabase salvo vía store.

Regla clave de diseño derivada del legacy: **toda la lógica de KPIs/embudo/ranking/status/días se
extrae a funciones puras en `src/lib/leadMetrics.js`** (el legacy la tenía embebida en el DOM, imposible de testear).
Esto la hace unit-testeable sin Supabase.

### Mapeo legacy → schema Supabase (ya decidido, para referencia del builder)

| Legacy (Sheet/HEADER_MAP) | Columna `leads` |
|---|---|
| Source | source |
| Contact | contact |
| Company | company |
| Correo | email |
| Teléfono | phone |
| Creación | created_at (date) |
| Requerimiento | requerimiento |
| Active Campaign | active_campaign (boolean) |
| Seguimiento (inicial) | seguimiento_inicial |
| Contactado/Calificado/No Calificado/Visita/Propuesta/Conversión/Rechazo | *_at (date) |
| Factura | factura (numeric) |
| Review | review |
| Seguimientos (Script Properties) | tabla `seguimientos` (lead_id FK, fecha, texto) |

### Reglas de negocio a portar (desde `appscript/index.html`, idiomático en Vue/JS puro)

- **status(lead)**: `conversion_at` → `'convertido'`; si no, `rechazo_at` → `'rechazado'`; si no → `'proceso'`.
- **diasEnProceso(lead)**: `floor((fin - inicio)/día)`, inicio = `created_at`, fin = `conversion_at` o hoy(GMT-5).
- **KPIs**: total leads; calificados (count `calificado_at`); visitas (count `visita_at`); conversiones (count `conversion_at`); % conversión = conversiones/total·100; días promedio de conversión (promedio de diasEnProceso sobre convertidos); total facturado (sum `factura`); ticket promedio.
- **Embudo**: total → contactados → calificados → visitas → conversiones (cada paso % del total y % del paso anterior).
- **Ranking top fuentes**: conteo por `source`, top 6.
- **Evolución mensual**: conteo de leads por `YYYY-MM` de `created_at` (bar chart).
- **Últimos 30 días**: conteo por día de `created_at` en ventana de 30 días GMT-5 (line chart).
- **Últimos seguimientos**: seguimientos ordenados por fecha desc, con contacto/empresa del lead.
- **Gestión**: tabla ordenada por `created_at` desc; búsqueda por contact/company; fila expandible con historial de seguimientos.

## Desviación de arquitectura

- ¿Se necesita desviarse? **NO**.
- El scaffold encaja de forma natural en el stack de referencia decidido (Vue 3 + Vite + Pinia + Supabase directo). No introduce un patrón nuevo, no cambia el modelo de datos (el schema ya existe y está poblado en producción), no afecta a un módulo previo (no hay). **No dispara GATE 1.**
- Decisiones que conviene dejar registradas (NO son desviaciones, no requieren Architect, pero el builder debe respetarlas):
  1. **Librería de gráficos: `chart.js` + `vue-chartjs`.** El legacy ya usa Chart.js (bar de evolución, line de 30 días); mantenerlo minimiza reescritura conceptual. `vue-chartjs` da wrappers reactivos idiomáticos en lugar de instanciar/destruir `new Chart()` a mano.
  2. **Métricas en `lib/leadMetrics.js` (funciones puras), no en el store ni en componentes.** Habilita el plan de pruebas sin Supabase.
  3. **Guard de router basado en sesión Supabase** (ver abajo), no un flag manual.

## Archivos a crear/modificar

Todos **crear** (proyecto nuevo). Se marcan CHUNKS paralelizables (sin solapamiento entre sí).

### Chunk A — Configuración base del proyecto (bloqueante, va primero)
- `package.json` — deps: vue, vue-router, pinia, @supabase/supabase-js, chart.js, vue-chartjs; devDeps: vite, @vitejs/plugin-vue, vitest, @vue/test-utils, jsdom. Scripts: dev/build/preview/test.
- `vite.config.js` — plugin Vue, alias `@` → `src`, config test (vitest, environment jsdom).
- `index.html` — punto de entrada Vite (raíz), monta `#app`.
- `.env.example` — placeholders `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=`.
- `.gitignore` — `node_modules`, `dist`, `.env`, `.DS_Store` (NO ignorar `appscript/`).
- `src/main.js` — crea app, registra Pinia y router, monta.
- `src/App.vue` — shell mínimo: `<router-view>` + `<LoadingOverlay>` + `<ConfirmDialog>` globales.

### Chunk B — Infraestructura (depende de A; base para C, D, E)
- `src/lib/supabase.js` — cliente Supabase singleton desde env vars.
- `src/lib/leadMetrics.js` — funciones puras: `getStatus`, `getDaysInProcess`, `computeKPIs`, `computeFunnel`, `computeSourceRanking`, `computeMonthlyEvolution`, `computeLast30Days`, `flattenLatestSeguimientos`. (Testeable, sin Supabase.)
- `src/composables/useDateGMT5.js` — unificado: `getCurrentDateGMT5`, `parseDateGMT5`, `formatDateGMT5`, `getTodayGMT5`, `formatDateForDisplay`, `compareDatesGMT5`. (Reemplaza la duplicación backend/frontend del legacy.)

### Chunk C — Stores y router (depende de B)
- `src/stores/auth.js` — Pinia: `session`/`user`, `signIn(email,password)`, `signOut()`, `restoreSession()`, `onAuthStateChange`. Envuelve Supabase Auth.
- `src/stores/leads.js` — Pinia: `leads` (con sus seguimientos), `loading`, `error`; acciones `fetchLeads()` (join leads + seguimientos), `createLead()`, `updateLead()`, `deleteLead()` (cascade en DB), `addSeguimiento()`, `deleteSeguimiento()`. Getters derivados delegan a `lib/leadMetrics.js`.
- `src/router/index.js` — rutas lazy: `/login` (Login), `/dashboard` (Dashboard), `/gestion` (Gestion). Guard global `beforeEach`: si ruta requiere auth y no hay sesión Supabase → redirige a `/login`; si hay sesión y va a `/login` → redirige a `/dashboard`. Redirect raíz `/` → `/dashboard`.

### Chunk D — Vista Login (depende de C) — CHUNK independiente de E y F
- `src/views/LoginView.vue` — formulario email+password, llama `auth.signIn`, maneja error, redirige a `/dashboard`.

### Chunk E — Dashboard (depende de C) — cada bloque su propio componente
- `src/views/DashboardView.vue` — orquesta; en `onMounted` dispara `leads.fetchLeads()`; pasa datos derivados a los hijos.
- `src/components/dashboard/KpiCards.vue` — 7 KPIs (total, calificados, visitas, conversiones, % conversión, días promedio, total facturado).
- `src/components/dashboard/ConversionFunnel.vue` — embudo (contactados→calificados→visitas→conversiones).
- `src/components/dashboard/MonthlyEvolutionChart.vue` — bar chart mensual (vue-chartjs).
- `src/components/dashboard/Last30DaysChart.vue` — line chart últimos 30 días (vue-chartjs).
- `src/components/dashboard/TopSourcesRanking.vue` — ranking top fuentes.
- `src/components/dashboard/LatestSeguimientos.vue` — lista de últimos seguimientos.

### Chunk F — Gestión (depende de C) — CHUNK independiente de E
- `src/views/GestionView.vue` — orquesta tabla + modales + botón flotante; usa `leads` store.
- `src/components/gestion/LeadsTable.vue` — tabla con búsqueda (contact/company), orden por fecha desc, fila expandible.
- `src/components/gestion/LeadRow.vue` — fila + fila expandible con historial de seguimientos (opcional; puede vivir dentro de LeadsTable si se prefiere menos granularidad).
- `src/components/gestion/LeadFormModal.vue` — modal alta/edición de lead (todos los campos del schema).
- `src/components/gestion/SeguimientosModal.vue` — modal ver/agregar/eliminar seguimientos de un lead.
- `src/components/gestion/AddLeadButton.vue` — botón flotante (FAB) para alta.

### Chunk G — Compartidos (depende de A; usados por App.vue) — CHUNK independiente
- `src/components/shared/LoadingOverlay.vue` — overlay de carga global (reemplaza spinners ad-hoc del legacy).
- `src/components/shared/ConfirmDialog.vue` — diálogo de confirmación (reemplaza `alert()`/`confirm()` nativos del legacy).

**Paralelización posible:** una vez cerrados A→B→C, los chunks **D, E, F, G** no se solapan y pueden construirse en paralelo. G puede empezar junto con A/B (solo son componentes presentacionales).

### Fuera de alcance (NO crear)
- UI para `prospectos` / `notas_prospeccion` (existen en DB pero fuera de alcance).
- Roles/permisos granulares (2-5 usuarios, misma policy `authenticated_full_access`).
- i18n, tests e2e, filtros avanzados de fecha/fuente/status del legacy salvo lo pedido (búsqueda). *Sugerencia aparte, no en este plan: los filtros por fuente/rango de fecha/status del dashboard legacy podrían reintroducirse en una iteración posterior.*

## Plan de pruebas

### Verificable en esta sesión (sin credenciales reales de Supabase)

**Compilation gate:** `npm run build` debe pasar (único gate funcional verificable).

**Unitarias con Vitest — funciones puras (`src/lib/leadMetrics.js`):**
- Camino feliz KPIs: dado un array de leads mock (mezcla de convertidos/calificados/visitas/facturados), `computeKPIs` retorna totales, % conversión y total facturado correctos.
- `getStatus`: convertido (con `conversion_at`), rechazado (con `rechazo_at` sin conversión), proceso (sin ninguno). Precedencia conversión > rechazo.
- `getDaysInProcess`: convertido usa `conversion_at`; no convertido usa hoy; sin `created_at` → 0.
- `computeFunnel`: porcentajes del total y del paso anterior; **borde: total = 0 → sin división por cero (0%).**
- `computeSourceRanking`: agrupa y ordena top 6; **borde: fuentes vacías/null se ignoran.**
- `computeMonthlyEvolution` / `computeLast30Days`: agrupación correcta; **borde: array vacío → estructura vacía sin throw.**

**Unitarias — `src/composables/useDateGMT5.js`:**
- `parseDateGMT5('YYYY-MM-DD')` produce el día correcto sin corrimiento de zona.
- `formatDateGMT5` round-trip. Borde: null/'' → `''`/null sin throw.

**Unitarias — stores (mockeando el cliente Supabase):**
- `stores/leads`: mock de `src/lib/supabase.js`; `fetchLeads` puebla `leads` con respuesta simulada; `createLead`/`updateLead`/`deleteLead` invocan el método correcto del mock y actualizan estado; **borde: error de Supabase setea `error` y no rompe el estado.**
- `stores/auth`: `signIn` con mock que resuelve setea sesión; **borde: credenciales inválidas (mock rechaza) setea error, no sesión.**

**Componentes presentacionales (@vue/test-utils, jsdom) — opcional/ligero:**
- `KpiCards` renderiza los valores recibidos por props.
- `ConfirmDialog` emite `confirm`/`cancel`.

### NO verificable en esta fase (dejar constancia)
- Conexión real a Supabase, correctitud de las queries contra el schema real y RLS/policy `authenticated_full_access` — no hay credenciales; requiere `.env` real + verificación manual del usuario.
- Login real contra Supabase Auth.
- Render real de Chart.js (canvas no disponible en jsdom sin stub) — solo se testea la transformación de datos que alimenta los charts, no el pintado.
- Comportamiento funcional end-to-end (guard de router redirigiendo con sesión real, cascade de borrado en DB).

### Criterios de aceptación (HU)
No se recibieron HU con escenarios Gherkin del ProductOwner para esta tarea. Si llegan, cada
escenario se mapea 1:1 a un caso de prueba adicional. **Falta de contexto declarada, no asumida.**
