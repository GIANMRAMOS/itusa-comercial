import { describe, it, expect } from 'vitest'
import { construirActualizacionEstado, OPCIONES_SUB_ESTADO_PROCESO, OPCIONES_MOTIVO_RECHAZO } from '@/lib/leadEstado'

describe('construirActualizacionEstado', () => {
  it('estado proceso con sub-estado "llamar": mapea contactado_at si estaba vacío', () => {
    const resultado = construirActualizacionEstado({
      estado: 'proceso',
      subEstadoProceso: 'llamar',
      fechaSubEstado: '2024-05-01',
      contactadoAt: null,
      calificadoAt: null,
      visitaAt: null,
    })
    expect(resultado.contactado_at).toBe('2024-05-01')
    expect(resultado.calificado_at).toBeUndefined()
    expect(resultado.visita_at).toBeUndefined()
    expect(resultado.conversion_at).toBeNull()
    expect(resultado.rechazo_at).toBeNull()
    expect(resultado.motivo_rechazo).toBeNull()
    expect(resultado.sub_estado_proceso).toBe('llamar')
    expect(resultado.fecha_sub_estado).toBe('2024-05-01')
  })

  it('forward-only: no sobrescribe contactado_at si ya tenía valor', () => {
    const resultado = construirActualizacionEstado({
      estado: 'proceso',
      subEstadoProceso: 'llamar',
      fechaSubEstado: '2024-05-01',
      contactadoAt: '2024-01-01',
      calificadoAt: null,
      visitaAt: null,
    })
    expect(resultado.contactado_at).toBeUndefined()
  })

  it('sub-estado "follow_up" mapea contactado_at y calificado_at, pero no visita_at', () => {
    const resultado = construirActualizacionEstado({
      estado: 'proceso',
      subEstadoProceso: 'follow_up',
      fechaSubEstado: '2024-06-01',
      contactadoAt: null,
      calificadoAt: null,
      visitaAt: null,
    })
    expect(resultado.contactado_at).toBe('2024-06-01')
    expect(resultado.calificado_at).toBe('2024-06-01')
    expect(resultado.visita_at).toBeUndefined()
  })

  it('sub-estado "citado" mapea contactado_at, calificado_at y visita_at', () => {
    const resultado = construirActualizacionEstado({
      estado: 'proceso',
      subEstadoProceso: 'citado',
      fechaSubEstado: '2024-06-15',
      contactadoAt: null,
      calificadoAt: null,
      visitaAt: null,
    })
    expect(resultado.contactado_at).toBe('2024-06-15')
    expect(resultado.calificado_at).toBe('2024-06-15')
    expect(resultado.visita_at).toBe('2024-06-15')
  })

  it('estado convertido: limpia rechazo/motivo/sub-estado y conserva conversion_at', () => {
    const resultado = construirActualizacionEstado({
      estado: 'convertido',
      conversionAt: '2024-07-01',
      subEstadoProceso: 'llamar',
      fechaSubEstado: '2024-06-01',
      rechazoAt: '2024-05-01',
      motivoRechazo: 'no_desea',
    })
    expect(resultado.conversion_at).toBe('2024-07-01')
    expect(resultado.rechazo_at).toBeNull()
    expect(resultado.motivo_rechazo).toBeNull()
    expect(resultado.sub_estado_proceso).toBeNull()
    expect(resultado.fecha_sub_estado).toBeNull()
    expect(resultado.contactado_at).toBeUndefined()
  })

  it('estado rechazado: limpia conversión/sub-estado y conserva motivo/fecha de rechazo', () => {
    const resultado = construirActualizacionEstado({
      estado: 'rechazado',
      rechazoAt: '2024-07-10',
      motivoRechazo: 'no_contesto',
      conversionAt: '2024-01-01',
      subEstadoProceso: 'citado',
      fechaSubEstado: '2024-02-01',
    })
    expect(resultado.rechazo_at).toBe('2024-07-10')
    expect(resultado.motivo_rechazo).toBe('no_contesto')
    expect(resultado.conversion_at).toBeNull()
    expect(resultado.sub_estado_proceso).toBeNull()
    expect(resultado.fecha_sub_estado).toBeNull()
  })

  it('expone las opciones de sub-estado y motivo de rechazo', () => {
    expect(OPCIONES_SUB_ESTADO_PROCESO.map((o) => o.value)).toEqual([
      'contactado',
      'llamar',
      'volver_a_llamar',
      'enviar_correo',
      'follow_up',
      'citado',
    ])
    expect(OPCIONES_MOTIVO_RECHAZO.map((o) => o.value)).toEqual([
      'no_califica',
      'oferta_muy_cara',
      'no_contesto',
      'no_desea',
    ])
  })
})
