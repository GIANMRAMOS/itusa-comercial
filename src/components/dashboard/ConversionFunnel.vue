<script setup>
import { ref, computed } from 'vue'
import { computeFunnel, getRecentMonthOptions, filterLeadsByMonthKeys } from '@/lib/leadMetrics'

const props = defineProps({
  leads: {
    type: Array,
    required: true,
  },
})

// Opciones de mes (últimos 3 meses calendario), calculadas una sola vez al montar.
const opcionesMes = getRecentMonthOptions()

// Selección del filtro de mes en el header. "todos" agrupa los 3 meses recientes.
const mesSeleccionado = ref('todos')

// Claves de mes a aplicar según la selección: los 3 meses recientes o solo el elegido.
const clavesAplicadas = computed(() =>
  mesSeleccionado.value === 'todos' ? opcionesMes.map((opcion) => opcion.clave) : [mesSeleccionado.value],
)

// Embudo calculado sobre el subconjunto de leads filtrado por mes.
const funnel = computed(() => computeFunnel(filterLeadsByMonthKeys(props.leads, clavesAplicadas.value)))

// Ícono por nombre de etapa (no depende del orden del array).
const iconosPorEtapa = {
  Contactados: '📞',
  Calificados: '✅',
  Visitas: '🏢',
  Conversiones: '🎯',
}

function obtenerIcono(nombre) {
  return iconosPorEtapa[nombre] || '📈'
}

// Clase de rango por posición (0-based): los 3 primeros puestos tienen degradado propio,
// el resto comparte el estilo neutro "rank-other".
function obtenerClaseRango(indice) {
  const posicion = indice + 1
  return posicion <= 3 ? `rank-${posicion}` : 'rank-other'
}

// Copy exacto del legacy: en la primera etapa se muestra el % sobre el total,
// en el resto el % de conversión respecto al paso anterior.
function obtenerDetalle(paso, indice) {
  return indice === 0 ? `${paso.porcentajeDelTotal}% del total` : `${paso.porcentajeDelAnterior}% de conversión`
}
</script>

<template>
  <section class="embudo">
    <div class="embudo__cabecera-seccion">
      <div>
        <h2 class="embudo__titulo">📊 Embudo de Conversión</h2>
        <p class="embudo__subtitulo">Progreso de leads por etapa</p>
      </div>
      <select v-model="mesSeleccionado" class="embudo__filtro" aria-label="Filtrar por mes">
        <option v-for="opcion in opcionesMes" :key="opcion.clave" :value="opcion.clave">
          {{ opcion.etiqueta }}
        </option>
        <option value="todos">Todos</option>
      </select>
    </div>
    <ul class="embudo__lista">
      <li
        v-for="(paso, indice) in funnel"
        :key="paso.nombre"
        class="embudo__paso"
        :class="obtenerClaseRango(indice)"
      >
        <span class="embudo__icono">{{ obtenerIcono(paso.nombre) }}</span>
        <div class="embudo__info">
          <span class="embudo__nombre">{{ paso.nombre }}</span>
          <span class="embudo__detalle">{{ obtenerDetalle(paso, indice) }}</span>
        </div>
        <span class="embudo__valor cifra">{{ paso.valor }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.embudo {
  background: #fff;
  border-radius: var(--radio-tarjeta);
  border: 1px solid var(--color-borde-tarjeta);
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.embudo__cabecera-seccion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
}

.embudo__titulo {
  margin: 0;
}

.embudo__subtitulo {
  margin: 0.25rem 0 0;
  color: var(--color-texto-secundario);
  font-size: var(--tamano-pequeno);
}

.embudo__filtro {
  border: 1px solid var(--color-borde-tarjeta);
  border-radius: var(--radio-tarjeta);
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  background: #fff;
  color: #334155;
}

.embudo__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.embudo__paso {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radio-tarjeta);
  background: #f8f9fa;
  color: #333;
}

/* Degradados exactos replicados del legacy (appscript/index.html) */
.embudo__paso.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #333;
}

.embudo__paso.rank-2 {
  background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
  color: #333;
}

.embudo__paso.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #daa520 100%);
  color: white;
}

.embudo__paso.rank-other {
  background: #f8f9fa;
  color: #333;
}

.embudo__icono {
  font-size: 1.5rem;
  line-height: 1;
}

.embudo__info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.embudo__nombre {
  font-weight: 600;
}

.embudo__detalle {
  font-size: 0.75rem;
  opacity: 0.85;
}

.embudo__valor {
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
