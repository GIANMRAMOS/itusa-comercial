import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('emite "confirm" al hacer click en el botón de confirmar', async () => {
    const wrapper = mount(ConfirmDialog, { props: { visible: true } })

    await wrapper.find('.confirm-dialog__boton--confirmar').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('emite "cancel" al hacer click en el botón de cancelar', async () => {
    const wrapper = mount(ConfirmDialog, { props: { visible: true } })

    await wrapper.find('.confirm-dialog__boton--cancelar').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('no renderiza el diálogo cuando visible es false', () => {
    const wrapper = mount(ConfirmDialog, { props: { visible: false } })
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
  })
})
