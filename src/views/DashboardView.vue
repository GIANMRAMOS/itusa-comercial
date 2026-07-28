<script setup>
import { onMounted } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import HeaderLegacy from '@/components/dashboard/HeaderLegacy.vue'
import KpiCards from '@/components/dashboard/KpiCards.vue'
import ConversionFunnel from '@/components/dashboard/ConversionFunnel.vue'
import Last30DaysChart from '@/components/dashboard/Last30DaysChart.vue'
import TopSourcesRanking from '@/components/dashboard/TopSourcesRanking.vue'
import LatestSeguimientos from '@/components/dashboard/LatestSeguimientos.vue'
import TareasProximoContacto from '@/components/dashboard/TareasProximoContacto.vue'

const leadsStore = useLeadsStore()

onMounted(() => {
  leadsStore.fetchLeads()
})
</script>

<template>
  <div class="dashboard">
    <HeaderLegacy :kpis="leadsStore.kpis" />

    <p v-if="leadsStore.error" class="dashboard__error">{{ leadsStore.error }}</p>

    <KpiCards :kpis="leadsStore.kpis" />

    <div class="dashboard__grid">
      <LatestSeguimientos :seguimientos="leadsStore.latestSeguimientos" />
      <TareasProximoContacto :leads="leadsStore.leads" />
    </div>

    <div class="dashboard__grid">
      <ConversionFunnel :leads="leadsStore.leads" />
      <Last30DaysChart :datos="leadsStore.last30Days" />
    </div>

    <div class="dashboard__grid">
      <TopSourcesRanking :ranking="leadsStore.sourceRanking" />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

.dashboard__error {
  color: #dc2626;
  background: #fef2f2;
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* 900px hardcodeado porque las media queries CSS no pueden leer custom properties;
   corresponde al token --breakpoint-app-shell definido en src/styles/tokens.css. */
@media (max-width: 900px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
