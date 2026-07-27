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
      <span class="kpi-card__valor cifra">{{ kpis.totalLeads }}</span>
      <span class="kpi-card__etiqueta">Total leads</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor cifra">{{ kpis.calificados }}</span>
      <span class="kpi-card__etiqueta">Calificados</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor cifra">{{ kpis.visitas }}</span>
      <span class="kpi-card__etiqueta">Visitas</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor cifra">{{ kpis.conversiones }}</span>
      <span class="kpi-card__etiqueta">Conversiones</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor cifra">{{ kpis.porcentajeConversion }}%</span>
      <span class="kpi-card__etiqueta">% Conversión</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-card__valor cifra">{{ kpis.diasPromedioConversion }}</span>
      <span class="kpi-card__etiqueta">Días promedio de conversión</span>
    </div>
    <div class="kpi-card kpi-card--destacada">
      <span class="kpi-card__valor cifra">${{ kpis.totalFacturado.toLocaleString('es') }}</span>
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
  background: var(--color-fondo);
  border: 1px solid var(--color-borde-tarjeta);
  border-radius: var(--radio-tarjeta);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.kpi-card--destacada {
  background: var(--color-primario);
  border-color: var(--color-primario);
}

.kpi-card--destacada .kpi-card__valor,
.kpi-card--destacada .kpi-card__etiqueta {
  color: #ffffff;
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
