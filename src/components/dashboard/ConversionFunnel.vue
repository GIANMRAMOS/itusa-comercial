<script setup>
defineProps({
  funnel: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <section class="embudo">
    <h2 class="embudo__titulo">Embudo de conversión</h2>
    <ul class="embudo__lista">
      <li v-for="paso in funnel" :key="paso.nombre" class="embudo__paso">
        <div class="embudo__cabecera">
          <span class="embudo__nombre">{{ paso.nombre }}</span>
          <span class="embudo__valor">{{ paso.valor }}</span>
        </div>
        <div class="embudo__barra">
          <div class="embudo__barra-relleno" :style="{ width: `${paso.porcentajeDelTotal}%` }" />
        </div>
        <span class="embudo__detalle">
          {{ paso.porcentajeDelTotal }}% del total · {{ paso.porcentajeDelAnterior }}% del paso anterior
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.embudo {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.embudo__titulo {
  margin: 0 0 1rem;
}

.embudo__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.embudo__cabecera {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.embudo__barra {
  background: #e2e8f0;
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.embudo__barra-relleno {
  background: #2563eb;
  height: 100%;
}

.embudo__detalle {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #64748b;
}
</style>
