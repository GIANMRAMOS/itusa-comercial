import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import LatestSeguimientos from '@/components/dashboard/LatestSeguimientos.vue'

// Fecha de referencia fija para que los presets de filtro ("hoy y ayer", "últimos 7 días")
// sean deterministas. Se fija al mediodía para evitar problemas de borde de día.
const HOY = '2026-06-15'
const AYER = '2026-06-14'
const HACE_5_DIAS = '2026-06-10'
const HACE_20_DIAS = '2026-05-26'

// Stub mínimo de <router-link>: renderiza un <a> con href = prop `to` (mismo patrón que App.test.js).
const RouterLinkStub = defineComponent({
  name: 'RouterLinkStub',
  props: { to: { type: String, required: true } },
  render() {
    return h('a', { href: this.to }, this.$slots.default?.())
  },
})

function montar(props) {
  return mount(LatestSeguimientos, { props, global: { stubs: { RouterLink: RouterLinkStub } } })
}

function crearSeguimiento(fecha, sufijo) {
  return {
    leadId: `lead-${sufijo}`,
    fecha,
    texto: `Seguimiento ${sufijo}`,
    contact: `Contacto ${sufijo}`,
    company: `Compañía ${sufijo}`,
  }
}

describe('LatestSeguimientos', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0)) // 15/06/2026 mediodía, local
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const seguimientos = [
    crearSeguimiento(HOY, 'hoy'),
    crearSeguimiento(AYER, 'ayer'),
    crearSeguimiento(HACE_5_DIAS, 'hace5'),
    crearSeguimiento(HACE_20_DIAS, 'hace20'),
  ]

  it('por defecto ("Hoy y ayer") solo muestra los seguimientos de hoy y ayer', () => {
    const wrapper = montar({ seguimientos })
    const textos = wrapper.findAll('.ultimos-seguimientos__item').map((item) => item.text())

    expect(wrapper.find('select').element.value).toBe('hoy_ayer')
    expect(textos.length).toBe(2)
    expect(textos.some((t) => t.includes('Seguimiento hoy'))).toBe(true)
    expect(textos.some((t) => t.includes('Seguimiento ayer'))).toBe(true)
    expect(textos.some((t) => t.includes('Seguimiento hace5'))).toBe(false)
    expect(textos.some((t) => t.includes('Seguimiento hace20'))).toBe(false)
  })

  it('con "Últimos 7 días" muestra hoy, ayer y hace 5 días, pero no el de hace 20', async () => {
    const wrapper = montar({ seguimientos })

    await wrapper.find('select').setValue('ultimos_7_dias')
    const textos = wrapper.findAll('.ultimos-seguimientos__item').map((item) => item.text())

    expect(textos.length).toBe(3)
    expect(textos.some((t) => t.includes('Seguimiento hoy'))).toBe(true)
    expect(textos.some((t) => t.includes('Seguimiento ayer'))).toBe(true)
    expect(textos.some((t) => t.includes('Seguimiento hace5'))).toBe(true)
    expect(textos.some((t) => t.includes('Seguimiento hace20'))).toBe(false)
  })

  it('con "Todo" muestra todos los seguimientos recibidos por prop', async () => {
    const wrapper = montar({ seguimientos })

    await wrapper.find('select').setValue('todo')
    const textos = wrapper.findAll('.ultimos-seguimientos__item').map((item) => item.text())

    expect(textos.length).toBe(4)
    ;['hoy', 'ayer', 'hace5', 'hace20'].forEach((sufijo) => {
      expect(textos.some((t) => t.includes(`Seguimiento ${sufijo}`))).toBe(true)
    })
  })

  it('muestra el estado vacío de rango cuando el preset activo no matchea ningún seguimiento', () => {
    // Solo hay un seguimiento y cae fuera del rango del preset por defecto ("Hoy y ayer").
    const soloAntiguos = [crearSeguimiento(HACE_20_DIAS, 'hace20')]
    const wrapper = montar({ seguimientos: soloAntiguos })

    expect(wrapper.findAll('.ultimos-seguimientos__item').length).toBe(0)
    expect(wrapper.find('.ultimos-seguimientos__vacio').exists()).toBe(true)
    expect(wrapper.find('.ultimos-seguimientos__vacio').text()).toBe('Sin seguimientos en este rango.')
  })

  it('muestra el mensaje de "sin seguimientos registrados" cuando la prop viene vacía', () => {
    const wrapper = montar({ seguimientos: [] })

    expect(wrapper.findAll('.ultimos-seguimientos__item').length).toBe(0)
    expect(wrapper.find('.ultimos-seguimientos__vacio').text()).toBe('Sin seguimientos registrados todavía.')
  })

  it('el nombre del contacto enlaza a Gestión con el leadId del seguimiento', () => {
    const wrapper = montar({ seguimientos })

    const primerItem = wrapper.findAll('.ultimos-seguimientos__item')[0]
    const enlace = primerItem.find('a')
    expect(enlace.attributes('href')).toBe('/gestion?leadId=lead-hoy')
    expect(enlace.text()).toBe('Contacto hoy')
  })
})
