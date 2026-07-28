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

  describe('aria-labels de accesibilidad', () => {
    it('el botón Editar tiene aria-label no vacío con "Editar" y el nombre del contacto', () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead({ contact: 'Juan Pérez' })] } })

      const botonEditar = wrapper.find('.leads-table__acciones .leads-table__boton-icono:not(.leads-table__boton-eliminar)')
      expect(botonEditar.exists()).toBe(true)
      const ariaLabel = botonEditar.attributes('aria-label')
      expect(ariaLabel.trim().length).toBeGreaterThan(0)
      expect(ariaLabel).toContain('Editar')
      expect(ariaLabel).toContain('Juan Pérez')
    })

    it('el botón Eliminar tiene aria-label no vacío con "Eliminar" y el nombre del contacto', () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead({ contact: 'Juan Pérez' })] } })

      const botonEliminar = wrapper.find('.leads-table__acciones .leads-table__boton-eliminar')
      expect(botonEliminar.exists()).toBe(true)
      const ariaLabel = botonEliminar.attributes('aria-label')
      expect(ariaLabel.trim().length).toBeGreaterThan(0)
      expect(ariaLabel).toContain('Eliminar')
      expect(ariaLabel).toContain('Juan Pérez')
    })

    it('el botón de agregar seguimiento del panel expandido tiene aria-label="Agregar seguimiento"', async () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const botonSeguimiento = wrapper.find('.leads-table__historial-cabecera .leads-table__boton-icono')
      expect(botonSeguimiento.exists()).toBe(true)
      expect(botonSeguimiento.attributes('aria-label')).toBe('Agregar seguimiento')
    })
  })

  describe('reubicación del disparador de abrir-seguimientos', () => {
    it('con la fila colapsada, Acciones tiene exactamente 2 botones y no dispara abrir-seguimientos', async () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

      const botonesAcciones = wrapper.find('.leads-table__acciones').findAll('button')
      expect(botonesAcciones.length).toBe(2)

      for (const boton of botonesAcciones) {
        await boton.trigger('click')
      }

      expect(wrapper.emitted('abrir-seguimientos')).toBeUndefined()
    })

    it('al expandir, el botón "Agregar seguimiento" del panel emite abrir-seguimientos con el lead completo', async () => {
      const lead = crearLead()
      const wrapper = mount(LeadsTable, { props: { leads: [lead] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const botonSeguimiento = wrapper.find('.leads-table__historial-cabecera .leads-table__boton-icono')
      expect(botonSeguimiento.exists()).toBe(true)

      await botonSeguimiento.trigger('click')

      const emitido = wrapper.emitted('abrir-seguimientos')
      expect(emitido).toBeTruthy()
      expect(emitido.length).toBe(1)
      expect(emitido[0][0]).toEqual(lead)
    })
  })

  describe('conteo del título de seguimientos', () => {
    it('con 3 seguimientos, el título dice "Historial de seguimientos (3)"', async () => {
      const lead = crearLead({
        seguimientos: [
          { id: 1, fecha: '2024-01-01T00:00:00.000Z', texto: 'Primero' },
          { id: 2, fecha: '2024-01-02T00:00:00.000Z', texto: 'Segundo' },
          { id: 3, fecha: '2024-01-03T00:00:00.000Z', texto: 'Tercero' },
        ],
      })
      const wrapper = mount(LeadsTable, { props: { leads: [lead] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const titulo = wrapper.find('.leads-table__historial-titulo')
      expect(titulo.text()).toContain('Historial de seguimientos (3)')
    })

    it('sin seguimientos (array vacío), el título dice "Historial de seguimientos (0)"', async () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead({ seguimientos: [] })] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const titulo = wrapper.find('.leads-table__historial-titulo')
      expect(titulo.text()).toContain('Historial de seguimientos (0)')
    })

    it('sin seguimientos (undefined), el título dice "Historial de seguimientos (0)"', async () => {
      const lead = crearLead()
      delete lead.seguimientos
      const wrapper = mount(LeadsTable, { props: { leads: [lead] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const titulo = wrapper.find('.leads-table__historial-titulo')
      expect(titulo.text()).toContain('Historial de seguimientos (0)')
    })
  })

  describe('franja de color izquierda por estado', () => {
    it('mapea conversion_at / rechazo_at / ninguno a las 3 clases de fila correctas', () => {
      const leadConvertido = crearLead({ id: 1, contact: 'Convertido', conversion_at: '2024-02-01T00:00:00.000Z' })
      const leadRechazado = crearLead({ id: 2, contact: 'Rechazado', rechazo_at: '2024-02-01T00:00:00.000Z' })
      const leadEnProceso = crearLead({ id: 3, contact: 'EnProceso' })

      const wrapper = mount(LeadsTable, {
        props: { leads: [leadConvertido, leadRechazado, leadEnProceso] },
      })

      const filas = wrapper.findAll('.leads-table__fila')
      expect(filas.length).toBe(3)
      expect(filas[0].classes()).toContain('leads-table__fila--convertido')
      expect(filas[1].classes()).toContain('leads-table__fila--rechazado')
      expect(filas[2].classes()).toContain('leads-table__fila--proceso')
    })
  })
})
