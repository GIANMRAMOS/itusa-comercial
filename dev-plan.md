# Micro-plan — Filtro de meses en el Embudo de Conversión

## Patrón arquitectónico detectado

- **Capas**: los cálculos de negocio viven como **funciones puras** en `src/lib/leadMetrics.js` (sin acoplamiento a Supabase ni a Vue). El store Pinia (`src/stores/leads.js`) solo mantiene `leads` crudos + estado, y **delega cada métrica a un getter que llama a una función pura** (`funnel: (state) => computeFunnel(state.leads)`). `DashboardView.vue` es el contenedor que cablea getters del store a props de componentes de presentación.
- **Fechas**: todo lo temporal pasa por `src/composables/useDateGMT5.js`. "Hoy" = `getCurrentDateGMT5()` (nunca `new Date()` suelto). El patrón para lógica dependiente de hoy ya está en `computeLast30Days`, que llama a `getCurrentDateGMT5()` **internamente** y los tests lo hacen determinista con `vi.setSystemTime` / mock del composable.
- **Clave de mes**: el formato canónico `YYYY-MM` ya existe en `computeMonthlyEvolution`, derivado como `lead.created_at.substring(0, 7)`. Se reusa ese mismo mecanismo, no se inventa otro.
- **Precedente directo en esta sesión**: `LatestSeguimientos.vue` ya dejó de ser 100% presentacional: recibe datos crudos (`seguimientos`) y filtra internamente por rango de fecha con un `<select v-model>` de presets, un `ref` para la selección y un `computed` que aplica el filtro. Este plan replica exactamente ese patrón (select + ref + computed que llama a una función pura existente sobre el subconjunto filtrado).

## Desviación de arquitectura

- **¿Se necesita desviarse? NO.**
- El cambio **no introduce un patrón nuevo**: es una extensión consistente del patrón "componente recibe datos crudos y computa su métrica filtrada internamente con una función pura existente", ya autorizado y **ya aplicado a `LatestSeguimientos.vue`** en esta misma sesión. No cambia el modelo de datos (misma tabla `leads`, mismo `created_at`, misma clave `YYYY-MM`). No cambia el contrato de Supabase.
- **¿Dispara GATE 1? NO** — pero no lo minimizo: no es un cambio de un solo archivo, es un cambio **coordinado sobre 4 archivos de producción** que deben ir juntos porque rompen un contrato de prop y dejan un getter huérfano. La razón por la que NO es GATE 1: (a) la decisión de arquitectura ya fue autorizada por el orquestador; (b) el patrón ya está establecido en el codebase (precedente `LatestSeguimientos`), o sea es "seguir el patrón", no "desviarse de él"; (c) no toca el modelo de datos. Si este precedente **no** existiera, un cambio de contrato de props + getter huérfano sí lo evaluaría como estructural y dispararía GATE 1. Queda registrado explícitamente para revisión.

### Impacto exacto confirmado

1. **Prop de `ConversionFunnel.vue`**: hoy es `funnel: Array` (funnel ya calculado). Pasa a ser `leads: Array` (leads crudos). El componente computa el funnel filtrado internamente. **Es un breaking change del contrato de props** de este componente.
2. **Lo que pasa `DashboardView.vue`**: hoy `:funnel="leadsStore.funnel"`. Pasa a `:leads="leadsStore.leads"`.
3. **Getter `funnel` del store**: confirmado por grep que su **único** consumidor es `DashboardView.vue:29`. No lo usa ningún otro componente ni test (el store test no lo referencia). Tras el cambio queda **huérfano**. Decisión: **eliminar el getter `funnel` de `src/stores/leads.js`** y quitar `computeFunnel` de su import (que solo se usa en ese getter). `computeFunnel` **permanece** exportado en `leadMetrics.js` porque ahora lo consume el componente y sigue cubierto por su test unitario. No dejar el getter muerto.
4. **Helpers puros nuevos en `leadMetrics.js`**: SÍ hacen falta dos, para no meter cálculo en el `.vue`:
   - `getRecentMonthOptions()` — genera las 3 claves/etiquetas de mes relativas a hoy.
   - `filterLeadsByMonthKeys(leads, claves)` — filtra leads por una o varias claves `YYYY-MM`. Un solo helper cubre tanto "mes específico" (un elemento) como "Todos" (los 3), reusando `substring(0, 7)` igual que `computeMonthlyEvolution`.

## Archivos a crear/modificar

> Los 4 archivos de producción están **acoplados y NO se paralelizan entre sí** (contrato de prop + getter). El chunk de helpers en `leadMetrics.js` SÍ puede construirse y testearse primero de forma independiente antes de tocar el componente.

- `src/lib/leadMetrics.js` — **modificar** — agregar dos funciones puras exportadas (sin tocar las existentes):
  - `getRecentMonthOptions()`: usa `getCurrentDateGMT5()` internamente (mismo patrón que `computeLast30Days`; queda determinista bajo `vi.setSystemTime`). Devuelve **3 opciones** = mes actual + los 2 meses anteriores, ordenadas **más reciente primero**. Forma: `[{ clave: 'YYYY-MM', etiqueta: 'Julio 2026' }, ...]`.
    - Construir cada mes como `new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)` para `i = 0,1,2`. **Usar día 1 fijo**: evita el bug de overflow (ej. hoy 31/03 → restar un mes no debe saltear febrero) y JS normaliza el cruce de año (`mes - i` negativo → año anterior).
    - `clave` = `` `${año}-${String(mes+1).padStart(2,'0')}` `` (mismo formato que `created_at.substring(0,7)`).
    - `etiqueta` = nombre de mes en español capitalizado + año, con un array local de nombres `['Enero', ..., 'Diciembre']`.
  - `filterLeadsByMonthKeys(leads = [], claves = [])`: devuelve los leads cuyo `lead.created_at?.substring(0, 7)` está incluido en `claves`. Aceptar `claves` como array (normalizar a `Set` internamente). Excluir leads sin `created_at`. Si `claves` viene vacío → devolver `[]`.

- `src/components/dashboard/ConversionFunnel.vue` — **modificar** — cambiar prop `funnel` → `leads: { type: Array, required: true }`; importar `computeFunnel`, `getRecentMonthOptions`, `filterLeadsByMonthKeys` y `ref`/`computed` de vue. Agregar:
  - `const opcionesMes = getRecentMonthOptions()` (las 3 opciones de mes).
  - `const mesSeleccionado = ref('todos')` (default "Todos").
  - `<select v-model="mesSeleccionado">` en la cabecera con `<option value="todos">Todos</option>` + una option por cada opción de mes (`:value="op.clave"`, texto `op.etiqueta`). Espejar markup/estilo del select de `LatestSeguimientos.vue` (clases propias de `.embudo`, `aria-label`).
  - `const funnel = computed(() => { const claves = mesSeleccionado.value === 'todos' ? opcionesMes.map(o => o.clave) : [mesSeleccionado.value]; return computeFunnel(filterLeadsByMonthKeys(props.leads, claves)) })`.
  - El `v-for` del template sigue iterando `funnel` (ahora computed). Las funciones de presentación (`obtenerIcono`, `obtenerClaseRango`, `obtenerDetalle`) **no cambian**.
  - Orden de opciones sugerido: los 3 meses (más reciente primero) y luego "Todos" (espeja a `LatestSeguimientos` donde "Todo" va último). El default es `'todos'` independientemente de la posición.

- `src/views/DashboardView.vue` — **modificar** — línea 29: `<ConversionFunnel :funnel="leadsStore.funnel" />` → `<ConversionFunnel :leads="leadsStore.leads" />`.

- `src/stores/leads.js` — **modificar** — eliminar el getter `funnel` (línea 23) y quitar `computeFunnel` del import (líneas 3-10), ya que su único uso era ese getter. No tocar los demás getters.

### Tests a modificar/crear (obligatorios, ver plan abajo)

- `src/lib/__tests__/leadMetrics.test.js` — **modificar** — agregar bloques `describe` para `getRecentMonthOptions` y `filterLeadsByMonthKeys`. Nota: el archivo ya mockea `getCurrentDateGMT5` a una fecha fija (31/01/2026); los tests nuevos de `getRecentMonthOptions` deben controlar la fecha con `vi.setSystemTime` en sus propios bloques (o ajustar el mock) para cubrir varias fechas de referencia.
- `src/components/dashboard/__tests__/ConversionFunnel.test.js` — **reescribir** — hoy monta con prop `funnel` ya calculado; debe pasar a montar con prop `leads` crudos y ejercitar el filtro + el cálculo. El comentario de cabecera (líneas 5-7) que dice "el cálculo no cambia en esta tarea" queda desactualizado y debe reescribirse.
- `src/stores/__tests__/leads.test.js` — **verificar** — no referencia `funnel` (confirmado por grep); no requiere cambios salvo, opcionalmente, un test que afirme que el store ya no expone `funnel`.
- `src/__tests__/App.test.js` / `DashboardView` — **verificar** que no dependan del prop viejo (no montan `ConversionFunnel` con `funnel` directo; el cambio de `DashboardView` es solo el nombre del prop cableado).

## Plan de pruebas (para dev-tester)

Foco explícito: probar el **CÁLCULO real** sobre leads mock con fechas en distintos meses, no solo el render.

### A. Helpers puros — `leadMetrics.test.js` (con `vi.useFakeTimers()` + `vi.setSystemTime`)

`getRecentMonthOptions()`:
- **Camino feliz**: con `vi.setSystemTime(new Date(2026, 6, 27))` (27/07/2026) → devuelve exactamente 3 opciones con `clave` `['2026-07', '2026-06', '2026-05']` y `etiqueta` `['Julio 2026', 'Junio 2026', 'Mayo 2026']`, en ese orden (más reciente primero).
- **Borde cruce de año**: con `vi.setSystemTime(new Date(2026, 0, 15))` (15/01/2026) → claves `['2026-01', '2025-12', '2025-11']` y etiquetas `['Enero 2026', 'Diciembre 2025', 'Noviembre 2025']`.
- **Borde overflow de día**: con `vi.setSystemTime(new Date(2026, 2, 31))` (31/03/2026) → claves `['2026-03', '2026-02', '2026-01']` (NO debe saltearse febrero por el día 31).

`filterLeadsByMonthKeys(leads, claves)`:
- Set mock de leads con `created_at` en varios meses (ej. dos en `2026-07`, uno en `2026-06`, uno en `2026-05`, uno en `2026-03`, y uno **sin** `created_at`).
- **Mes específico**: filtrar por `['2026-07']` → devuelve solo los 2 leads de julio.
- **Unión (Todos)**: filtrar por `['2026-07','2026-06','2026-05']` → devuelve los 4 leads de esos meses y **excluye** el de `2026-03` (histórico más viejo) y el que no tiene `created_at`.
- **Borde**: `claves = []` → devuelve `[]`. Lead con `created_at` nulo/ausente → nunca incluido.

### B. Componente — `ConversionFunnel.test.js` (montar con prop `leads`)

Construir leads mock con `created_at` en `2026-07`, `2026-06`, `2026-05` y `2026-03`, con distintos flags de etapa (`contactado_at`, `calificado_at`, `visita_at`, `conversion_at`) de modo que el conteo por etapa sea verificable. Usar `vi.setSystemTime(new Date(2026, 6, 27))` para fijar las opciones de mes.

- **Default "Todos"**: al montar, `select.value === 'todos'`; el funnel renderizado corresponde a `computeFunnel` sobre la **unión de los 3 meses recientes**, y **excluye** los leads de `2026-03`. Verificar los `.embudo__valor` esperados.
- **Mes específico**: `await select.setValue('2026-06')` → el funnel se recalcula solo con los leads de junio; verificar que los `.embudo__valor` reflejan únicamente ese subconjunto (distintos de los de "Todos").
- **Opciones del select**: hay exactamente 4 options; las 3 de mes tienen etiquetas `Julio 2026 / Junio 2026 / Mayo 2026` + la de "Todos".
- **Borde: mes sin leads**: seleccionar un mes cuyo subconjunto quede vacío → el funnel renderiza las 4 etapas en `0` sin romper (los porcentajes usan la guarda `totalLeads > 0` ya existente en `computeFunnel`).
- **Presentación preservada** (regresión del comportamiento actual, ahora derivado del computed): íconos correctos por etapa (los 4 emojis del mapa), clases `rank-1/2/3/other` por posición, copy `"% del total"` solo en la primera etapa y `"% de conversión"` en el resto, y `.embudo__valor` con clase `.cifra`.

### C. Store — `leads.test.js`
- (Opcional) Afirmar que `useLeadsStore()` ya no expone `funnel`, dejando constancia de que el getter se eliminó a propósito y no quedó huérfano.

---

## Sugerencias fuera de alcance (NO implementar en esta tarea)
- El array de nombres de meses en español queda hoy local en `leadMetrics.js`. Si a futuro aparece i18n, ese array debería centralizarse en `useDateGMT5.js` (hogar de la lógica de fechas). Para esta tarea, mantenerlo local es consistente con el alcance.
- `MonthlyEvolutionChart` también usa claves `YYYY-MM`; si en el futuro se quisiera unificar la generación de claves de mes desde un `Date`, `getRecentMonthOptions` sería el punto natural para extraer un helper `monthKeyFromDate`. No hace falta ahora.
