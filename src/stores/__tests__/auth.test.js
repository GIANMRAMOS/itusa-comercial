import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mockeamos el cliente Supabase singleton: no se prueba Supabase Auth real.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useAuthStore.signIn', () => {
  it('camino feliz: si Supabase resuelve con sesión, la guarda en el store', async () => {
    const sesionSimulada = { access_token: 'abc123' }
    const usuarioSimulado = { id: 'u1', email: 'gianmarcoramosr@gmail.com' }
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: sesionSimulada, user: usuarioSimulado },
      error: null,
    })

    const store = useAuthStore()
    const resultado = await store.signIn('gianmarcoramosr@gmail.com', 'password123')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'gianmarcoramosr@gmail.com',
      password: 'password123',
    })
    expect(store.session).toEqual(sesionSimulada)
    expect(store.user).toEqual(usuarioSimulado)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(true)
    expect(resultado).toEqual({ success: true })
  })

  it('borde: con credenciales inválidas (Supabase retorna error), setea error y NO setea sesión', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    })

    const store = useAuthStore()
    const resultado = await store.signIn('gianmarcoramosr@gmail.com', 'incorrecta')

    expect(store.error).toBe('Invalid login credentials')
    expect(store.session).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.loading).toBe(false)
    expect(resultado).toEqual({ success: false, error: 'Invalid login credentials' })
  })
})
