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
      borderColor: '#16a34a',
      backgroundColor: 'rgba(22, 163, 74, 0.15)',
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
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ultimos-30-dias__titulo {
  margin: 0 0 1rem;
}
</style>
