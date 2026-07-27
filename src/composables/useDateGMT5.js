// Utilidades de fecha unificadas en GMT-5 (zona horaria de referencia del negocio).
// Reemplazan la duplicación de estas mismas funciones entre backend y frontend del legacy.

const GMT5_OFFSET_MS = -5 * 60 * 60000

/**
 * Devuelve la fecha y hora actual como Date ajustado a GMT-5.
 */
export function getCurrentDateGMT5() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + GMT5_OFFSET_MS)
}

/**
 * Convierte un string de fecha (o un Date) a un objeto Date, interpretando
 * formatos 'YYYY-MM-DD' como fecha local sin corrimiento de zona horaria.
 * Devuelve null si la entrada es vacía o inválida.
 */
export function parseDateGMT5(dateInput) {
  if (!dateInput) return null

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput
  }

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return null
  return date
}

/**
 * Formatea un Date (o string parseable) a 'YYYY-MM-DD'.
 */
export function formatDateGMT5(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : parseDateGMT5(date)
  if (!d) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Devuelve la fecha de hoy en GMT-5 como string 'YYYY-MM-DD'.
 */
export function getTodayGMT5() {
  return formatDateGMT5(getCurrentDateGMT5())
}

/**
 * Compara dos fechas en GMT-5. Devuelve la diferencia en milisegundos (date1 - date2).
 * Devuelve 0 si alguna de las dos fechas no es parseable.
 */
export function compareDatesGMT5(date1, date2) {
  const d1 = parseDateGMT5(date1)
  const d2 = parseDateGMT5(date2)
  if (!d1 || !d2) return 0
  return d1.getTime() - d2.getTime()
}

/**
 * Formatea una fecha para mostrar en español (DD/MM).
 */
export function formatDateForDisplay(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : parseDateGMT5(date)
  if (!d) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}
