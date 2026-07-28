<script setup>
defineEmits(['click'])
</script>

<template>
  <button type="button" class="add-lead-button" aria-label="Agregar lead" title="Agregar lead" @click="$emit('click')">
    +
  </button>
</template>

<style scoped>
.add-lead-button {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 50%;
  background: var(--color-primario);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--sombra-flotante);
}

.add-lead-button:hover {
  background: var(--color-primario-hover);
}
</style>
