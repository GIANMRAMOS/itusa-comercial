# Micro-plan — Sistema de diseño "Caudal" (capa de presentación)

## Patrón arquitectónico detectado

App Vue 3 (`<script setup>` + Pinia + vue-router). Verificado leyendo el código real:

- **Sin CSS global hoy.** `src/main.js` no importa ningún `.css`; `index.html` no carga fuentes. No existe `src/styles/` ni `public/`. Cada componente usa exclusivamente `<style scoped>` con colores/valores hardcodeados (azul `#2d6cdf`, grises `#d0d3d9`/`#64748b`, radios `6px`/`8px`, etc.). No hay ninguna variable CSS en el proyecto todavía.
- **Convención BEM en español** consistente: bloque `.componente`, `.componente__elemento`, `.componente__elemento--modificador` (p. ej. `leads-table__estado--convertido`, `kpi-card__valor`). El sistema Caudal encaja: la clase de cifras es `.cifra` y la variante oscura del KPI es `.kpi-card--destacada`.
- **Capas:** `src/views/*` (Login, Dashboard, Gestion) orquestan; `src/components/{dashboard,gestion,shared}/*` presentan; `src/lib/leadMetrics.js` + `src/composables/useDateGMT5.js` son lógica pura (NO se tocan); `src/stores/*` datos (NO se tocan).
- **Estado del lead:** `getStatus(lead)` en `leadMetrics.js` devuelve exactamente `'convertido' | 'rechazado' | 'proceso'`. Las clases de badge existentes son `leads-table__estado--{convertido|rechazado|proceso}`. Mapeo semántico Caudal directo: convertido→éxito, rechazado→error, proceso→advertencia. **No se toca la lógica**, solo el color de esas 3 clases.
- **Tabla actual** (`LeadsTable.vue`): `overflow-x: auto` + columnas sticky izquierda/derecha (`.leads-table__col-izquierda/--derecha`). Ese es el "tratamiento sticky ya existente" que el rango 640–900px debe conservar intacto.
- **Modales** (`LeadFormModal`, `SeguimientosModal`): misma estructura duplicada (`__fondo` overlay + `__panel` con `border-radius: 10px`, `box-shadow: 0 10px 40px`, `max-height`, `overflow-y`). Radio/sombra divergen de los tokens (`--radio-tarjeta: 18px` / `--sombra-modal`). Se unifican vía token dentro de cada scoped, NO extrayendo un componente compartido nuevo (eso sería refactor fuera de alcance).
- **Charts** (`MonthlyEvolutionChart`, `Last30DaysChart`): render en `<canvas>` vía chart.js/vue-chartjs. Sus cifras se dibujan en canvas: **`.cifra` NO aplica ahí**. Solo se tokeniza el wrapper `<section>` y, opcionalmente, los colores de dataset dentro de `chartOptions` (por hex, chart.js no lee CSS vars).

## Desviación de arquitectura

- **¿Se necesita desviarse? NO.**
- Es estrictamente capa de presentación: un archivo de tokens nuevo (aditivo), un import en `main.js`, y reemplazo de valores CSS hardcodeados por `var(--token)` dentro de `<style scoped>` existentes. Dos cambios de layout responsive (nav en `App.vue`, tabla→tarjetas en `LeadsTable.vue`) que modifican solo CSS/markup de presentación, sin tocar props, emits, stores ni lógica de negocio.
- No cambia el modelo de datos, no introduce patrón arquitectónico nuevo, no acopla módulos entre sí. **GATE 1 no se dispara.**
- Único artefacto nuevo: `src/styles/tokens.css` + `public/fonts/` — infra de estilos estándar, no arquitectura de aplicación.

## Archivos a crear/modificar

### FASE 1 — bloqueante, en orden estricto (cada paso habilita al siguiente)

1. `public/fonts/*.woff2` — **crear** — descargar de Google Fonts si no existen localmente: DM Sans 400, DM Sans 800, IBM Plex Mono 600. La carpeta `public/` no existe aún: crearla.
2. `src/styles/tokens.css` — **crear** — carpeta `src/styles/` no existe aún. Contenido en este orden: (a) `@font-face` self-hosted apuntando a `/fonts/*.woff2` con `font-display: swap`; (b) el bloque `:root` **exacto** provisto (no modificar valores); (c) reset mínimo (`*,*::before,*::after{box-sizing:border-box}`, `body{margin:0}`); (d) base de `body`: `font-family: var(--fuente-base)`, `font-size: var(--tamano-base)`, `line-height: var(--interlineado)`, `color: var(--color-texto)`, `background: var(--color-fondo-app)`; (e) utilitaria global `.cifra { font-family: var(--fuente-mono); font-variant-numeric: tabular-nums; }`. **`.cifra` debe ser global (no scoped)** para usarse en cualquier componente.
3. `src/main.js` — **modificar** — añadir `import '@/styles/tokens.css'` antes de montar. Única línea que cambia.
4. `src/App.vue` — **modificar** — nav restyle. `.barra-navegacion`: horizontal arriba en ≥900px (`--breakpoint-app-shell`); en <900px pasa a barra inferior fija (`position: fixed; bottom: 0; left/right: 0`), sin sidebar. Tokenizar borde (`--color-borde`), texto y activo (`--color-primario` / peso 800). Solo 2 destinos + logout. Añadir `padding-bottom` al contenido en móvil para no quedar tapado por la barra fija.
5. `src/components/gestion/LeadsTable.vue` — **modificar** — (a) responsive tabla→tarjetas <640px (`--breakpoint-tabla`): `thead` oculto, `tr.leads-table__fila` a `display:block` con estilo tarjeta (`--radio-tarjeta`, `--color-borde-tarjeta`, gap), cada `td` a `display:block` con `td::before { content: attr(data-label) }`. Requiere **añadir atributo `data-label` a cada `<td>`** de la fila principal: `Fuente, Contacto, Empresa, Correo, Teléfono, Creación, Estado, Factura, Días en proceso, Acciones`. (b) 640–900px: **NO tocar** el sticky existente. (c) badges: recolorear `--convertido`→`--color-exito`/`--color-exito-fondo`, `--rechazado`→`--color-error`/fondo, `--proceso`→`--color-advertencia`/fondo. (d) envolver en `<span class="cifra">` la Factura, la fecha de Creación y Días en proceso (solo la cifra, no labels/teléfono/correo). Tokenizar bordes/inputs/botones.

### FASE 2 — en paralelo (chunks independientes, sin solape entre sí; todos dependen solo de FASE 1 completa)

- **Chunk A** `src/components/dashboard/KpiCards.vue` — los 7 `<span class="kpi-card__valor">` reciben además la clase `cifra`. La tarjeta "Total facturado" (última) recibe `kpi-card--destacada` (fondo `--color-primario`, texto claro). Tokenizar fondo/radio (`--radio-tarjeta`)/sombra del resto.
- **Chunk B** `src/components/gestion/LeadFormModal.vue` — `__panel`: `border-radius: var(--radio-tarjeta)` + `box-shadow: var(--sombra-modal)`. Inputs/textarea: borde `--color-borde` y foco visible `:focus { border-color: var(--color-borde-foco); box-shadow: var(--sombra-foco); outline: none }`. Botón guardar → `--color-primario`/hover. Error → `--color-error`. El campo Factura es un `<input type=number>` editable: NO forzar `.cifra` (la regla `.cifra` es para cifras mostradas, no inputs).
- **Chunk C** `src/components/gestion/SeguimientosModal.vue` — mismo tratamiento de `__panel` (`--radio-tarjeta` + `--sombra-modal`) y foco visible en inputs/textarea. Botón agregar → `--color-primario`. Tokenizar bordes de items/error. Las fechas listadas (`formatearFechaCompleta`) van en `.cifra`; el texto de la nota NO.
- **Chunk D** `src/components/gestion/AddLeadButton.vue` — FAB: fondo `--color-primario` / hover `--color-primario-hover`, `box-shadow: var(--sombra-flotante)`. Sin `.cifra`. En móvil, subir `bottom` para no colisionar con la barra inferior fija del nav.
- **Chunk E** `src/components/dashboard/ConversionFunnel.vue` — wrapper con `--radio-tarjeta`/borde/sombra; barra-relleno con `--color-primario`; `.embudo__valor` y los porcentajes de `__detalle` en `.cifra`. Nombres de paso NO.
- **Chunk F** `src/components/dashboard/MonthlyEvolutionChart.vue` — wrapper tokenizado (radio/borde/sombra) + título con tipografía base. Cifras en canvas → `.cifra` NO aplica. Opcional-alineado: `backgroundColor` del dataset de `#2563eb` a `--color-primario` (`#1a1a18`) por hex directo en JS.
- **Chunk G** `src/components/dashboard/Last30DaysChart.vue` — igual que F. Opcional: verde `#16a34a` → `--color-exito` `#3a9d6b` por hex directo.
- **Chunk H** `src/components/dashboard/TopSourcesRanking.vue` — wrapper tokenizado; `.ranking-fuentes__cantidad` en `.cifra` (color `--color-primario` en vez de azul). Nombre de fuente NO.
- **Chunk I** `src/components/dashboard/LatestSeguimientos.vue` — wrapper/bordes tokenizados; `.ultimos-seguimientos__fecha` en `.cifra`. Contacto/empresa/texto NO.
- **Chunk J** `src/views/LoginView.vue` — form con `--radio-tarjeta`, borde/sombra; inputs con foco visible (`--sombra-foco`); botón `--color-primario`; `max-width: var(--ancho-maximo-formulario)` (400px); error `--color-error`. Sin cifras.
- **Chunk K** `src/components/shared/LoadingOverlay.vue` — spinner: `border-top-color: var(--color-primario)`, borde base `--color-borde`; overlay tokenizado. Sin cifras.
- **Chunk L** `src/components/shared/ConfirmDialog.vue` — caja con `--radio-tarjeta` + `--sombra-modal`; botón confirmar (destructivo) con `--color-error`; cancelar con fondo neutro tokenizado. Sin cifras.

**Fuera de alcance (sugerencia aparte, NO incluir en el plan):** extraer la estructura duplicada overlay/panel de los dos modales a un `BaseModal` compartido. Es refactor válido pero no es la capa de presentación pedida.

## Plan de pruebas

### Verificable con Vitest + @vue/test-utils (unitario, para dev-tester)

- **KpiCards** (extender `src/components/dashboard/__tests__/KpiCards.test.js`, ya existe):
  - Los 7 `.kpi-card__valor` tienen también la clase `cifra` (`findAll('.cifra').length >= 7`).
  - La tarjeta "Total facturado" (última `.kpi-card`) tiene `kpi-card--destacada`; las otras 6 NO.
  - Regresión: los asserts existentes (`$500`, `20%`, `99` reactivo) siguen pasando — `.cifra` no cambia el texto renderizado.
- **LeadsTable** (test nuevo `src/components/gestion/__tests__/LeadsTable.test.js`):
  - Camino feliz: con un lead mock, cada `<td>` de datos expone el `data-label` correcto (`Fuente`, `Contacto`, `Empresa`, `Correo`, `Teléfono`, `Creación`, `Estado`, `Factura`, `Días en proceso`, `Acciones`) vía `attributes('data-label')`.
  - Badge: lead con `conversion_at` → clase `leads-table__estado--convertido`; con `rechazo_at` (sin conversión) → `--rechazado`; sin ninguno → `--proceso`. Valida el mapeo semántico sin depender del color.
  - Factura, fecha de Creación y Días en proceso se renderizan dentro de un `<span class="cifra">`.
  - Borde: `leads` vacío → fila "No hay leads..." (comportamiento existente intacto).
  - Borde: búsqueda sin match → 0 filas de datos + mensaje sin-resultados.
- **ConfirmDialog / LoadingOverlay** (ConfirmDialog ya tiene test): siguen montando y emitiendo `confirm`/`cancel` tras el restyle (regresión).
- **Regresión global:** correr toda la suite (`leadMetrics`, `useDateGMT5`, stores, ConfirmDialog). Ningún cambio toca lógica → deben seguir verdes.

### Fuera del alcance de tests unitarios (verificación manual en navegador)

- **Colapso real** tabla→tarjetas a <640px (p. ej. 375px): jsdom no calcula media queries ni layout. El test solo garantiza `data-label`/markup; que el `::before` se vea y el `thead` se oculte se valida en DevTools responsive.
- **Nav:** horizontal ≥900px vs barra inferior fija <900px (media query) — visual. Que la barra fija no tape contenido ni colisione con el FAB de AddLeadButton.
- **Foco visible** (`--sombra-foco`) en inputs de modales/login al tabular.
- Carga/render de las **fuentes self-hosted** y que `.cifra` use realmente IBM Plex Mono con `tabular-nums` — visual + Network tab.
- **Colores de los charts** (canvas) — visual; sin DOM inspeccionable de las cifras internas.
- Contraste de **`.kpi-card--destacada`** (texto claro sobre `--color-primario`) — visual/accesibilidad.

### Criterios de aceptación (HU)

No se recibieron HU con escenarios Gherkin del ProductOwner para esta tarea (es una capa de diseño con decisiones de UX ya cerradas). Si llegan, cada escenario se mapea 1:1 a un caso adicional. **Ausencia declarada, no asumida.**
