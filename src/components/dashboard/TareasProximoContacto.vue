<script setup>
import { computed } from 'vue'
import { computeTareasProximoContacto } from '@/lib/leadMetrics'
import { etiquetaSubEstado } from '@/lib/leadEstado'
import { parseDateGMT5 } from '@/composables/useDateGMT5'

const props = defineProps({
  leads: {
    type: Array,
    required: true,
  },
})

const ETIQUETAS_ESTADO = {
  proceso: 'En Proceso',
  rechazado: 'Rechazado',
  convertido: 'Convertido',
}

const tareas = computed(() => computeTareasProximoContacto(props.leads))

function formatearFecha(fecha) {
  const parseada = parseDateGMT5(fecha)
  if (!parseada) return '—'
  const dia = String(parseada.getDate()).padStart(2, '0')
  const mes = String(parseada.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${parseada.getFullYear()}`
}
</script>

<template>
  <section class="tareas">
    <div class="tareas__cabecera-seccion">
      <div>
        <h2 class="tareas__titulo">📋 Atención a estos pendientes:</h2>
        <p class="tareas__subtitulo">Leads a contactar (2 días antes y después de hoy)</p>
      </div>
      <span class="tareas__contador">{{ tareas.length }}</span>
    </div>

    <p v-if="tareas.length === 0" class="tareas__vacio">No hay contactos próximos en este rango de fechas.</p>

    <ul v-else class="tareas__lista">
      <li
        v-for="tarea in tareas"
        :key="tarea.leadId"
        class="tareas__item"
        :class="`tareas__item--${tarea.urgencia}`"
      >
        <div class="tareas__cabecera">
          <router-link
            :to="`/gestion?leadId=${tarea.leadId}`"
            class="tareas__contacto"
            :title="`Ver historial de ${tarea.contact} en Gestión`"
          >
            {{ tarea.contact }}
          </router-link>
          <span class="tareas__fecha cifra">{{ formatearFecha(tarea.fechaSubEstado) }}</span>
        </div>
        <div class="tareas__meta">
          <span class="tareas__estado" :class="`tareas__estado--${tarea.estado}`">
            {{ ETIQUETAS_ESTADO[tarea.estado] || tarea.estado }}
          </span>
          <span v-if="tarea.subEstadoProceso" class="tareas__sub-estado">
            {{ etiquetaSubEstado(tarea.subEstadoProceso) }}
          </span>
        </div>
        <p class="tareas__descripcion">{{ tarea.descripcion || 'Sin seguimientos registrados.' }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.tareas {
  background: #fff;
  border-radius: var(--radio-tarjeta);
  border: 1px solid var(--color-borde-tarjeta);
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tareas__cabecera-seccion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
}

.tareas__titulo {
  margin: 0;
}

.tareas__subtitulo {
  margin: 0.25rem 0 0;
  color: var(--color-texto-secundario);
  font-size: var(--tamano-pequeno);
}

.tareas__contador {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  height: 1.6rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: var(--color-borde-tarjeta);
  color: var(--color-texto-secundario);
  font-size: 0.85rem;
  font-weight: 600;
}

.tareas__vacio {
  color: #64748b;
  margin: 0;
}

.tareas__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 420px;
  overflow-y: auto;
}

.tareas__item {
  border-radius: var(--radio-tarjeta);
  border: 1px solid var(--color-borde-tarjeta);
  padding: 0.75rem;
}

.tareas__item--vencida {
  background: var(--color-error-fondo);
  border-color: var(--color-error);
}

.tareas__item--hoy {
  background: var(--color-exito-fondo);
  border-color: var(--color-exito);
}

.tareas__item--futura {
  background: var(--color-advertencia-fondo);
  border-color: var(--color-advertencia);
}

.tareas__cabecera {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.tareas__contacto {
  font-weight: 600;
  color: var(--color-texto);
  text-decoration: none;
}

.tareas__contacto:hover {
  color: var(--color-primario);
  text-decoration: underline;
}

.tareas__fecha {
  font-size: 0.85rem;
  white-space: nowrap;
  color: var(--color-texto-secundario);
}

.tareas__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.tareas__estado {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #eef0f3;
  color: var(--color-texto);
}

.tareas__estado--convertido {
  background: var(--color-exito);
  color: #fff;
}

.tareas__estado--rechazado {
  background: var(--color-error);
  color: #fff;
}

.tareas__estado--proceso {
  background: var(--color-advertencia);
  color: #fff;
}

.tareas__sub-estado {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-texto);
}

.tareas__descripcion {
  margin: 0.4rem 0 0;
  color: var(--color-texto);
  font-size: 0.9rem;
}
</style>
