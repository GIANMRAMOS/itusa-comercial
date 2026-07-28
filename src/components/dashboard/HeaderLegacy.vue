<script setup>
import { computed } from 'vue'

// Header legacy del dashboard: componente presentacional puro, recibe los KPIs por prop
// y no accede al store ni recalcula métricas.
const props = defineProps({
  kpis: {
    type: Object,
    required: true,
  },
})

// __APP_VERSION__ y __BUILD_DATE__ son constantes globales inyectadas por Vite (ver
// define en vite.config.js): versión de package.json y timestamp de compilación.
const version = __APP_VERSION__

// Formatea la fecha de build a DD/MM/AAAA para mostrarla en el subtítulo del header.
const fechaCompilacion = computed(() => {
  const fecha = new Date(__BUILD_DATE__)
  if (isNaN(fecha.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha)
})

// Mismo formato de moneda que KpiCards, para no introducir un criterio distinto.
const facturadoFormateado = computed(() => `$${props.kpis.totalFacturado.toLocaleString('es')}`)
</script>

<template>
  <div class="header-legacy">
    <div class="header-legacy__info">
      <span class="header-legacy__icono">📊</span>
      <div class="header-legacy__textos">
        <h1 class="header-legacy__titulo">Dashboard Control Comercial - ITUSA</h1>
        <p class="header-legacy__subtitulo">
          Sistema completo de gestión y seguimiento de leads comerciales | Actualizado en
          tiempo real
        </p>
        <p class="header-legacy__version">
          Versión {{ version }} | Última compilación: {{ fechaCompilacion }}
        </p>
      </div>
    </div>

    <div class="header-legacy__resumen">
      <div class="header-legacy__dato">
        <span class="header-legacy__dato-valor">{{ kpis.totalLeads }}</span>
        <span class="header-legacy__dato-etiqueta">Total Leads</span>
      </div>
      <div class="header-legacy__dato">
        <span class="header-legacy__dato-valor">{{ facturadoFormateado }}</span>
        <span class="header-legacy__dato-etiqueta">Facturado</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Excepción de estilo puntual: header legacy con azul corporativo fuera de la paleta
   Caudal (tokens.css). Autorizado por producto, vive solo en este componente. */
.header-legacy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-legacy__info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-legacy__icono {
  font-size: 2.5rem;
  line-height: 1;
}

.header-legacy__textos {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.header-legacy__titulo {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0066cc;
}

.header-legacy__subtitulo {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.header-legacy__version {
  margin: 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

.header-legacy__resumen {
  display: flex;
  gap: 1.5rem;
}

.header-legacy__dato {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-legacy__dato-valor {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0066cc;
}

.header-legacy__dato-etiqueta {
  font-size: 0.8rem;
  color: #64748b;
}
</style>
