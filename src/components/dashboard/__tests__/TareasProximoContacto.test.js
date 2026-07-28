import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TareasProximoContacto from '@/components/dashboard/TareasProximoContacto.vue'

// "Hoy" fijo en 31/01/2026 (mediodía, local) para que la ventana [-2, +2] sea determinista.
const HOY = '2026-01-31'

function crearLead(overrides = {}) {
  return {
    id: 1,
    contact: 'Juan Pérez',
    fecha_sub_estado: HOY,
    sub_estado_proceso: 'llamar',
    seguimientos: [],
    ...overrides,
  }
}

describe('TareasProximoContacto', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 31, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra solo los leads dentro de la ventana [-2, +2] días y el contador refleja esa cantidad', () => {
    const leads = [
      crearLead({ id: 1, contact: 'Fuera de rango (lejos)', fecha_sub_estado: '2026-01-20' }),
      crearLead({ id: 2, contact: 'Vencido límite', fecha_sub_estado: '2026-01-29' }),
      crearLead({ id: 3, contact: 'Hoy', fecha_sub_estado: '2026-01-31' }),
      crearLead({ id: 4, contact: 'Futuro límite', fecha_sub_estado: '2026-02-02' }),
      crearLead({ id: 5, contact: 'Convertido (sin fecha)', fecha_sub_estado: null }),
    ]
    const wrapper = mount(TareasProximoContacto, { props: { leads } })

    const items = wrapper.findAll('.tareas__item')
    expect(items.length).toBe(3)
    expect(wrapper.find('.tareas__contador').text()).toBe('3')
    expect(wrapper.text()).not.toContain('Fuera de rango')
    expect(wrapper.text()).not.toContain('Convertido (sin fecha)')
  })

  it('aplica la clase de urgencia correcta: vencida, hoy y futura', () => {
    const leads = [
      crearLead({ id: 1, contact: 'Vencido', fecha_sub_estado: '2026-01-30' }),
      crearLead({ id: 2, contact: 'De hoy', fecha_sub_estado: '2026-01-31' }),
      crearLead({ id: 3, contact: 'Futuro', fecha_sub_estado: '2026-02-01' }),
    ]
    const wrapper = mount(TareasProximoContacto, { props: { leads } })

    const items = wrapper.findAll('.tareas__item')
    const porContacto = (texto) => items.find((item) => item.text().includes(texto))

    expect(porContacto('Vencido').classes()).toContain('tareas__item--vencida')
    expect(porContacto('De hoy').classes()).toContain('tareas__item--hoy')
    expect(porContacto('Futuro').classes()).toContain('tareas__item--futura')
  })

  it('muestra estado, sub-estado y la descripción del último seguimiento registrado', () => {
    const leads = [
      crearLead({
        sub_estado_proceso: 'follow_up',
        seguimientos: [
          { fecha: '2026-01-10', texto: 'Primer contacto' },
          { fecha: '2026-01-25', texto: 'Cliente pidió cotización' },
        ],
      }),
    ]
    const wrapper = mount(TareasProximoContacto, { props: { leads } })

    const item = wrapper.find('.tareas__item')
    expect(item.text()).toContain('En Proceso')
    expect(item.text()).toContain('Follow-up')
    expect(item.text()).toContain('Cliente pidió cotización')
  })

  it('si no hay seguimientos registrados, muestra el texto de respaldo', () => {
    const leads = [crearLead({ seguimientos: [] })]
    const wrapper = mount(TareasProximoContacto, { props: { leads } })

    expect(wrapper.find('.tareas__descripcion').text()).toBe('Sin seguimientos registrados.')
  })

  it('muestra el mensaje vacío cuando ningún lead cae dentro de la ventana', () => {
    const leads = [crearLead({ fecha_sub_estado: '2026-03-01' })]
    const wrapper = mount(TareasProximoContacto, { props: { leads } })

    expect(wrapper.findAll('.tareas__item').length).toBe(0)
    expect(wrapper.find('.tareas__vacio').exists()).toBe(true)
  })
})
