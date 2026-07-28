// Funciones puras de métricas de negocio sobre leads.
// Portadas desde appscript/index.html; testeables sin Supabase.

import {
  getCurrentDateGMT5,
  parseDateGMT5,
  formatDateGMT5,
  formatDateForDisplay,
  getTodayGMT5,
} from '@/composables/useDateGMT5'

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

// Nombres de mes en español, usados para construir las etiquetas de getRecentMonthOptions.
const NOMBRES_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/**
 * Últimos 3 meses calendario (mes actual + 2 anteriores) relativos a hoy (GMT-5),
 * ordenados del más reciente al más antiguo. Cada opción tiene clave YYYY-MM
 * (mismo formato que created_at.substring(0, 7)) y una etiqueta legible en
 * español, ej. "Julio 2026".
 */
export function getRecentMonthOptions() {
  const hoy = getCurrentDateGMT5()
  const opciones = []

  for (let i = 0; i <= 2; i++) {
    // Día fijo en 1 para evitar el bug de overflow (ej. hoy 31/03 no debe saltear febrero).
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const anio = fecha.getFullYear()
    const mes = fecha.getMonth()
    const clave = `${anio}-${String(mes + 1).padStart(2, '0')}`
    const etiqueta = `${NOMBRES_MESES[mes]} ${anio}`
    opciones.push({ clave, etiqueta })
  }

  return opciones
}

/**
 * Filtra leads dejando solo los que tengan created_at (YYYY-MM) dentro de las claves recibidas.
 * Sirve tanto para un mes específico (un elemento) como para "Todos" (varias claves).
 */
export function filterLeadsByMonthKeys(leads = [], claves = []) {
  const clavesValidas = new Set(claves)
  return leads.filter((lead) => lead.created_at && clavesValidas.has(lead.created_at.substring(0, 7)))
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

/**
 * Tareas de próximo contacto: leads "En Proceso" cuya próxima fecha a contactar
 * (fecha_sub_estado) cae dentro de la ventana [hoy-2, hoy+2] días, ordenadas por fecha
 * ascendente (vencidas primero). Cada tarea trae su "urgencia" ('vencida' | 'hoy' | 'futura')
 * y la descripción del último seguimiento registrado para ese lead, si existe.
 */
export function computeTareasProximoContacto(leads = [], hoyStr = getTodayGMT5()) {
  const hoy = parseDateGMT5(hoyStr)
  if (!hoy) return []

  const inicioVentana = new Date(hoy)
  inicioVentana.setDate(inicioVentana.getDate() - 2)
  const finVentana = new Date(hoy)
  finVentana.setDate(finVentana.getDate() + 2)

  const tareas = leads
    .map((lead) => ({ lead, fecha: parseDateGMT5(lead.fecha_sub_estado) }))
    .filter(({ fecha }) => fecha && fecha >= inicioVentana && fecha <= finVentana)
    .map(({ lead, fecha }) => {
      let urgencia = 'futura'
      if (fecha.getTime() < hoy.getTime()) urgencia = 'vencida'
      else if (fecha.getTime() === hoy.getTime()) urgencia = 'hoy'

      const ultimoSeguimiento = Array.isArray(lead.seguimientos)
        ? [...lead.seguimientos].sort((a, b) => {
            const fechaA = parseDateGMT5(a.fecha)
            const fechaB = parseDateGMT5(b.fecha)
            if (!fechaA && !fechaB) return 0
            if (!fechaA) return 1
            if (!fechaB) return -1
            return fechaB.getTime() - fechaA.getTime()
          })[0]
        : null

      return {
        leadId: lead.id,
        contact: lead.contact || 'Sin contacto',
        company: lead.company || '',
        estado: getStatus(lead),
        subEstadoProceso: lead.sub_estado_proceso || '',
        descripcion: ultimoSeguimiento?.texto || '',
        fechaSubEstado: lead.fecha_sub_estado,
        urgencia,
      }
    })

  return tareas.sort((a, b) => parseDateGMT5(a.fechaSubEstado).getTime() - parseDateGMT5(b.fechaSubEstado).getTime())
}
