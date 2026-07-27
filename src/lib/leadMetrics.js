// Funciones puras de métricas de negocio sobre leads.
// Portadas desde appscript/index.html; testeables sin Supabase.

import { getCurrentDateGMT5, parseDateGMT5, formatDateGMT5, formatDateForDisplay } from '@/composables/useDateGMT5'

/**
 * Estado de un lead. Precedencia: convertido > rechazado > proceso.
 */
export function getStatus(lead) {
  if (lead?.conversion_at) return 'convertido'
  if (lead?.rechazo_at) return 'rechazado'
  return 'proceso'
}

/**
 * Días transcurridos desde la creación del lead hasta su conversión (o hasta hoy si no convirtió).
 */
export function getDaysInProcess(lead) {
  if (!lead?.created_at) return 0
  const inicio = parseDateGMT5(lead.created_at)
  const fin = lead.conversion_at ? parseDateGMT5(lead.conversion_at) : getCurrentDateGMT5()
  if (!inicio || !fin) return 0
  return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * KPIs agregados del conjunto de leads.
 */
export function computeKPIs(leads = []) {
  const totalLeads = leads.length
  const calificados = leads.filter((l) => l.calificado_at).length
  const visitas = leads.filter((l) => l.visita_at).length
  const conversiones = leads.filter((l) => l.conversion_at).length
  const totalFacturado = leads.reduce((suma, l) => suma + (l.factura || 0), 0)
  const porcentajeConversion = totalLeads > 0 ? Number(((conversiones / totalLeads) * 100).toFixed(1)) : 0

  const facturasValidas = leads.filter((l) => l.factura)
  const ticketPromedio = facturasValidas.length > 0 ? Math.round(totalFacturado / facturasValidas.length) : 0

  const leadsConvertidos = leads.filter((l) => l.conversion_at && l.created_at)
  const diasPromedioConversion =
    leadsConvertidos.length > 0
      ? Math.round(leadsConvertidos.reduce((suma, l) => suma + getDaysInProcess(l), 0) / leadsConvertidos.length)
      : 0

  return {
    totalLeads,
    calificados,
    visitas,
    conversiones,
    porcentajeConversion,
    diasPromedioConversion,
    totalFacturado,
    ticketPromedio,
  }
}

/**
 * Embudo de conversión: total -> contactados -> calificados -> visitas -> conversiones.
 * Cada paso incluye porcentaje sobre el total y porcentaje sobre el paso anterior.
 */
export function computeFunnel(leads = []) {
  const totalLeads = leads.length
  const contactados = leads.filter((l) => l.contactado_at).length
  const calificados = leads.filter((l) => l.calificado_at).length
  const visitas = leads.filter((l) => l.visita_at).length
  const conversiones = leads.filter((l) => l.conversion_at).length

  const pasos = [
    { nombre: 'Contactados', valor: contactados, anterior: totalLeads },
    { nombre: 'Calificados', valor: calificados, anterior: contactados },
    { nombre: 'Visitas', valor: visitas, anterior: calificados },
    { nombre: 'Conversiones', valor: conversiones, anterior: visitas },
  ]

  return pasos.map((paso) => ({
    nombre: paso.nombre,
    valor: paso.valor,
    porcentajeDelTotal: totalLeads > 0 ? Number(((paso.valor / totalLeads) * 100).toFixed(1)) : 0,
    porcentajeDelAnterior: paso.anterior > 0 ? Number(((paso.valor / paso.anterior) * 100).toFixed(1)) : 0,
  }))
}

/**
 * Ranking de las top fuentes (source) por cantidad de leads. Ignora fuentes vacías/null.
 */
export function computeSourceRanking(leads = [], top = 6) {
  const conteoPorFuente = leads.reduce((acc, lead) => {
    if (lead.source) {
      acc[lead.source] = (acc[lead.source] || 0) + 1
    }
    return acc
  }, {})

  return Object.entries(conteoPorFuente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([source, cantidad]) => ({ source, cantidad }))
}

/**
 * Evolución mensual: cantidad de leads por mes (YYYY-MM) de created_at, ordenado ascendente.
 */
export function computeMonthlyEvolution(leads = []) {
  const conteoPorMes = leads.reduce((acc, lead) => {
    if (lead.created_at) {
      const mes = lead.created_at.substring(0, 7)
      acc[mes] = (acc[mes] || 0) + 1
    }
    return acc
  }, {})

  return Object.keys(conteoPorMes)
    .sort()
    .map((mes) => ({ mes, cantidad: conteoPorMes[mes] }))
}

/**
 * Cantidad de leads creados por día en los últimos 30 días (ventana en GMT-5).
 */
export function computeLast30Days(leads = []) {
  const hoy = getCurrentDateGMT5()
  const hace29Dias = new Date(hoy)
  hace29Dias.setDate(hace29Dias.getDate() - 29)

  const conteoPorDia = {}
  leads.forEach((lead) => {
    if (!lead.created_at) return
    const fechaCreacion = parseDateGMT5(lead.created_at)
    if (!fechaCreacion) return
    if (fechaCreacion < hace29Dias || fechaCreacion > hoy) return
    const dia = formatDateGMT5(fechaCreacion)
    conteoPorDia[dia] = (conteoPorDia[dia] || 0) + 1
  })

  const resultado = []
  for (let i = 29; i >= 0; i--) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() - i)
    const clave = formatDateGMT5(fecha)
    resultado.push({
      fecha: clave,
      etiqueta: formatDateForDisplay(fecha),
      cantidad: conteoPorDia[clave] || 0,
    })
  }
  return resultado
}

/**
 * Aplana los seguimientos de todos los leads en una sola lista, ordenada por fecha descendente,
 * incluyendo el contacto y la compañía del lead al que pertenecen.
 */
export function flattenLatestSeguimientos(leads = [], limite = 10) {
  const todosLosSeguimientos = []

  leads.forEach((lead) => {
    if (Array.isArray(lead.seguimientos)) {
      lead.seguimientos.forEach((seguimiento) => {
        todosLosSeguimientos.push({
          leadId: lead.id,
          fecha: seguimiento.fecha || '',
          texto: seguimiento.texto || '',
          contact: lead.contact || 'Sin contacto',
          company: lead.company || 'Sin compañía',
        })
      })
    }
  })

  todosLosSeguimientos.sort((a, b) => {
    const fechaA = parseDateGMT5(a.fecha)
    const fechaB = parseDateGMT5(b.fecha)
    if (!fechaA && !fechaB) return 0
    if (!fechaA) return 1
    if (!fechaB) return -1
    return fechaB.getTime() - fechaA.getTime()
  })

  return todosLosSeguimientos.slice(0, limite)
}
