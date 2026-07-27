<script setup>
defineProps({
  ranking: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <section class="ranking-fuentes">
    <h2 class="ranking-fuentes__titulo">Top fuentes</h2>
    <ol v-if="ranking.length" class="ranking-fuentes__lista">
      <li v-for="item in ranking" :key="item.source" class="ranking-fuentes__item">
        <span class="ranking-fuentes__nombre">{{ item.source }}</span>
        <span class="ranking-fuentes__cantidad">{{ item.cantidad }}</span>
      </li>
    </ol>
    <p v-else class="ranking-fuentes__vacio">Sin datos de fuentes todavía.</p>
  </section>
</template>

<style scoped>
.ranking-fuentes {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ranking-fuentes__titulo {
  margin: 0 0 1rem;
}

.ranking-fuentes__lista {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ranking-fuentes__item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.ranking-fuentes__cantidad {
  font-weight: 600;
  color: #2563eb;
}

.ranking-fuentes__vacio {
  color: #64748b;
  margin: 0;
}
</style>
