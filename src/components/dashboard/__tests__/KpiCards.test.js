import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiCards from '@/components/dashboard/KpiCards.vue'

describe('KpiCards', () => {
  it('renderiza los 7 valores recibidos por props', () => {
    const kpis = {
      totalLeads: 10,
      calificados: 5,
      visitas: 3,
      conversiones: 2,
      porcentajeConversion: 20,
      diasPromedioConversion: 15,
      totalFacturado: 500,
    }

    const wrapper = mount(KpiCards, { props: { kpis } })
    const texto = wrapper.text()

    expect(texto).toContain('10')
    expect(texto).toContain('5')
    expect(texto).toContain('3')
    expect(texto).toContain('2')
    expect(texto).toContain('20%')
    expect(texto).toContain('15')
    expect(texto).toContain('$500')
  })

  it('actualiza el texto renderizado cuando cambian las props (reactividad)', async () => {
    const wrapper = mount(KpiCards, {
      props: {
        kpis: {
          totalLeads: 1,
          calificados: 0,
          visitas: 0,
          conversiones: 0,
          porcentajeConversion: 0,
          diasPromedioConversion: 0,
          totalFacturado: 0,
        },
      },
    })

    await wrapper.setProps({
      kpis: {
        totalLeads: 99,
        calificados: 0,
        visitas: 0,
        conversiones: 0,
        porcentajeConversion: 0,
        diasPromedioConversion: 0,
        totalFacturado: 0,
      },
    })

    expect(wrapper.text()).toContain('99')
  })
})
