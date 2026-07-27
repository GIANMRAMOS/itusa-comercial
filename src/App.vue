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
    <button type="button" class="barra-navegacion__cerrar-sesion" @click="cerrarSesion">Cerrar sesión</button>
  </nav>
  <div class="contenido-app" :class="{ 'contenido-app--con-nav': authStore.isAuthenticated }">
    <router-view />
  </div>
</template>

<style scoped>
/* Nota: los media queries no admiten var() como condición, por eso se
   repite en px el valor de --breakpoint-app-shell (900px). */

.barra-navegacion {
  display: flex;
  align-items: center;
  gap: var(--espacio-4);
  padding: var(--espacio-3) var(--espacio-4);
  background: var(--color-fondo);
  color: var(--color-texto);
  border-top: 1px solid var(--color-borde);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.barra-navegacion a {
  text-decoration: none;
  color: var(--color-texto-secundario);
}

.barra-navegacion a.router-link-active {
  color: var(--color-primario);
  font-weight: 800;
}

.barra-navegacion__cerrar-sesion {
  margin-left: auto;
}

/* En pantallas de app-shell (tablet/desktop) la nav pasa a barra horizontal fija arriba */
@media (min-width: 900px) {
  .barra-navegacion {
    position: static;
    border-top: none;
    border-bottom: 1px solid var(--color-borde);
  }
}

/* Espacio para que el contenido no quede tapado por la barra inferior fija en móvil */
.contenido-app--con-nav {
  padding-bottom: calc(var(--espacio-8) + var(--espacio-4));
}

@media (min-width: 900px) {
  .contenido-app--con-nav {
    padding-bottom: 0;
  }
}
</style>
