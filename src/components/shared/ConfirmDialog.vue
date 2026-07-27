<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  titulo: {
    type: String,
    default: 'Confirmar acción',
  },
  mensaje: {
    type: String,
    default: '¿Estás seguro?',
  },
  textoConfirmar: {
    type: String,
    default: 'Confirmar',
  },
  textoCancelar: {
    type: String,
    default: 'Cancelar',
  },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="visible" class="confirm-dialog">
    <div class="confirm-dialog__caja">
      <h2 class="confirm-dialog__titulo">{{ titulo }}</h2>
      <p class="confirm-dialog__mensaje">{{ mensaje }}</p>
      <div class="confirm-dialog__acciones">
        <button
          type="button"
          class="confirm-dialog__boton confirm-dialog__boton--cancelar"
          @click="emit('cancel')"
        >
          {{ textoCancelar }}
        </button>
        <button
          type="button"
          class="confirm-dialog__boton confirm-dialog__boton--confirmar"
          @click="emit('confirm')"
        >
          {{ textoConfirmar }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 10000;
}

.confirm-dialog__caja {
  width: 100%;
  max-width: 360px;
  padding: 1.5rem;
  background: var(--color-fondo);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra-modal);
}

.confirm-dialog__titulo {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.confirm-dialog__mensaje {
  margin: 0 0 1.25rem;
  color: var(--color-texto-secundario);
  font-size: 0.9rem;
}

.confirm-dialog__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.confirm-dialog__boton {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.confirm-dialog__boton--cancelar {
  background: var(--color-fondo);
  border: 1px solid var(--color-borde);
  color: var(--color-texto);
}

.confirm-dialog__boton--confirmar {
  background: var(--color-error);
  border: 1px solid var(--color-error);
  color: #fff;
}
</style>
