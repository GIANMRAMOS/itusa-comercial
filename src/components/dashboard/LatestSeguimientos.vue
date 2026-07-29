<script setup>
import { ref, computed } from 'vue'
import { getTodayGMT5, parseDateGMT5, compareDatesGMT5 } from '@/composables/useDateGMT5'

const props = defineProps({
  seguimientos: {
    type: Array,
    required: true,
  },
})

// Presets disponibles para el filtro de fecha del historial de seguimientos.
const PRESETS = [
  { valor: 'hoy_ayer', etiqueta: 'Hoy y ayer' },
  { valor: 'ultimos_7_dias', etiqueta: 'Últimos 7 días' },
  { valor: 'todo', etiqueta: 'Todo' },
]

const presetSeleccionado = ref('hoy_ayer')

// Fecha límite (en GMT-5) según el preset activo. `null` significa sin límite ("Todo").
function calcularFechaLimite(preset) {
  const hoy = parseDateGMT5(getTodayGMT5())
  if (preset === 'hoy_ayer') {
    return new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000)
  }
  if (preset === 'ultimos_7_dias') {
    return new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000)
  }
  return null
}

const seguimientosFiltrados = computed(() => {
  const fechaLimite = calcularFechaLimite(presetSeleccionado.value)
  if (!fechaLimite) return props.seguimientos
  return props.seguimientos.filter((seguimiento) => compareDatesGMT5(seguimiento.fecha, fechaLimite) >= 0)
})
</script>

<template>
  <section class="ultimos-seguimientos">
    <div class="ultimos-seguimientos__cabecera-seccion">
      <h2 class="ultimos-seguimientos__titulo">Últimos seguimientos</h2>
      <select v-model="presetSeleccionado" class="ultimos-seguimientos__filtro" aria-label="Filtrar por fecha">
        <option v-for="preset in PRESETS" :key="preset.valor" :value="preset.valor">
          {{ preset.etiqueta }}
        </option>
      </select>
    </div>
    <ul v-if="seguimientosFiltrados.length" class="ultimos-seguimientos__lista">
      <li
        v-for="seguimiento in seguimientosFiltrados"
        :key="`${seguimiento.leadId}-${seguimiento.fecha}-${seguimiento.texto}`"
        class="ultimos-seguimientos__item"
      >
        <div class="ultimos-seguimientos__cabecera">
          <span class="ultimos-seguimientos__contacto">
            <router-link
              :to="`/gestion?leadId=${seguimiento.leadId}`"
              class="ultimos-seguimientos__enlace-contacto"
              :title="`Ver historial de ${seguimiento.contact} en Gestión`"
            >
              {{ seguimiento.contact }}
            </router-link>
            · {{ seguimiento.company }}
          </span>
          <span class="ultimos-seguimientos__fecha cifra">{{ seguimiento.fecha }}</span>
        </div>
        <p class="ultimos-seguimientos__texto">{{ seguimiento.texto }}</p>
      </li>
    </ul>
    <p v-else-if="!seguimientos.length" class="ultimos-seguimientos__vacio">
      Sin seguimientos registrados todavía.
    </p>
    <p v-else class="ultimos-seguimientos__vacio">Sin seguimientos en este rango.</p>
  </section>
</template>

<style scoped>
.ultimos-seguimientos {
  background: #fff;
  border-radius: var(--radio-tarjeta);
  border: 1px solid var(--color-borde-tarjeta);
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ultimos-seguimientos__cabecera-seccion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
}

.ultimos-seguimientos__titulo {
  margin: 0;
}

.ultimos-seguimientos__filtro {
  border: 1px solid var(--color-borde-tarjeta);
  border-radius: var(--radio-tarjeta);
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  background: #fff;
  color: #334155;
}

.ultimos-seguimientos__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ultimos-seguimientos__item {
  border-bottom: 1px solid var(--color-borde-tarjeta);
  padding-bottom: 0.75rem;
}

.ultimos-seguimientos__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.ultimos-seguimientos__cabecera {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  gap: 1rem;
}

.ultimos-seguimientos__enlace-contacto {
  color: inherit;
  text-decoration: none;
}

.ultimos-seguimientos__enlace-contacto:hover {
  color: var(--color-primario);
  text-decoration: underline;
}

.ultimos-seguimientos__fecha {
  color: #64748b;
  font-weight: 400;
  font-size: 0.85rem;
  white-space: nowrap;
}

.ultimos-seguimientos__texto {
  margin: 0.25rem 0 0;
  color: #334155;
}

.ultimos-seguimientos__vacio {
  color: #64748b;
  margin: 0;
}
</style>
