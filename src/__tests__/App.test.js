import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'

// __APP_VERSION__ es el mismo global que Vite inyecta en el componente real (ver `define`
// en vite.config.js, aplicado también a vitest porque ambos comparten el mismo archivo de
// config). No se necesita vi.stubGlobal, igual que en HeaderLegacy.test.js.

// App.vue usa `useRouter()` de 'vue-router' solo para hacer `router.push('/login')` al
// cerrar sesión; no necesita un router real montado, así que mockeamos el módulo completo.
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

// Mockeamos también el cliente Supabase: el store `auth` real lo importa para signOut/signIn,
// pero en estos tests no probamos Supabase Auth, solo que App.vue invoque la acción del store.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}))

// Stub mínimo de <router-link>: renderiza un <a> con href = prop `to`, para poder verificar
// el destino de cada link sin depender de un router real.
const RouterLinkStub = defineComponent({
  name: 'RouterLinkStub',
  props: { to: { type: String, required: true } },
  render() {
    return h('a', { href: this.to }, this.$slots.default?.())
  },
})

// Setea el estado del store ANTES de montar: si se setea después, el DOM inicial ya
// renderizado no refleja el cambio hasta el próximo tick de Vue, lo que generaba falsos
// negativos (nodos "vacíos") en las aserciones síncronas de abajo.
function montarApp({ session = null, user = null, leads = null, leadsArchivados = null } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.session = session
  authStore.user = user

  const leadsStore = useLeadsStore()
  // Se setean ANTES de montar, igual que la sesión: el watch(isAuthenticated, {immediate:true})
  // de App.vue dispara fetchLeads/fetchLeadsArchivados al montar, pero como el supabase
  // mockeado no tiene `.from(...)`, esas llamadas fallan silenciosamente (quedan atrapadas
  // en el try/catch del store) sin tocar `leads`/`leadsArchivados` — por eso el valor seteado
  // acá sobrevive al mount.
  if (leads) leadsStore.leads = leads
  if (leadsArchivados) leadsStore.leadsArchivados = leadsArchivados

  const wrapper = mount(App, {
    global: {
      plugins: [pinia],
      // RouterView no es objeto de esta suite (solo la nav); se stubea para evitar el
      // warning de Vue por componente no resuelto, ya que no hay router real montado.
      stubs: { RouterLink: RouterLinkStub, RouterView: true },
    },
  })

  return { wrapper, authStore, leadsStore }
}

describe('App.vue - navegación', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  describe('con sesión activa', () => {
    function montarAutenticado(user = { email: 'usuario@itusa.com' }) {
      return montarApp({ session: { access_token: 'token-simulado' }, user })
    }

    it('renderiza la marca "ITUSA Comercial"', () => {
      const { wrapper } = montarAutenticado()
      expect(wrapper.find('.barra-navegacion__marca').text()).toBe('ITUSA Comercial')
    })

    it('renderiza el email del usuario logueado', () => {
      const { wrapper } = montarAutenticado({ email: 'usuario@itusa.com' })
      expect(wrapper.find('.barra-navegacion__email').text()).toBe('usuario@itusa.com')
    })

    it('renderiza el botón "Cerrar sesión"', () => {
      const { wrapper } = montarAutenticado()
      const boton = wrapper.find('.barra-navegacion__cerrar-sesion')
      expect(boton.exists()).toBe(true)
      expect(boton.text()).toBe('Cerrar sesión')
    })

    it('renderiza la versión desde el global __APP_VERSION__ inyectado por Vite', () => {
      const { wrapper } = montarAutenticado()
      expect(wrapper.find('.barra-navegacion__version').text()).toBe(`v${__APP_VERSION__}`)
    })

    it('los router-link apuntan a /dashboard, /gestion y /archivados', () => {
      const { wrapper } = montarAutenticado()
      const links = wrapper.findAll('a')
      const destinos = links.map((link) => link.attributes('href'))
      expect(destinos).toContain('/dashboard')
      expect(destinos).toContain('/gestion')
      expect(destinos).toContain('/archivados')
    })

    it('el link de Gestión y Archivados muestra la cantidad de leads entre paréntesis', () => {
      const { wrapper } = montarApp({
        session: { access_token: 'token-simulado' },
        user: { email: 'usuario@itusa.com' },
        leads: [{ id: 1 }, { id: 2 }, { id: 3 }],
        leadsArchivados: [{ id: 4 }],
      })

      const links = wrapper.findAll('a')
      const gestionLink = links.find((link) => link.attributes('href') === '/gestion')
      const archivadosLink = links.find((link) => link.attributes('href') === '/archivados')

      expect(gestionLink.text()).toBe('Gestión (3)')
      expect(archivadosLink.text()).toBe('Archivados (1)')
    })

    it('sin leads cargados todavía, muestra el contador en (0)', () => {
      const { wrapper } = montarAutenticado()

      const links = wrapper.findAll('a')
      const gestionLink = links.find((link) => link.attributes('href') === '/gestion')
      const archivadosLink = links.find((link) => link.attributes('href') === '/archivados')

      expect(gestionLink.text()).toBe('Gestión (0)')
      expect(archivadosLink.text()).toBe('Archivados (0)')
    })

    it('al hacer click en "Cerrar sesión" invoca authStore.signOut y router.push("/login")', async () => {
      const { wrapper, authStore } = montarAutenticado()
      const signOutSpy = vi.spyOn(authStore, 'signOut').mockResolvedValue()

      await wrapper.find('.barra-navegacion__cerrar-sesion').trigger('click')
      // cerrarSesion() es async (await authStore.signOut() antes del push).
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(signOutSpy).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })

  describe('sin sesión', () => {
    it('no renderiza la <nav> (v-if="authStore.isAuthenticated")', () => {
      const { wrapper } = montarApp({ session: null, user: null })

      expect(wrapper.find('nav').exists()).toBe(false)
      expect(wrapper.find('.barra-navegacion').exists()).toBe(false)
      expect(wrapper.find('.barra-navegacion__email').exists()).toBe(false)
      expect(wrapper.find('.barra-navegacion__version').exists()).toBe(false)
      expect(wrapper.findAll('a')).toHaveLength(0)
      expect(wrapper.find('.barra-navegacion__cerrar-sesion').exists()).toBe(false)
    })
  })

  describe('borde: usuario sin email', () => {
    it('con user = {} no rompe el render y el nodo de email queda vacío', () => {
      const { wrapper } = montarApp({ session: { access_token: 'token-simulado' }, user: {} })

      expect(wrapper.find('.barra-navegacion').exists()).toBe(true)
      expect(wrapper.find('.barra-navegacion__email').exists()).toBe(true)
      expect(wrapper.find('.barra-navegacion__email').text()).toBe('')
    })

    it('con user = null no rompe el render y el nodo de email queda vacío', () => {
      const { wrapper } = montarApp({ session: { access_token: 'token-simulado' }, user: null })

      expect(wrapper.find('.barra-navegacion').exists()).toBe(true)
      expect(wrapper.find('.barra-navegacion__email').exists()).toBe(true)
      expect(wrapper.find('.barra-navegacion__email').text()).toBe('')
    })
  })
})
