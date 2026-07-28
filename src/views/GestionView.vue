<script setup>
import { computed, onMounted, ref } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import LeadsTable from '@/components/gestion/LeadsTable.vue'
import LeadFormModal from '@/components/gestion/LeadFormModal.vue'
import SeguimientosModal from '@/components/gestion/SeguimientosModal.vue'
import AddLeadButton from '@/components/gestion/AddLeadButton.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import LoadingOverlay from '@/components/shared/LoadingOverlay.vue'

const leadsStore = useLeadsStore()

const mostrarFormulario = ref(false)
const leadEnEdicion = ref(null)

const mostrarSeguimientos = ref(false)
const leadSeguimientos = ref(null)

const mostrarConfirmacionEliminar = ref(false)
const leadPendienteEliminar = ref(null)

onMounted(() => {
  leadsStore.fetchLeads()
})

// Fuentes ya cargadas en el sistema, para el select de Fuente del formulario de lead.
const fuentesDisponibles = computed(() =>
  [...new Set(leadsStore.leads.map((lead) => lead.source).filter(Boolean))].sort()
)

function abrirAltaLead() {
  leadEnEdicion.value = null
  mostrarFormulario.value = true
}

function abrirEdicionLead(lead) {
  leadEnEdicion.value = lead
  mostrarFormulario.value = true
}

function cerrarFormulario() {
  mostrarFormulario.value = false
  leadEnEdicion.value = null
}

async function guardarLead(payload) {
  const esAlta = !leadEnEdicion.value
  const resultado = esAlta
    ? await leadsStore.createLead(payload)
    : await leadsStore.updateLead(leadEnEdicion.value.id, payload)

  if (resultado.success) {
    // El texto de "Seguimiento inicial" se registra como el primer seguimiento del historial,
    // solo al dar de alta (no en cada edición, para no duplicar registros).
    if (esAlta && payload.seguimiento_inicial?.trim()) {
      await leadsStore.addSeguimiento(resultado.data.id, {
        fecha: resultado.data.created_at,
        texto: payload.seguimiento_inicial.trim(),
      })
    }
    cerrarFormulario()
  }
}

function pedirConfirmacionEliminar(lead) {
  leadPendienteEliminar.value = lead
  mostrarConfirmacionEliminar.value = true
}

function cancelarEliminacion() {
  mostrarConfirmacionEliminar.value = false
  leadPendienteEliminar.value = null
}

async function confirmarEliminacion() {
  if (leadPendienteEliminar.value) {
    await leadsStore.deleteLead(leadPendienteEliminar.value.id)
  }
  cancelarEliminacion()
}

function abrirSeguimientos(lead) {
  leadSeguimientos.value = lead
  mostrarSeguimientos.value = true
}

function cerrarSeguimientos() {
  mostrarSeguimientos.value = false
  leadSeguimientos.value = null
}

async function agregarSeguimiento(datosSeguimiento) {
  if (!leadSeguimientos.value) return
  await leadsStore.addSeguimiento(leadSeguimientos.value.id, datosSeguimiento)
}

async function eliminarSeguimiento(seguimientoId) {
  if (!leadSeguimientos.value) return
  await leadsStore.deleteSeguimiento(seguimientoId, leadSeguimientos.value.id)
}

async function editarSeguimiento(datos) {
  if (!leadSeguimientos.value) return
  await leadsStore.updateSeguimiento(datos.id, leadSeguimientos.value.id, {
    fecha: datos.fecha,
    texto: datos.texto,
  })
}

async function archivarLead(lead) {
  await leadsStore.archivarLead(lead.id)
}
</script>

<template>
  <div class="gestion-view">
    <header class="gestion-view__cabecera">
      <div class="gestion-view__fila-titulo">
        <h1 class="gestion-view__titulo">Gestión de leads</h1>
        <AddLeadButton @click="abrirAltaLead" />
      </div>
      <p v-if="leadsStore.error" class="gestion-view__error">{{ leadsStore.error }}</p>
    </header>

    <LoadingOverlay :visible="leadsStore.loading" mensaje="Cargando leads..." />

    <LeadsTable
      :leads="leadsStore.leads"
      :mostrar-archivar="true"
      @editar-lead="abrirEdicionLead"
      @eliminar-lead="pedirConfirmacionEliminar"
      @abrir-seguimientos="abrirSeguimientos"
      @archivar-lead="archivarLead"
    />

    <ConfirmDialog
      :visible="mostrarConfirmacionEliminar"
      titulo="Eliminar lead"
      :mensaje="`¿Eliminar a ${leadPendienteEliminar?.contact || leadPendienteEliminar?.company || 'este lead'}? Esta acción no se puede deshacer.`"
      texto-confirmar="Eliminar"
      @confirm="confirmarEliminacion"
      @cancel="cancelarEliminacion"
    />

    <LeadFormModal
      v-if="mostrarFormulario"
      :key="leadEnEdicion?.id ?? 'nuevo'"
      :lead="leadEnEdicion"
      :fuentes-disponibles="fuentesDisponibles"
      @save="guardarLead"
      @close="cerrarFormulario"
    />

    <SeguimientosModal
      v-if="mostrarSeguimientos"
      :key="leadSeguimientos?.id"
      :lead="leadSeguimientos"
      @agregar-seguimiento="agregarSeguimiento"
      @eliminar-seguimiento="eliminarSeguimiento"
      @editar-seguimiento="editarSeguimiento"
      @close="cerrarSeguimientos"
    />
  </div>
</template>

<style scoped>
.gestion-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.gestion-view__cabecera {
  margin-bottom: 1.25rem;
}

.gestion-view__fila-titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-3);
}

.gestion-view__titulo {
  margin: 0;
  font-size: 1.5rem;
}

.gestion-view__error {
  margin: 0;
  color: #c0392b;
  font-size: 0.9rem;
}
</style>
