import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LeadsTable from '@/components/gestion/LeadsTable.vue'

function crearLead(overrides = {}) {
  return {
    id: 1,
    source: 'Web',
    contact: 'Juan Pérez',
    company: 'Acme SAC',
    email: 'juan@acme.com',
    phone: '999999999',
    created_at: '2024-01-10T00:00:00.000Z',
    factura: 1500,
    seguimientos: [],
    ...overrides,
  }
}

const ETIQUETAS_ESPERADAS = [
  'Fuente',
  'Contacto',
  'Empresa',
  'Correo',
  'Teléfono',
  'Creación',
  'Estado',
  'Factura',
  'Días en proceso',
  'Acciones',
]

describe('LeadsTable', () => {
  it('expone el data-label correcto en cada td de datos de la fila principal', () => {
    const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

    const fila = wrapper.find('.leads-table__fila')
    // El primer td (botón expandir) no lleva data-label; los siguientes 10 sí.
    const tds = fila.findAll('td')
    const dataLabels = tds.map((td) => td.attributes('data-label')).filter((label) => label !== undefined)

    expect(dataLabels).toEqual(ETIQUETAS_ESPERADAS)
  })

  it('asigna la clase --convertido cuando el lead tiene conversion_at', () => {
    const wrapper = mount(LeadsTable, {
      props: { leads: [crearLead({ conversion_at: '2024-02-01T00:00:00.000Z' })] },
    })

    const badge = wrapper.find('.leads-table__estado')
    expect(badge.classes()).toContain('leads-table__estado--convertido')
  })

  it('asigna la clase --rechazado cuando el lead tiene rechazo_at y no conversion_at', () => {
    const wrapper = mount(LeadsTable, {
      props: { leads: [crearLead({ rechazo_at: '2024-02-01T00:00:00.000Z' })] },
    })

    const badge = wrapper.find('.leads-table__estado')
    expect(badge.classes()).toContain('leads-table__estado--rechazado')
  })

  it('asigna la clase --proceso cuando el lead no tiene conversion_at ni rechazo_at', () => {
    const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

    const badge = wrapper.find('.leads-table__estado')
    expect(badge.classes()).toContain('leads-table__estado--proceso')
  })

  it('envuelve Factura, Creación y Días en proceso en un span.cifra', () => {
    const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

    const tdFactura = wrapper.find('td[data-label="Factura"]')
    const tdCreacion = wrapper.find('td[data-label="Creación"]')
    const tdDias = wrapper.find('td[data-label="Días en proceso"]')

    expect(tdFactura.find('span.cifra').exists()).toBe(true)
    expect(tdCreacion.find('span.cifra').exists()).toBe(true)
    expect(tdDias.find('span.cifra').exists()).toBe(true)
  })

  it('muestra el mensaje "No hay leads..." cuando la lista de leads está vacía', () => {
    const wrapper = mount(LeadsTable, { props: { leads: [] } })

    const sinResultados = wrapper.find('.leads-table__sin-resultados')
    expect(sinResultados.exists()).toBe(true)
    expect(sinResultados.text()).toContain('No hay leads que coincidan con la búsqueda.')
    expect(wrapper.findAll('.leads-table__fila').length).toBe(0)
  })

  it('muestra 0 filas de datos y el mensaje sin-resultados cuando la búsqueda no tiene coincidencias', async () => {
    const wrapper = mount(LeadsTable, {
      props: { leads: [crearLead({ contact: 'Juan Pérez', company: 'Acme SAC' })] },
    })

    await wrapper.find('.leads-table__busqueda').setValue('texto-que-no-existe-en-ningun-lead')

    expect(wrapper.findAll('.leads-table__fila').length).toBe(0)
    const sinResultados = wrapper.find('.leads-table__sin-resultados')
    expect(sinResultados.exists()).toBe(true)
    expect(sinResultados.text()).toContain('No hay leads que coincidan con la búsqueda.')
  })
})
