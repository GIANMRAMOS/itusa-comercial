import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LeadFormModal from '@/components/gestion/LeadFormModal.vue'
import { getTodayGMT5 } from '@/composables/useDateGMT5'

function crearLead(overrides = {}) {
  return {
    id: 1,
    source: 'Web',
    contact: 'Juan Pérez',
    company: 'Acme SAC',
    email: 'juan@acme.com',
    phone: '999999999',
    created_at: '2024-01-10',
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
    ...overrides,
  }
}

// Helper genérico para setear un <select>/<input> por el <span> de su label.
async function setCampoPorLabel(wrapper, textoLabel, valor) {
  const label = wrapper.findAll('label.lead-form-modal__campo').find((l) => l.find('span').text() === textoLabel)
  expect(label, `no se encontró el campo "${textoLabel}"`).toBeTruthy()
  const control = label.find('select').exists() ? label.find('select') : label.find('input')
  await control.setValue(valor)
  return control
}

// Helper para ubicar (sin setear) el <select> de un campo por el texto de su label.
// Necesario porque "Fuente" ahora también es un <select>, ubicado antes que "Estado"
// en el formulario: wrapper.find('select') ya no apunta al <select> de Estado.
function obtenerSelectPorLabel(wrapper, textoLabel) {
  const label = wrapper.findAll('label.lead-form-modal__campo').find((l) => l.find('span').text() === textoLabel)
  expect(label, `no se encontró el campo "${textoLabel}"`).toBeTruthy()
  return label.find('select')
}

describe('LeadFormModal', () => {
  describe('estado inicial del selector "Estado"', () => {
    it('alta (sin props.lead): arranca en "proceso"', () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      const select = obtenerSelectPorLabel(wrapper, 'Estado')
      expect(select.element.value).toBe('proceso')
    })

    it('edición con conversion_at: arranca en "convertido"', () => {
      const lead = crearLead({ conversion_at: '2024-02-01' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      const select = obtenerSelectPorLabel(wrapper, 'Estado')
      expect(select.element.value).toBe('convertido')
    })

    it('edición con rechazo_at (sin conversion_at): arranca en "rechazado"', () => {
      const lead = crearLead({ rechazo_at: '2024-02-01' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      const select = obtenerSelectPorLabel(wrapper, 'Estado')
      expect(select.element.value).toBe('rechazado')
    })

    it('edición sin conversion_at ni rechazo_at: arranca en "proceso"', () => {
      const lead = crearLead()
      const wrapper = mount(LeadFormModal, { props: { lead } })
      const select = obtenerSelectPorLabel(wrapper, 'Estado')
      expect(select.element.value).toBe('proceso')
    })
  })

  describe('render condicional por estado (mutuamente excluyente)', () => {
    it('estado=proceso: muestra sub-estado + fecha, NO convertido ni rechazado', () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })

      const labels = wrapper.findAll('label.lead-form-modal__campo').map((l) => l.find('span').text())
      expect(labels).toContain('Sub-estado')
      expect(labels).toContain('Fecha')
      expect(labels).not.toContain('Fecha de convertido')
      expect(labels).not.toContain('Motivo de rechazo')
      expect(labels).not.toContain('Fecha de rechazado')
    })

    it('estado=convertido: muestra "Fecha de convertido", NO proceso ni rechazado', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await obtenerSelectPorLabel(wrapper, 'Estado').setValue('convertido')

      const labels = wrapper.findAll('label.lead-form-modal__campo').map((l) => l.find('span').text())
      expect(labels).toContain('Fecha de convertido')
      expect(labels).not.toContain('Sub-estado')
      expect(labels).not.toContain('Fecha de rechazado')
      expect(labels).not.toContain('Motivo de rechazo')
    })

    it('estado=rechazado: muestra motivo + "Fecha de rechazado", NO proceso ni convertido', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await obtenerSelectPorLabel(wrapper, 'Estado').setValue('rechazado')

      const labels = wrapper.findAll('label.lead-form-modal__campo').map((l) => l.find('span').text())
      expect(labels).toContain('Motivo de rechazo')
      expect(labels).toContain('Fecha de rechazado')
      expect(labels).not.toContain('Sub-estado')
      expect(labels).not.toContain('Fecha de convertido')
    })
  })

  describe('validaciones bloquean el submit', () => {
    async function llenarContactYSource(wrapper) {
      await setCampoPorLabel(wrapper, 'Contacto', 'Pedro')
      await setCampoPorLabel(wrapper, 'Fuente', 'Web')
      await setCampoPorLabel(wrapper, 'Empresa', 'Acme')
      await setCampoPorLabel(wrapper, 'Correo', 'pedro@acme.com')
    }

    it('proceso sin sub_estado_proceso: bloquea y setea errorValidacion', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await llenarContactYSource(wrapper)
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')
      // sub_estado_proceso queda '' (no seleccionado)

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').exists()).toBe(true)
      expect(wrapper.find('.lead-form-modal__error').text().length).toBeGreaterThan(0)
    })

    it('proceso sin fecha_sub_estado: bloquea', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await llenarContactYSource(wrapper)
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      // la fecha arranca en hoy por defecto (para no mostrar el input vacío); se limpia
      // explícitamente para simular que el usuario la borró.
      await setCampoPorLabel(wrapper, 'Fecha', '')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').exists()).toBe(true)
    })

    it('convertido sin conversion_at: bloquea', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await llenarContactYSource(wrapper)
      await setCampoPorLabel(wrapper, 'Estado', 'convertido')
      // la fecha arranca en hoy por defecto; se limpia para simular que el usuario la borró.
      await setCampoPorLabel(wrapper, 'Fecha de convertido', '')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').exists()).toBe(true)
    })

    it('rechazado sin motivo_rechazo: bloquea', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await llenarContactYSource(wrapper)
      await setCampoPorLabel(wrapper, 'Estado', 'rechazado')
      await setCampoPorLabel(wrapper, 'Fecha de rechazado', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').exists()).toBe(true)
    })

    it('rechazado sin rechazo_at: bloquea', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await llenarContactYSource(wrapper)
      await setCampoPorLabel(wrapper, 'Estado', 'rechazado')
      await setCampoPorLabel(wrapper, 'Motivo de rechazo', 'no_contesto')
      // la fecha arranca en hoy por defecto; se limpia para simular que el usuario la borró.
      await setCampoPorLabel(wrapper, 'Fecha de rechazado', '')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').exists()).toBe(true)
    })

    it('regresión: contact vacío bloquea el submit', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await setCampoPorLabel(wrapper, 'Fuente', 'Web')
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')
      // contact queda vacío

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').text()).toContain('contacto')
    })

    it('regresión: source vacío bloquea el submit', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await setCampoPorLabel(wrapper, 'Contacto', 'Pedro')
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')
      // source queda vacío

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(wrapper.find('.lead-form-modal__error').text()).toContain('fuente')
    })
  })

  describe('payload — mapeo forward-only (proceso)', () => {
    it('"llamar" con contactado_at vacío: el payload setea contactado_at = fecha_sub_estado', async () => {
      const lead = crearLead({ contactado_at: '' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      // estado ya arranca en 'proceso' (sin conversion_at/rechazo_at)
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.contactado_at).toBe('2024-05-01')
    })

    it('"llamar" con contactado_at YA presente: el payload NO lo sobreescribe', async () => {
      const lead = crearLead({ contactado_at: '2024-01-15' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.contactado_at).toBe('2024-01-15')
    })

    it('"follow_up" con contactado_at y calificado_at vacíos: setea ambos', async () => {
      const lead = crearLead({ contactado_at: '', calificado_at: '' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'follow_up')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.contactado_at).toBe('2024-05-01')
      expect(payload.calificado_at).toBe('2024-05-01')
    })

    it('"follow_up" respeta calificado_at ya existente (no lo sobreescribe)', async () => {
      const lead = crearLead({ contactado_at: '', calificado_at: '2024-01-15' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'follow_up')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.contactado_at).toBe('2024-05-01')
      expect(payload.calificado_at).toBe('2024-01-15')
    })

    it('"citado" con contactado_at, calificado_at y visita_at vacíos: setea los 3', async () => {
      const lead = crearLead({ contactado_at: '', calificado_at: '', visita_at: '' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'citado')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.contactado_at).toBe('2024-05-01')
      expect(payload.calificado_at).toBe('2024-05-01')
      expect(payload.visita_at).toBe('2024-05-01')
    })

    it('"citado" no retrocede: respeta contactado_at/calificado_at/visita_at previos', async () => {
      const lead = crearLead({
        contactado_at: '2024-01-01',
        calificado_at: '2024-01-02',
        visita_at: '2024-01-03',
      })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'citado')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.contactado_at).toBe('2024-01-01')
      expect(payload.calificado_at).toBe('2024-01-02')
      expect(payload.visita_at).toBe('2024-01-03')
    })

    it('proceso siempre limpia conversion_at/rechazo_at/motivo_rechazo a null', async () => {
      const lead = crearLead({
        conversion_at: '',
        rechazo_at: '',
        motivo_rechazo: '',
      })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.conversion_at).toBeNull()
      expect(payload.rechazo_at).toBeNull()
      expect(payload.motivo_rechazo).toBeNull()
      expect(payload.sub_estado_proceso).toBe('llamar')
      expect(payload.fecha_sub_estado).toBe('2024-05-01')
    })
  })

  describe('payload — limpieza al cambiar de estado', () => {
    it('convertido: setea conversion_at; limpia rechazo_at/motivo_rechazo/sub_estado_proceso/fecha_sub_estado; no toca el funnel', async () => {
      const lead = crearLead({
        contactado_at: '2024-01-01',
        calificado_at: '2024-01-02',
        visita_at: '2024-01-03',
        sub_estado_proceso: 'citado',
        fecha_sub_estado: '2024-01-03',
      })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      // ya arranca en 'proceso' porque el lead no tiene conversion_at/rechazo_at
      await setCampoPorLabel(wrapper, 'Estado', 'convertido')
      await setCampoPorLabel(wrapper, 'Fecha de convertido', '2024-06-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.conversion_at).toBe('2024-06-01')
      expect(payload.rechazo_at).toBeNull()
      expect(payload.motivo_rechazo).toBeNull()
      expect(payload.sub_estado_proceso).toBeNull()
      expect(payload.fecha_sub_estado).toBeNull()
      // funnel intacto (historial preservado)
      expect(payload.contactado_at).toBe('2024-01-01')
      expect(payload.calificado_at).toBe('2024-01-02')
      expect(payload.visita_at).toBe('2024-01-03')
    })

    it('rechazado: setea rechazo_at y motivo_rechazo; limpia conversion_at/sub_estado_proceso/fecha_sub_estado', async () => {
      const lead = crearLead({
        contactado_at: '2024-01-01',
        calificado_at: '2024-01-02',
        sub_estado_proceso: 'follow_up',
        fecha_sub_estado: '2024-01-02',
      })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Estado', 'rechazado')
      await setCampoPorLabel(wrapper, 'Motivo de rechazo', 'no_contesto')
      await setCampoPorLabel(wrapper, 'Fecha de rechazado', '2024-06-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.rechazo_at).toBe('2024-06-01')
      expect(payload.motivo_rechazo).toBe('no_contesto')
      expect(payload.conversion_at).toBeNull()
      expect(payload.sub_estado_proceso).toBeNull()
      expect(payload.fecha_sub_estado).toBeNull()
      // funnel intacto
      expect(payload.contactado_at).toBe('2024-01-01')
      expect(payload.calificado_at).toBe('2024-01-02')
    })
  })

  describe('created_at', () => {
    it('alta: el payload trae created_at = hoy (getTodayGMT5)', async () => {
      const wrapper = mount(LeadFormModal, { props: { lead: null, fuentesDisponibles: ['Web'] } })
      await setCampoPorLabel(wrapper, 'Contacto', 'Pedro')
      await setCampoPorLabel(wrapper, 'Fuente', 'Web')
      await setCampoPorLabel(wrapper, 'Empresa', 'Acme')
      await setCampoPorLabel(wrapper, 'Correo', 'pedro@acme.com')
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.created_at).toBe(getTodayGMT5())
    })

    it('edición: el payload preserva created_at del lead original sin cambios', async () => {
      const lead = crearLead({ created_at: '2019-03-15' })
      const wrapper = mount(LeadFormModal, { props: { lead } })
      await setCampoPorLabel(wrapper, 'Sub-estado', 'llamar')
      await setCampoPorLabel(wrapper, 'Fecha', '2024-05-01')

      await wrapper.find('form').trigger('submit.prevent')

      const payload = wrapper.emitted('save')[0][0]
      expect(payload.created_at).toBe('2019-03-15')
    })
  })
})
