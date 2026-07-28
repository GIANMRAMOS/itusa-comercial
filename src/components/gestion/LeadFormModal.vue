<script setup>
import { ref } from 'vue'
import { getTodayGMT5 } from '@/composables/useDateGMT5'
import { getStatus } from '@/lib/leadMetrics'

const props = defineProps({
  lead: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save', 'close'])

function crearFormularioInicial() {
  if (props.lead) {
    return {
      source: props.lead.source || '',
      contact: props.lead.contact || '',
      company: props.lead.company || '',
      email: props.lead.email || '',
      phone: props.lead.phone || '',
      created_at: props.lead.created_at || '',
      requerimiento: props.lead.requerimiento || '',
      active_campaign: !!props.lead.active_campaign,
      seguimiento_inicial: props.lead.seguimiento_inicial || '',
      contactado_at: props.lead.contactado_at || '',
      calificado_at: props.lead.calificado_at || '',
      no_calificado_at: props.lead.no_calificado_at || '',
      visita_at: props.lead.visita_at || '',
      propuesta_at: props.lead.propuesta_at || '',
      conversion_at: props.lead.conversion_at || '',
      rechazo_at: props.lead.rechazo_at || '',
      sub_estado_proceso: props.lead.sub_estado_proceso || '',
      fecha_sub_estado: props.lead.fecha_sub_estado || '',
      motivo_rechazo: props.lead.motivo_rechazo || '',
      factura: props.lead.factura ?? '',
      review: props.lead.review || '',
    }
  }

  return {
    source: '',
    contact: '',
    company: '',
    email: '',
    phone: '',
    created_at: getTodayGMT5(),
    requerimiento: '',
    active_campaign: false,
    seguimiento_inicial: '',
    contactado_at: '',
    calificado_at: '',
    no_calificado_at: '',
    visita_at: '',
    propuesta_at: '',
    conversion_at: '',
    rechazo_at: '',
    sub_estado_proceso: '',
    fecha_sub_estado: '',
    motivo_rechazo: '',
    factura: '',
    review: '',
  }
}

const formulario = ref(crearFormularioInicial())
const errorValidacion = ref('')

// Estado de UI (no es columna): condiciona qué bloque del formulario se muestra.
const estado = ref(props.lead ? getStatus(props.lead) : 'proceso')

const camposFecha = [
  'created_at',
  'contactado_at',
  'calificado_at',
  'no_calificado_at',
  'visita_at',
  'propuesta_at',
  'conversion_at',
  'rechazo_at',
]

// Sub-estados de proceso que, además de marcar contacto, ya implican calificación y/o visita
// (mapeo cumulativo: Follow-up también contactó, Citado también contactó y calificó).
const SUB_ESTADOS_CONTACTO = ['llamar', 'volver_a_llamar', 'enviar_correo', 'follow_up', 'citado']
const SUB_ESTADOS_CALIFICADO = ['follow_up', 'citado']
const SUB_ESTADOS_VISITA = ['citado']

function construirPayload() {
  const payload = { ...formulario.value }

  camposFecha.forEach((campo) => {
    payload[campo] = payload[campo] || null
  })

  payload.factura = payload.factura === '' || payload.factura === null ? null : Number(payload.factura)
  payload.active_campaign = !!payload.active_campaign

  if (estado.value === 'proceso') {
    const fecha = formulario.value.fecha_sub_estado
    const subEstado = formulario.value.sub_estado_proceso

    // Avance forward-only: nunca sobrescribir una etapa del embudo que ya tenía valor.
    if (SUB_ESTADOS_CONTACTO.includes(subEstado) && !payload.contactado_at) {
      payload.contactado_at = fecha
    }
    if (SUB_ESTADOS_CALIFICADO.includes(subEstado) && !payload.calificado_at) {
      payload.calificado_at = fecha
    }
    if (SUB_ESTADOS_VISITA.includes(subEstado) && !payload.visita_at) {
      payload.visita_at = fecha
    }

    payload.conversion_at = null
    payload.rechazo_at = null
    payload.motivo_rechazo = null
  } else if (estado.value === 'convertido') {
    payload.rechazo_at = null
    payload.motivo_rechazo = null
    payload.sub_estado_proceso = null
    payload.fecha_sub_estado = null
  } else if (estado.value === 'rechazado') {
    payload.conversion_at = null
    payload.sub_estado_proceso = null
    payload.fecha_sub_estado = null
  }

  return payload
}

function enviarFormulario() {
  errorValidacion.value = ''

  if (!formulario.value.contact.trim()) {
    errorValidacion.value = 'El contacto es obligatorio.'
    return
  }
  if (!formulario.value.source.trim()) {
    errorValidacion.value = 'La fuente es obligatoria.'
    return
  }

  if (estado.value === 'proceso') {
    if (!formulario.value.sub_estado_proceso || !formulario.value.fecha_sub_estado) {
      errorValidacion.value = 'El sub-estado y la fecha son obligatorios.'
      return
    }
  } else if (estado.value === 'convertido') {
    if (!formulario.value.conversion_at) {
      errorValidacion.value = 'La fecha de convertido es obligatoria.'
      return
    }
  } else if (estado.value === 'rechazado') {
    if (!formulario.value.motivo_rechazo || !formulario.value.rechazo_at) {
      errorValidacion.value = 'El motivo y la fecha de rechazo son obligatorios.'
      return
    }
  }

  emit('save', construirPayload())
}
</script>

<template>
  <div class="lead-form-modal">
    <div class="lead-form-modal__fondo" @click="emit('close')"></div>
    <div class="lead-form-modal__panel">
      <h2 class="lead-form-modal__titulo">{{ props.lead ? 'Editar lead' : 'Nuevo lead' }}</h2>

      <form class="lead-form-modal__form" @submit.prevent="enviarFormulario">
        <div class="lead-form-modal__grid">
          <label class="lead-form-modal__campo">
            <span>Fuente</span>
            <input v-model="formulario.source" type="text" required />
          </label>

          <label class="lead-form-modal__campo">
            <span>Contacto</span>
            <input v-model="formulario.contact" type="text" required />
          </label>

          <label class="lead-form-modal__campo">
            <span>Empresa</span>
            <input v-model="formulario.company" type="text" />
          </label>

          <label class="lead-form-modal__campo">
            <span>Correo</span>
            <input v-model="formulario.email" type="email" />
          </label>

          <label class="lead-form-modal__campo">
            <span>Teléfono</span>
            <input v-model="formulario.phone" type="text" />
          </label>

          <label class="lead-form-modal__campo">
            <span>Estado</span>
            <select v-model="estado" required>
              <option value="proceso">En Proceso</option>
              <option value="rechazado">Rechazado</option>
              <option value="convertido">Convertido</option>
            </select>
          </label>

          <label class="lead-form-modal__campo lead-form-modal__campo--checkbox">
            <input v-model="formulario.active_campaign" type="checkbox" />
            <span>Active Campaign</span>
          </label>

          <label class="lead-form-modal__campo">
            <span>Factura</span>
            <input v-model="formulario.factura" type="number" step="0.01" min="0" />
          </label>

          <template v-if="estado === 'proceso'">
            <label class="lead-form-modal__campo">
              <span>Sub-estado</span>
              <select v-model="formulario.sub_estado_proceso" required>
                <option value="" disabled>Seleccionar...</option>
                <option value="llamar">Llamar</option>
                <option value="volver_a_llamar">Volver a Llamar</option>
                <option value="enviar_correo">Enviar correo</option>
                <option value="follow_up">Follow-up</option>
                <option value="citado">Citado</option>
              </select>
            </label>

            <label class="lead-form-modal__campo">
              <span>Fecha</span>
              <input v-model="formulario.fecha_sub_estado" type="date" required />
            </label>
          </template>

          <label v-if="estado === 'convertido'" class="lead-form-modal__campo">
            <span>Fecha de convertido</span>
            <input v-model="formulario.conversion_at" type="date" required />
          </label>

          <template v-if="estado === 'rechazado'">
            <label class="lead-form-modal__campo">
              <span>Motivo de rechazo</span>
              <select v-model="formulario.motivo_rechazo" required>
                <option value="" disabled>Seleccionar...</option>
                <option value="no_califica">No califica</option>
                <option value="oferta_muy_cara">Ppta muy cara</option>
                <option value="no_contesto">No contesto</option>
                <option value="no_desea">No desea</option>
              </select>
            </label>

            <label class="lead-form-modal__campo">
              <span>Fecha de rechazado</span>
              <input v-model="formulario.rechazo_at" type="date" required />
            </label>
          </template>
        </div>

        <label class="lead-form-modal__campo lead-form-modal__campo--full">
          <span>Requerimiento</span>
          <textarea v-model="formulario.requerimiento" rows="2"></textarea>
        </label>

        <label class="lead-form-modal__campo lead-form-modal__campo--full">
          <span>Seguimiento inicial</span>
          <textarea v-model="formulario.seguimiento_inicial" rows="2"></textarea>
        </label>

        <label class="lead-form-modal__campo lead-form-modal__campo--full">
          <span>Review</span>
          <textarea v-model="formulario.review" rows="2"></textarea>
        </label>

        <p v-if="errorValidacion" class="lead-form-modal__error">{{ errorValidacion }}</p>

        <div class="lead-form-modal__acciones">
          <button type="button" class="lead-form-modal__boton-cancelar" @click="emit('close')">Cancelar</button>
          <button type="submit" class="lead-form-modal__boton-guardar">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.lead-form-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.lead-form-modal__fondo {
  position: absolute;
  inset: 0;
  background: rgba(15, 20, 30, 0.45);
}

.lead-form-modal__panel {
  position: relative;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: var(--radio-tarjeta);
  padding: 1.5rem;
  box-shadow: var(--sombra-modal);
}

.lead-form-modal__titulo {
  margin: 0 0 1rem;
  font-size: 1.2rem;
}

.lead-form-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

.lead-form-modal__campo {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.lead-form-modal__campo input,
.lead-form-modal__campo textarea,
.lead-form-modal__campo select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-borde);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.lead-form-modal__campo input:focus,
.lead-form-modal__campo textarea:focus,
.lead-form-modal__campo select:focus {
  border-color: var(--color-borde-foco);
  box-shadow: var(--sombra-foco);
  outline: none;
}

.lead-form-modal__campo--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.lead-form-modal__campo--full {
  margin-bottom: 0.85rem;
}

.lead-form-modal__error {
  margin: 0 0 0.85rem;
  color: var(--color-error);
  font-size: 0.85rem;
}

.lead-form-modal__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.lead-form-modal__boton-cancelar {
  padding: 0.55rem 1rem;
  border: 1px solid #d0d3d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.lead-form-modal__boton-guardar {
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primario);
  color: #fff;
  cursor: pointer;
}

.lead-form-modal__boton-guardar:hover {
  background: var(--color-primario-hover);
}
</style>
