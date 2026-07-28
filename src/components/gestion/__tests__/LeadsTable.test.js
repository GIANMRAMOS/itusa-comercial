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
    it('con 3 seguimientos, el título dice "Historial de seguimientos" y el contador muestra "3"', async () => {
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
      expect(titulo.text()).toBe('Historial de seguimientos')
      const contador = wrapper.find('.leads-table__historial-contador')
      expect(contador.text()).toBe('3')
    })

    it('sin seguimientos (array vacío), el contador muestra "0"', async () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead({ seguimientos: [] })] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const contador = wrapper.find('.leads-table__historial-contador')
      expect(contador.text()).toBe('0')
    })

    it('sin seguimientos (undefined), el contador muestra "0"', async () => {
      const lead = crearLead()
      delete lead.seguimientos
      const wrapper = mount(LeadsTable, { props: { leads: [lead] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const contador = wrapper.find('.leads-table__historial-contador')
      expect(contador.text()).toBe('0')
    })
  })

  describe('agrupación del contador y el botón de agregar seguimiento', () => {
    it('el contador y el botón están ambos dentro de la cabecera del historial, junto al título', async () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const cabecera = wrapper.find('.leads-table__historial-cabecera')
      expect(cabecera.find('.leads-table__historial-titulo').exists()).toBe(true)
      expect(cabecera.find('.leads-table__historial-contador').exists()).toBe(true)
      expect(cabecera.find('.leads-table__boton-icono').exists()).toBe(true)
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

  describe('prop mostrarArchivar', () => {
    it('con mostrarArchivar=true, existe el botón Archivar con aria-label correcto y emite archivar-lead con el lead completo', async () => {
      const lead = crearLead({ contact: 'Juan Pérez' })
      const wrapper = mount(LeadsTable, { props: { leads: [lead], mostrarArchivar: true } })

      const botonArchivar = wrapper.find('.leads-table__boton-archivar')
      expect(botonArchivar.exists()).toBe(true)
      const ariaLabel = botonArchivar.attributes('aria-label')
      expect(ariaLabel.trim().length).toBeGreaterThan(0)
      expect(ariaLabel).toContain('Archivar')
      expect(ariaLabel).toContain('Juan Pérez')

      await botonArchivar.trigger('click')

      const emitido = wrapper.emitted('archivar-lead')
      expect(emitido).toBeTruthy()
      expect(emitido[0][0]).toEqual(lead)
    })

    it('con mostrarArchivar=false (default), el botón Archivar no existe', () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })
      expect(wrapper.find('.leads-table__boton-archivar').exists()).toBe(false)
    })
  })

  describe('prop mostrarReactivar (vista Archivados: solo Reactivar, sin Editar/Eliminar)', () => {
    function montarSoloReactivar(overrides = {}) {
      return mount(LeadsTable, {
        props: {
          leads: [crearLead({ contact: 'Ana López', ...overrides })],
          mostrarEditar: false,
          mostrarEliminar: false,
          mostrarArchivar: false,
          mostrarReactivar: true,
        },
      })
    }

    it('Acciones tiene SOLO el botón Reactivar (Editar/Eliminar/Archivar ausentes)', () => {
      const wrapper = montarSoloReactivar()

      const botonesAcciones = wrapper.find('.leads-table__acciones').findAll('button')
      expect(botonesAcciones.length).toBe(1)
      expect(wrapper.find('.leads-table__boton-reactivar').exists()).toBe(true)
      expect(wrapper.find('.leads-table__boton-eliminar').exists()).toBe(false)
      expect(wrapper.find('.leads-table__boton-archivar').exists()).toBe(false)
    })

    it('el aria-label del botón Reactivar no está vacío, contiene "Reactivar" y el click emite reactivar-lead con el lead', async () => {
      const wrapper = montarSoloReactivar()
      const botonReactivar = wrapper.find('.leads-table__boton-reactivar')

      const ariaLabel = botonReactivar.attributes('aria-label')
      expect(ariaLabel.trim().length).toBeGreaterThan(0)
      expect(ariaLabel).toContain('Reactivar')
      expect(ariaLabel).toContain('Ana López')

      await botonReactivar.trigger('click')

      const emitido = wrapper.emitted('reactivar-lead')
      expect(emitido).toBeTruthy()
      const leadEmitido = emitido[0][0]
      expect(leadEmitido.contact).toBe('Ana López')
    })
  })

  describe('prop permitirAgregarSeguimiento', () => {
    it('permitirAgregarSeguimiento=false: el historial se renderiza pero el botón "Agregar seguimiento" no existe', async () => {
      const lead = crearLead({
        seguimientos: [{ id: 1, fecha: '2024-01-01T00:00:00.000Z', texto: 'Primero' }],
      })
      const wrapper = mount(LeadsTable, { props: { leads: [lead], permitirAgregarSeguimiento: false } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      expect(wrapper.find('.leads-table__historial-titulo').exists()).toBe(true)
      expect(wrapper.find('.leads-table__historial-titulo').text()).toBe('Historial de seguimientos')
      expect(wrapper.find('.leads-table__historial-contador').text()).toBe('1')
      expect(wrapper.find('.leads-table__historial-lista').exists()).toBe(true)

      expect(wrapper.find('.leads-table__historial-cabecera .leads-table__boton-icono').exists()).toBe(false)
      expect(wrapper.emitted('abrir-seguimientos')).toBeUndefined()
    })

    it('permitirAgregarSeguimiento=true (default, sin pasar la prop): el botón "Agregar seguimiento" sigue existiendo', async () => {
      const wrapper = mount(LeadsTable, { props: { leads: [crearLead()] } })

      await wrapper.find('.leads-table__boton-expandir').trigger('click')

      const botonSeguimiento = wrapper.find('.leads-table__historial-cabecera .leads-table__boton-icono')
      expect(botonSeguimiento.exists()).toBe(true)
    })
  })
})
