import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// El componente ahora recibe `leads` crudos (no un `funnel` ya calculado) y computa
// internamente el embudo filtrado por mes con computeFunnel/filterLeadsByMonthKeys
// (ya cubiertos con sus propios tests en src/lib/__tests__/leadMetrics.test.js).
// Fijamos "hoy" para que getRecentMonthOptions() (usado internamente por el componente
// al montar) sea determinista: con "hoy" = 15/07/2026, los 3 meses recientes son
// Julio, Junio y Mayo 2026.
const HOY_FIJO = new Date(2026, 6, 15) // 15/07/2026

vi.mock('@/composables/useDateGMT5', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getCurrentDateGMT5: () => new Date(HOY_FIJO.getTime()),
  }
})

import ConversionFunnel from '@/components/dashboard/ConversionFunnel.vue'
import { computeFunnel, filterLeadsByMonthKeys } from '@/lib/leadMetrics'

const CLAVES_3_MESES = ['2026-07', '2026-06', '2026-05']

describe('ConversionFunnel', () => {
  // 100 leads creados en julio 2026 (mes actual, siempre incluido tanto en "todos" como
  // seleccionando julio), con avance controlado por etapa para reproducir exactamente los
  // valores/porcentajes que verifican los tests de presentación de abajo:
  // 100 contactados, 60 calificados (60% del anterior), 30 con visita (50%), 12 convertidos (40%).
  const leadsEtapasControladas = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    created_at: '2026-07-10',
    contactado_at: '2026-07-11',
    ...(i < 60 ? { calificado_at: '2026-07-12' } : {}),
    ...(i < 30 ? { visita_at: '2026-07-13' } : {}),
    ...(i < 12 ? { conversion_at: '2026-07-14' } : {}),
  }))

  it('renderiza una tarjeta por cada paso del embudo', () => {
    const wrapper = mount(ConversionFunnel, { props: { leads: leadsEtapasControladas } })
    const tarjetas = wrapper.findAll('.embudo__paso')

    expect(tarjetas.length).toBe(4)
  })

  it('asigna el ícono correcto según el nombre de la etapa', () => {
    const wrapper = mount(ConversionFunnel, { props: { leads: leadsEtapasControladas } })
    const tarjetas = wrapper.findAll('.embudo__paso')

    const iconosEsperados = ['📞', '✅', '🏢', '🎯']
    tarjetas.forEach((tarjeta, indice) => {
      expect(tarjeta.find('.embudo__icono').text()).toBe(iconosEsperados[indice])
    })
  })

  // NOTA: se retira el test "usa un ícono por defecto cuando el nombre de la etapa no está
  // mapeado" del suite anterior (que montaba un `funnel` arbitrario por prop con un nombre de
  // etapa inventado, ej. "Etapa rara"). Con el contrato nuevo el componente ya no recibe un
  // `funnel` por prop: lo calcula internamente con computeFunnel(leads), que SIEMPRE devuelve
  // los 4 nombres fijos (Contactados/Calificados/Visitas/Conversiones), todos mapeados en
  // iconosPorEtapa. No hay forma de alcanzar la rama del ícono por defecto ('📈') a través de
  // la API pública del componente (`leads`), así que escribir ese test sería una prueba de
  // mentira (no puede fallar con la implementación actual porque la rama es inalcanzable).
  // Se reporta esta rama muerta al orquestador en vez de simular una entrada imposible.

  it('asigna la clase de rango correcta según la posición: rank-1, rank-2, rank-3, rank-other', () => {
    const wrapper = mount(ConversionFunnel, { props: { leads: leadsEtapasControladas } })
    const tarjetas = wrapper.findAll('.embudo__paso')

    expect(tarjetas[0].classes()).toContain('rank-1')
    expect(tarjetas[1].classes()).toContain('rank-2')
    expect(tarjetas[2].classes()).toContain('rank-3')
    expect(tarjetas[3].classes()).toContain('rank-other')
    // El cuarto paso no debe llevar ninguna de las clases numeradas.
    expect(tarjetas[3].classes()).not.toContain('rank-4')
  })

  it('muestra "% del total" solo en la primera etapa y "% de conversión" en el resto', () => {
    const wrapper = mount(ConversionFunnel, { props: { leads: leadsEtapasControladas } })
    const detalles = wrapper.findAll('.embudo__detalle')

    expect(detalles[0].text()).toBe('100% del total')
    expect(detalles[0].text()).not.toContain('% de conversión')

    expect(detalles[1].text()).toBe('60% de conversión')
    expect(detalles[2].text()).toBe('50% de conversión')
    expect(detalles[3].text()).toBe('40% de conversión')
    detalles.slice(1).forEach((detalle) => {
      expect(detalle.text()).not.toContain('% del total')
    })
  })

  it('muestra el valor de cada paso con la clase .cifra', () => {
    const wrapper = mount(ConversionFunnel, { props: { leads: leadsEtapasControladas } })
    const valores = wrapper.findAll('.embudo__valor')

    expect(valores.map((v) => v.text())).toEqual(['100', '60', '30', '12'])
    valores.forEach((valor) => {
      expect(valor.classes()).toContain('cifra')
    })
  })

  describe('filtro de mes', () => {
    it('camino feliz: con selección "todos" (default), agrega los leads de los últimos 3 meses calendario', () => {
      const leads = [
        { created_at: '2026-07-05', contactado_at: '2026-07-06', calificado_at: '2026-07-07' },
        { created_at: '2026-06-10', contactado_at: '2026-06-11' },
        {
          created_at: '2026-05-01',
          contactado_at: '2026-05-02',
          calificado_at: '2026-05-03',
          visita_at: '2026-05-04',
        },
      ]
      const wrapper = mount(ConversionFunnel, { props: { leads } })

      // Comparamos contra el mismo cálculo hecho directamente con las funciones puras
      // (verifica el "cableado": que el componente arma bien el subconjunto de meses),
      // y además contra valores fijos (verifica que el resultado sea el correcto de verdad).
      const esperado = computeFunnel(filterLeadsByMonthKeys(leads, CLAVES_3_MESES))
      const valores = wrapper.findAll('.embudo__valor').map((v) => Number(v.text()))

      expect(valores).toEqual(esperado.map((paso) => paso.valor))
      expect(valores).toEqual([3, 2, 1, 0]) // contactados, calificados, visitas, conversiones
    })

    it('al cambiar la selección del select a un mes específico, recalcula el embudo usando solo los leads de ese mes', async () => {
      const leads = [
        { created_at: '2026-06-10', contactado_at: '2026-06-11' }, // cae en junio: debe contarse
        { created_at: '2026-07-10', contactado_at: '2026-07-11' }, // cae en julio: NO debe contarse
      ]
      const wrapper = mount(ConversionFunnel, { props: { leads } })

      await wrapper.find('[aria-label="Filtrar por mes"]').setValue('2026-06')

      const valores = wrapper.findAll('.embudo__valor').map((v) => Number(v.text()))
      // Solo el lead de junio entra en el cálculo: 1 contactado, 100% del total.
      expect(valores).toEqual([1, 0, 0, 0])
      expect(wrapper.findAll('.embudo__detalle')[0].text()).toBe('100% del total')
    })

    it('con selección "todos", excluye leads con fecha fuera de los últimos 3 meses calendario', () => {
      const leadReciente = { created_at: '2026-07-01', contactado_at: '2026-07-02' }
      const leadViejo = { created_at: '2026-01-01', contactado_at: '2026-01-02' } // fuera de la ventana de 3 meses

      const wrapper = mount(ConversionFunnel, { props: { leads: [leadReciente, leadViejo] } })

      const valorContactados = Number(wrapper.findAll('.embudo__valor')[0].text())
      expect(valorContactados).toBe(1) // solo cuenta el lead reciente, el viejo queda fuera
    })
  })
})
