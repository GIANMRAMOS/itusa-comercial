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
  background: #2d6cdf;
  color: #fff;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(45, 108, 223, 0.45);
}

.add-lead-button:hover {
  background: #2559b8;
}
</style>
