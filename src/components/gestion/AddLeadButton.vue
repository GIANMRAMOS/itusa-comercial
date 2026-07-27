<script setup>
defineEmits(['click'])
</script>

<template>
  <button type="button" class="add-lead-button" aria-label="Agregar lead" @click="$emit('click')">
    +
  </button>
</template>

<style scoped>
.add-lead-button {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  width: 3.25rem;
  height: 3.25rem;
  border: none;
  border-radius: 50%;
  background: var(--color-primario);
  color: #fff;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--sombra-flotante);
}

.add-lead-button:hover {
  background: var(--color-primario-hover);
}

/* En móvil la nav pasa a barra inferior fija (ver App.vue): el FAB sube
   para no quedar tapado por ella (altura aprox. de la barra + margen). */
@media (max-width: 899px) {
  .add-lead-button {
    bottom: calc(var(--espacio-8) + var(--espacio-6));
  }
}
</style>
