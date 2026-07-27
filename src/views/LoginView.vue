<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')

async function enviarLogin() {
  const resultado = await auth.signIn(email.value, password.value)
  if (resultado.success) {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="login-view">
    <form class="login-view__form" @submit.prevent="enviarLogin">
      <h1 class="login-view__titulo">ITUSA Comercial</h1>

      <label class="login-view__campo">
        <span>Correo electrónico</span>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="username"
          placeholder="usuario@empresa.com"
        />
      </label>

      <label class="login-view__campo">
        <span>Contraseña</span>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="••••••••"
        />
      </label>

      <p v-if="auth.error" class="login-view__error">{{ auth.error }}</p>

      <button type="submit" class="login-view__boton" :disabled="auth.loading">
        {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-fondo-app);
}

.login-view__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: var(--ancho-maximo-formulario);
  padding: 2rem;
  background: var(--color-fondo);
  border: 1px solid var(--color-borde-tarjeta);
  border-radius: var(--radio-tarjeta);
}

.login-view__titulo {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  text-align: center;
}

.login-view__campo {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.login-view__campo input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-borde);
  font-size: 0.95rem;
}

.login-view__campo input:focus {
  border-color: var(--color-borde-foco);
  box-shadow: var(--sombra-foco);
  outline: none;
}

.login-view__error {
  margin: 0;
  color: var(--color-error);
  font-size: 0.85rem;
}

.login-view__boton {
  padding: 0.65rem;
  border: none;
  border-radius: var(--radio-borde);
  background: var(--color-primario);
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
}

.login-view__boton:hover:not(:disabled) {
  background: var(--color-primario-hover);
}

.login-view__boton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
