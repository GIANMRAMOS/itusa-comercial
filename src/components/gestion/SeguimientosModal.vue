<script setup>
import { computed, ref } from 'vue'
import { getTodayGMT5, parseDateGMT5 } from '@/composables/useDateGMT5'
import { getStatus } from '@/lib/leadMetrics'
import { OPCIONES_SUB_ESTADO_PROCESO, OPCIONES_MOTIVO_RECHAZO, construirActualizacionEstado } from '@/lib/leadEstado'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const props = defineProps({
  lead: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['agregar-seguimiento', 'editar-seguimiento', 'eliminar-seguimiento', 'close'])

const nuevaFecha = ref(getTodayGMT5())
const nuevoTexto = ref('')
const errorValidacion = ref('')

// Id del seguimiento que se está editando; null cuando el form está en modo alta.
const seguimientoEnEdicionId = ref(null)

// Estado/sub-estado del lead: se editan solo al agregar un seguimiento nuevo (modo alta),
// nunca al editar un seguimiento histórico. Se inicializan con el estado/sub-estado vigente.
const estado = ref(getStatus(props.lead))
const subEstadoProceso = ref(props.lead?.sub_estado_proceso || '')
const fechaSubEstado = ref(props.lead?.fecha_sub_estado || getTodayGMT5())
const conversionAt = ref(props.lead?.conversion_at || getTodayGMT5())
const rechazoAt = ref(props.lead?.rechazo_at || getTodayGMT5())
const motivoRechazo = ref(props.lead?.motivo_rechazo || '')

const mostrarConfirmacionEliminar = ref(false)
const seguimientoPendienteEliminar = ref(null)

const seguimientosOrdenados = computed(() => {
  const seguimientos = Array.isArray(props.lead?.seguimientos) ? [...props.lead.seguimientos] : []
  return seguimientos.sort((a, b) => {
    const fechaA = parseDateGMT5(a.fecha)
    const fechaB = parseDateGMT5(b.fecha)
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

function manejarSubmitForm() {
  errorValidacion.value = ''

  if (!nuevoTexto.value.trim()) {
    errorValidacion.value = 'El texto del seguimiento es obligatorio.'
    return
  }

  if (seguimientoEnEdicionId.value) {
    if (!nuevaFecha.value) {
      errorValidacion.value = 'La fecha del seguimiento es obligatoria.'
      return
    }

    emit('editar-seguimiento', {
      id: seguimientoEnEdicionId.value,
      fecha: nuevaFecha.value,
      texto: nuevoTexto.value.trim(),
    })
    seguimientoEnEdicionId.value = null
  } else {
    if (estado.value === 'proceso') {
      if (!subEstadoProceso.value || !fechaSubEstado.value) {
        errorValidacion.value = 'El sub-estado y la fecha son obligatorios.'
        return
      }
    } else if (estado.value === 'convertido') {
      if (!conversionAt.value) {
        errorValidacion.value = 'La fecha de convertido es obligatoria.'
        return
      }
    } else if (estado.value === 'rechazado') {
      if (!motivoRechazo.value || !rechazoAt.value) {
        errorValidacion.value = 'El motivo y la fecha de rechazo son obligatorios.'
        return
      }
    }

    const actualizacionEstado = construirActualizacionEstado({
      estado: estado.value,
      subEstadoProceso: subEstadoProceso.value,
      fechaSubEstado: fechaSubEstado.value,
      conversionAt: conversionAt.value,
      rechazoAt: rechazoAt.value,
      motivoRechazo: motivoRechazo.value,
      contactadoAt: props.lead?.contactado_at,
      calificadoAt: props.lead?.calificado_at,
      visitaAt: props.lead?.visita_at,
    })

    emit('agregar-seguimiento', {
      fecha: getTodayGMT5(),
      texto: nuevoTexto.value.trim(),
      actualizacionEstado,
    })
    emit('close')
  }

  nuevoTexto.value = ''
  nuevaFecha.value = getTodayGMT5()
}

function iniciarEdicion(seguimiento) {
  seguimientoEnEdicionId.value = seguimiento.id
  nuevaFecha.value = seguimiento.fecha
  nuevoTexto.value = seguimiento.texto
}

function cancelarEdicion() {
  seguimientoEnEdicionId.value = null
  nuevaFecha.value = getTodayGMT5()
  nuevoTexto.value = ''
}

function pedirConfirmacionEliminar(seguimiento) {
  seguimientoPendienteEliminar.value = seguimiento
  mostrarConfirmacionEliminar.value = true
}

function cancelarEliminacion() {
  mostrarConfirmacionEliminar.value = false
  seguimientoPendienteEliminar.value = null
}

function confirmarEliminacion() {
  if (seguimientoPendienteEliminar.value) {
    emit('eliminar-seguimiento', seguimientoPendienteEliminar.value.id)
  }
  cancelarEliminacion()
}
</script>

<template>
  <div class="seguimientos-modal">
    <div class="seguimientos-modal__fondo"></div>
    <div class="seguimientos-modal__panel">
      <h2 class="seguimientos-modal__titulo">
        Seguimientos de {{ props.lead?.contact || props.lead?.company || 'lead' }}
      </h2>

      <ul v-if="seguimientosOrdenados.length > 0" class="seguimientos-modal__lista">
        <li v-for="seguimiento in seguimientosOrdenados" :key="seguimiento.id" class="seguimientos-modal__item">
          <div>
            <strong><span class="cifra">{{ formatearFechaCompleta(seguimiento.fecha) }}</span></strong>
            <p class="seguimientos-modal__texto">{{ seguimiento.texto }}</p>
          </div>
          <div class="seguimientos-modal__item-acciones">
            <button
              type="button"
              class="seguimientos-modal__boton-editar"
              @click="iniciarEdicion(seguimiento)"
            >
              Editar
            </button>
            <button
              type="button"
              class="seguimientos-modal__boton-eliminar"
              @click="pedirConfirmacionEliminar(seguimiento)"
            >
              Eliminar
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="seguimientos-modal__vacio">Todavía no hay seguimientos registrados para este lead.</p>

      <form class="seguimientos-modal__form" @submit.prevent="manejarSubmitForm">
        <template v-if="!seguimientoEnEdicionId">
          <div class="seguimientos-modal__fila">
            <label class="seguimientos-modal__campo">
              <span>Estado</span>
              <select v-model="estado" required>
                <option value="proceso">En Proceso</option>
                <option value="rechazado">Rechazado</option>
                <option value="convertido">Convertido</option>
              </select>
            </label>

            <label v-if="estado === 'proceso'" class="seguimientos-modal__campo">
              <span>Sub-estado</span>
              <select v-model="subEstadoProceso" required>
                <option value="" disabled>Seleccionar...</option>
                <option v-for="opcion in OPCIONES_SUB_ESTADO_PROCESO" :key="opcion.value" :value="opcion.value">
                  {{ opcion.label }}
                </option>
              </select>
            </label>

            <label v-else-if="estado === 'rechazado'" class="seguimientos-modal__campo">
              <span>Motivo de rechazo</span>
              <select v-model="motivoRechazo" required>
                <option value="" disabled>Seleccionar...</option>
                <option v-for="opcion in OPCIONES_MOTIVO_RECHAZO" :key="opcion.value" :value="opcion.value">
                  {{ opcion.label }}
                </option>
              </select>
            </label>
          </div>

          <label v-if="estado === 'proceso'" class="seguimientos-modal__campo">
            <span>Prox. fecha a contactar</span>
            <input v-model="fechaSubEstado" type="date" required />
          </label>

          <label v-if="estado === 'convertido'" class="seguimientos-modal__campo">
            <span>Fecha de convertido</span>
            <input v-model="conversionAt" type="date" required />
          </label>

          <label v-if="estado === 'rechazado'" class="seguimientos-modal__campo">
            <span>Fecha de rechazado</span>
            <input v-model="rechazoAt" type="date" required />
          </label>
        </template>

        <label v-else class="seguimientos-modal__campo">
          <span>Fecha</span>
          <input v-model="nuevaFecha" type="date" required />
        </label>

        <label class="seguimientos-modal__campo seguimientos-modal__campo--texto">
          <span>Anotaciones</span>
          <textarea v-model="nuevoTexto" rows="5" placeholder="Describí el seguimiento..."></textarea>
        </label>
        <p v-if="errorValidacion" class="seguimientos-modal__error">{{ errorValidacion }}</p>
        <div class="seguimientos-modal__acciones">
          <button type="button" class="seguimientos-modal__boton-cerrar" @click="emit('close')">Cerrar</button>
          <button
            v-if="seguimientoEnEdicionId"
            type="button"
            class="seguimientos-modal__boton-cerrar"
            @click="cancelarEdicion"
          >
            Cancelar edición
          </button>
          <button type="submit" class="seguimientos-modal__boton-agregar">
            {{ seguimientoEnEdicionId ? 'Guardar cambios' : 'Agregar seguimiento' }}
          </button>
        </div>
      </form>
    </div>

    <ConfirmDialog
      :visible="mostrarConfirmacionEliminar"
      titulo="Eliminar seguimiento"
      mensaje="¿Eliminar este seguimiento? Esta acción no se puede deshacer."
      texto-confirmar="Eliminar"
      @confirm="confirmarEliminacion"
      @cancel="cancelarEliminacion"
    />
  </div>
</template>

<style scoped>
.seguimientos-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.seguimientos-modal__fondo {
  position: absolute;
  inset: 0;
  background: rgba(15, 20, 30, 0.45);
}

.seguimientos-modal__panel {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  background: #fff;
  border-radius: var(--radio-tarjeta);
  padding: 1.5rem;
  box-shadow: var(--sombra-modal);
}

.seguimientos-modal__titulo {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.seguimientos-modal__lista {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.seguimientos-modal__item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem;
  border: 1px solid var(--color-borde);
  border-radius: 6px;
  font-size: 0.85rem;
}

.seguimientos-modal__texto {
  margin: 0.25rem 0 0;
}

.seguimientos-modal__item-acciones {
  flex-shrink: 0;
  display: flex;
  gap: 0.4rem;
}

.seguimientos-modal__boton-editar {
  flex-shrink: 0;
  padding: 0.3rem 0.55rem;
  border: 1px solid #b7c3d6;
  border-radius: 6px;
  background: #fff;
  color: #33507a;
  font-size: 0.8rem;
  cursor: pointer;
}

.seguimientos-modal__boton-eliminar {
  flex-shrink: 0;
  padding: 0.3rem 0.55rem;
  border: 1px solid #e3b3ae;
  border-radius: 6px;
  background: #fff;
  color: #a83a2f;
  font-size: 0.8rem;
  cursor: pointer;
}

.seguimientos-modal__vacio {
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0 0 1rem;
}

.seguimientos-modal__form {
  border-top: 1px solid var(--color-borde);
  padding-top: 1rem;
}

.seguimientos-modal__fila {
  display: flex;
  gap: 0.75rem;
}

.seguimientos-modal__fila .seguimientos-modal__campo {
  flex: 1;
  min-width: 0;
}

.seguimientos-modal__campo {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.seguimientos-modal__campo input,
.seguimientos-modal__campo textarea {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-borde);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.seguimientos-modal__campo--texto textarea {
  min-height: 8rem;
  width: 100%;
  resize: vertical;
}

.seguimientos-modal__campo input:focus,
.seguimientos-modal__campo textarea:focus {
  border-color: var(--color-borde-foco);
  box-shadow: var(--sombra-foco);
  outline: none;
}

.seguimientos-modal__error {
  margin: 0 0 0.75rem;
  color: var(--color-error);
  font-size: 0.85rem;
}

.seguimientos-modal__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.seguimientos-modal__boton-cerrar {
  padding: 0.55rem 1rem;
  border: 1px solid #d0d3d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.seguimientos-modal__boton-agregar {
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primario);
  color: #fff;
  cursor: pointer;
}

.seguimientos-modal__boton-agregar:hover {
  background: var(--color-primario-hover);
}
</style>
