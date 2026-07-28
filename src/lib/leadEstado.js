// Lógica compartida del ciclo de vida de un lead por Estado (En Proceso / Rechazado / Convertido).
// Usado tanto por LeadFormModal.vue (alta/edición del lead) como por SeguimientosModal.vue
// (actualización de estado al registrar un nuevo seguimiento).

export const OPCIONES_SUB_ESTADO_PROCESO = [
  { value: 'contactado', label: 'Contactado' },
  { value: 'llamar', label: 'Llamar' },
  { value: 'volver_a_llamar', label: 'Volver a Llamar' },
  { value: 'enviar_correo', label: 'Enviar correo' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'citado', label: 'Citado' },
]

export const OPCIONES_MOTIVO_RECHAZO = [
  { value: 'no_califica', label: 'No califica' },
  { value: 'oferta_muy_cara', label: 'Ppta muy cara' },
  { value: 'no_contesto', label: 'No contesto' },
  { value: 'no_desea', label: 'No desea' },
]

/**
 * Etiqueta legible de un valor de sub_estado_proceso (ej. 'follow_up' -> 'Follow-up').
 * Devuelve el valor crudo si no se reconoce (dato legado o inesperado).
 */
export function etiquetaSubEstado(valor) {
  return OPCIONES_SUB_ESTADO_PROCESO.find((opcion) => opcion.value === valor)?.label || valor
}

// Sub-estados de proceso que, además de marcar contacto, ya implican calificación y/o visita
// (mapeo cumulativo: Follow-up también contactó, Citado también contactó y calificó).
const SUB_ESTADOS_CONTACTO = ['contactado', 'llamar', 'volver_a_llamar', 'enviar_correo', 'follow_up', 'citado']
const SUB_ESTADOS_CALIFICADO = ['follow_up', 'citado']
const SUB_ESTADOS_VISITA = ['citado']

/**
 * Construye el subconjunto de columnas del lead que dependen del Estado elegido
 * (sub_estado_proceso, fecha_sub_estado, conversion_at, rechazo_at, motivo_rechazo),
 * aplicando el mapeo forward-only hacia el embudo (contactado_at/calificado_at/visita_at)
 * y la limpieza cruzada entre estados. No toca ninguna otra columna del lead.
 */
export function construirActualizacionEstado({
  estado,
  subEstadoProceso,
  fechaSubEstado,
  conversionAt,
  rechazoAt,
  motivoRechazo,
  contactadoAt,
  calificadoAt,
  visitaAt,
}) {
  const actualizacion = {
    sub_estado_proceso: estado === 'proceso' ? subEstadoProceso || null : null,
    fecha_sub_estado: estado === 'proceso' ? fechaSubEstado || null : null,
    conversion_at: estado === 'convertido' ? conversionAt || null : null,
    rechazo_at: estado === 'rechazado' ? rechazoAt || null : null,
    motivo_rechazo: estado === 'rechazado' ? motivoRechazo || null : null,
  }

  if (estado === 'proceso') {
    // Avance forward-only: nunca sobrescribir una etapa del embudo que ya tenía valor.
    if (SUB_ESTADOS_CONTACTO.includes(subEstadoProceso) && !contactadoAt) {
      actualizacion.contactado_at = fechaSubEstado
    }
    if (SUB_ESTADOS_CALIFICADO.includes(subEstadoProceso) && !calificadoAt) {
      actualizacion.calificado_at = fechaSubEstado
    }
    if (SUB_ESTADOS_VISITA.includes(subEstadoProceso) && !visitaAt) {
      actualizacion.visita_at = fechaSubEstado
    }
  }

  return actualizacion
}
