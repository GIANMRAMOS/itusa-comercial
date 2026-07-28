<script setup>
import { onMounted } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import LeadsTable from '@/components/gestion/LeadsTable.vue'
import LoadingOverlay from '@/components/shared/LoadingOverlay.vue'

const leadsStore = useLeadsStore()

onMounted(() => {
  leadsStore.fetchLeadsArchivados()
})

async function reactivarLead(lead) {
  await leadsStore.reactivarLead(lead.id)
}
</script>

<template>
  <div class="archivados-view">
    <header class="archivados-view__cabecera">
      <h1 class="archivados-view__titulo">Leads Archivados</h1>
      <p v-if="leadsStore.error" class="archivados-view__error">{{ leadsStore.error }}</p>
    </header>

    <LoadingOverlay :visible="leadsStore.loading" mensaje="Cargando leads..." />

    <LeadsTable
      :leads="leadsStore.leadsArchivados"
      :mostrar-editar="false"
      :mostrar-eliminar="false"
      :mostrar-archivar="false"
      :mostrar-reactivar="true"
      :permitir-agregar-seguimiento="false"
      @reactivar-lead="reactivarLead"
    />
  </div>
</template>

<style scoped>
.archivados-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.archivados-view__cabecera {
  margin-bottom: 1.25rem;
}

.archivados-view__titulo {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.archivados-view__error {
  margin: 0;
  color: #c0392b;
  font-size: 0.9rem;
}
</style>
