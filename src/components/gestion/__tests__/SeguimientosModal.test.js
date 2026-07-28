import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeguimientosModal from '@/components/gestion/SeguimientosModal.vue'
import { getTodayGMT5 } from '@/composables/useDateGMT5'

function crearLead(overrides = {}) {
  return {
    id: 1,
    contact: 'Juan Pérez',
    company: 'Acme SAC',
    sub_estado_proceso: 'contactado',
    fecha_sub_estado: '2024-01-10',
    contactado_at: '2024-01-10',
    seguimientos: [
      { id: 10, fecha: '2024-01-01', texto: 'Primer seguimiento' },
      { id: 20, fecha: '2024-02-01', texto: 'Segundo seguimiento' },
    ],
    ...overrides,
  }
}

function botonSubmit(wrapper) {
  return wrapper.find('.seguimientos-modal__boton-agregar')
}

function botonEditarDe(wrapper, seguimientoId) {
  const item = wrapper.findAll('.seguimientos-modal__item').find((li) => {
    return li.text().includes(
      wrapper.vm.$props.lead.seguimientos.find((s) => s.id === seguimientoId).texto
    )
  })
  return item.find('.seguimientos-modal__boton-editar')
}

// Busca el input/select de un campo por el texto de su <span> (label), no por tipo/orden en el DOM.
function campoPorLabel(wrapper, texto) {
  const label = wrapper.findAll('label').find((l) => {
    const span = l.find('span')
    return span.exists() && span.text() === texto
  })
  return label ? label.find('input, select') : undefined
}

describe('SeguimientosModal', () => {
  it('click en "Editar" precarga fecha y texto en el form, y el botón submit pasa a "Guardar cambios"', async () => {
    const lead = crearLead()
    const wrapper = mount(SeguimientosModal, { props: { lead } })

    expect(botonSubmit(wrapper).text()).toBe('Agregar seguimiento')

    const boton = botonEditarDe(wrapper, 20)
    await boton.trigger('click')

    const inputFecha = wrapper.find('input[type="date"]')
    const textarea = wrapper.find('textarea')
    expect(inputFecha.element.value).toBe('2024-02-01')
    expect(textarea.element.value).toBe('Segundo seguimiento')
    expect(botonSubmit(wrapper).text()).toBe('Guardar cambios')
  })

  it('submit en modo edición emite editar-seguimiento con {id, fecha, texto} y NO agregar-seguimiento', async () => {
    const lead = crearLead()
    const wrapper = mount(SeguimientosModal, { props: { lead } })

    await botonEditarDe(wrapper, 10).trigger('click')
    await wrapper.find('input[type="date"]').setValue('2024-03-15')
    await wrapper.find('textarea').setValue('Texto editado')

    await wrapper.find('form').trigger('submit.prevent')

    const emitidoEditar = wrapper.emitted('editar-seguimiento')
    expect(emitidoEditar).toBeTruthy()
    expect(emitidoEditar[0][0]).toEqual({ id: 10, fecha: '2024-03-15', texto: 'Texto editado' })
    expect(wrapper.emitted('agregar-seguimiento')).toBeUndefined()
  })

  it('"Cancelar edición" vuelve el form a modo alta (label vuelve a "Agregar seguimiento" y el form queda limpio)', async () => {
    const lead = crearLead()
    const wrapper = mount(SeguimientosModal, { props: { lead } })

    await botonEditarDe(wrapper, 10).trigger('click')
    expect(botonSubmit(wrapper).text()).toBe('Guardar cambios')

    const botonesCerrar = wrapper.findAll('.seguimientos-modal__boton-cerrar')
    const botonCancelarEdicion = botonesCerrar.find((b) => b.text() === 'Cancelar edición')
    expect(botonCancelarEdicion).toBeTruthy()

    await botonCancelarEdicion.trigger('click')

    expect(botonSubmit(wrapper).text()).toBe('Agregar seguimiento')
    expect(wrapper.find('textarea').element.value).toBe('')
    // "Cancelar edición" ya no debe existir en modo alta
    const botonesCerrarLuego = wrapper.findAll('.seguimientos-modal__boton-cerrar')
    expect(botonesCerrarLuego.find((b) => b.text() === 'Cancelar edición')).toBeUndefined()
  })

  it('"Cancelar edición" no existe en modo alta (sin haber clickeado Editar)', () => {
    const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
    const botonesCerrar = wrapper.findAll('.seguimientos-modal__boton-cerrar')
    expect(botonesCerrar.find((b) => b.text() === 'Cancelar edición')).toBeUndefined()
  })

  describe('bloque de Estado/Sub-estado en el formulario de alta', () => {
    it('Estado por defecto refleja el estado actual del lead (getStatus)', () => {
      const wrapperProceso = mount(SeguimientosModal, { props: { lead: crearLead() } })
      expect(campoPorLabel(wrapperProceso, 'Estado').element.value).toBe('proceso')

      const wrapperConvertido = mount(SeguimientosModal, {
        props: { lead: crearLead({ conversion_at: '2024-03-01' }) },
      })
      expect(campoPorLabel(wrapperConvertido, 'Estado').element.value).toBe('convertido')

      const wrapperRechazado = mount(SeguimientosModal, {
        props: { lead: crearLead({ rechazo_at: '2024-03-01' }) },
      })
      expect(campoPorLabel(wrapperRechazado, 'Estado').element.value).toBe('rechazado')
    })

    it('Sub-estado y "Fecha a contactar" por defecto reflejan los valores vigentes del lead', () => {
      const wrapper = mount(SeguimientosModal, {
        props: { lead: crearLead({ sub_estado_proceso: 'follow_up', fecha_sub_estado: '2024-04-05' }) },
      })
      expect(campoPorLabel(wrapper, 'Sub-estado').element.value).toBe('follow_up')
      expect(campoPorLabel(wrapper, 'Fecha a contactar').element.value).toBe('2024-04-05')
    })

    it('al elegir Estado = Convertido, se oculta Sub-estado y se muestra Fecha de convertido', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      await campoPorLabel(wrapper, 'Estado').setValue('convertido')
      expect(campoPorLabel(wrapper, 'Sub-estado')).toBeUndefined()
      expect(campoPorLabel(wrapper, 'Fecha de convertido')).toBeTruthy()
    })

    it('al elegir Estado = Rechazado, se muestra Motivo de rechazo y Fecha de rechazado', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      await campoPorLabel(wrapper, 'Estado').setValue('rechazado')
      expect(campoPorLabel(wrapper, 'Motivo de rechazo')).toBeTruthy()
      expect(campoPorLabel(wrapper, 'Fecha de rechazado')).toBeTruthy()
      expect(campoPorLabel(wrapper, 'Sub-estado')).toBeUndefined()
    })

    it('el bloque de Estado no aparece en modo edición de un seguimiento existente', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      await botonEditarDe(wrapper, 10).trigger('click')
      expect(campoPorLabel(wrapper, 'Estado')).toBeUndefined()
    })

    it('el campo "Describe el seguimiento" reemplaza la etiqueta "Texto"', () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      expect(campoPorLabel(wrapper, 'Describe el seguimiento')).toBeTruthy()
      expect(campoPorLabel(wrapper, 'Texto')).toBeUndefined()
    })
  })

  describe('validaciones del formulario de alta', () => {
    it('falta sub-estado (Estado = En Proceso) bloquea el submit', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead({ sub_estado_proceso: '' }) } })
      await wrapper.find('textarea').setValue('Un texto')
      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('agregar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })

    it('Estado = Convertido sin fecha de convertido bloquea el submit', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      await campoPorLabel(wrapper, 'Estado').setValue('convertido')
      await campoPorLabel(wrapper, 'Fecha de convertido').setValue('')
      await wrapper.find('textarea').setValue('Un texto')
      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('agregar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })

    it('Estado = Rechazado sin motivo de rechazo bloquea el submit', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      await campoPorLabel(wrapper, 'Estado').setValue('rechazado')
      await wrapper.find('textarea').setValue('Un texto')
      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('agregar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })

    it('texto vacío bloquea el submit y no emite agregar-seguimiento', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })
      await wrapper.find('textarea').setValue('')
      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('agregar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })

    it('modo edición: texto vacío bloquea el submit y no emite editar-seguimiento', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

      await botonEditarDe(wrapper, 10).trigger('click')
      await wrapper.find('textarea').setValue('')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('editar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })

    it('modo edición: fecha vacía bloquea el submit y no emite editar-seguimiento', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

      await botonEditarDe(wrapper, 10).trigger('click')
      await wrapper.find('input[type="date"]').setValue('')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('editar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })
  })

  it('regresión: agregar un seguimiento nuevo en modo alta emite agregar-seguimiento con fecha automática (hoy) y actualización de estado', async () => {
    const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

    await wrapper.find('textarea').setValue('Seguimiento nuevo')
    await wrapper.find('form').trigger('submit.prevent')

    const emitido = wrapper.emitted('agregar-seguimiento')
    expect(emitido).toBeTruthy()
    expect(emitido[0][0].fecha).toBe(getTodayGMT5())
    expect(emitido[0][0].texto).toBe('Seguimiento nuevo')
    expect(emitido[0][0].actualizacionEstado).toBeTruthy()
    expect(wrapper.emitted('editar-seguimiento')).toBeUndefined()
  })

  it('agregar seguimiento con Estado = Rechazado arma actualizacionEstado con el motivo y la fecha elegidos', async () => {
    const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

    await campoPorLabel(wrapper, 'Estado').setValue('rechazado')
    await campoPorLabel(wrapper, 'Motivo de rechazo').setValue('no_desea')
    await campoPorLabel(wrapper, 'Fecha de rechazado').setValue('2024-08-01')
    await wrapper.find('textarea').setValue('Se rechazó')
    await wrapper.find('form').trigger('submit.prevent')

    const emitido = wrapper.emitted('agregar-seguimiento')
    expect(emitido[0][0].actualizacionEstado).toEqual(
      expect.objectContaining({ rechazo_at: '2024-08-01', motivo_rechazo: 'no_desea', conversion_at: null })
    )
  })
})
