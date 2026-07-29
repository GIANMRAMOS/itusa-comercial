<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { getStatus } from '@/lib/leadMetrics'
import { parseDateGMT5 } from '@/composables/useDateGMT5'
import { etiquetaSubEstado } from '@/lib/leadEstado'

const props = defineProps({
  leads: {
    type: Array,
    default: () => [],
  },
  mostrarEditar: {
    type: Boolean,
    default: true,
  },
  mostrarEliminar: {
    type: Boolean,
    default: true,
  },
  mostrarArchivar: {
    type: Boolean,
    default: false,
  },
  mostrarReactivar: {
    type: Boolean,
    default: false,
  },
  permitirAgregarSeguimiento: {
    type: Boolean,
    default: true,
  },
  // Id del lead a mostrar ya expandido al montar (ej. al llegar desde un enlace del Dashboard).
  leadIdExpandidoInicial: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits([
  'editar-lead',
  'eliminar-lead',
  'abrir-seguimientos',
  'archivar-lead',
  'reactivar-lead',
])

const busqueda = ref('')
// Los id de lead son uuid (string) en Supabase; el query param de la URL también llega
// como string, así que se comparan tal cual, sin convertir a número.
const leadExpandidoId = ref(props.leadIdExpandidoInicial ?? null)

// Si se llegó con un lead a expandir de entrada, hace scroll hacia esa fila apenas
// los leads terminan de cargar (una sola vez).
if (leadExpandidoId.value != null) {
  const detenerScrollInicial = watch(
    () => props.leads,
    async (leads) => {
      if (!leads.some((lead) => lead.id === leadExpandidoId.value)) return
      await nextTick()
      document
        .querySelector(`[data-lead-id="${leadExpandidoId.value}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      detenerScrollInicial()
    },
    { immediate: true }
  )
}

// Orden manual por columna: null = sin orden manual (default por fecha de creación)
const ordenColumna = ref(null) // 'contact' | 'company' | null
const ordenDireccion = ref('asc') // 'asc' | 'desc'

// Alterna el orden manual de una columna: cambia de columna reinicia en A-Z,
// repetir la misma columna alterna A-Z <-> Z-A.
function alternarOrden(columna) {
  if (ordenColumna.value !== columna) {
    ordenColumna.value = columna
    ordenDireccion.value = 'asc'
  } else {
    ordenDireccion.value = ordenDireccion.value === 'asc' ? 'desc' : 'asc'
  }
}

const leadsFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  const filtrados = termino
    ? props.leads.filter((lead) => {
        const contact = (lead.contact || '').toLowerCase()
        const company = (lead.company || '').toLowerCase()
        return contact.includes(termino) || company.includes(termino)
      })
    : props.leads

  return [...filtrados].sort((a, b) => {
    if (ordenColumna.value) {
      const valorA = (a[ordenColumna.value] || '').toString().toLowerCase()
      const valorB = (b[ordenColumna.value] || '').toString().toLowerCase()
      const comparacion = valorA.localeCompare(valorB)
      return ordenDireccion.value === 'asc' ? comparacion : -comparacion
    }

    const fechaA = parseDateGMT5(a.created_at)
    const fechaB = parseDateGMT5(b.created_at)
    if (!fechaA && !fechaB) return 0
    if (!fechaA) return 1
    if (!fechaB) return -1
    return fechaB.getTime() - fechaA.getTime()
  })
})

function formatearFechaCompleta(fecha) {
  const parseada = parseDateGMT5(fecha)
  if (!parseada) return '—'
  const dia = String(parseada.getDate()).padStart(2, '0')
  const mes = String(parseada.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${parseada.getFullYear()}`
}

function formatearFactura(factura) {
  if (!factura) return '—'
  return Number(factura).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })
}

function alternarExpandido(leadId) {
  leadExpandidoId.value = leadExpandidoId.value === leadId ? null : leadId
}

function seguimientosOrdenados(lead) {
  const seguimientos = Array.isArray(lead.seguimientos) ? [...lead.seguimientos] : []
  return seguimientos.sort((a, b) => {
    const fechaA = parseDateGMT5(a.fecha)
    const fechaB = parseDateGMT5(b.fecha)
    if (!fechaA && !fechaB) return 0
    if (!fechaA) return 1
    if (!fechaB) return -1
    return fechaB.getTime() - fechaA.getTime()
  })
}


</script>

<template>
  <div class="leads-table">
    <div class="leads-table__barra">
      <input
        v-model="busqueda"
        type="search"
        class="leads-table__busqueda"
        placeholder="Buscar por contacto o empresa..."
      />
    </div>

    <div class="leads-table__contenedor">
      <table class="leads-table__tabla">
        <thead>
          <tr>
            <th class="leads-table__col-izquierda"></th>
            <th>
              <button type="button" class="leads-table__boton-orden" @click="alternarOrden('contact')">
                Contacto
                <svg
                  v-if="ordenColumna === 'contact'"
                  viewBox="0 0 20 20"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  :style="{ transform: ordenDireccion === 'desc' ? 'rotate(180deg)' : 'none' }"
                >
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </button>
            </th>
            <th>
              <button type="button" class="leads-table__boton-orden" @click="alternarOrden('company')">
                Empresa
                <svg
                  v-if="ordenColumna === 'company'"
                  viewBox="0 0 20 20"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  :style="{ transform: ordenDireccion === 'desc' ? 'rotate(180deg)' : 'none' }"
                >
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </button>
            </th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th>Factura</th>
            <th class="leads-table__col-derecha">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(lead, indice) in leadsFiltrados" :key="lead.id">
            <tr
              class="leads-table__fila"
              :class="`leads-table__fila--${getStatus(lead)}`"
              :data-lead-id="lead.id"
            >
              <td class="leads-table__col-izquierda">
                <button
                  type="button"
                  class="leads-table__boton-expandir"
                  :class="{ 'leads-table__boton-expandir--abierto': leadExpandidoId === lead.id }"
                  :aria-expanded="leadExpandidoId === lead.id"
                  :aria-label="leadExpandidoId === lead.id ? 'Contraer detalle del lead' : 'Expandir detalle del lead'"
                  :title="leadExpandidoId === lead.id ? 'Contraer detalle del lead' : 'Expandir detalle del lead'"
                  @click="alternarExpandido(lead.id)"
                >
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M7 4l6 6-6 6" />
                  </svg>
                </button>
              </td>
              <td data-label="Contacto">
                <span class="leads-table__avatar" aria-hidden="true">{{ indice + 1 }}</span>
                <span class="leads-table__nombre-contacto">{{ lead.contact || '—' }}</span>
              </td>
              <td data-label="Empresa">{{ lead.company || '—' }}</td>
              <td data-label="Correo">{{ lead.email || '—' }}</td>
              <td data-label="Teléfono">{{ lead.phone || '—' }}</td>
              <td data-label="Factura"><span class="cifra" :class="{ 'cifra--ingreso': lead.factura }">{{ formatearFactura(lead.factura) }}</span></td>
              <td data-label="Acciones" class="leads-table__acciones leads-table__col-derecha">
                <button
                  v-if="mostrarEditar"
                  type="button"
                  class="leads-table__boton-icono"
                  :aria-label="`Editar lead de ${lead.contact || 'este lead'}`"
                  :title="`Editar lead de ${lead.contact || 'este lead'}`"
                  @click="emit('editar-lead', lead)"
                >
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" />
                  </svg>
                </button>
                <button
                  v-if="mostrarArchivar"
                  type="button"
                  class="leads-table__boton-icono leads-table__boton-archivar"
                  :aria-label="`Archivar lead de ${lead.contact || 'este lead'}`"
                  :title="`Archivar lead de ${lead.contact || 'este lead'}`"
                  @click="emit('archivar-lead', lead)"
                >
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3.5 5.5A1.5 1.5 0 015 4h10a1.5 1.5 0 011.5 1.5v1.5h-13V5.5zM3.5 8.5h13V14a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 14V8.5zM8 11h4" />
                  </svg>
                </button>
                <button
                  v-if="mostrarEliminar"
                  type="button"
                  class="leads-table__boton-icono leads-table__boton-eliminar"
                  :aria-label="`Eliminar lead de ${lead.contact || 'este lead'}`"
                  :title="`Eliminar lead de ${lead.contact || 'este lead'}`"
                  @click="emit('eliminar-lead', lead)"
                >
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6.5 0l.6 9.4A1.5 1.5 0 007.6 17h4.8a1.5 1.5 0 001.5-1.6L14.5 6M8.5 9v5M11.5 9v5" />
                  </svg>
                </button>
                <button
                  v-if="mostrarReactivar"
                  type="button"
                  class="leads-table__boton-icono leads-table__boton-reactivar"
                  :aria-label="`Reactivar lead de ${lead.contact || 'este lead'}`"
                  :title="`Reactivar lead de ${lead.contact || 'este lead'}`"
                  @click="emit('reactivar-lead', lead)"
                >
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M15.5 6.5A6 6 0 105.7 9.5M15.5 6.5V3M15.5 6.5H12" />
                  </svg>
                </button>
              </td>
            </tr>
            <tr v-if="leadExpandidoId === lead.id" class="leads-table__fila-expandida">
              <td colspan="7">
                <div class="leads-table__historial">
                  <div class="leads-table__historial-cabecera">
                    <h3 class="leads-table__historial-titulo">Historial de seguimientos</h3>
                    <span class="leads-table__historial-contador">{{ seguimientosOrdenados(lead).length }}</span>
                    <button
                      v-if="permitirAgregarSeguimiento"
                      type="button"
                      class="leads-table__boton-icono"
                      aria-label="Agregar seguimiento"
                      title="Agregar seguimiento"
                      @click="emit('abrir-seguimientos', lead)"
                    >
                      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 4.5A1.5 1.5 0 014.5 3h8A1.5 1.5 0 0114 4.5v6a1.5 1.5 0 01-1.5 1.5H7l-3 3v-3H4.5A1.5 1.5 0 013 10.5v-6z" />
                        <path d="M6.5 6.5h4M6.5 8.5h2.5" />
                      </svg>
                    </button>
                  </div>
                  <div class="leads-table__meta">
                    <span class="leads-table__meta-chip">
                      <span class="leads-table__meta-etiqueta">Fuente</span>
                      <span class="leads-table__meta-valor">{{ lead.source || '—' }}</span>
                    </span>
                    <span class="leads-table__meta-chip">
                      <span class="leads-table__meta-etiqueta">Creación</span>
                      <span class="leads-table__meta-valor cifra">{{ formatearFechaCompleta(lead.created_at) }}</span>
                    </span>
                    <span class="leads-table__meta-chip">
                      <span class="leads-table__meta-etiqueta">Estado</span>
                      <span class="leads-table__estado" :class="`leads-table__estado--${getStatus(lead)}`">
                        {{ getStatus(lead) }}
                      </span>
                    </span>
                    <span v-if="lead.sub_estado_proceso" class="leads-table__meta-chip">
                      <span class="leads-table__meta-etiqueta">Sub-estado</span>
                      <span class="leads-table__meta-valor">{{ etiquetaSubEstado(lead.sub_estado_proceso) }}</span>
                    </span>
                  </div>
                  <p v-if="seguimientosOrdenados(lead).length === 0" class="leads-table__historial-vacio">
                    Este lead todavía no tiene seguimientos registrados.
                  </p>
                  <ul v-else class="leads-table__historial-lista">
                    <li v-for="seguimiento in seguimientosOrdenados(lead)" :key="seguimiento.id">
                      <span class="cifra">{{ formatearFechaCompleta(seguimiento.fecha) }}</span> — {{ seguimiento.texto }}
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="leadsFiltrados.length === 0">
            <td colspan="7" class="leads-table__sin-resultados">No hay leads que coincidan con la búsqueda.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Nota: los media queries no admiten var() como condición, por eso se repite
   en px el valor de --breakpoint-tabla (640px). El rango 640-900px conserva
   intacto el tratamiento sticky de las columnas izquierda/derecha. */

.leads-table__barra {
  margin-bottom: 1rem;
}

.leads-table__busqueda {
  width: 100%;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-borde);
  font-size: 0.9rem;
}

.leads-table__contenedor {
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.leads-table__tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.leads-table__tabla th,
.leads-table__tabla td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eef0f3;
  white-space: nowrap;
}

.leads-table__boton-orden {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: inherit;
  color: inherit;
  cursor: pointer;
}

.leads-table__col-izquierda,
.leads-table__col-derecha {
  position: sticky;
  z-index: 2;
  background: #fff;
}

.leads-table__col-izquierda {
  left: 0;
  box-shadow: 4px 0 6px -4px rgba(0, 0, 0, 0.2);
}

.leads-table__col-derecha {
  right: 0;
  box-shadow: -4px 0 6px -4px rgba(0, 0, 0, 0.2);
}

.leads-table__boton-expandir {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-borde);
  background: #f8f9fb;
  cursor: pointer;
}

.leads-table__boton-expandir svg {
  transition: transform 0.15s ease;
}

.leads-table__boton-expandir--abierto svg {
  transform: rotate(90deg);
}

.leads-table__fila--convertido {
  border-left: 3px solid var(--color-exito);
}

.leads-table__fila--rechazado {
  border-left: 3px solid var(--color-error);
}

.leads-table__fila--proceso {
  border-left: 3px solid var(--color-advertencia);
}

.leads-table__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-borde-tarjeta);
  color: var(--color-texto);
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: var(--espacio-2);
  vertical-align: middle;
}

.leads-table__nombre-contacto {
  vertical-align: middle;
}

.leads-table__estado {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: capitalize;
  background: #eef0f3;
}

.leads-table__estado--convertido {
  background: var(--color-exito-fondo);
  color: var(--color-exito);
}

.leads-table__estado--rechazado {
  background: var(--color-error-fondo);
  color: var(--color-error);
}

.leads-table__estado--proceso {
  background: var(--color-advertencia-fondo);
  color: var(--color-advertencia);
}

.leads-table__acciones {
  display: flex;
  gap: 0.4rem;
  white-space: nowrap;
}

.leads-table__boton-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-borde);
  background: #fff;
  color: var(--color-texto);
  cursor: pointer;
}

.leads-table__boton-eliminar {
  border-color: #e3b3ae;
  color: #a83a2f;
}

.leads-table__boton-archivar,
.leads-table__boton-reactivar {
  border-color: #b7c6e3;
  color: #2f5aa8;
}

.leads-table__fila-expandida td {
  background: #fafbfc;
  white-space: normal;
}

.leads-table__historial-cabecera {
  display: flex;
  align-items: center;
  gap: var(--espacio-2);
  margin-bottom: 0.5rem;
}

.leads-table__historial-titulo {
  margin: 0;
  font-size: 0.9rem;
}

.leads-table__historial-contador {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: var(--color-borde-tarjeta);
  color: var(--color-texto-secundario);
  font-size: 0.75rem;
  font-weight: 600;
}

.leads-table__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-3);
  margin-bottom: var(--espacio-3);
}

.leads-table__meta-chip {
  display: flex;
  align-items: center;
  gap: var(--espacio-1);
  padding: 0.3rem 0.6rem;
  border-radius: var(--radio-borde);
  background: var(--color-borde-tarjeta);
  font-size: 0.8rem;
}

.leads-table__meta-etiqueta {
  color: var(--color-texto-terciario);
  font-weight: 600;
}

.leads-table__meta-valor {
  color: var(--color-texto);
}

.leads-table__historial-vacio {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
}

.leads-table__historial-lista {
  margin: 0;
  padding-left: 0;
  list-style: none;
  font-size: 0.85rem;
}

.leads-table__historial-lista li {
  position: relative;
  padding-left: 1.25rem;
  padding-bottom: var(--espacio-3);
}

.leads-table__historial-lista li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.35rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primario);
}

.leads-table__historial-lista li::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0.75rem;
  bottom: 0;
  width: 2px;
  background: var(--color-borde-tarjeta);
}

.leads-table__historial-lista li:last-child {
  padding-bottom: 0;
}

.leads-table__historial-lista li:last-child::after {
  content: none;
}

.leads-table__sin-resultados {
  text-align: center;
  color: #6b7280;
  padding: 1.25rem;
}

/* Colapso a tarjetas por debajo de --breakpoint-tabla (640px).
   El rango 640-900px arriba no se toca: mantiene el scroll horizontal + sticky. */
@media (max-width: 639px) {
  .leads-table__tabla,
  .leads-table__tabla tbody,
  .leads-table__tabla tr {
    display: block;
    width: 100%;
  }

  .leads-table__tabla thead {
    display: none;
  }

  .leads-table__tabla td {
    display: block;
    width: 100%;
    padding: var(--espacio-2) var(--espacio-3);
    border-bottom: 1px solid var(--color-borde-tarjeta);
    text-align: left;
    white-space: normal;
  }

  .leads-table__tabla td:last-child {
    border-bottom: none;
  }

  .leads-table__tabla td::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
    font-size: var(--tamano-pequeno);
    color: var(--color-texto-secundario);
    margin-bottom: var(--espacio-1);
  }

  /* La columna izquierda/derecha pierde el comportamiento sticky en modo tarjeta */
  .leads-table__col-izquierda,
  .leads-table__col-derecha {
    position: static;
    box-shadow: none;
    background: transparent;
  }

  /* El botón de expandir no tiene data-label: se omite la etiqueta vacía */
  .leads-table__col-izquierda::before {
    content: none;
  }

  .leads-table__fila {
    border: 1px solid var(--color-borde-tarjeta);
    border-radius: var(--radio-tarjeta);
    margin-bottom: var(--espacio-4);
    padding: var(--espacio-2) 0;
    background: var(--color-fondo);
  }

  /* Cuando la fila tiene seguimientos expandidos, se pega visualmente a la tarjeta siguiente */
  .leads-table__fila:has(+ .leads-table__fila-expandida) {
    margin-bottom: 0;
    border-bottom: none;
    border-radius: var(--radio-tarjeta) var(--radio-tarjeta) 0 0;
  }

  .leads-table__fila-expandida {
    border: 1px solid var(--color-borde-tarjeta);
    border-top: none;
    border-radius: 0 0 var(--radio-tarjeta) var(--radio-tarjeta);
    margin-bottom: var(--espacio-4);
  }

  .leads-table__fila-expandida td {
    padding: var(--espacio-3);
    border-bottom: none;
  }

  .leads-table__fila-expandida td::before {
    content: none;
  }

  .leads-table__fila .leads-table__acciones {
    display: flex;
    flex-wrap: wrap;
    gap: var(--espacio-2);
  }

  /* El td Contacto se vuelve la cabecera visual de la tarjeta: avatar + nombre en línea,
     sin la etiqueta "Contacto" como si fuera un dato más. */
  .leads-table__tabla td[data-label="Contacto"] {
    display: flex;
    align-items: center;
  }

  .leads-table__tabla td[data-label="Contacto"]::before {
    content: none;
  }

  .leads-table__tabla td[data-label="Contacto"] .leads-table__avatar {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
  }

  .leads-table__nombre-contacto {
    font-weight: 600;
  }

  .leads-table__sin-resultados {
    display: block;
  }
}
</style>
