import { describe, it, expect } from 'vitest'
import { parseDateGMT5, formatDateGMT5 } from '@/composables/useDateGMT5'

describe('parseDateGMT5', () => {
  it('produce el día correcto para un string YYYY-MM-DD, sin corrimiento de zona horaria', () => {
    const fecha = parseDateGMT5('2026-03-15')
    expect(fecha).toBeInstanceOf(Date)
    expect(fecha.getFullYear()).toBe(2026)
    expect(fecha.getMonth()).toBe(2) // marzo = índice 2
    expect(fecha.getDate()).toBe(15)
  })

  it('no corre el día al parsear fechas de fin/inicio de mes (caso típico de corrimiento UTC)', () => {
    const fecha = parseDateGMT5('2026-01-01')
    expect(fecha.getDate()).toBe(1)
    expect(fecha.getMonth()).toBe(0)
  })

  it('borde: retorna null para entrada vacía o null, sin lanzar error', () => {
    expect(() => parseDateGMT5(null)).not.toThrow()
    expect(() => parseDateGMT5('')).not.toThrow()
    expect(parseDateGMT5(null)).toBeNull()
    expect(parseDateGMT5('')).toBeNull()
  })
})

describe('formatDateGMT5', () => {
  it('hace round-trip con parseDateGMT5: parsear y formatear devuelve el mismo string', () => {
    const original = '2026-03-15'
    expect(formatDateGMT5(parseDateGMT5(original))).toBe(original)
  })

  it('hace round-trip para varias fechas, incluyendo bordes de mes/año', () => {
    ;['2026-01-01', '2026-12-31', '2026-02-28'].forEach((fechaStr) => {
      expect(formatDateGMT5(parseDateGMT5(fechaStr))).toBe(fechaStr)
    })
  })

  it('borde: retorna string vacío para null o "" sin lanzar error', () => {
    expect(() => formatDateGMT5(null)).not.toThrow()
    expect(() => formatDateGMT5('')).not.toThrow()
    expect(formatDateGMT5(null)).toBe('')
    expect(formatDateGMT5('')).toBe('')
  })
})
