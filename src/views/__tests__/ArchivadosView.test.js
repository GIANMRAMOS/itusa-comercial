import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import ArchivadosView from '@/views/ArchivadosView.vue'
import LeadsTable from '@/components/gestion/LeadsTable.vue'

// No hay precedente de test de vistas en el proyecto (GestionView/DashboardView no tienen
// suite propia) y el proyecto no tiene @pinia/testing instalado, así que mockeamos
// `@/stores/leads` directamente, igual que se mockea `@/lib/supabase` en los tests del store.
vi.mock('@/stores/leads', () => ({
  useLeadsStore: vi.fn(),
}))

import { useLeadsStore } from '@/stores/leads'

function crearLead(overrides = {}) {
  return {
    id: 1,
    contact: 'Archivado Uno',
    seguimientos: [],
    ...overrides,
  }
}

function montarConStoreFake(overrides = {}) {
  const storeFake = reactive({
    leadsArchivados: [],
    loading: false,
    error: null,
    fetchLeadsArchivados: vi.fn(),
    reactivarLead: vi.fn(),
    ...overrides,
  })
  useLeadsStore.mockReturnValue(storeFake)

  const wrapper = mount(ArchivadosView)
  return { wrapper, storeFake }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ArchivadosView', () => {
  it('al montar, llama a fetchLeadsArchivados del store', () => {
    const { storeFake } = montarConStoreFake()
    expect(storeFake.fetchLeadsArchivados).toHaveBeenCalledTimes(1)
  })

  it('renderiza un <h1> con el texto "Leads Archivados"', () => {
    const { wrapper } = montarConStoreFake()
    const titulo = wrapper.find('h1')
    expect(titulo.exists()).toBe(true)
    expect(titulo.text()).toBe('Leads Archivados')
  })

  it('pasa a LeadsTable las props correctas (solo Reactivar, sin agregar seguimiento) y los leads archivados del store', () => {
    const leadsArchivados = [crearLead({ id: 5, contact: 'Archivado Cinco' })]
    const { wrapper } = montarConStoreFake({ leadsArchivados })

    const tabla = wrapper.findComponent(LeadsTable)
    expect(tabla.exists()).toBe(true)
    expect(tabla.props('leads')).toEqual(leadsArchivados)
    expect(tabla.props('mostrarEditar')).toBe(false)
    expect(tabla.props('mostrarEliminar')).toBe(false)
    expect(tabla.props('mostrarArchivar')).toBe(false)
    expect(tabla.props('mostrarReactivar')).toBe(true)
    expect(tabla.props('permitirAgregarSeguimiento')).toBe(false)
  })

  it('al recibir el evento reactivar-lead de LeadsTable, llama a leadsStore.reactivarLead(lead.id)', async () => {
    const lead = crearLead({ id: 7 })
    const { wrapper, storeFake } = montarConStoreFake({ leadsArchivados: [lead] })

    const tabla = wrapper.findComponent(LeadsTable)
    tabla.vm.$emit('reactivar-lead', lead)
    await wrapper.vm.$nextTick()

    expect(storeFake.reactivarLead).toHaveBeenCalledTimes(1)
    expect(storeFake.reactivarLead).toHaveBeenCalledWith(7)
  })

  it('muestra el mensaje de error del store cuando leadsStore.error está seteado', () => {
    const { wrapper } = montarConStoreFake({ error: 'Falla de conexión' })
    expect(wrapper.text()).toContain('Falla de conexión')
  })
})
