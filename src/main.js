import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

// Pinia debe registrarse antes de poder usar useAuthStore() fuera de un componente.
app.use(createPinia())
app.use(router)

// Restauramos la sesión persistida de Supabase antes del primer render
// para evitar que la UI parpadee como si no hubiera sesión activa.
// El target de build no soporta top-level await, por lo que usamos una función async.
async function iniciarAplicacion() {
  const authStore = useAuthStore()
  await authStore.restoreSession()
  // Suscribimos el store a futuros cambios de sesión (logout en otra pestaña, expiración, login).
  authStore.onAuthStateChange()

  app.mount('#app')
}

iniciarAplicacion()
