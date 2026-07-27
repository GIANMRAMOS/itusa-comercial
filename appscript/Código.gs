// ============================================
// CONFIGURACIÓN
// ============================================
const SPREADSHEET_ID = '1eOHmH0zfTQLvqZzMBzk1iJ50W3fPjm8VaFf-tYzpXLM';
const SHEET_NAME = 'Sheet1';
/** Nombre de la hoja de prospección de clientes (Hoja 1). Si renombras la pestaña en el Sheet, actualiza aquí. */
const PROSPECCION_SHEET_NAME = 'Hoja 1';
const TIME_ZONE = 'America/Lima'; // GMT-5

// Mapeo de nombres de columnas
const HEADER_MAP = {
  'Source': 'Source',
  'Contact': 'Contact',
  'Company': 'Company',
  'Correo': 'Correo',
  'Teléfono': 'Telefono',
  'Creación': 'Creación',
  'Requerimiento': 'Requerimiento',
  'Active Campaign': 'ActiveCampaign',
  'Seguimiento': 'SeguimientoInicial',
  'Contactado': 'Contactado',
  'Calificado': 'Calificado',
  'No Calificado': 'NoCalificado',
  'Visita': 'Visita',
  'Propuesta': 'Propuesta',
  'Conversión': 'Conversión',
  'Rechazo': 'Rechazo',
  'Factura': 'Factura',
  'Review': 'Review'
};

// Columnas que contienen fechas
const DATE_HEADERS = ['Creación', 'Contactado', 'Calificado', 'No Calificado', 'Visita', 'Propuesta', 'Conversión', 'Rechazo'];

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Obtiene la hoja del spreadsheet
 */
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('No se encontró la hoja: ' + SHEET_NAME);
  }
  return sheet;
}

/**
 * Convierte un string de fecha (yyyy-MM-dd) a objeto Date
 */
function parseDateString(dateString) {
  if (!dateString || typeof dateString !== 'string' || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null;
  }
  const dateParts = dateString.split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // Los meses son 0-11
  const day = parseInt(dateParts[2]);
  // Usar mediodía para evitar problemas de zona horaria
  return new Date(year, month, day, 12, 0, 0, 0);
}

/**
 * Aplica formato de fecha a una celda
 */
function applyDateFormat(range, dateString) {
  const dateObj = parseDateString(dateString);
  if (dateObj) {
    range.setValue(dateObj);
    range.setNumberFormat('yyyy-mm-dd');
  }
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Menú al abrir el proyecto en el editor. Permite registrar la fecha de compilación tras un despliegue.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.createMenu('App Leads')
        .addItem('Registrar fecha de compilación', 'menuUpdateCompilationDate')
        .addToUi();
    }
  } catch (e) {
    Logger.log('onOpen menu: ' + e.toString());
  }
}

function menuUpdateCompilationDate() {
  var r = updateAppCompilationDate();
  var ui = SpreadsheetApp.getUi();
  if (ui) ui.alert(r.success ? 'Fecha de compilación actualizada.' : 'Error: ' + r.message);
}

/**
 * Sirve la página HTML del dashboard
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Dashboard Control Comercial - ITUSA')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Obtiene todos los leads del Google Sheet
 */
function getAllLeads() {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const seguimientosMap = getAllSeguimientosMap();
    const leads = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const lead = {
        rowIndex: i + 1 // Guardar el índice de fila para actualizaciones
      };
      
      for (let j = 0; j < headers.length; j++) {
        let value = row[j];
        if (value instanceof Date) value = Utilities.formatDate(value, TIME_ZONE, 'yyyy-MM-dd');
        lead[HEADER_MAP[headers[j]] || headers[j]] = value === '' ? null : value;
      }
      
      lead.Seguimientos = seguimientosMap['seguimientos_' + lead.rowIndex] || [];
      leads.push(lead);
    }
    
    return leads;
  } catch (error) {
    Logger.log('Error en getAllLeads: ' + error.toString());
    throw new Error('Error al obtener los leads: ' + error.message);
  }
}

/**
 * Agrega un nuevo lead al Google Sheet
 */
function addLead(leadData) {
  try {
    const sheet = getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = [];
    
    headers.forEach(header => {
      const mappedHeader = HEADER_MAP[header] || header;
      let value = leadData[mappedHeader];
      
      // Manejar valores null, undefined o vacíos
      if (value === null || value === undefined || value === '') {
        value = '';
      }
      
      // Manejar números (Factura)
      if (mappedHeader === 'Factura' && value !== '') {
        value = parseFloat(value) || 0;
      }
      
      newRow.push(value);
    });
    
    // Guardar la fila
    const newRowIndex = sheet.getLastRow() + 1;
    sheet.getRange(newRowIndex, 1, 1, newRow.length).setValues([newRow]);
    
    // Aplicar formato de fecha a las columnas de fecha después de guardar
    headers.forEach((header, colIndex) => {
      if (DATE_HEADERS.indexOf(header) !== -1) {
        const cellValue = newRow[colIndex];
        if (cellValue && typeof cellValue === 'string') {
          const range = sheet.getRange(newRowIndex, colIndex + 1);
          applyDateFormat(range, cellValue);
        }
      }
    });
    
    // Guardar seguimientos si existen
    if (leadData.Seguimientos && leadData.Seguimientos.length > 0) {
      try {
        saveSeguimientosForLead(newRowIndex, leadData.Seguimientos);
      } catch (seguimientoError) {
        Logger.log('Error al guardar seguimientos: ' + seguimientoError.toString());
        // No fallar si solo hay error en seguimientos
      }
    }
    
    // Asegurarse de devolver un objeto JSON válido
    return JSON.parse(JSON.stringify({
      success: true,
      message: 'Lead agregado exitosamente',
      rowIndex: newRowIndex
    }));
  } catch (error) {
    Logger.log('Error en addLead: ' + error.toString());
    Logger.log('Stack trace: ' + (error.stack || 'No disponible'));
    
    // Devolver un objeto de error en lugar de lanzar excepción
    // para evitar que Google Apps Script redirija a la página de error
    return JSON.parse(JSON.stringify({
      success: false,
      message: 'Error al agregar el lead: ' + (error.message || error.toString()),
      error: error.toString()
    }));
  }
}

/**
 * Actualiza un lead existente en el Google Sheet
 */
function updateLead(leadData) {
  try {
    const sheet = getSheet();
    const rowIndex = leadData.rowIndex;
    
    if (!rowIndex || rowIndex < 2) {
      throw new Error('Índice de fila inválido');
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    headers.forEach((header, colIndex) => {
      const mappedHeader = HEADER_MAP[header] || header;
      let value = leadData[mappedHeader];
      
      if (value === undefined || value === null) {
        value = '';
      }
      
      const range = sheet.getRange(rowIndex, colIndex + 1);
      
      // Para fechas, convertir preservando el día exacto
      if (DATE_HEADERS.indexOf(header) !== -1 && value && typeof value === 'string') {
        try {
          applyDateFormat(range, value);
        } catch (e) {
          Logger.log('Error al convertir fecha en updateLead: ' + value + ' - ' + e.toString());
          range.setValue('');
        }
      } else {
        // Para valores que no son fechas, guardar normalmente
        range.setValue(value);
      }
    });
    
    // Actualizar seguimientos
    if (leadData.Seguimientos) {
      saveSeguimientosForLead(rowIndex, leadData.Seguimientos);
    }
    
    return { success: true, message: 'Lead actualizado exitosamente' };
  } catch (error) {
    Logger.log('Error en updateLead: ' + error.toString());
    throw new Error('Error al actualizar el lead: ' + error.message);
  }
}

/**
 * Elimina un lead del Google Sheet
 */
function deleteLead(rowIndex) {
  try {
    const sheet = getSheet();
    
    if (!rowIndex || rowIndex < 2) {
      throw new Error('Índice de fila inválido');
    }
    
    sheet.deleteRow(rowIndex);
    
    // Eliminar seguimientos asociados
    deleteSeguimientosForLead(rowIndex);
    
    return { success: true, message: 'Lead eliminado exitosamente' };
  } catch (error) {
    Logger.log('Error en deleteLead: ' + error.toString());
    throw new Error('Error al eliminar el lead: ' + error.message);
  }
}

// ============================================
// FUNCIONES DE SEGUIMIENTO
// ============================================

/**
 * Obtiene los seguimientos de un lead específico
 */
function getSeguimientosForLead(rowIndex) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'seguimientos_' + rowIndex;
    const data = props.getProperty(key);
    if (data) return JSON.parse(data);
    return [];
  } catch (error) {
    Logger.log('Error en getSeguimientosForLead: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene todos los seguimientos en una sola lectura (optimización para getAllLeads).
 */
function getAllSeguimientosMap() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var out = {};
    for (var key in all) {
      if (key.indexOf('seguimientos_') === 0) {
        try {
          out[key] = JSON.parse(all[key]);
        } catch (e) {
          out[key] = [];
        }
      }
    }
    return out;
  } catch (e) {
    Logger.log('getAllSeguimientosMap: ' + e.toString());
    return {};
  }
}

/**
 * Guarda los seguimientos de un lead
 */
function saveSeguimientosForLead(rowIndex, seguimientos) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'seguimientos_' + rowIndex;
    props.setProperty(key, JSON.stringify(seguimientos));
    return { success: true };
  } catch (error) {
    Logger.log('Error en saveSeguimientosForLead: ' + error.toString());
    throw new Error('Error al guardar seguimientos: ' + error.message);
  }
}

/**
 * Elimina los seguimientos de un lead
 */
function deleteSeguimientosForLead(rowIndex) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'seguimientos_' + rowIndex;
    props.deleteProperty(key);
    return { success: true };
  } catch (error) {
    Logger.log('Error en deleteSeguimientosForLead: ' + error.toString());
    return { success: false };
  }
}

/**
 * Agrega un seguimiento a un lead
 */
function addSeguimiento(rowIndex, seguimiento) {
  try {
    const seguimientos = getSeguimientosForLead(rowIndex);
    seguimientos.push(seguimiento);
    saveSeguimientosForLead(rowIndex, seguimientos);
    return { success: true, message: 'Seguimiento agregado exitosamente' };
  } catch (error) {
    Logger.log('Error en addSeguimiento: ' + error.toString());
    throw new Error('Error al agregar seguimiento: ' + error.message);
  }
}

/**
 * Elimina un seguimiento específico
 */
function deleteSeguimiento(rowIndex, seguimientoIndex) {
  try {
    const seguimientos = getSeguimientosForLead(rowIndex);
    seguimientos.splice(seguimientoIndex, 1);
    saveSeguimientosForLead(rowIndex, seguimientos);
    return { success: true, message: 'Seguimiento eliminado exitosamente' };
  } catch (error) {
    Logger.log('Error en deleteSeguimiento: ' + error.toString());
    throw new Error('Error al eliminar seguimiento: ' + error.message);
  }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Formatea una celda para prospección: fechas (Date o número serial) a YYYY-MM-DD.
 */
function formatProspeccionCell(cell) {
  if (cell instanceof Date) {
    try {
      return Utilities.formatDate(cell, TIME_ZONE, 'yyyy-MM-dd');
    } catch (e) {
      Logger.log('Error formateando fecha en prospección: ' + e.toString());
      return cell;
    }
  }
  // Fechas como número serial (Google Sheets / Excel). No tratar 0 ni 1 como fecha (ej. columna Copiado).
  if (typeof cell === 'number' && cell >= 25569 && cell < 2958466) {
    try {
      const d = new Date((cell - 25569) * 86400 * 1000);
      return Utilities.formatDate(d, TIME_ZONE, 'yyyy-MM-dd');
    } catch (e) {
      return cell;
    }
  }
  return cell === null || cell === undefined ? '' : cell;
}

/**
 * Obtiene todos los datos de la hoja de prospección (Hoja 1) para la pestaña Prospección Clientes.
 * Devuelve { data: array de filas, notasByRow: { "2": [{fecha, texto}], ... } }.
 * En Notas: se guarda el contenido del campo Comentarios con la fecha actual (seed si la fila no tenía notas).
 * En Comentarios (UI): se muestra el contenido de Oportunidad con el Cliente.
 */
function getProspeccionData() {
  try {
    var sheet = getProspeccionSheet();
    var data = sheet.getDataRange().getValues();
    
    if (!data || data.length === 0) {
      return { data: [], notasByRow: {} };
    }
    
    var numCols = data[0].length;
    var headers = data[0];
    var idxComentarios = findProspeccionColInHeaders(headers, 'Comentarios');
    var idxOportunidad = findProspeccionColInHeaders(headers, 'Oportunidad con el Cliente');
    if (idxOportunidad < 0) idxOportunidad = findProspeccionColInHeaders(headers, 'Oportunidades del cliente');
    var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    
    var formattedData = data.map(function (row, rowIndex) {
      var out = [];
      for (var colIndex = 0; colIndex < numCols; colIndex++) {
        var cell = row[colIndex];
        out.push(formatProspeccionCell(cell));
      }
      return out;
    });
    
    var notasMap = getAllProspeccionNotasMap();
    var notasByRow = {};
    for (var i = 1; i < formattedData.length; i++) {
      var sheetRowIndex = i + 1;
      var key = PROSPECCION_NOTAS_PREFIX + sheetRowIndex;
      var row = formattedData[i];
      var notas = notasMap[key] || [];
      if (notas.length === 0 && idxComentarios >= 0 && row[idxComentarios] != null && String(row[idxComentarios]).trim() !== '') {
        notas = [{ fecha: today, texto: String(row[idxComentarios]).trim() }];
        saveProspeccionNotasForRow(sheetRowIndex, notas);
      }
      notasByRow[String(sheetRowIndex)] = notas;
    }
    return { data: formattedData, notasByRow: notasByRow };
  } catch (error) {
    Logger.log('Error en getProspeccionData: ' + error.toString());
    throw new Error('Error al obtener los datos de prospección: ' + error.message);
  }
}

/**
 * Actualiza una celda en la hoja de prospección (Hoja 1). Índices 1-based.
 */
function updateProspeccionCell(rowIndex, colIndex, value) {
  var sheet = getProspeccionSheet();
  sheet.getRange(rowIndex, colIndex).setValue(value == null ? '' : value);
}

/**
 * Actualiza una fila completa en la hoja de prospección. rowIndex 1-based (fila 2 = primera fila de datos).
 * Si la columna Comentarios tiene contenido, se añade una nota con la fecha actual a las notas del registro.
 */
function updateProspeccionRow(rowIndex, values) {
  if (!values || !values.length) return;
  var sheet = getProspeccionSheet();
  var numCols = sheet.getLastColumn();
  var startCol = 1;
  var endCol = Math.min(values.length, numCols);
  sheet.getRange(rowIndex, startCol, rowIndex, endCol).setValues([values.slice(0, endCol)]);
  var headers = sheet.getRange(1, 1, 1, numCols).getValues()[0];
  var idxComentarios = findProspeccionColInHeaders(headers, 'Comentarios');
  if (idxComentarios >= 0 && values[idxComentarios] != null && String(values[idxComentarios]).trim() !== '') {
    var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    var notas = getProspeccionNotasForRow(rowIndex);
    notas.push({ fecha: today, texto: String(values[idxComentarios]).trim() });
    saveProspeccionNotasForRow(rowIndex, notas);
  }
}

/**
 * Agrega una nueva fila en la hoja de prospección (Hoja 1).
 * values: array con los valores en el mismo orden que los encabezados.
 * La columna Copiado se rellena con 0 si existe.
 */
function addProspeccionRow(values) {
  var sheet = getProspeccionSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var numCols = headers.length;
  var row = [];
  for (var i = 0; i < numCols; i++) {
    var headerNorm = (headers[i] != null && headers[i] !== undefined) ? String(headers[i]).toLowerCase().trim() : '';
    if (headerNorm === 'copiado') {
      row.push(0);
    } else {
      row.push(i < values.length && values[i] !== undefined && values[i] !== null ? values[i] : '');
    }
  }
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, lastRow + 1, numCols).setValues([row]);
  return { success: true, rowIndex: lastRow + 1 };
}

/**
 * Elimina una fila en la hoja de prospección. rowIndex 1-based.
 */
function deleteProspeccionRow(rowIndex) {
  var sheet = getProspeccionSheet();
  sheet.deleteRow(rowIndex);
}

function getProspeccionSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(PROSPECCION_SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja: ' + PROSPECCION_SHEET_NAME);
  return sheet;
}

function findProspeccionColIndexByName(sheet, displayName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var want = (displayName != null) ? String(displayName).toLowerCase().trim() : '';
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var s = (h != null && h !== undefined) ? String(h).toLowerCase().trim() : '';
    if (s === want) return i;
  }
  return -1;
}

/** Busca índice de columna en un array de encabezados (minúsculas comparadas). */
function findProspeccionColInHeaders(headers, displayName) {
  var want = (displayName != null) ? String(displayName).toLowerCase().trim() : '';
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var s = (h != null && h !== undefined) ? String(h).toLowerCase().trim() : '';
    if (s === want) return i;
  }
  return -1;
}

// ============================================
// NOTAS DE PROSPECCIÓN (Script Properties, misma lógica que Gestión de Leads)
// ============================================

var PROSPECCION_NOTAS_PREFIX = 'prospeccion_notas_';

function getProspeccionNotasForRow(sheetRowIndex) {
  try {
    var props = PropertiesService.getScriptProperties();
    var data = props.getProperty(PROSPECCION_NOTAS_PREFIX + sheetRowIndex);
    if (data) return JSON.parse(data);
    return [];
  } catch (e) {
    Logger.log('Error getProspeccionNotasForRow: ' + e.toString());
    return [];
  }
}

/** Obtiene todas las notas de prospección en una sola lectura (optimización para getProspeccionData). */
function getAllProspeccionNotasMap() {
  try {
    var all = PropertiesService.getScriptProperties().getProperties();
    var out = {};
    for (var key in all) {
      if (key.indexOf(PROSPECCION_NOTAS_PREFIX) === 0) {
        try {
          out[key] = JSON.parse(all[key]);
        } catch (e) {
          out[key] = [];
        }
      }
    }
    return out;
  } catch (e) {
    Logger.log('getAllProspeccionNotasMap: ' + e.toString());
    return {};
  }
}

function saveProspeccionNotasForRow(sheetRowIndex, notas) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key = PROSPECCION_NOTAS_PREFIX + sheetRowIndex;
    if (!notas || notas.length === 0) {
      props.deleteProperty(key);
      return { success: true };
    }
    props.setProperty(key, JSON.stringify(notas));
    return { success: true };
  } catch (e) {
    Logger.log('Error saveProspeccionNotasForRow: ' + e.toString());
    throw new Error('Error al guardar notas de prospección: ' + e.message);
  }
}

/**
 * Validación previa: Hoja 1 existe y tiene columnas "Oportunidad con el Cliente" y "Comentarios".
 * Devuelve { ok: true, message } o { ok: false, error }.
 */
function validarProspeccionNotasConfig() {
  try {
    var sheet = getProspeccionSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idxOportunidad = findProspeccionColIndexByName(sheet, 'Oportunidad con el Cliente');
    if (idxOportunidad < 0) idxOportunidad = findProspeccionColIndexByName(sheet, 'Oportunidades del cliente');
    var idxComentarios = findProspeccionColIndexByName(sheet, 'Comentarios');
    if (idxOportunidad < 0) {
      return { ok: false, error: 'En Hoja 1 no se encontró la columna "Oportunidad con el Cliente" (ni "Oportunidades del cliente").' };
    }
    if (idxComentarios < 0) {
      return { ok: false, error: 'En Hoja 1 no se encontró la columna "Comentarios".' };
    }
    return { ok: true, message: 'Configuración correcta: Comentarios = Oportunidad con el Cliente; Notas = contenido de Comentarios con fecha actual.' };
  } catch (e) {
    Logger.log('Error validarProspeccionNotasConfig: ' + e.toString());
    return { ok: false, error: e.message || e.toString() };
  }
}

/**
 * Pasa un registro de prospección (Hoja 1) a seguimiento: pone Copiado=1 y crea fila en Sheet1.
 * sheetRowIndex: fila 1-based en Hoja 1 (2 = primera fila de datos).
 */
function prospeccionPasarASeguimiento(sheetRowIndex) {
  var hoja1 = getProspeccionSheet();
  var headers = hoja1.getRange(1, 1, 1, hoja1.getLastColumn()).getValues()[0];
  var rowRange = hoja1.getRange(sheetRowIndex, 1, sheetRowIndex, headers.length);
  var row = rowRange.getValues()[0];

  var idxCopiado = findProspeccionColIndexByName(hoja1, 'Copiado');
  var idxContacto = findProspeccionColIndexByName(hoja1, 'Contacto');
  var idxCliente = findProspeccionColIndexByName(hoja1, 'Cliente');
  var idxCorreo = findProspeccionColIndexByName(hoja1, 'Correo');
  var idxTelefono = findProspeccionColIndexByName(hoja1, 'Teléfono');
  var idxOportunidad = findProspeccionColIndexByName(hoja1, 'Oportunidades del cliente');
  if (idxOportunidad < 0) idxOportunidad = findProspeccionColIndexByName(hoja1, 'Oportunidad con el Cliente');
  var idxComentarios = findProspeccionColIndexByName(hoja1, 'Comentarios');

  if (idxCopiado >= 0) hoja1.getRange(sheetRowIndex, idxCopiado + 1).setValue(1);

  var contacto = idxContacto >= 0 ? (row[idxContacto] != null ? String(row[idxContacto]) : '') : '';
  var cliente = idxCliente >= 0 ? (row[idxCliente] != null ? String(row[idxCliente]) : '') : '';
  var correo = idxCorreo >= 0 ? (row[idxCorreo] != null ? String(row[idxCorreo]).trim() : '') : '';
  var telefono = idxTelefono >= 0 ? (row[idxTelefono] != null ? String(row[idxTelefono]).trim() : '') : '';
  var oportunidad = idxOportunidad >= 0 ? (row[idxOportunidad] != null ? String(row[idxOportunidad]) : '') : '';
  var comentarios = idxComentarios >= 0 ? (row[idxComentarios] != null ? String(row[idxComentarios]) : '') : '';

  var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  var notasIniciales = [];
  if (comentarios != null && String(comentarios).trim() !== '') {
    notasIniciales.push({ fecha: today, texto: String(comentarios).trim() });
  }
  var leadData = {
    Source: 'BDCliente',
    Contact: contacto,
    Company: cliente,
    Correo: correo,
    Telefono: telefono,
    Creación: today,
    Requerimiento: oportunidad,
    ActiveCampaign: 'Si',
    SeguimientoInicial: oportunidad,
    Seguimientos: notasIniciales
  };
  addLead(leadData);
  return { success: true };
}

// ============================================
// VERSIÓN Y FECHA DE COMPILACIÓN (Apps Script)
// ============================================

var APP_VERSION_KEY = 'APP_VERSION';
var APP_LAST_COMPILATION_KEY = 'APP_LAST_COMPILATION';

/**
 * Devuelve versión y última fecha de compilación para mostrar en la interfaz.
 * Los valores se guardan en Script Properties. Si no existen, usa la fecha actual como referencia.
 * Tras cada despliegue, ejecuta "Registrar fecha de compilación" desde el menú o updateAppCompilationDate().
 */
function getAppVersionInfo() {
  try {
    var props = PropertiesService.getScriptProperties();
    var version = props.getProperty(APP_VERSION_KEY);
    var lastCompilation = props.getProperty(APP_LAST_COMPILATION_KEY);
    if (!version || version.trim() === '') version = '1.0.0';
    if (!lastCompilation || lastCompilation.trim() === '') {
      var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
      lastCompilation = today;
      props.setProperty(APP_LAST_COMPILATION_KEY, today);
    }
    var d = lastCompilation;
    if (d.length === 10 && d.indexOf('-') !== -1) {
      var parts = d.split('-');
      if (parts.length === 3) d = parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return { version: version, lastCompilation: d };
  } catch (e) {
    Logger.log('getAppVersionInfo: ' + e.toString());
    var today = Utilities.formatDate(new Date(), TIME_ZONE, 'dd/MM/yyyy');
    return { version: '1.0.0', lastCompilation: today };
  }
}

/**
 * Actualiza la fecha de compilación a hoy. Ejecutar tras cada despliegue en Apps Script.
 */
function updateAppCompilationDate() {
  try {
    var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    PropertiesService.getScriptProperties().setProperty(APP_LAST_COMPILATION_KEY, today);
    return { success: true, message: 'Fecha de compilación actualizada a ' + today };
  } catch (e) {
    Logger.log('updateAppCompilationDate: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}

/**
 * Función de prueba para verificar conexión
 */
function testConnection() {
  try {
    const sheet = getSheet();
    return {
      success: true,
      sheetName: sheet.getName(),
      rows: sheet.getLastRow(),
      columns: sheet.getLastColumn()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}