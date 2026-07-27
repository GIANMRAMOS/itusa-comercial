<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  mensaje: {
    type: String,
    default: 'Cargando...',
  },
})
</script>

<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-overlay__contenido">
      <div class="loading-overlay__spinner" />
      <p class="loading-overlay__mensaje">{{ mensaje }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  z-index: 9999;
}

.loading-overlay__contenido {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.loading-overlay__spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-borde);
  border-top-color: var(--color-primario);
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

.loading-overlay__mensaje {
  margin: 0;
  color: var(--color-texto-secundario);
  font-size: 0.9rem;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}
</style>
