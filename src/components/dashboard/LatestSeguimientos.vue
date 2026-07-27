<script setup>
defineProps({
  seguimientos: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <section class="ultimos-seguimientos">
    <h2 class="ultimos-seguimientos__titulo">Últimos seguimientos</h2>
    <ul v-if="seguimientos.length" class="ultimos-seguimientos__lista">
      <li
        v-for="seguimiento in seguimientos"
        :key="`${seguimiento.leadId}-${seguimiento.fecha}-${seguimiento.texto}`"
        class="ultimos-seguimientos__item"
      >
        <div class="ultimos-seguimientos__cabecera">
          <span class="ultimos-seguimientos__contacto">{{ seguimiento.contact }} · {{ seguimiento.company }}</span>
          <span class="ultimos-seguimientos__fecha">{{ seguimiento.fecha }}</span>
        </div>
        <p class="ultimos-seguimientos__texto">{{ seguimiento.texto }}</p>
      </li>
    </ul>
    <p v-else class="ultimos-seguimientos__vacio">Sin seguimientos registrados todavía.</p>
  </section>
</template>

<style scoped>
.ultimos-seguimientos {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ultimos-seguimientos__titulo {
  margin: 0 0 1rem;
}

.ultimos-seguimientos__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ultimos-seguimientos__item {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
}

.ultimos-seguimientos__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.ultimos-seguimientos__cabecera {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  gap: 1rem;
}

.ultimos-seguimientos__fecha {
  color: #64748b;
  font-weight: 400;
  font-size: 0.85rem;
  white-space: nowrap;
}

.ultimos-seguimientos__texto {
  margin: 0.25rem 0 0;
  color: #334155;
}

.ultimos-seguimientos__vacio {
  color: #64748b;
  margin: 0;
}
</style>
