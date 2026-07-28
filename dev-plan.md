# Micro-plan — Rediseño de `LeadsTable.vue`

## Patrón arquitectónico detectado

- **Vista contenedora**: `src/views/GestionView.vue` es el "smart component". Tiene el store
  (`useLeadsStore`), maneja modales (`LeadFormModal`, `SeguimientosModal`, `ConfirmDialog`) y traduce
  eventos de `LeadsTable` a acciones. `LeadsTable` es "presentacional": recibe `leads` por prop y
  emite intención hacia arriba; no conoce el store ni abre modales por sí mismo.
- **Contrato actual de `LeadsTable.vue`** (confirmado leyendo el archivo, no asumido):
  - Props: `leads: Array` (única prop).
  - Emits: `editar-lead`, `eliminar-lead`, `abrir-seguimientos` — los tres emiten el objeto `lead` completo.
  - `GestionView` los escucha en las líneas 98-103: `@editar-lead="abrirEdicionLead"`,
    `@eliminar-lead="pedirConfirmacionEliminar"`, `@abrir-seguimientos="abrirSeguimientos"`.
- **Estado local del componente**: `busqueda` (ref) y `leadExpandidoId` (ref). Expandir es estado de
  UI propio, una fila expandida a la vez vía `alternarExpandido(leadId)`.
- **Métricas**: `getStatus(lead)` y `getDaysInProcess(lead)` vienen de `@/lib/leadMetrics` (funciones
  puras). `getStatus` devuelve exactamente `'convertido' | 'rechazado' | 'proceso'`
  (precedencia conversion_at > rechazo_at > proceso). NO se toca.
- **Sistema de diseño**: tokens en `src/styles/tokens.css`, confirmados y disponibles:
  `--color-primario (#1a1a18)`, `--color-texto (#1a1a18)`, `--color-borde-tarjeta (#f0eeea)`,
  `--color-exito (#3a9d6b)`, `--color-error (#d9573f)`, `--color-advertencia (#ff9500)` y sus
  `*-fondo`. La clase global `.cifra` existe (tokens.css:88) y `.cifra--ingreso` (línea 94).
- **Convención de nombres**: BEM en español con prefijo `leads-table__`. El badge de estado ya usa el
  sufijo devuelto por `getStatus` (`__estado--convertido/--rechazado/--proceso`); ese mismo patrón de
  sufijo se reutiliza para la franja izquierda.
- **Responsive ya establecido (se conserva idéntico, no se toca)**: tabla completa ≥900px, sticky de
  columnas izquierda/derecha en 640-900px (vía `overflow-x:auto` + `position:sticky` del layout base),
  y tarjetas en `@media (max-width: 639px)` con `td { display:block }` +
  `td::before { content: attr(data-label) }`. El único media query del scoped es `max-width:639px`; no
  hay un cuarto rango ni breakpoints en px que modificar.
- **Testing**: Vitest + `@vue/test-utils` `mount`. Test existente en
  `src/components/gestion/__tests__/LeadsTable.test.js` verifica `data-label`s, clases de estado y
  `span.cifra`. **jsdom NO aplica media queries**: el DOM es idéntico en los 3 rangos y el reacomodo
  mobile es puramente CSS — implicación clave para el plan de pruebas (ver abajo).

## Desviación de arquitectura

- ¿Se necesita desviarse? **NO**.
- **¿Dispara GATE 1? NO.** Evaluado con criterio, no minimizado:
  - No cambia el modelo de datos: solo se leen campos ya existentes (`lead.seguimientos`,
    `lead.contact`, y `getStatus(lead)`). No se agregan/renombran campos ni se toca `leadMetrics.js`.
  - No cambia el contrato del componente: mismas props (`leads`), mismos emits
    (`editar-lead`, `eliminar-lead`, `abrir-seguimientos`) con el mismo payload (`lead`).
  - El único cambio de comportamiento —mover el disparador de `abrir-seguimientos` de la columna
    Acciones al panel expandido— es **reubicar qué elemento del DOM emite un evento que ya existe**,
    dentro del mismo componente. No cruza el límite de módulos: `GestionView.vue` sigue escuchando el
    mismo evento con el mismo handler.
  - Todo lo demás es presentación/accesibilidad (SVG, aria-labels, timeline, avatar, franja, chevron).
    No introduce patrón nuevo, no afecta >1 módulo, no cambia el flujo de datos.
- Conclusión: cambio contenido en un solo archivo presentacional. Pipeline normal (builder -> tester),
  sin gate estructural.

## Archivos a crear/modificar

- `src/components/gestion/LeadsTable.vue` — **modificar** — único archivo de producción a tocar.
  Cambios (template + script mínimo + estilos scoped):
  1. **Iconos Editar/Eliminar (Acciones de fila colapsada)**: reemplazar los `<button>` de texto por
     `<button>` con SVG inline monolínea (`viewBox="0 0 20 20"`, `stroke="currentColor"`,
     `stroke-width="1.75"`, `fill="none"`). Mantener `@click="emit('editar-lead', lead)"` y
     `emit('eliminar-lead', lead)`. Cada botón con `aria-label` descriptivo
     (ej. `aria-label="Editar lead"`, `aria-label="Eliminar lead"`). Área táctil real: `<button>` con
     `min-width:44px; min-height:44px` (o padding equivalente) aunque el SVG sea de 20px.
     **Quitar de aquí el botón "Seguimientos"** (era la línea 125).
  2. **Seguimientos -> panel expandido**: dentro de `.leads-table__historial`, junto al `<h3>`
     "Historial de seguimientos (N)", agregar un `<button>` con SVG (mismo formato) que emita
     `emit('abrir-seguimientos', lead)` con `aria-label="Agregar seguimiento"`. Mismo evento, mismo
     payload; solo cambia el disparador.
  3. **Conteo (N) en el título**: `Historial de seguimientos ({{ lead.seguimientos?.length ?? 0 }})`
     — N = cantidad real de notas del lead (equivale a `seguimientosOrdenados(lead).length`). Usar la
     longitud real del array, no un contador aparte.
  4. **Chevron expandir**: reemplazar el glifo `+/−` (línea 107) por un SVG chevron (mismo formato)
     que rote 90° vía CSS `transition: transform 0.15s ease`, disparado por el estado abierto
     (`leadExpandidoId === lead.id`) con una clase modificadora
     (ej. `:class="{ 'leads-table__boton-expandir--abierto': leadExpandidoId === lead.id }"`).
     Conservar el `aria-expanded` existente (línea 104). Recomendado: agregar `aria-label` al botón.
  5. **Timeline en el historial**: la `<ul class="leads-table__historial-lista">` pasa a lista tipo
     timeline: cada `<li>` con punto (`--color-primario`) y línea conectora
     (`--color-borde-tarjeta`) vía `::before`/`::after`. La fecha va en `<span class="cifra">`
     (reemplaza el `<strong>` actual); el texto de la nota no cambia. Solo estructura/CSS, sin cambios
     de datos.
  6. **Franja de color izquierda por estado**: agregar clase modificadora a `.leads-table__fila` ligada
     a `getStatus(lead)`, ej. `` :class="`leads-table__fila--${getStatus(lead)}`" ``, con
     `border-left: 3-4px solid` mapeando: `--convertido -> --color-exito`,
     `--rechazado -> --color-error`, `--proceso -> --color-advertencia`. Reutiliza el patrón de sufijo
     del badge. NO tocar `getStatus`.
  7. **Avatar de iniciales**: función local simple (ej. `inicial(lead)` que devuelve
     `(lead.contact || '').trim().charAt(0).toUpperCase() || '?'`). Renderizar un `<span>` circular con
     esa inicial dentro del `td[data-label="Contacto"]`, fondo `--color-borde-tarjeta`, texto
     `--color-texto`. Tamaño 28px en fila desktop/tablet; 32px dentro del `@media (max-width:639px)`.
  8. **Reacomodo mobile del avatar+nombre (sin cuarto breakpoint)**: DOM único (avatar + nombre siempre
     dentro del td Contacto). Dentro del `@media (max-width:639px)` YA existente, dar al
     `td[data-label="Contacto"]` tratamiento de cabecera de tarjeta (avatar 32px + nombre en línea,
     ocultar su `::before` de data-label "Contacto" para que no sea "una fila de dato más"). Solo CSS
     dentro del media query existente; no se agregan breakpoints.

- `src/views/GestionView.vue` — **NO se modifica.** Sigue escuchando `abrir-seguimientos` con
  `abrirSeguimientos`. El cambio de "de dónde sale el evento" es interno a `LeadsTable`; el contrato
  hacia la vista es idéntico. Confirmado: **alcanza con `LeadsTable.vue` solo.**

- `src/components/gestion/__tests__/LeadsTable.test.js` — **modificar/ampliar** (lo hace dev-tester,
  no el builder) — agregar los casos del plan de pruebas. Los 7 tests existentes deben seguir
  pasando: `data-label="Acciones"` se conserva (la columna sigue existiendo, solo cambia su
  contenido), los `data-label`s no cambian, y `span.cifra` en Factura/Creación/Días sigue igual.

**Chunks paralelizables**: un solo archivo de producción con template + estilos scoped entrelazados;
NO conviene paralelizar el build. El único trabajo independiente es la ampliación de tests
(dev-tester), una vez definido el marcado por el builder.

## Plan de pruebas (Vitest — para dev-tester)

Nota transversal: jsdom no evalúa media queries, así que estos tests validan **marcado, eventos,
conteo y clases** (contrato + lógica), iguales en los 3 rangos. Lo puramente visual —rotación real del
chevron, apariencia del timeline, colores renderizados de la franja, reacomodo mobile del avatar— se
deja para **verificación manual**, igual que en tareas anteriores de la sesión.

### Camino feliz
- Lead normal (sin `conversion_at` ni `rechazo_at`): la fila renderiza avatar con inicial del contacto,
  iconos de Editar y Eliminar en Acciones, y chevron de expandir. `getStatus` = `proceso`.

### Borde/error
- Lead sin `contact` (`''` o ausente): la función de inicial no rompe y devuelve fallback (`'?'`).
- Lead con `seguimientos: []`: al expandir, el conteo del título muestra `(0)` y sigue el mensaje de
  historial vacío; el icono "Agregar seguimiento" existe igual.

### aria-labels (existen y tienen contenido)
- Botón Editar: `aria-label` no vacío (`.trim().length > 0`).
- Botón Eliminar: `aria-label` no vacío.
- Tras expandir, el icono de seguimientos del panel tiene `aria-label="Agregar seguimiento"` (no vacío).
- (Recomendado) el botón de expandir tiene `aria-label` no vacío y conserva `aria-expanded`.

### Evento de seguimientos migrado (dispara desde el panel, NO desde la fila colapsada)
- **Ausencia en fila colapsada**: montar sin expandir; verificar que dentro de
  `.leads-table__acciones` NO hay control que emita `abrir-seguimientos`. Concretamente:
  `wrapper.emitted('abrir-seguimientos')` es `undefined` tras click en cada botón de Acciones, y/o que
  `.leads-table__acciones` contiene exactamente 2 botones (Editar, Eliminar).
- **Presencia en panel expandido**: expandir la fila (click en botón expandir), localizar el icono de
  seguimientos dentro de `.leads-table__historial`, click, y verificar que
  `wrapper.emitted('abrir-seguimientos')` existe, longitud 1, con payload `[0][0]` = el `lead`.

### Conteo (N) del título coincide con `seguimientos.length` real
- Lead con 3 seguimientos: al expandir, el texto del título contiene `(3)`.
- Lead con `seguimientos: []`: el título contiene `(0)`.
- El conteo refleja el array real del lead, independiente del orden que aplica `seguimientosOrdenados`.

### Franja izquierda mapea a cada uno de los 3 estados
- Lead con `conversion_at` -> `.leads-table__fila` tiene la clase `leads-table__fila--convertido`.
- Lead con `rechazo_at` (sin `conversion_at`) -> clase `...--rechazado`.
- Lead sin ninguno -> clase `...--proceso`.
- Los colores exactos de la franja se validan manualmente; el test solo asegura el mapeo de clase,
  reusando la lógica de `getStatus` (ya cubierta por `leadMetrics.test.js`).

### Regresión (no romper lo existente)
- Los 7 tests actuales de `LeadsTable.test.js` deben seguir verdes: `data-label`s intactos
  (incl. `Acciones`), clases de badge de estado, `span.cifra` en Factura/Creación/Días, y mensajes de
  "sin resultados" / búsqueda sin coincidencias.

---

## Sugerencias fuera de alcance (NO implementar en esta tarea)
- El botón de expandir usa `aria-expanded` pero no `aria-controls` apuntando al panel; agregarlo
  mejoraría la accesibilidad, pero excede lo pedido.
- Los colores hardcodeados que quedan en el scoped (`#f8f9fb`, `#6b7280`, `#eef0f3`, `#a83a2f`, etc.)
  podrían migrarse a tokens en una limpieza posterior; fuera de alcance aquí.
