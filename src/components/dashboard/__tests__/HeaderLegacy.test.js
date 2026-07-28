import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HeaderLegacy from '@/components/dashboard/HeaderLegacy.vue'

// __APP_VERSION__ y __BUILD_DATE__ son los mismos globals que Vite inyecta en el
// componente real (ver `define` en vite.config.js, aplicado también a vitest porque
// ambos comparten el mismo archivo de config). No se necesita vi.stubGlobal: ya están
// disponibles en el entorno de test tal como lo estarán en build/dev.

describe('HeaderLegacy', () => {
  const kpisBase = {
    totalLeads: 42,
    totalFacturado: 12345,
    calificados: 10,
    visitas: 5,
    conversiones: 3,
    porcentajeConversion: 30,
    diasPromedioConversion: 7,
  }

  it('renderiza el total de leads y el facturado formateado igual que KpiCards', () => {
    const wrapper = mount(HeaderLegacy, { props: { kpis: kpisBase } })
    const texto = wrapper.text()

    // Mismo criterio de formato que KpiCards.vue: `$${totalFacturado.toLocaleString('es')}`.
    const facturadoEsperado = `$${kpisBase.totalFacturado.toLocaleString('es')}`

    expect(texto).toContain(String(kpisBase.totalLeads))
    expect(texto).toContain(facturadoEsperado)
  })

  it('actualiza los valores mostrados cuando cambian las props (reactividad)', async () => {
    const wrapper = mount(HeaderLegacy, { props: { kpis: kpisBase } })

    const nuevosKpis = { ...kpisBase, totalLeads: 99, totalFacturado: 50000 }
    await wrapper.setProps({ kpis: nuevosKpis })

    const texto = wrapper.text()
    const facturadoEsperado = `$${nuevosKpis.totalFacturado.toLocaleString('es')}`

    expect(texto).toContain('99')
    expect(texto).toContain(facturadoEsperado)
    // El valor anterior ya no debería seguir presente como "Total Leads".
    expect(wrapper.find('.header-legacy__dato-valor').text()).toBe('99')
  })

  it('renderiza el título y el subtítulo esperados', () => {
    const wrapper = mount(HeaderLegacy, { props: { kpis: kpisBase } })

    expect(wrapper.find('.header-legacy__titulo').text()).toBe('Dashboard Control Comercial - ITUSA')
    expect(wrapper.find('.header-legacy__subtitulo').text()).toContain(
      'Sistema completo de gestión y seguimiento de leads comerciales',
    )
    expect(wrapper.find('.header-legacy__subtitulo').text()).toContain('Actualizado en tiempo real')
  })

  it('muestra la versión y la fecha de compilación a partir de los globals inyectados por Vite', () => {
    const wrapper = mount(HeaderLegacy, { props: { kpis: kpisBase } })
    const lineaVersion = wrapper.find('.header-legacy__version').text()

    // Misma versión que expone el global real (viene de package.json vía vite.config.js).
    expect(lineaVersion).toContain(`Versión ${__APP_VERSION__}`)

    // Misma fecha, formateada con el mismo criterio (DD/MM/AAAA vía Intl es-AR) que usa
    // el propio componente para __BUILD_DATE__.
    const fechaEsperada = new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(__BUILD_DATE__))

    expect(lineaVersion).toContain(`Última compilación: ${fechaEsperada}`)
    expect(lineaVersion).toMatch(/Última compilación: \d{2}\/\d{2}\/\d{4}/)
  })
})
