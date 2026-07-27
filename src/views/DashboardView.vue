<script setup>
import { onMounted } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import KpiCards from '@/components/dashboard/KpiCards.vue'
import ConversionFunnel from '@/components/dashboard/ConversionFunnel.vue'
import MonthlyEvolutionChart from '@/components/dashboard/MonthlyEvolutionChart.vue'
import Last30DaysChart from '@/components/dashboard/Last30DaysChart.vue'
import TopSourcesRanking from '@/components/dashboard/TopSourcesRanking.vue'
import LatestSeguimientos from '@/components/dashboard/LatestSeguimientos.vue'

const leadsStore = useLeadsStore()

onMounted(() => {
  leadsStore.fetchLeads()
})
</script>

<template>
  <div class="dashboard">
    <h1 class="dashboard__titulo">Dashboard</h1>

    <p v-if="leadsStore.error" class="dashboard__error">{{ leadsStore.error }}</p>

    <KpiCards :kpis="leadsStore.kpis" />

    <div class="dashboard__grid">
      <ConversionFunnel :funnel="leadsStore.funnel" />
      <TopSourcesRanking :ranking="leadsStore.sourceRanking" />
    </div>

    <div class="dashboard__grid">
      <MonthlyEvolutionChart :evolucion="leadsStore.monthlyEvolution" />
      <Last30DaysChart :datos="leadsStore.last30Days" />
    </div>

    <LatestSeguimientos :seguimientos="leadsStore.latestSeguimientos" />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

.dashboard__titulo {
  margin: 0;
}

.dashboard__error {
  color: #dc2626;
  background: #fef2f2;
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}
</style>
