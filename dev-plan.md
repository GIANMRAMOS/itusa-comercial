# Micro-plan — Épica: Formulario de lead por Estado + edición de seguimientos + orden de tabla (HU-1 a HU-6)

Alcance: 5 archivos de producción. Migración de 3 columnas nuevas (nullable). NO implementa nada este documento: solo planifica.

Nota de contexto: el `dev-plan.md` anterior describía la épica YA COMPLETADA de "simplificar columnas de LeadsTable + chip de metadatos" (visible hoy en el código: cabeceras Contacto/Empresa/Correo/Teléfono/Factura/Acciones + chips Fuente/Creación/Estado en el panel expandido). Ese plan quedó obsoleto y se sobrescribe aquí. El estilo de análisis de GATE se mantiene alineado con esa épica previa.

---

## Patrón arquitectónico detectado

Stack: Vue 3 + `<script setup>` (Composition API) + Pinia + Supabase + Vitest. Convenciones ya establecidas y verificadas leyendo los archivos:

- **Componentes presentacionales** (`LeadFormModal`, `SeguimientosModal`, `LeadsTable`): reciben datos por `props`, comunican hacia arriba por `emit`. No tocan store ni red. Estado local con `ref`.
- **Vistas** (`GestionView`, `ArchivadosView`): orquestan store + modales. Los handlers (`guardarLead`, `agregarSeguimiento`, `eliminarSeguimiento`, `archivarLead`) son `async`, llaman a una acción del store y actúan según `resultado.success`.
- **Store Pinia** (`stores/leads.js`): acciones `async` con patrón uniforme:
  - `this.error = null` al entrar.
  - `try { const { data, error } = await supabase.from(...)...; if (error) { this.error = error.message; return { success:false, error: error.message } } ...mutación optimista en memoria...; return { success:true, data } } catch (error) { this.error = error.message; return { success:false, error: error.message } }`.
  - `updateLead` usa `update(datos).eq('id', id).select('*, seguimientos(*)').single()`. `addSeguimiento`/`deleteSeguimiento` operan sobre `.from('seguimientos')` y mutan `lead.seguimientos` en memoria del lead correspondiente.
- **Fechas**: todo pasa por `@/composables/useDateGMT5` (`getTodayGMT5`, `parseDateGMT5`). Formato de columnas `date` = `'YYYY-MM-DD'`.
- **Estado del lead**: derivado, NO columna. `getStatus(lead)` en `@/lib/leadMetrics` → `convertido` si `conversion_at`, `rechazado` si `rechazo_at`, si no `proceso`. `computeFunnel` (Embudo) cuenta `contactado_at / calificado_at / visita_at / conversion_at` (NO usa `no_calificado_at` ni `propuesta_at`).
- **Formulario actual**: un `ref(crearFormularioInicial())` que arranca de `props.lead` (edición) o de defaults (alta). `construirPayload()` hace `{ ...formulario.value }`, normaliza los 8 campos fecha a `null` si vacíos, castea `factura`. Validación imperativa en `enviarFormulario()` con `errorValidacion.value` (string). Layout en grid de 2 columnas con clases BEM `lead-form-modal__*` y tokens de diseño.
- **Tabla** (`LeadsTable`): `leadsFiltrados` computed que filtra por búsqueda y ordena por `created_at` descendente. Celdas con `data-label` para modo tarjeta móvil. Cifras en `<span class="cifra">`.

El patrón para esta épica: quedarse dentro de este molde. El formulario mantiene UN objeto `formulario` con TODAS las columnas (incluidas las que dejan de tener input visible, para preservarlas en edición); la "Estado" es un `ref` de UI que condiciona qué inputs se muestran y cómo se arma el payload. El store gana una acción `updateSeguimiento` calcada de las existentes. La tabla gana un `ref` de orden local que tiene prioridad sobre el orden por fecha.

---

## Desviación de arquitectura

- ¿Se necesita desviarse? **SÍ — parcial. Dispara GATE 1.**
- **Qué desviación**: la épica introduce un **cambio en el modelo de datos** (migración con 3 columnas nuevas en `leads`) y un **cambio en la semántica de escritura del formulario**: hoy el usuario edita directamente cada fecha del embudo (`contactado_at`, `calificado_at`, `visita_at`, etc.); tras esta épica esas columnas dejan de ser editables directamente y pasan a **derivarse indirectamente** desde el selector "Estado" + "sub-estado", con una regla de avance monótono ("solo hacia adelante": nunca sobrescribir un campo con valor).
- **Por qué el patrón actual no alcanza sin ampliarlo**: el formulario hoy es un mapeo 1:1 input↔columna. Las HU-2/3/4 rompen ese 1:1 e introducen (a) un campo de UI que no es columna ("Estado"), (b) escritura condicional/derivada de varias columnas existentes, y (c) 2 columnas nuevas cuyo único propósito es re-hidratar el selector al reabrir en edición. Nada de esto encaja en el `{ ...formulario.value }` plano actual sin lógica nueva en `construirPayload()`.
- **¿Es estructural?** **SÍ**: cambia el modelo de datos (migración) y afecta a >1 pieza acopladas por el nuevo contrato de columnas (migración SQL ↔ `LeadFormModal` ↔ store `createLead/updateLead` que ya persiste el payload completo). No cambia el patrón de componentes/store en sí (sigue siendo SFC + acciones `{success,error}`), pero al tocar el esquema de datos entra de lleno en el criterio "cambia el modelo de datos" → **GATE 1**.

### Qué requiere confirmación explícita antes de construir (GATE 1)

1. **La migración SQL debe correrse en Supabase ANTES de mergear el código.** Si el código que persiste `sub_estado_proceso` / `fecha_sub_estado` / `motivo_rechazo` llega a producción sin las columnas, `createLead`/`updateLead` fallarán con error de columna inexistente (Supabase rechaza el insert/update). Orden obligatorio: migración → deploy de código.
2. **La regla de mapeo al embudo (interpretación del "además" cumulativo)** — ver "Punto abierto de negocio" más abajo. Es la única regla con dos lecturas posibles; conviene que Gianmarco la confirme al aprobar el GATE.
3. **Columnas huérfanas** `no_calificado_at` y `propuesta_at` — dejan de tener input y ningún sub-estado las setea → quedan congeladas (solo se preservan en edición). Confirmar que es aceptable (ver gap 2). No están en el Embudo, así que no afectan métricas.

---

## Migración SQL (para Gianmarco — correr en Supabase antes del deploy)

```sql
ALTER TABLE public.leads
  ADD COLUMN sub_estado_proceso text,
  ADD COLUMN fecha_sub_estado   date,
  ADD COLUMN motivo_rechazo     text;
```

- Las 3 columnas son **nullable** (sin `NOT NULL`, sin `DEFAULT`): un lead convertido/rechazado tendrá `sub_estado_proceso`/`fecha_sub_estado` en `NULL`; uno en proceso tendrá `motivo_rechazo` en `NULL`. Los leads existentes quedan con las 3 en `NULL`, coherente.
- No se agregan constraints/CHECK: la validación de valores permitidos (los 5 sub-estados, los 4 motivos) vive en el `<select>` del formulario, consistente con cómo el proyecto ya valida (no hay enums en DB para `source`, etc.).
- No se toca `getStatus()` ni ninguna columna existente. "Estado" del formulario NO es columna.

---

## Archivos a crear/modificar

Son **5 archivos de producción**. Confirmado: **`ArchivadosView.vue` NO requiere cambios** — usa `LeadsTable` solo por props/emits, no usa `LeadFormModal` ni `SeguimientosModal`, y el orden de HU-6 es estado interno de `LeadsTable` (sin prop nueva), así que aplica a Archivados automáticamente.

### Chunk A — Formulario por Estado (HU-1, HU-2, HU-3, HU-4) — INDEPENDIENTE

- `src/components/gestion/LeadFormModal.vue` — **modificar**:
  - **Estado del componente**: agregar `import { computed } from 'vue'`, `import { getStatus } from '@/lib/leadMetrics'`. Agregar `ref` de UI: `const estado = ref(props.lead ? getStatus(props.lead) : 'proceso')`.
  - **`crearFormularioInicial()`**: agregar al objeto (en ambas ramas, edición y alta) `sub_estado_proceso` y `fecha_sub_estado` y `motivo_rechazo` (edición: desde `props.lead.*`; alta: `''`). Mantener en el objeto TODOS los campos fecha existentes (incluidos `contactado_at`, `calificado_at`, `no_calificado_at`, `visita_at`, `propuesta_at`, `conversion_at`, `rechazo_at`) aunque pierdan input: se preservan al re-enviar el payload en edición.
  - **Template — quitar inputs (HU-1)**: eliminar los `<label>` de Fecha de creación (líneas ~140-143), Fecha contactado (~155-158), Fecha calificado (~160-163), Fecha no calificado (~165-168), Fecha de visita (~170-173), Fecha de propuesta (~175-178), Fecha de conversión (~180-183) y Fecha de rechazo (~185-188). Es decir: se quitan los 8 inputs de fecha; `conversion_at`/`rechazo_at` reaparecen condicionalmente vía Estado (HU-3/HU-4).
  - **Template — agregar selector "Estado" (HU-1)**: `<select v-model="estado" required>` con opciones `proceso`="En Proceso", `rechazado`="Rechazado", `convertido`="Convertido". Obligatorio.
  - **Template — bloque condicional proceso (HU-2)** `v-if="estado === 'proceso'"`: `<select v-model="formulario.sub_estado_proceso">` con opciones (valores exactos a confirmar con Gianmarco; sugerido: los mismos labels) Llamar / Volver a Llamar / Enviar correo / Follow-up / Citado; + `<input type="date" v-model="formulario.fecha_sub_estado">`. Ambos obligatorios.
  - **Template — bloque condicional convertido (HU-3)** `v-if="estado === 'convertido'"`: `<input type="date" v-model="formulario.conversion_at">` "Fecha de convertido", obligatorio.
  - **Template — bloque condicional rechazado (HU-4)** `v-if="estado === 'rechazado'"`: `<select v-model="formulario.motivo_rechazo">` (No califica / Ppta muy cara / No contesto / No desea) + `<input type="date" v-model="formulario.rechazo_at">` "Fecha de rechazado". Ambos obligatorios.
  - **`construirPayload()`** — reescribir la lógica de estado (mantener el resto: normalización de fechas a `null`, casteo de `factura`, `active_campaign`). Reglas por `estado.value`:
    - `created_at`: alta = `getTodayGMT5()` (ya viene así del default); edición = preservado (ya viene de `props.lead`). No se toca en payload.
    - **proceso**: aplicar mapeo forward-only al embudo (ver regla abajo) usando `formulario.fecha_sub_estado`; setear `conversion_at = null`, `rechazo_at = null`, `motivo_rechazo = null`. Persistir `sub_estado_proceso` y `fecha_sub_estado` tal cual.
    - **convertido**: `conversion_at` = valor del input; `rechazo_at = null`, `motivo_rechazo = null`, `sub_estado_proceso = null`, `fecha_sub_estado = null`. NO tocar `contactado_at`/`calificado_at`/`visita_at`.
    - **rechazado**: `rechazo_at` = valor del input; `motivo_rechazo` = valor del select; `conversion_at = null`, `sub_estado_proceso = null`, `fecha_sub_estado = null`. NO tocar `contactado_at`/`calificado_at`/`visita_at`.
  - **Regla de mapeo forward-only (HU-2)** — interpretación cumulativa (ver "Punto abierto"): con `f = formulario.fecha_sub_estado`,
    - Llamar / Volver a Llamar / Enviar correo → si `!contactado_at`: `contactado_at = f`.
    - Follow-up → si `!contactado_at`: `contactado_at = f`; **y** si `!calificado_at`: `calificado_at = f`.
    - Citado → si `!contactado_at`: `contactado_at = f`; **y** si `!calificado_at`: `calificado_at = f`; **y** si `!visita_at`: `visita_at = f`.
    - NUNCA sobrescribir un campo que ya tenía valor.
  - **`enviarFormulario()` (validaciones)**: mantener contact/source obligatorios. La validación de "created_at obligatorio" (líneas 98-101) ya no aplica a un input pero `created_at` siempre está poblado; conservarla como red de seguridad o quitarla (recomendado conservar). Agregar por estado: proceso → `sub_estado_proceso` y `fecha_sub_estado` obligatorios; convertido → `conversion_at` obligatorio; rechazado → `motivo_rechazo` y `rechazo_at` obligatorios. Mensajes en `errorValidacion.value`, mismo patrón.
  - **CSS**: reutilizar `.lead-form-modal__campo` y el bloque genérico `select` ya presente (líneas 264-280 ya estilan `select`). No hace falta CSS nuevo salvo ajuste de grid si UX lo pide.
  - **NO tocar** `GestionView.guardarLead`: el contrato `@save` (payload) no cambia de forma, solo de contenido.

### Chunk B — Edición de seguimientos (HU-5) — INDEPENDIENTE de A y C

Los 3 archivos de este chunk están acoplados entre sí (wiring del nuevo evento) pero no se solapan con A ni C.

- `src/stores/leads.js` — **modificar**: agregar acción `updateSeguimiento(seguimientoId, leadId, datosSeguimiento)` calcada de `deleteSeguimiento`/`updateLead`:
  ```
  const { data, error } = await supabase
    .from('seguimientos')
    .update(datosSeguimiento)
    .eq('id', seguimientoId)
    .select()
    .single()
  ```
  Si `error` → `{success:false,error}`. Si OK → buscar `lead` por `leadId` en `this.leads`, y si `Array.isArray(lead.seguimientos)` reemplazar el item con `id === seguimientoId` por `data` (mutación optimista en memoria). Retornar `{success:true, data}`. Mismo `try/catch` y `this.error` que las hermanas.

- `src/components/gestion/SeguimientosModal.vue` — **modificar**:
  - `defineEmits` (línea 13): agregar `'editar-seguimiento'`.
  - Estado local: `const seguimientoEnEdicionId = ref(null)`. El form inferior (hoy solo "agregar") pasa a modo dual usando `nuevaFecha` / `nuevoTexto` como campos compartidos.
  - Cada `<li>` (líneas 86-98): agregar botón "Editar" junto a "Eliminar". Al click → `iniciarEdicion(seguimiento)`: setea `seguimientoEnEdicionId.value = seguimiento.id`, `nuevaFecha.value = seguimiento.fecha`, `nuevoTexto.value = seguimiento.texto`.
  - El submit del form (`agregarSeguimiento`) se bifurca: si `seguimientoEnEdicionId.value` → emitir `editar-seguimiento` con `{ id: seguimientoEnEdicionId.value, fecha: nuevaFecha.value, texto: nuevoTexto.value.trim() }` y salir de modo edición; si no → comportamiento actual `agregar-seguimiento`. Reutilizar las mismas validaciones de fecha/texto.
  - Botón submit: label dinámico `"Guardar cambios"` en edición vs `"Agregar seguimiento"` en alta. Agregar botón "Cancelar edición" visible solo en modo edición → `cancelarEdicion()` (limpia `seguimientoEnEdicionId` y resetea `nuevaFecha`/`nuevoTexto`).
  - CSS: botón "Editar" análogo a `.seguimientos-modal__boton-eliminar` (nueva clase, p.ej. `--boton-editar`).

- `src/views/GestionView.vue` — **modificar**: agregar handler `async function editarSeguimiento(datos)` análogo a `agregarSeguimiento` (líneas 78-81): `if (!leadSeguimientos.value) return; await leadsStore.updateSeguimiento(datos.id, leadSeguimientos.value.id, { fecha: datos.fecha, texto: datos.texto })`. Enganchar en el template (línea ~130) `@editar-seguimiento="editarSeguimiento"` en `<SeguimientosModal>`.

### Chunk C — Orden por Contacto/Empresa (HU-6) — INDEPENDIENTE de A y B

- `src/components/gestion/LeadsTable.vue` — **modificar**:
  - Estado local: `const ordenColumna = ref(null)` (`'contact' | 'company' | null`) y `const ordenDireccion = ref('asc')` (`'asc' | 'desc'`).
  - Función `alternarOrden(columna)`: si `ordenColumna.value !== columna` → `ordenColumna = columna`, `ordenDireccion = 'asc'` (reinicia A-Z en la columna nueva); si es la misma → si estaba `'asc'` pasa a `'desc'`, si `'desc'` vuelve a `'asc'` (toggle A-Z ↔ Z-A). (Confirmar con UX si un tercer click debe limpiar el orden; el enunciado solo pide A-Z↔Z-A, así que toggle binario.)
  - `leadsFiltrados` (computed, líneas 44-63): cuando `ordenColumna.value` está activo, ordenar alfabéticamente por ese campo (`localeCompare`, case-insensitive, con fallback para `''`/`null`) respetando `ordenDireccion`; ese orden **tiene prioridad** sobre el orden por `created_at` (que sigue siendo el default cuando `ordenColumna.value === null`). Mantener el filtro de búsqueda intacto antes de ordenar.
  - Cabeceras (líneas 117-118): `<th>Contacto</th>` y `<th>Empresa</th>` pasan a ser clickeables (`@click="alternarOrden('contact')"` / `'company'`, con `role="button"`/`tabindex` o un `<button>` interno para accesibilidad). Indicador visual simple de dirección en la cabecera activa (p. ej. ▲/▼ o una flecha SVG condicionada a `ordenColumna`/`ordenDireccion`).
  - CSS: cursor/estilo de cabecera clickeable + estilo del indicador. Sin tocar el resto.

### Paralelización

- **A, B y C no comparten archivos** → los 3 chunks pueden construirse en paralelo. Dentro de B, los 3 archivos deben ir juntos (contrato del evento `editar-seguimiento`). `GestionView.vue` y `leads.js` son tocados SOLO por B; `LeadFormModal.vue` SOLO por A; `LeadsTable.vue` SOLO por C.

---

## Plan de pruebas

### Cubrible con Vitest (dev-tester)

**Chunk A — `LeadFormModal` (crear archivo nuevo `src/components/gestion/__tests__/LeadFormModal.test.js`; hoy no existe):**
- Estado inicial: alta → `estado` = "proceso"; edición de lead con `conversion_at` → "convertido"; con `rechazo_at` y sin `conversion_at` → "rechazado"; sin ninguno → "proceso" (equivale a `getStatus`).
- Render condicional: proceso muestra sub-estado + fecha; convertido muestra "Fecha de convertido"; rechazado muestra motivo + "Fecha de rechazado"; y los otros bloques NO se renderizan.
- Validaciones (bloquean `emit('save')` y setean `errorValidacion`): proceso sin sub-estado o sin fecha; convertido sin `conversion_at`; rechazado sin motivo o sin `rechazo_at`; contact/source vacíos.
- Payload — mapeo forward-only (camino feliz + regla "solo si vacío"):
  - proceso + "Llamar" con `contactado_at` vacío → payload setea `contactado_at = fecha_sub_estado`.
  - proceso + "Llamar" con `contactado_at` YA presente → NO se sobrescribe.
  - proceso + "Follow-up" (cumulativo) → setea `contactado_at` y `calificado_at` si vacíos; respeta los que ya tenían valor.
  - proceso + "Citado" → setea hasta `visita_at`; no retrocede.
  - proceso siempre limpia `conversion_at`/`rechazo_at`/`motivo_rechazo` a `null` y persiste `sub_estado_proceso`/`fecha_sub_estado`.
- Payload — limpieza al cambiar de estado:
  - convertido → `conversion_at` seteado; `rechazo_at`/`motivo_rechazo`/`sub_estado_proceso`/`fecha_sub_estado` = `null`; `contactado_at`/`calificado_at`/`visita_at` intactos (historial).
  - rechazado → `rechazo_at` + `motivo_rechazo` seteados; `conversion_at`/`sub_estado_proceso`/`fecha_sub_estado` = `null`; funnel intacto.
- `created_at`: alta lo setea a hoy; edición lo preserva del lead original.

**Chunk B — store + modal:**
- `leads.test.js` (modificar): `updateSeguimiento` camino feliz (llama `update(datos).eq('id', segId).select().single()`, reemplaza el item en `lead.seguimientos` en memoria, retorna `{success:true,data}`) y borde (error de Supabase → `error` seteado, memoria intacta, `{success:false,error}`). Seguir el patrón de mock de `updateLead` (cadena `from→update→eq→select→single`).
- `SeguimientosModal.test.js` (crear nuevo; hoy no existe): click en "Editar" precarga fecha/texto en el form y cambia el label a "Guardar cambios"; submit en modo edición emite `editar-seguimiento` con `{id, fecha, texto}` (y NO `agregar-seguimiento`); "Cancelar edición" vuelve a modo alta; validaciones de fecha/texto vacíos siguen bloqueando.

**Chunk C — `LeadsTable.test.js` (modificar):**
- Click en cabecera Contacto sin orden activo → orden A-Z por `contact`; segundo click → Z-A; click en Empresa → reinicia A-Z por `company`.
- El orden por columna tiene prioridad sobre `created_at`; sin columna activa, el default sigue siendo `created_at` descendente.
- Indicador de dirección aparece en la cabecera activa.
- Regresión: los tests existentes (data-labels de `td`, badges de estado, aria-labels, props `mostrar*`) NO deben romperse — los `<th>` clickeables no cambian los `data-label` de `td` ni el conteo de columnas. Verificar que `ETIQUETAS_ESPERADAS` y el resto siguen verdes.

### Solo verificable manualmente (no Vitest)

- **La migración SQL en sí** (correrla en Supabase, confirmar las 3 columnas y su nullability). Requisito previo al deploy (GATE 1).
- **Que el Embudo real siga poblándose**: con datos reales, crear/editar leads en proceso con distintos sub-estados y verificar en `DashboardView`/`ConversionFunnel` que `computeFunnel` refleja los `contactado_at`/`calificado_at`/`visita_at` seteados indirectamente. (La lógica de mapeo se testea en unit; el end-to-end contra la DB es manual.)
- **Persistencia round-trip real**: guardar un lead en proceso, recargar, reabrir en edición y confirmar que el sub-estado + fecha se re-muestran desde `sub_estado_proceso`/`fecha_sub_estado`; ídem motivo en rechazado. (El re-hidratado se puede unit-testear con un lead mock, pero el ciclo real Supabase es manual.)
- **Revisión visual/CSS**: selectores, bloques condicionales, indicador de orden, botón Editar/Cancelar en el modal.

### Criterios de aceptación (Gherkin)

No se recibieron escenarios Gherkin de ProductOwner; la especificación funcional son las HU-1..HU-6 del orquestador, ya traducidas a casos de prueba arriba.

---

## Puntos abiertos y gaps detectados (señalados, NO resueltos)

1. **Punto abierto de negocio — mapeo cumulativo del "además" (HU-2)**: el enunciado dice "Follow-up → además, si `calificado_at` vacío, setear. Citado → además, si `visita_at` vacío, setear." Hay dos lecturas: (a) **cumulativa** — Follow-up también rellena `contactado_at`, y Citado rellena `contactado_at`+`calificado_at` (coherente con que el Embudo es anidado: un lead calificado estuvo contactado); (b) **1:1** — cada sub-estado toca solo su etapa. El plan asume la **cumulativa** porque es la única que hace que el Embudo (`computeFunnel`) quede consistente (no puede haber calificados > contactados por un lead que saltó etapas). **Recomendación: confirmar con Gianmarco al aprobar el GATE.** Si fuera 1:1, cambia solo el bloque "Regla de mapeo forward-only" del Chunk A.

2. **Gap — columnas huérfanas `no_calificado_at` y `propuesta_at`**: sus inputs se quitan (HU-1) y ningún sub-estado las setea → dejan de poder poblarse por UI de aquí en más (solo se preservan en edición de leads viejos). No están en `computeFunnel` ni en `computeKPIs` salvo indirectamente, así que **no afectan métricas del Embudo**. Es un efecto colateral esperado del rediseño, no un bug. Señalado por si Gianmarco esperaba mantenerlas editables en algún lado.

3. **Gap — visibilidad del historial de avance en el formulario**: tras la simplificación, al editar un lead ya avanzado el usuario NO ve dentro del formulario qué etapas del embudo (`contactado_at`/`calificado_at`/`visita_at`) ya alcanzó; solo ve el sub-estado actual (que sí se re-muestra gracias a las 2 columnas nuevas). La regla forward-only protege los datos (no se pierde avance), así que **no hay hueco funcional que rompa las 4 HU de formulario**. Pero es un hueco de UX real: no hay dónde consultar el avance acumulado desde el form. El panel expandido de `LeadsTable` tampoco lo muestra hoy (solo Fuente/Creación/Estado). **Sugerencia fuera de alcance (NO implementar sin pedido explícito)**: agregar un bloque de solo-lectura tipo "avance acumulado" (chips con las fechas de contactado/calificado/visita) en el formulario o en el panel expandido. Se deja como nota, no se mete al plan.

Conclusión sobre la pregunta 5: **el plan cubre completamente las 4 HU de formulario sin dejar huecos funcionales.** El formulario NO necesita ningún campo de fecha adicional para cumplir HU-1..HU-4. Los puntos 2 y 3 son notas de producto/UX (visibilidad y columnas congeladas), no defectos del plan.
