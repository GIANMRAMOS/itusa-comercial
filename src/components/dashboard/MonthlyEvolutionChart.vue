<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  evolucion: {
    type: Array,
    required: true,
  },
})

const chartData = computed(() => ({
  labels: props.evolucion.map((item) => item.mes),
  datasets: [
    {
      label: 'Leads por mes',
      data: props.evolucion.map((item) => item.cantidad),
      backgroundColor: '#1a1a18',
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
  <section class="evolucion-mensual">
    <h2 class="evolucion-mensual__titulo">Evolución mensual</h2>
    <Bar :data="chartData" :options="chartOptions" />
  </section>
</template>

<style scoped>
.evolucion-mensual {
  background: var(--color-fondo);
  border-radius: var(--radio-tarjeta);
  border: 1px solid var(--color-borde-tarjeta);
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.evolucion-mensual__titulo {
  margin: 0 0 1rem;
}
</style>
