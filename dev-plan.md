# Micro-plan — Épica "Archivado de leads" (HU-1 + HU-2)

## Patrón arquitectónico detectado

Confirmado leyendo el código, no asumido:

- **Vistas = smart components**: `GestionView.vue` y `DashboardView.vue` instancian `useLeadsStore()`,
  disparan el fetch en `onMounted`, y leen `leadsStore.leads` / getters. Los componentes hijos
  (`LeadsTable`, componentes de dashboard) son presentacionales: reciben datos por props y emiten
  intención hacia arriba. `LeadsTable` no conoce el store.
- **Store Pinia único** (`src/stores/leads.js`): un solo `state.leads` alimenta HOY tanto Gestión como
  Dashboard (Dashboard deriva KPIs/embudo/etc. vía getters que delegan a `leadMetrics.js`). Acciones con
  patrón uniforme: `this.error = null` → `try/catch` → chequeo de `error` de Supabase → mutación del
  array en memoria → `return { success, error }`. `fetchLeads` usa `.select('*, seguimientos(*)').order(...)`.
- **`createLead`**: hace `insert(datosLead).select('*, seguimientos(*)').single()` y `unshift` al estado.
  El payload lo arma `LeadFormModal.construirPayload()` y NO incluye `archivado` — o sea, el valor por
  defecto tiene que venir del DEFAULT de la columna en la DB (ver migración).
- **Router**: rutas planas con `meta.requiresAuth`, componentes lazy (`() => import(...)`), guard global
  por sesión de Supabase.
- **Nav (`App.vue`)**: una sola `<nav>` con `<router-link>` a `/dashboard` y `/gestion`; CSS la muestra
  como bottom-nav en móvil y sidebar fijo en ≥900px. Un link nuevo sirve para ambos con solo agregar el
  `<router-link>`.
- **Iconos**: SVG inline monolínea `viewBox="0 0 20 20"`, `stroke="currentColor"`, `fill="none"`,
  `stroke-width="1.75"`, `stroke-linecap/linejoin="round"`; botón con `aria-label` no vacío y área táctil
  `min-width/height: 44px` (clase `.leads-table__boton-icono`).
- **Tests**: Vitest + `@vue/test-utils` (`mount`, props, `find`, `trigger`, `emitted()`); el store se
  testea mockeando `@/lib/supabase` y encadenando `vi.fn()` que imitan el builder de queries
  (`select → order`, `update → eq`, etc.). jsdom no evalúa media queries.

El plan encaja en este patrón: props-abajo/eventos-arriba para la tabla, acciones Pinia con el mismo
contrato `{success, error}`, vista nueva como smart component espejo de `GestionView`.

## Desviación de arquitectura

- ¿Se necesita desviarse? **SÍ — desviación estructural leve. Recomiendo confirmación GATE 1.**
- Qué se desvía y por qué el patrón actual no alcanza tal cual:
  1. **Cambia el modelo de datos**: nueva columna `archivado` en la tabla `leads` (migración SQL). Es un
     trigger clásico de GATE 1, aunque sea aditivo y ya confirmado por negocio.
  2. **Cambia la semántica de un fetch compartido que alimenta >1 módulo**: `fetchLeads()` pasa a traer
     SOLO `archivado=false`, lo que afecta a Gestión **y** a Dashboard (KPIs, embudo, evolución, ranking).
     Es un cambio de comportamiento cross-módulo, ya confirmado con Gianmarco pero que conviene sellar.
  3. **Introduce un sub-patrón nuevo en el store**: el store deja de ser "un solo `leads`" y pasa a
     mantener DOS colecciones (`leads` = activos, `leadsArchivados` = archivados) con fetches separados,
     tal como pide HU-2 ("fetch separado del state principal"). Sigue las mismas convenciones de las
     acciones existentes, pero es una extensión de forma del store.
  4. **Dependencia de orden dura**: el código que filtra `.eq('archivado', false)` **rompe en runtime**
     si la columna no existe todavía. La migración TIENE que correrse en Supabase ANTES de mergear/deploy.
- Por qué es leve y de bajo riesgo: no introduce librería nueva ni cambia el flujo de datos general;
  reutiliza el patrón props/eventos y el patrón de acciones `{success,error}`. Las decisiones de negocio
  ya están tomadas. El GATE 1 aquí es un **sign-off técnico** sobre (a) el approach de doble colección en
  un mismo store vs. store separado, y (b) la secuencia migración-primero — no una pregunta de negocio.
- La parametrización de `LeadsTable` (props nuevas con defaults retrocompatibles + 2 emits nuevos) es
  **aditiva y no rompe consumidores**, por lo que por sí sola **NO** dispara GATE 1.

## Migración SQL (entregar a Gianmarco — correr en el editor SQL de Supabase ANTES del código)

```sql
-- Agrega el flag de archivado a la tabla leads.
-- NOT NULL + DEFAULT false: las filas existentes quedan en false, y todo lead nuevo
-- nace en false sin que el código tenga que enviarlo explícitamente (lo cubre createLead).
ALTER TABLE public.leads
  ADD COLUMN archivado boolean NOT NULL DEFAULT false;

-- Opcional (recomendado si la tabla crece): índice para acelerar el filtrado por archivado.
CREATE INDEX IF NOT EXISTS idx_leads_archivado ON public.leads (archivado);
```

Notas:
- El `DEFAULT false` sobre las filas ya existentes las deja como no archivadas (comportamiento deseado:
  nada desaparece de Gestión/Dashboard tras la migración).
- No hace falta tocar `createLead`: el DEFAULT de la DB cubre el criterio "lead nuevo con archivado=false".

## Archivos a crear/modificar

Contrato congelado primero (para poder paralelizar chunks sin colisión de nombres):

**LeadsTable — props nuevas (aditivas, defaults preservan Gestión actual) + emits nuevos**
- Props: `leads` (existente) + `mostrarEditar: Boolean = true`, `mostrarEliminar: Boolean = true`,
  `mostrarArchivar: Boolean = false`, `mostrarReactivar: Boolean = false`,
  `permitirAgregarSeguimiento: Boolean = true`.
- Emits: `editar-lead`, `eliminar-lead`, `abrir-seguimientos` (existentes) + `archivar-lead`,
  `reactivar-lead` (nuevos). Todos emiten el objeto `lead` completo.

**Store — contrato congelado**
- `state.leadsArchivados: []` (nuevo).
- `fetchLeads()` → agrega `.eq('archivado', false)` (cadena `select → eq → order`).
- `fetchLeadsArchivados()` (nuevo) → `from('leads').select('*, seguimientos(*)').eq('archivado', true).order('created_at', {ascending:false})`, puebla `state.leadsArchivados`; mismo manejo de error.
- `archivarLead(leadId)` (nuevo) → `from('leads').update({ archivado: true }).eq('id', leadId)`; si OK, quita el lead de `state.leads`; `return {success, error}`. Sin `.select()` (patrón `deleteLead`).
- `reactivarLead(leadId)` (nuevo) → `update({ archivado: false }).eq('id', leadId)`; si OK, quita el lead de `state.leadsArchivados`; `return {success, error}`.
- Nota de consistencia: no hace falta mover el item entre arrays en memoria; cada vista hace su fetch en
  `onMounted` al navegar, así que "reaparece en la otra lista" queda cubierto por la navegación SPA.

Archivos:

- **`src/stores/leads.js`** — modificar — aplicar el contrato de store de arriba (filtro en `fetchLeads`,
  `state.leadsArchivados`, `fetchLeadsArchivados`, `archivarLead`, `reactivarLead`). *[Chunk A — base]*

- **`src/components/gestion/LeadsTable.vue`** — modificar (reutilizar, NO duplicar). Justificación:
  la UX pide "exactamente igual a Gestión" con diferencias puntuales → parametrizar es lo correcto y
  mantiene una sola fuente de verdad para tabla/buscador/responsive/timeline. Cambios:
  - Declarar props/emits nuevos del contrato.
  - Columna Acciones: envolver cada botón en `v-if` — Editar (`v-if="mostrarEditar"`),
    Archivar (`v-if="mostrarArchivar"`, nuevo, emite `archivar-lead`), Eliminar (`v-if="mostrarEliminar"`),
    Reactivar (`v-if="mostrarReactivar"`, nuevo, emite `reactivar-lead`).
  - Icono **Archivar**: SVG monolínea de caja/archivo (p.ej. tapa horizontal + cuerpo + tirador), no emoji.
    `aria-label="Archivar lead de ${lead.contact || 'este lead'}"`.
  - Icono **Reactivar**: SVG monolínea de flecha circular / restaurar.
    `aria-label="Reactivar lead de ${lead.contact || 'este lead'}"`.
  - Panel expandido: envolver el botón "Agregar seguimiento" en `v-if="permitirAgregarSeguimiento"`.
    El historial (`<h3>`, contador, `<ul>` timeline) se mantiene SIEMPRE visible.
  - Defaults elegidos para que montar `LeadsTable` sin props nuevas siga dando Editar+Eliminar (2 botones)
    y el botón de agregar seguimiento → los 7 tests actuales quedan verdes sin tocarlos. *[Chunk B]*

- **`src/views/GestionView.vue`** — modificar — pasar `:mostrar-archivar="true"` a `LeadsTable` y
  escuchar `@archivar-lead="archivarLead"`. Handler nuevo `archivarLead(lead)` que llama
  `leadsStore.archivarLead(lead.id)` (directo, sin ConfirmDialog: el Gherkin no pide confirmación y la
  acción es reversible). El resto (alta/edición/eliminar/seguimientos) sin cambios. *[Chunk D]*

- **`src/views/ArchivadosView.vue`** — crear — smart component espejo de `GestionView`, minimalista:
  - `onMounted(() => leadsStore.fetchLeadsArchivados())`.
  - Header con `<h1>` "Leads Archivados" (el título vive en la vista, no en la tabla) + `LoadingOverlay` +
    error del store, igual que `GestionView`.
  - `<LeadsTable :leads="leadsStore.leadsArchivados" :mostrar-editar="false" :mostrar-eliminar="false"
    :mostrar-archivar="false" :mostrar-reactivar="true" :permitir-agregar-seguimiento="false"
    @reactivar-lead="reactivarLead" />`.
  - Handler `reactivarLead(lead)` → `leadsStore.reactivarLead(lead.id)`.
  - SIN `AddLeadButton`, `LeadFormModal`, `SeguimientosModal`, `ConfirmDialog`. *[Chunk D]*

- **`src/router/index.js`** — modificar — agregar ruta:
  `{ path: '/archivados', name: 'archivados', component: () => import('@/views/ArchivadosView.vue'), meta: { requiresAuth: true } }`. *[Chunk C]*

- **`src/App.vue`** — modificar — agregar `<router-link to="/archivados">Archivados</router-link>` en la
  `<nav>`, junto a Dashboard/Gestión (sirve para sidebar desktop y bottom-nav móvil por el CSS existente).
  *[Chunk C]*

**Chunks paralelizables** (archivos que no se solapan; con el contrato de arriba congelado):
- Chunk A: `stores/leads.js`.
- Chunk B: `components/gestion/LeadsTable.vue`.
- Chunk C: `router/index.js` + `App.vue`.
- Chunk D: `views/ArchivadosView.vue` + `views/GestionView.vue` (depende de que A y B expongan los nombres
  del contrato, pero no comparte archivos con ellos).

## Plan de pruebas

### Cubrible con Vitest

**Store — `src/stores/__tests__/leads.test.js`** (mockeando `@/lib/supabase`):
- `fetchLeads`: la cadena ahora es `select → eq → order`; assert `eq` invocado con `('archivado', false)`
  y que puebla `state.leads`. **Ajustar los 2 tests existentes de `fetchLeads`** (hoy mockean `select → order`
  sin `eq`) para intercalar el `eq`.
- `fetchLeadsArchivados` (nuevo): camino feliz puebla `state.leadsArchivados`; assert `from('leads')` +
  `eq('archivado', true)`. Borde: error de Supabase → `state.error` seteado, `leadsArchivados` intacto.
- `archivarLead` (nuevo): assert `update({ archivado: true })` + `eq('id', id)`; quita el lead de
  `state.leads`; retorna `{success:true}`. Borde: error → `state.leads` intacto, `{success:false, error}`.
- `reactivarLead` (nuevo): assert `update({ archivado: false })` + `eq('id', id)`; quita el lead de
  `state.leadsArchivados`; retorna `{success:true}`. Borde: error → estado intacto, `{success:false}`.

**LeadsTable — `src/components/gestion/__tests__/LeadsTable.test.js`**:
- Regresión: con props por defecto, Acciones tiene exactamente Editar+Eliminar (2 botones), sin
  Archivar/Reactivar; los 7 tests actuales siguen verdes.
- `mostrarArchivar=true`: existe el botón Archivar con `aria-label` no vacío que contiene "Archivar" y el
  contacto; click emite `archivar-lead` con `[0][0] === lead`.
- `mostrarReactivar=true, mostrarEditar=false, mostrarEliminar=false`: Acciones tiene SOLO Reactivar;
  Editar/Eliminar ausentes; `aria-label` no vacío contiene "Reactivar"; click emite `reactivar-lead` con el lead.
- `permitirAgregarSeguimiento=false`: al expandir, el historial (título, contador, `<ul>`) renderiza, pero
  el botón "Agregar seguimiento" NO existe (`find(...).exists() === false`) y no puede emitir
  `abrir-seguimientos`.
- `permitirAgregarSeguimiento=true` (default): el botón "Agregar seguimiento" existe (test actual sigue válido).

**App / Nav — `src/__tests__/App.test.js`**:
- Con sesión, los `href` de la nav incluyen `/dashboard`, `/gestion` y `/archivados`.
- Sin sesión, sigue sin renderizar la nav (`findAll('a')` length 0) — regresión.

**ArchivadosView (opcional, `src/views/__tests__/ArchivadosView.test.js`)**:
- Monta con store mock/stub: renderiza `<h1>` "Leads Archivados", llama `fetchLeadsArchivados` en
  `onMounted`, y pasa a `LeadsTable` las props correctas (`mostrar-reactivar=true`,
  `permitir-agregar-seguimiento=false`, `mostrar-editar=false`, `mostrar-eliminar=false`).

### Criterios de aceptación (HU) mapeados a casos
- HU-1 "lead nuevo con archivado=false por defecto": **NO** unit-testeable (lo cubre el DEFAULT de la DB) →
  verificación manual tras la migración.
- HU-1 "Gestión excluye archivado=true": cubierto por el test de `fetchLeads` (`eq('archivado', false)`);
  el excluir real de datos → verificación manual.
- HU-1 "click Archivar → archivado=true y desaparece": test de emit en LeadsTable + test de `archivarLead`
  (quita de `state.leads`).
- HU-2 "opción Archivados en el menú": test de nav en App.test.js.
- HU-2 "vista título 'Leads Archivados', SOLO archivado=true, fetch separado": test de ArchivadosView +
  `fetchLeadsArchivados` (`eq('archivado', true)`).
- HU-2 "mismo buscador": se hereda de `LeadsTable` sin cambios (el buscador interno ya existe) → cubierto
  por reutilización; verificación manual del comportamiento en la vista.
- HU-2 "solo botón Reactivar, sin Editar/Eliminar": test de LeadsTable con las props de Archivados.
- HU-2 "click Reactivar → archivado=false y desaparece de Archivados": test de emit + `reactivarLead`.
- HU-2 "panel de historial sin botón de agregar seguimiento pero con historial": test de
  `permitirAgregarSeguimiento=false`.

### Solo verificable manualmente (fuera de Vitest)
- Correr la migración SQL en Supabase y que la columna quede con el default correcto.
- El fetch real devolviendo solo `archivado=false` / `archivado=true`.
- Que el Dashboard (KPIs/embudo/evolución/ranking) efectivamente excluya archivados con datos reales.
- Navegación real entre Dashboard/Gestión/Archivados y el refetch en `onMounted` al cambiar de vista.
- Apariencia de los iconos nuevos (Archivar/Reactivar) y su render en móvil (tarjetas <640px).

## Sugerencias fuera de alcance (NO implementar aquí)
- Si a futuro se quiere consistencia en memoria sin refetch al navegar, `archivarLead`/`reactivarLead`
  podrían mover el item entre `leads` y `leadsArchivados`. Innecesario ahora (el `onMounted` de cada vista
  lo resuelve) y agregaría complejidad al store.
- Confirmación previa (`ConfirmDialog`) antes de Archivar/Reactivar: el Gherkin no lo pide y son acciones
  reversibles; se deja directo.
