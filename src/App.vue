<script setup>
// Shell raíz de la aplicación.
// Los componentes globales <LoadingOverlay> y <ConfirmDialog> (Chunk G) se integrarán aquí
// una vez existan en src/components/shared/.
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// __APP_VERSION__ es una constante global inyectada por Vite (ver define en vite.config.js):
// versión de package.json. Se muestra en el pie del sidebar de desktop.
const version = __APP_VERSION__

async function cerrarSesion() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <nav v-if="authStore.isAuthenticated" class="barra-navegacion">
    <span class="barra-navegacion__marca">ITUSA Comercial</span>
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/gestion">Gestión</router-link>
    <router-link to="/archivados">Archivados</router-link>
    <span class="barra-navegacion__email">{{ authStore.user?.email }}</span>
    <button type="button" class="barra-navegacion__cerrar-sesion" @click="cerrarSesion">Cerrar sesión</button>
    <span class="barra-navegacion__version">v{{ version }}</span>
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

.barra-navegacion__marca,
.barra-navegacion__email,
.barra-navegacion__version {
  display: none;
}

/* En pantallas de app-shell (tablet/desktop) la nav pasa a sidebar fijo a la izquierda */
@media (min-width: 900px) {
  .barra-navegacion {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: auto;
    width: 220px;
    flex-direction: column;
    align-items: stretch;
    gap: var(--espacio-3);
    padding: var(--espacio-6) var(--espacio-4);
    background: var(--color-primario);
    color: var(--color-fondo);
    border-top: none;
    border-bottom: none;
  }

  .barra-navegacion__marca {
    display: block;
    font-weight: 800;
    color: var(--color-fondo);
    margin-bottom: var(--espacio-4);
  }

  .barra-navegacion a {
    display: block;
    color: var(--color-fondo);
    padding: var(--espacio-2) var(--espacio-1);
  }

  .barra-navegacion a::before {
    content: '• ';
  }

  .barra-navegacion a.router-link-active {
    color: var(--color-fondo);
    background: var(--color-primario-hover);
  }

  .barra-navegacion__email {
    display: block;
    margin-top: auto;
    padding-top: var(--espacio-3);
    color: var(--color-texto-terciario);
    border-top: 1px solid var(--color-primario-hover);
  }

  .barra-navegacion__cerrar-sesion {
    margin-left: 0;
  }

  .barra-navegacion__version {
    display: block;
    color: var(--color-texto-terciario);
    font-size: var(--tamano-pequeno);
  }
}

/* Espacio para que el contenido no quede tapado por la barra inferior fija en móvil */
.contenido-app--con-nav {
  padding-bottom: calc(var(--espacio-8) + var(--espacio-4));
}

@media (min-width: 900px) {
  .contenido-app--con-nav {
    padding-bottom: 0;
    padding-left: 220px;
  }
}
</style>
