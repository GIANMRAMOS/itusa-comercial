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
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const store = useLeadsStore()
    await store.fetchLeads()

    expect(supabase.from).toHaveBeenCalledWith('leads')
    expect(store.leads).toEqual(dataSimulada)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('borde: si Supabase retorna error, setea error y no rompe el estado (leads queda como estaba)', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Falla de conexión' } })
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const store = useLeadsStore()
    await store.fetchLeads()

    expect(store.error).toBe('Falla de conexión')
    expect(store.leads).toEqual([]) // estado inicial preservado, sin throw
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
