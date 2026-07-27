<script setup>
// Shell raíz de la aplicación.
// Los componentes globales <LoadingOverlay> y <ConfirmDialog> (Chunk G) se integrarán aquí
// una vez existan en src/components/shared/.
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function cerrarSesion() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <nav v-if="authStore.isAuthenticated" class="barra-navegacion">
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/gestion">Gestión</router-link>
    <button type="button" @click="cerrarSesion">Cerrar sesión</button>
  </nav>
  <router-view />
</template>

<style scoped>
.barra-navegacion {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #ddd;
}

.barra-navegacion a {
  text-decoration: none;
  color: inherit;
}

.barra-navegacion a.router-link-active {
  font-weight: bold;
}

.barra-navegacion button {
  margin-left: auto;
}
</style>
