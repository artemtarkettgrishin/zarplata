export const GAS_SCRIPT = `/**
 * ============================================================
 *  ЗАРПЛАТЫ — СЕРВЕРНАЯ ЧАСТЬ ДЛЯ GOOGLE APPS SCRIPT
 *  Скопируйте ВЕСЬ этот код в редактор Apps Script вашей таблицы.
 * ============================================================
 *  Листы, которые создаются автоматически:
 *    Stores   — id | name
 *    Employees— id | name | storeId
 *    Salaries — id | employeeId | month | amount
 */

var SHEET_CONFIG = [
  { name: 'Stores',    headers: ['id', 'name'] },
  { name: 'Employees', headers: ['id', 'name', 'storeId'] },
  { name: 'Salaries',  headers: ['id', 'employeeId', 'month', 'amount'] }
];

/** Создаёт (или находит) лист и добавляет заголовки */
function getSheet_(ss, cfg) {
  var sh = ss.getSheetByName(cfg.name);
  if (!sh) sh = ss.insertSheet(cfg.name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET — приложение читает данные таблицы */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {
      stores: readSheet_(ss, 'Stores'),
      employees: readSheet_(ss, 'Employees'),
      salaries: readSheet_(ss, 'Salaries')
    };
    return json_({ ok: true, data: data, updated: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** POST — приложение присылает данные, мы полностью перезаписываем листы */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var payload = body && body.data ? body.data : body;

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var counts = {
        stores: writeSheet_(ss, 'Stores', payload.stores || [], ['id', 'name']),
        employees: writeSheet_(ss, 'Employees', payload.employees || [], ['id', 'name', 'storeId']),
        salaries: writeSheet_(ss, 'Salaries', payload.salaries || [], ['id', 'employeeId', 'month', 'amount'])
      };
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true, saved: counts, updated: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function readSheet_(ss, name) {
  var cfg = null;
  for (var i = 0; i < SHEET_CONFIG.length; i++) {
    if (SHEET_CONFIG[i].name === name) cfg = SHEET_CONFIG[i];
  }
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var values = sh.getRange(2, 1, lastRow - 1, cfg.headers.length).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    if (row[0] === '' || row[0] === null) continue;
    var obj = {};
    for (var c = 0; c < cfg.headers.length; c++) {
      var key = cfg.headers[c];
      var val = row[c];
      if (key === 'amount') val = Number(val) || 0;
      else if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      else val = String(val === null || val === undefined ? '' : val).trim();
      obj[key] = val;
    }
    out.push(obj);
  }
  return out;
}

function writeSheet_(ss, name, rows, headers) {
  var sh = getSheet_(ss, { name: name, headers: headers });
  var matrix = [];
  for (var i = 0; i < rows.length; i++) {
    var line = [];
    for (var c = 0; c < headers.length; c++) {
      var v = rows[i][headers[c]];
      line.push(v === undefined || v === null ? '' : v);
    }
    matrix.push(line);
  }
  var lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  if (matrix.length) sh.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
  return matrix.length;
}

/** Запускается вручную один раз: создаёт листы и меню */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < SHEET_CONFIG.length; i++) getSheet_(ss, SHEET_CONFIG[i]);
  ss.toast('Листы Stores / Employees / Salaries готовы', 'Зарплаты', 5);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Зарплаты')
    .addItem('Создать листы', 'setup')
    .addToUi();
}
`;
