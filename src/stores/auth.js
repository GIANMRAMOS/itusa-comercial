import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

// Store de autenticación: envuelve Supabase Auth y expone la sesión activa.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.session,
  },

  actions: {
    async signIn(email, password) {
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          this.error = error.message
          this.session = null
          this.user = null
          return { success: false, error: error.message }
        }
        this.session = data.session
        this.user = data.user
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async signOut() {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          this.error = error.message
          return
        }
        this.session = null
        this.user = null
      } catch (error) {
        this.error = error.message
      }
    },

    async restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          this.error = error.message
          return
        }
        this.session = data.session
        this.user = data.session?.user ?? null
      } catch (error) {
        this.error = error.message
      }
    },

    /**
     * Suscribe a los cambios de sesión de Supabase Auth (login/logout desde otra pestaña, expiración, etc.).
     */
    onAuthStateChange() {
      supabase.auth.onAuthStateChange((_evento, session) => {
        this.session = session
        this.user = session?.user ?? null
      })
    },
  },
})
