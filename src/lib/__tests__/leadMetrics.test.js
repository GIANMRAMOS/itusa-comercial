import { describe, it, expect, vi } from 'vitest'

// Fijamos "hoy" en GMT-5 para que getDaysInProcess (caso no convertido) y
// computeLast30Days sean deterministas y no dependan del reloj real de la máquina.
const HOY_FIJO = new Date(2026, 0, 31) // 31/01/2026

vi.mock('@/composables/useDateGMT5', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // vi.fn (en vez de una arrow function fija) para poder sobreescribir el "hoy" mockeado
    // por test en los describe de getRecentMonthOptions/filterLeadsByMonthKeys más abajo,
    // sin afectar el resto de los tests de este archivo (que siguen usando HOY_FIJO).
    getCurrentDateGMT5: vi.fn(() => new Date(HOY_FIJO.getTime())),
  }
})

import { getCurrentDateGMT5 } from '@/composables/useDateGMT5'
import {
  getStatus,
  getDaysInProcess,
  computeKPIs,
  computeFunnel,
  computeSourceRanking,
  computeLast30Days,
  getRecentMonthOptions,
  filterLeadsByMonthKeys,
  computeTareasProximoContacto,
} from '@/lib/leadMetrics'

describe('getStatus', () => {
  it('retorna "convertido" cuando el lead tiene conversion_at', () => {
    expect(getStatus({ conversion_at: '2026-01-05' })).toBe('convertido')
  })

  it('retorna "rechazado" cuando tiene rechazo_at y NO tiene conversion_at', () => {
    expect(getStatus({ rechazo_at: '2026-01-05' })).toBe('rechazado')
  })

  it('retorna "proceso" cuando no tiene conversion_at ni rechazo_at', () => {
    expect(getStatus({})).toBe('proceso')
    expect(getStatus({ contactado_at: '2026-01-01' })).toBe('proceso')
  })

  it('da precedencia a "convertido" sobre "rechazado" si el lead tiene ambos', () => {
    expect(getStatus({ conversion_at: '2026-01-05', rechazo_at: '2026-01-01' })).toBe('convertido')
  })
})

describe('getDaysInProcess', () => {
  it('retorna 0 si el lead no tiene created_at', () => {
    expect(getDaysInProcess({})).toBe(0)
    expect(getDaysInProcess({ conversion_at: '2026-01-10' })).toBe(0)
  })

  it('usa conversion_at como fecha fin cuando el lead está convertido', () => {
    const lead = { created_at: '2026-01-01', conversion_at: '2026-01-10' }
    expect(getDaysInProcess(lead)).toBe(9)
  })

  it('usa "hoy" (GMT-5) como fecha fin cuando el lead NO está convertido', () => {
    const lead = { created_at: '2026-01-01' }
    // hoy mockeado = 2026-01-31 → 30 días desde 2026-01-01
    expect(getDaysInProcess(lead)).toBe(30)
  })
})

describe('computeKPIs', () => {
  it('camino feliz: calcula totales, % de conversión, ticket y días promedio correctos sobre una mezcla de leads', () => {
    const leads = [
      // convertido, calificado, con visita, facturado — 5 días en proceso
      {
        created_at: '2026-01-01',
        calificado_at: '2026-01-02',
        visita_at: '2026-01-03',
        conversion_at: '2026-01-06',
        factura: 1000,
      },
      // convertido, calificado, con visita, facturado — 10 días en proceso
      {
        created_at: '2026-01-01',
        calificado_at: '2026-01-02',
        visita_at: '2026-01-03',
        conversion_at: '2026-01-11',
        factura: 2000,
      },
      // solo calificado, no visita, no conversión, no factura
      { created_at: '2026-01-01', calificado_at: '2026-01-02' },
      // lead crudo, sin ningún avance
      { created_at: '2026-01-01' },
      // lead sin created_at (borde dentro del camino feliz)
      {},
    ]

    const kpis = computeKPIs(leads)

    expect(kpis).toEqual({
      totalLeads: 5,
      calificados: 3,
      visitas: 2,
      conversiones: 2,
      porcentajeConversion: 40,
      diasPromedioConversion: 8, // round((5 + 10) / 2) = round(7.5) = 8
      totalFacturado: 3000,
      ticketPromedio: 1500,
    })
  })

  it('retorna todo en cero (sin dividir por cero) cuando no hay leads', () => {
    expect(computeKPIs([])).toEqual({
      totalLeads: 0,
      calificados: 0,
      visitas: 0,
      conversiones: 0,
      porcentajeConversion: 0,
      diasPromedioConversion: 0,
      totalFacturado: 0,
      ticketPromedio: 0,
    })
  })
})

describe('computeFunnel', () => {
  it('camino feliz: calcula porcentaje del total y del paso anterior en cada etapa', () => {
    const leads = [
      ...Array.from({ length: 8 }, () => ({ contactado_at: '2026-01-01' })),
      ...Array.from({ length: 2 }, () => ({})), // no contactados
    ].map((lead, i) => ({ ...lead, id: i }))

    // De los 8 contactados, 5 calificados; de esos 5, 3 con visita; de esas 3, 1 conversión.
    leads[0].calificado_at = '2026-01-02'
    leads[1].calificado_at = '2026-01-02'
    leads[2].calificado_at = '2026-01-02'
    leads[3].calificado_at = '2026-01-02'
    leads[4].calificado_at = '2026-01-02'

    leads[0].visita_at = '2026-01-03'
    leads[1].visita_at = '2026-01-03'
    leads[2].visita_at = '2026-01-03'

    leads[0].conversion_at = '2026-01-04'

    const funnel = computeFunnel(leads)

    expect(funnel).toEqual([
      { nombre: 'Contactados', valor: 8, porcentajeDelTotal: 80, porcentajeDelAnterior: 80 },
      { nombre: 'Calificados', valor: 5, porcentajeDelTotal: 50, porcentajeDelAnterior: 62.5 },
      { nombre: 'Visitas', valor: 3, porcentajeDelTotal: 30, porcentajeDelAnterior: 60 },
      { nombre: 'Conversiones', valor: 1, porcentajeDelTotal: 10, porcentajeDelAnterior: 33.3 },
    ])
  })

  it('borde: con 0 leads no divide por cero, todos los porcentajes quedan en 0', () => {
    const funnel = computeFunnel([])
    for (const paso of funnel) {
      expect(paso.valor).toBe(0)
      expect(paso.porcentajeDelTotal).toBe(0)
      expect(paso.porcentajeDelAnterior).toBe(0)
      expect(Number.isNaN(paso.porcentajeDelTotal)).toBe(false)
      expect(Number.isNaN(paso.porcentajeDelAnterior)).toBe(false)
    }
  })
})

describe('computeSourceRanking', () => {
  it('agrupa por fuente y ordena de mayor a menor', () => {
    const leads = [
      ...Array.from({ length: 5 }, () => ({ source: 'Web' })),
      ...Array.from({ length: 3 }, () => ({ source: 'Referido' })),
      ...Array.from({ length: 1 }, () => ({ source: 'Feria' })),
    ]

    expect(computeSourceRanking(leads)).toEqual([
      { source: 'Web', cantidad: 5 },
      { source: 'Referido', cantidad: 3 },
      { source: 'Feria', cantidad: 1 },
    ])
  })

  it('limita el resultado a las top 6 fuentes', () => {
    const conteos = { A: 10, B: 9, C: 8, D: 7, E: 6, F: 5, G: 4, H: 3 }
    const leads = Object.entries(conteos).flatMap(([source, cantidad]) =>
      Array.from({ length: cantidad }, () => ({ source })),
    )

    const ranking = computeSourceRanking(leads)

    expect(ranking).toHaveLength(6)
    expect(ranking.map((r) => r.source)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('borde: ignora leads con source vacío, null o undefined', () => {
    const leads = [{ source: null }, { source: '' }, { source: undefined }, {}]
    expect(computeSourceRanking(leads)).toEqual([])
  })
})

describe('computeLast30Days', () => {
  it('agrupa correctamente por día dentro de la ventana de 30 días (GMT-5) e ignora lo que queda afuera', () => {
    const leads = [
      { created_at: '2026-01-02' }, // límite inferior de la ventana (hoy - 29 = 2026-01-02)
      { created_at: '2026-01-15' },
      { created_at: '2026-01-15' },
      { created_at: '2025-12-31' }, // fuera de ventana (antes del límite inferior)
      { created_at: '2026-02-01' }, // fuera de ventana (después de "hoy")
    ]

    const resultado = computeLast30Days(leads)

    expect(resultado).toHaveLength(30)

    const totalContado = resultado.reduce((suma, dia) => suma + dia.cantidad, 0)
    expect(totalContado).toBe(3) // solo las 3 fechas dentro de ventana

    const diaLimite = resultado.find((d) => d.fecha === '2026-01-02')
    const dia15 = resultado.find((d) => d.fecha === '2026-01-15')
    expect(diaLimite.cantidad).toBe(1)
    expect(dia15.cantidad).toBe(2)

    const ultimoDia = resultado[resultado.length - 1]
    expect(ultimoDia.fecha).toBe('2026-01-31')
    expect(ultimoDia.etiqueta).toBe('31/01')
  })

  it('borde: array vacío retorna la estructura de 30 días sin datos, sin lanzar error', () => {
    expect(() => computeLast30Days([])).not.toThrow()
    const resultado = computeLast30Days([])
    expect(resultado).toHaveLength(30)
    expect(resultado.every((dia) => dia.cantidad === 0)).toBe(true)
  })
})

describe('getRecentMonthOptions', () => {
  // Cada test fija su propio "hoy" mockeado y lo restauramos al HOY_FIJO del archivo
  // al terminar, para no afectar a los describe que corren después de este.
  afterEach(() => {
    vi.mocked(getCurrentDateGMT5).mockReturnValue(new Date(HOY_FIJO.getTime()))
  })

  it('camino feliz: devuelve los últimos 3 meses (actual + 2 anteriores), más reciente primero, con clave YYYY-MM y etiqueta en español', () => {
    vi.mocked(getCurrentDateGMT5).mockReturnValue(new Date(2026, 6, 15)) // "hoy" = 15/07/2026

    expect(getRecentMonthOptions()).toEqual([
      { clave: '2026-07', etiqueta: 'Julio 2026' },
      { clave: '2026-06', etiqueta: 'Junio 2026' },
      { clave: '2026-05', etiqueta: 'Mayo 2026' },
    ])
  })

  it('borde: cruce de año — con "hoy" en enero, noviembre y diciembre salen con el año anterior correcto', () => {
    vi.mocked(getCurrentDateGMT5).mockReturnValue(new Date(2026, 0, 15)) // "hoy" = 15/01/2026

    expect(getRecentMonthOptions()).toEqual([
      { clave: '2026-01', etiqueta: 'Enero 2026' },
      { clave: '2025-12', etiqueta: 'Diciembre 2025' },
      { clave: '2025-11', etiqueta: 'Noviembre 2025' },
    ])
  })

  it('borde: con "hoy" en el día 31 de un mes, restar meses no saltea ningún mes (sin overflow de día)', () => {
    vi.mocked(getCurrentDateGMT5).mockReturnValue(new Date(2026, 2, 31)) // "hoy" = 31/03/2026

    expect(getRecentMonthOptions()).toEqual([
      { clave: '2026-03', etiqueta: 'Marzo 2026' },
      { clave: '2026-02', etiqueta: 'Febrero 2026' },
      { clave: '2026-01', etiqueta: 'Enero 2026' },
    ])
  })
})

describe('filterLeadsByMonthKeys', () => {
  afterEach(() => {
    vi.mocked(getCurrentDateGMT5).mockReturnValue(new Date(HOY_FIJO.getTime()))
  })

  const leads = [
    { id: 1, created_at: '2026-07-05' },
    { id: 2, created_at: '2026-07-20' },
    { id: 3, created_at: '2026-06-10' },
    { id: 4, created_at: '2026-05-15' },
    { id: 5, created_at: '2026-01-01' }, // fuera de los últimos 3 meses ("viejo")
    { id: 6 }, // sin created_at
  ]

  it('camino feliz: filtrando por una sola clave de mes deja solo los leads de ese mes', () => {
    expect(filterLeadsByMonthKeys(leads, ['2026-07'])).toEqual([
      { id: 1, created_at: '2026-07-05' },
      { id: 2, created_at: '2026-07-20' },
    ])
  })

  it('camino feliz: filtrando por las 3 claves de getRecentMonthOptions da el agregado de esos meses y excluye el lead viejo', () => {
    vi.mocked(getCurrentDateGMT5).mockReturnValue(new Date(2026, 6, 15)) // "hoy" = 15/07/2026
    const clavesRecientes = getRecentMonthOptions().map((opcion) => opcion.clave)

    const resultado = filterLeadsByMonthKeys(leads, clavesRecientes)

    expect(resultado.map((l) => l.id)).toEqual([1, 2, 3, 4])
    expect(resultado.some((l) => l.id === 5)).toBe(false) // lead viejo (2026-01) queda excluido
  })

  it('borde: claves=[] retorna un array vacío', () => {
    expect(filterLeadsByMonthKeys(leads, [])).toEqual([])
  })

  it('borde: leads sin created_at quedan excluidos', () => {
    expect(filterLeadsByMonthKeys([{ id: 6 }], ['2026-07'])).toEqual([])
  })
})

describe('computeTareasProximoContacto', () => {
  const HOY = '2026-01-31'

  it('incluye leads con fecha_sub_estado dentro de la ventana [-4, +4] y excluye los que quedan fuera', () => {
    const leads = [
      { id: 1, contact: 'Vencido lejos', fecha_sub_estado: '2026-01-26' }, // fuera (hoy-5)
      { id: 2, contact: 'Vencido límite', fecha_sub_estado: '2026-01-27' }, // dentro (hoy-4)
      { id: 3, contact: 'Hoy', fecha_sub_estado: '2026-01-31' },
      { id: 4, contact: 'Futuro límite', fecha_sub_estado: '2026-02-04' }, // dentro (hoy+4)
      { id: 5, contact: 'Futuro lejos', fecha_sub_estado: '2026-02-05' }, // fuera (hoy+5)
      { id: 6, contact: 'Sin fecha', fecha_sub_estado: null },
    ]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas.map((t) => t.leadId)).toEqual([2, 3, 4])
  })

  it('clasifica correctamente la urgencia: vencida, hoy y futura', () => {
    const leads = [
      { id: 1, fecha_sub_estado: '2026-01-30' },
      { id: 2, fecha_sub_estado: '2026-01-31' },
      { id: 3, fecha_sub_estado: '2026-02-01' },
    ]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas.find((t) => t.leadId === 1).urgencia).toBe('vencida')
    expect(tareas.find((t) => t.leadId === 2).urgencia).toBe('hoy')
    expect(tareas.find((t) => t.leadId === 3).urgencia).toBe('futura')
  })

  it('ordena las tareas por fecha ascendente (vencidas primero)', () => {
    const leads = [
      { id: 1, fecha_sub_estado: '2026-02-01' },
      { id: 2, fecha_sub_estado: '2026-01-29' },
      { id: 3, fecha_sub_estado: '2026-01-31' },
    ]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas.map((t) => t.leadId)).toEqual([2, 3, 1])
  })

  it('la descripción toma el texto del último seguimiento registrado (por fecha más reciente)', () => {
    const leads = [
      {
        id: 1,
        fecha_sub_estado: '2026-01-31',
        seguimientos: [
          { fecha: '2026-01-10', texto: 'Primer contacto' },
          { fecha: '2026-01-25', texto: 'Seguimiento más reciente' },
        ],
      },
    ]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas[0].descripcion).toBe('Seguimiento más reciente')
  })

  it('si el lead no tiene seguimientos, la descripción queda vacía', () => {
    const leads = [{ id: 1, fecha_sub_estado: '2026-01-31', seguimientos: [] }]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas[0].descripcion).toBe('')
  })

  it('trae estado, sub_estado_proceso y proximo_contacto tal como están en el lead', () => {
    const leads = [
      { id: 1, fecha_sub_estado: '2026-01-31', sub_estado_proceso: 'follow_up', proximo_contacto: 'mail' },
    ]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas[0].estado).toBe('proceso')
    expect(tareas[0].subEstadoProceso).toBe('follow_up')
    expect(tareas[0].proximoContacto).toBe('mail')
  })

  it('si el lead no tiene proximo_contacto definido, queda vacío', () => {
    const leads = [{ id: 1, fecha_sub_estado: '2026-01-31' }]

    const tareas = computeTareasProximoContacto(leads, HOY)

    expect(tareas[0].proximoContacto).toBe('')
  })

  it('borde: array vacío retorna array vacío sin lanzar error', () => {
    expect(() => computeTareasProximoContacto([], HOY)).not.toThrow()
    expect(computeTareasProximoContacto([], HOY)).toEqual([])
  })
})
