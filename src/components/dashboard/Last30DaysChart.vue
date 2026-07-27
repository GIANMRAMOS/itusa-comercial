<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const props = defineProps({
  datos: {
    type: Array,
    required: true,
  },
})

const chartData = computed(() => ({
  labels: props.datos.map((item) => item.etiqueta),
  datasets: [
    {
      label: 'Leads por día',
      data: props.datos.map((item) => item.cantidad),
      borderColor: '#3a9d6b',
      backgroundColor: 'rgba(58, 157, 107, 0.15)',
      tension: 0.3,
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
}
</script>

<template>
  <section class="ultimos-30-dias">
    <h2 class="ultimos-30-dias__titulo">Últimos 30 días</h2>
    <Line :data="chartData" :options="chartOptions" />
  </section>
</template>

<style scoped>
.ultimos-30-dias {
  background: var(--color-fondo);
  border-radius: var(--radio-tarjeta);
  border: 1px solid var(--color-borde-tarjeta);
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ultimos-30-dias__titulo {
  margin: 0 0 1rem;
}
</style>
