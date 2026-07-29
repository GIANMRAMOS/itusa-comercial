import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mockeamos el cliente Supabase singleton: los stores no deben tocar la red real.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { useLeadsStore } from '@/stores/leads'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useLeadsStore.fetchLeads', () => {
  it('camino feliz: puebla leads con la respuesta simulada de Supabase', async () => {
    const dataSimulada = [
      { id: 1, contact: 'Juan', seguimientos: [] },
      { id: 2, contact: 'Ana', seguimientos: [] },
    ]
    const order = vi.fn().mockResolvedValue({ data: dataSimulada, error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const store = useLeadsStore()
    await store.fetchLeads()

    expect(supabase.from).toHaveBeenCalledWith('leads')
    expect(eq).toHaveBeenCalledWith('archivado', false)
    expect(store.leads).toEqual(dataSimulada)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('borde: si Supabase retorna error, setea error y no rompe el estado (leads queda como estaba)', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Falla de conexión' } })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const store = useLeadsStore()
    await store.fetchLeads()

    expect(store.error).toBe('Falla de conexión')
    expect(store.leads).toEqual([]) // estado inicial preservado, sin throw
    expect(store.loading).toBe(false)
  })
})

describe('useLeadsStore.fetchLeadsArchivados', () => {
  it('camino feliz: puebla leadsArchivados con la respuesta simulada, filtrando archivado=true', async () => {
    const dataSimulada = [
      { id: 10, contact: 'Archivado 1', seguimientos: [] },
      { id: 11, contact: 'Archivado 2', seguimientos: [] },
    ]
    const order = vi.fn().mockResolvedValue({ data: dataSimulada, error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const store = useLeadsStore()
    await store.fetchLeadsArchivados()

    expect(supabase.from).toHaveBeenCalledWith('leads')
    expect(eq).toHaveBeenCalledWith('archivado', true)
    expect(store.leadsArchivados).toEqual(dataSimulada)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('borde: si Supabase retorna error, setea error y leadsArchivados queda intacto', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Falla de conexión' } })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const store = useLeadsStore()
    store.leadsArchivados = [{ id: 99 }]
    await store.fetchLeadsArchivados()

    expect(store.error).toBe('Falla de conexión')
    expect(store.leadsArchivados).toEqual([{ id: 99 }])
    expect(store.loading).toBe(false)
  })
})

describe('useLeadsStore.createLead', () => {
  it('invoca insert() con los datos del lead y agrega el resultado al inicio del estado', async () => {
    const datosLead = { contact: 'Nuevo', company: 'ACME' }
    const leadCreado = { id: 3, ...datosLead, seguimientos: [] }
    const single = vi.fn().mockResolvedValue({ data: leadCreado, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const store = useLeadsStore()
    store.leads = [{ id: 1 }]
    const resultado = await store.createLead(datosLead)

    expect(supabase.from).toHaveBeenCalledWith('leads')
    expect(insert).toHaveBeenCalledWith(datosLead)
    expect(store.leads[0]).toEqual(leadCreado)
    expect(store.leads).toHaveLength(2)
    expect(resultado).toEqual({ success: true, data: leadCreado })
  })

  it('borde: si Supabase retorna error, setea error y no agrega nada al estado', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Violación de constraint' } })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const store = useLeadsStore()
    store.leads = [{ id: 1 }]
    const resultado = await store.createLead({ contact: 'X' })

    expect(store.error).toBe('Violación de constraint')
    expect(store.leads).toEqual([{ id: 1 }])
    expect(resultado).toEqual({ success: false, error: 'Violación de constraint' })
  })
})

describe('useLeadsStore.updateLead', () => {
  it('invoca update()/eq() con los datos correctos y reemplaza el lead en el estado', async () => {
    const leadActualizado = { id: 5, contact: 'Editado' }
    const single = vi.fn().mockResolvedValue({ data: leadActualizado, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leads = [{ id: 5, contact: 'Original' }, { id: 6, contact: 'Otro' }]
    const resultado = await store.updateLead(5, { contact: 'Editado' })

    expect(update).toHaveBeenCalledWith({ contact: 'Editado' })
    expect(eq).toHaveBeenCalledWith('id', 5)
    expect(store.leads[0]).toEqual(leadActualizado)
    expect(store.leads[1]).toEqual({ id: 6, contact: 'Otro' })
    expect(resultado.success).toBe(true)
  })

  it('borde: si Supabase retorna error, setea error y deja el estado intacto', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'No encontrado' } })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leads = [{ id: 5, contact: 'Original' }]
    const resultado = await store.updateLead(5, { contact: 'Editado' })

    expect(store.error).toBe('No encontrado')
    expect(store.leads).toEqual([{ id: 5, contact: 'Original' }])
    expect(resultado.success).toBe(false)
  })
})

describe('useLeadsStore.updateSeguimiento', () => {
  it('camino feliz: invoca update()/eq()/select()/single() y reemplaza el item en lead.seguimientos por índice', async () => {
    const seguimientoActualizado = { id: 20, fecha: '2024-03-15', texto: 'Editado' }
    const single = vi.fn().mockResolvedValue({ data: seguimientoActualizado, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leads = [
      {
        id: 1,
        contact: 'Juan',
        seguimientos: [
          { id: 10, fecha: '2024-01-01', texto: 'Primero' },
          { id: 20, fecha: '2024-02-01', texto: 'Segundo' },
        ],
      },
    ]

    const resultado = await store.updateSeguimiento(20, 1, { fecha: '2024-03-15', texto: 'Editado' })

    expect(supabase.from).toHaveBeenCalledWith('seguimientos')
    expect(update).toHaveBeenCalledWith({ fecha: '2024-03-15', texto: 'Editado' })
    expect(eq).toHaveBeenCalledWith('id', 20)
    expect(store.leads[0].seguimientos[0]).toEqual({ id: 10, fecha: '2024-01-01', texto: 'Primero' })
    expect(store.leads[0].seguimientos[1]).toEqual(seguimientoActualizado)
    expect(resultado).toEqual({ success: true, data: seguimientoActualizado })
  })

  it('borde: si Supabase retorna error, setea error, deja la memoria intacta y retorna success:false', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'No se pudo actualizar' } })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    const seguimientosOriginales = [{ id: 10, fecha: '2024-01-01', texto: 'Primero' }]
    store.leads = [{ id: 1, contact: 'Juan', seguimientos: seguimientosOriginales }]

    const resultado = await store.updateSeguimiento(10, 1, { fecha: '2024-03-15', texto: 'Editado' })

    expect(store.error).toBe('No se pudo actualizar')
    expect(store.leads[0].seguimientos).toEqual([{ id: 10, fecha: '2024-01-01', texto: 'Primero' }])
    expect(resultado).toEqual({ success: false, error: 'No se pudo actualizar' })
  })
})

describe('useLeadsStore.deleteLead', () => {
  it('invoca delete()/eq() y quita el lead del estado', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ delete: del })

    const store = useLeadsStore()
    store.leads = [{ id: 1 }, { id: 2 }]
    const resultado = await store.deleteLead(1)

    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', 1)
    expect(store.leads).toEqual([{ id: 2 }])
    expect(resultado).toEqual({ success: true })
  })

  it('borde: si Supabase retorna error, setea error y NO borra nada del estado', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'No se pudo borrar' } })
    const del = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ delete: del })

    const store = useLeadsStore()
    store.leads = [{ id: 1 }, { id: 2 }]
    const resultado = await store.deleteLead(1)

    expect(store.error).toBe('No se pudo borrar')
    expect(store.leads).toEqual([{ id: 1 }, { id: 2 }])
    expect(resultado).toEqual({ success: false, error: 'No se pudo borrar' })
  })
})

describe('useLeadsStore.archivarLead', () => {
  it('invoca update({archivado:true})/eq(), quita el lead de state.leads y lo agrega a state.leadsArchivados', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leads = [{ id: 1, contact: 'Uno' }, { id: 2 }]
    store.leadsArchivados = [{ id: 9 }]
    const resultado = await store.archivarLead(1)

    expect(supabase.from).toHaveBeenCalledWith('leads')
    expect(update).toHaveBeenCalledWith({ archivado: true })
    expect(eq).toHaveBeenCalledWith('id', 1)
    expect(store.leads).toEqual([{ id: 2 }])
    // Se mueve al frente de leadsArchivados con archivado:true, para que el contador
    // de "Archivados" en el sidebar refleje el cambio sin esperar a visitar esa pantalla.
    expect(store.leadsArchivados).toEqual([{ id: 1, contact: 'Uno', archivado: true }, { id: 9 }])
    expect(resultado).toEqual({ success: true })
  })

  it('borde: si Supabase retorna error, setea error, NO toca leads ni leadsArchivados y retorna success:false', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'No se pudo archivar' } })
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leads = [{ id: 1 }, { id: 2 }]
    store.leadsArchivados = []
    const resultado = await store.archivarLead(1)

    expect(store.error).toBe('No se pudo archivar')
    expect(store.leads).toEqual([{ id: 1 }, { id: 2 }])
    expect(store.leadsArchivados).toEqual([])
    expect(resultado).toEqual({ success: false, error: 'No se pudo archivar' })
  })
})

describe('useLeadsStore.reactivarLead', () => {
  it('invoca update({archivado:false})/eq(), quita el lead de state.leadsArchivados y lo agrega a state.leads', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leadsArchivados = [{ id: 1, contact: 'Uno' }, { id: 2 }]
    store.leads = [{ id: 9 }]
    const resultado = await store.reactivarLead(1)

    expect(supabase.from).toHaveBeenCalledWith('leads')
    expect(update).toHaveBeenCalledWith({ archivado: false })
    expect(eq).toHaveBeenCalledWith('id', 1)
    expect(store.leadsArchivados).toEqual([{ id: 2 }])
    // Se mueve al frente de leads con archivado:false, para que el contador de "Gestión"
    // en el sidebar refleje el cambio sin esperar a visitar esa pantalla.
    expect(store.leads).toEqual([{ id: 1, contact: 'Uno', archivado: false }, { id: 9 }])
    expect(resultado).toEqual({ success: true })
  })

  it('borde: si Supabase retorna error, setea error, deja state.leadsArchivados y state.leads intactos y retorna success:false', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'No se pudo reactivar' } })
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const store = useLeadsStore()
    store.leadsArchivados = [{ id: 1 }, { id: 2 }]
    store.leads = []
    const resultado = await store.reactivarLead(1)

    expect(store.error).toBe('No se pudo reactivar')
    expect(store.leadsArchivados).toEqual([{ id: 1 }, { id: 2 }])
    expect(store.leads).toEqual([])
    expect(resultado).toEqual({ success: false, error: 'No se pudo reactivar' })
  })
})
