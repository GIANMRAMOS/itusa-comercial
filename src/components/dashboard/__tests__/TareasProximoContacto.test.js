import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import TareasProximoContacto from '@/components/dashboard/TareasProximoContacto.vue'

// Stub mínimo de <router-link>: renderiza un <a> con href = prop `to` (mismo patrón que App.test.js).
const RouterLinkStub = defineComponent({
  name: 'RouterLinkStub',
  props: { to: { type: String, required: true } },
  render() {
    return h('a', { href: this.to }, this.$slots.default?.())
  },
})

function montar(props) {
  return mount(TareasProximoContacto, { props, global: { stubs: { RouterLink: RouterLinkStub } } })
}

// "Hoy" fijo en 31/01/2026 (mediodía, local) para que la ventana [-4, +4] sea determinista.
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

  it('muestra solo los leads dentro de la ventana [-4, +4] días y el contador refleja esa cantidad', () => {
    const leads = [
      crearLead({ id: 1, contact: 'Fuera de rango (lejos)', fecha_sub_estado: '2026-01-26' }),
      crearLead({ id: 2, contact: 'Vencido límite', fecha_sub_estado: '2026-01-27' }),
      crearLead({ id: 3, contact: 'Hoy', fecha_sub_estado: '2026-01-31' }),
      crearLead({ id: 4, contact: 'Futuro límite', fecha_sub_estado: '2026-02-04' }),
      crearLead({ id: 5, contact: 'Futuro fuera de rango', fecha_sub_estado: '2026-02-05' }),
      crearLead({ id: 6, contact: 'Convertido (sin fecha)', fecha_sub_estado: null }),
    ]
    const wrapper = montar({ leads })

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
    const wrapper = montar({ leads })

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
    const wrapper = montar({ leads })

    const item = wrapper.find('.tareas__item')
    expect(item.text()).toContain('En Proceso')
    expect(item.text()).toContain('Follow-up')
    expect(item.text()).toContain('Cliente pidió cotización')
  })

  it('si no hay seguimientos registrados, muestra el texto de respaldo', () => {
    const leads = [crearLead({ seguimientos: [] })]
    const wrapper = montar({ leads })

    expect(wrapper.find('.tareas__descripcion').text()).toBe('Sin seguimientos registrados.')
  })

  it('muestra el mensaje vacío cuando ningún lead cae dentro de la ventana', () => {
    const leads = [crearLead({ fecha_sub_estado: '2026-03-01' })]
    const wrapper = montar({ leads })

    expect(wrapper.findAll('.tareas__item').length).toBe(0)
    expect(wrapper.find('.tareas__vacio').exists()).toBe(true)
  })

  it('muestra el chip de Próx. Contacto después del sub-estado, cuando el lead lo tiene definido', () => {
    const leads = [crearLead({ sub_estado_proceso: 'llamar', proximo_contacto: 'mail' })]
    const wrapper = montar({ leads })

    const meta = wrapper.find('.tareas__meta')
    expect(meta.find('.tareas__proximo-contacto').exists()).toBe(true)
    expect(meta.find('.tareas__proximo-contacto').text()).toBe('Mail')

    const spans = meta.findAll('span')
    const indiceSubEstado = spans.findIndex((s) => s.classes().includes('tareas__sub-estado'))
    const indiceProximoContacto = spans.findIndex((s) => s.classes().includes('tareas__proximo-contacto'))
    expect(indiceProximoContacto).toBeGreaterThan(indiceSubEstado)
  })

  it('no muestra el chip de Próx. Contacto cuando el lead no lo tiene definido', () => {
    const leads = [crearLead()]
    const wrapper = montar({ leads })

    expect(wrapper.find('.tareas__proximo-contacto').exists()).toBe(false)
  })

  it('el nombre del contacto enlaza a Gestión con el leadId de la tarea', () => {
    const leads = [crearLead({ id: 42, contact: 'María López' })]
    const wrapper = montar({ leads })

    const enlace = wrapper.find('.tareas__item a')
    expect(enlace.attributes('href')).toBe('/gestion?leadId=42')
    expect(enlace.text()).toBe('María López')
  })
})
