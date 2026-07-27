<script setup>
defineProps({
  kpis: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="kpi-cards">
    <div class="kpi-card">
      <span class="kpi-card__valor">{{ kpis.totalLeads }}</span>
      <span class="kpi-card__etiqueta">Total leads</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor">{{ kpis.calificados }}</span>
      <span class="kpi-card__etiqueta">Calificados</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor">{{ kpis.visitas }}</span>
      <span class="kpi-card__etiqueta">Visitas</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor">{{ kpis.conversiones }}</span>
      <span class="kpi-card__etiqueta">Conversiones</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor">{{ kpis.porcentajeConversion }}%</span>
      <span class="kpi-card__etiqueta">% Conversión</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor">{{ kpis.diasPromedioConversion }}</span>
      <span class="kpi-card__etiqueta">Días promedio de conversión</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor">${{ kpis.totalFacturado.toLocaleString('es') }}</span>
      <span class="kpi-card__etiqueta">Total facturado</span>
    </div>
  </div>
</template>

<style scoped>
.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.kpi-card__valor {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.kpi-card__etiqueta {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}
</style>
