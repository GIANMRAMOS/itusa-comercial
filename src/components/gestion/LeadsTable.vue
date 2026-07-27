<script setup>
import { computed, ref } from 'vue'
import { getStatus, getDaysInProcess } from '@/lib/leadMetrics'
import { parseDateGMT5 } from '@/composables/useDateGMT5'

const props = defineProps({
  leads: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['editar-lead', 'eliminar-lead', 'abrir-seguimientos'])

const busqueda = ref('')
const leadExpandidoId = ref(null)

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
            <th>Fuente</th>
            <th>Contacto</th>
            <th>Empresa</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th>Creación</th>
            <th>Estado</th>
            <th>Factura</th>
            <th>Días en proceso</th>
            <th class="leads-table__col-derecha">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="lead in leadsFiltrados" :key="lead.id">
            <tr class="leads-table__fila">
              <td class="leads-table__col-izquierda">
                <button
                  type="button"
                  class="leads-table__boton-expandir"
                  :aria-expanded="leadExpandidoId === lead.id"
                  @click="alternarExpandido(lead.id)"
                >
                  {{ leadExpandidoId === lead.id ? '−' : '+' }}
                </button>
              </td>
              <td>{{ lead.source || '—' }}</td>
              <td>{{ lead.contact || '—' }}</td>
              <td>{{ lead.company || '—' }}</td>
              <td>{{ lead.email || '—' }}</td>
              <td>{{ lead.phone || '—' }}</td>
              <td>{{ formatearFechaCompleta(lead.created_at) }}</td>
              <td>
                <span class="leads-table__estado" :class="`leads-table__estado--${getStatus(lead)}`">
                  {{ getStatus(lead) }}
                </span>
              </td>
              <td>{{ formatearFactura(lead.factura) }}</td>
              <td>{{ getDaysInProcess(lead) }}</td>
              <td class="leads-table__acciones leads-table__col-derecha">
                <button type="button" @click="emit('editar-lead', lead)">Editar</button>
                <button type="button" @click="emit('abrir-seguimientos', lead)">Seguimientos</button>
                <button type="button" class="leads-table__boton-eliminar" @click="emit('eliminar-lead', lead)">
                  Eliminar
                </button>
              </td>
            </tr>
            <tr v-if="leadExpandidoId === lead.id" class="leads-table__fila-expandida">
              <td colspan="11">
                <div class="leads-table__historial">
                  <h3 class="leads-table__historial-titulo">Historial de seguimientos</h3>
                  <p v-if="seguimientosOrdenados(lead).length === 0" class="leads-table__historial-vacio">
                    Este lead todavía no tiene seguimientos registrados.
                  </p>
                  <ul v-else class="leads-table__historial-lista">
                    <li v-for="seguimiento in seguimientosOrdenados(lead)" :key="seguimiento.id">
                      <strong>{{ formatearFechaCompleta(seguimiento.fecha) }}</strong> — {{ seguimiento.texto }}
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="leadsFiltrados.length === 0">
            <td colspan="11" class="leads-table__sin-resultados">No hay leads que coincidan con la búsqueda.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.leads-table__barra {
  margin-bottom: 1rem;
}

.leads-table__busqueda {
  width: 100%;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d0d3d9;
  border-radius: 6px;
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
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid #d0d3d9;
  border-radius: 4px;
  background: #f8f9fb;
  cursor: pointer;
}

.leads-table__estado {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: capitalize;
  background: #eef0f3;
}

.leads-table__estado--convertido {
  background: #d7f5df;
  color: #1e7a3d;
}

.leads-table__estado--rechazado {
  background: #fbe0de;
  color: #a83a2f;
}

.leads-table__estado--proceso {
  background: #fdf1d6;
  color: #96700d;
}

.leads-table__acciones {
  display: flex;
  gap: 0.4rem;
  white-space: nowrap;
}

.leads-table__acciones button {
  padding: 0.3rem 0.55rem;
  border: 1px solid #d0d3d9;
  border-radius: 6px;
  background: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.leads-table__boton-eliminar {
  border-color: #e3b3ae;
  color: #a83a2f;
}

.leads-table__fila-expandida td {
  background: #fafbfc;
  white-space: normal;
}

.leads-table__historial-titulo {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.leads-table__historial-vacio {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
}

.leads-table__historial-lista {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
}

.leads-table__historial-lista li {
  margin-bottom: 0.25rem;
}

.leads-table__sin-resultados {
  text-align: center;
  color: #6b7280;
  padding: 1.25rem;
}
</style>
