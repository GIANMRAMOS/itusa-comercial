import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/gestion',
    name: 'gestion',
    component: () => import('@/views/GestionView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard global de autenticación basado en la sesión real de Supabase Auth.
router.beforeEach(async (to) => {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error al obtener la sesión de Supabase:', error.message)
  }
  const haySesion = !!data?.session

  if (to.meta.requiresAuth && !haySesion) {
    return { name: 'login' }
  }
  if (to.name === 'login' && haySesion) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
