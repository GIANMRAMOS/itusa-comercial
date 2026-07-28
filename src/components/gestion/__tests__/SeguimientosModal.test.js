import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeguimientosModal from '@/components/gestion/SeguimientosModal.vue'

function crearLead(overrides = {}) {
  return {
    id: 1,
    contact: 'Juan Pérez',
    company: 'Acme SAC',
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

  describe('validaciones de fecha/texto vacíos siguen bloqueando el submit', () => {
    it('modo alta: fecha vacía bloquea el submit y no emite agregar-seguimiento', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

      await wrapper.find('input[type="date"]').setValue('')
      await wrapper.find('textarea').setValue('Un texto')

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.emitted('agregar-seguimiento')).toBeUndefined()
      expect(wrapper.find('.seguimientos-modal__error').exists()).toBe(true)
    })

    it('modo alta: texto vacío bloquea el submit y no emite agregar-seguimiento', async () => {
      const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

      await wrapper.find('input[type="date"]').setValue('2024-05-01')
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

  it('regresión: agregar un seguimiento nuevo en modo alta sigue emitiendo agregar-seguimiento', async () => {
    const wrapper = mount(SeguimientosModal, { props: { lead: crearLead() } })

    await wrapper.find('input[type="date"]').setValue('2024-07-01')
    await wrapper.find('textarea').setValue('Seguimiento nuevo')

    await wrapper.find('form').trigger('submit.prevent')

    const emitidoAgregar = wrapper.emitted('agregar-seguimiento')
    expect(emitidoAgregar).toBeTruthy()
    expect(emitidoAgregar[0][0]).toEqual({ fecha: '2024-07-01', texto: 'Seguimiento nuevo' })
    expect(wrapper.emitted('editar-seguimiento')).toBeUndefined()
  })
})
