/**
 * Разбор скопированной таблицы (Excel / Google Таблицы / CSV) для массового
 * импорта сотрудников и их зарплат по месяцам.
 *
 * Поддерживаемые форматы:
 *  - строки = сотрудники, столбцы = месяцы (с заголовком или без);
 *  - транспонированный вариант: строки = месяцы, столбцы = сотрудники;
 *  - необязательный столбец с магазином;
 *  - разделители: табуляция, «;», «,», «|».
 */

export interface ParseOptions {
  /** Год, который подставляется, если в заголовке он не указан */
  defaultYear: number;
  /** Первый месяц (1–12), если заголовков с месяцами нет */
  defaultStartMonth: number;
  /** Существующие магазины — для автоопределения столбца с магазином */
  storeNames: string[];
}

export interface ParsedRow {
  name: string;
  storeName: string | null;
  values: (number | null)[];
}

export interface ParseResult {
  months: string[];
  rows: ParsedRow[];
  headerDetected: boolean;
  storeColumnDetected: boolean;
  transposed: boolean;
  delimiter: string;
  warnings: string[];
}

export function normName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

const pad = (n: number) => String(n).padStart(2, "0");

/* ------------------------------ Числа ------------------------------ */

/** «50 000,50 ₽» → 50000.5 ; «(1 200)» → -1200 ; «—» → null */
export function parseAmount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).replace(/\u00a0/g, " ").trim();
  if (!s) return null;
  if (/^[-–—]+$/.test(s)) return null;
  if (/^(н\/д|нет|n\/a|-)$/i.test(s)) return null;

  s = s.replace(/["'₽$€руб.]/gi, "");
  let negative = false;
  if (/^\(.+\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/\s+/g, "");
  if (!s) return null;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    // «1,234» / «1,234,567» — разряды; «50000,50» — дробная часть
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)) {
      s = s.replace(/\./g, "");
    }
  }

  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/* ------------------------------ Месяцы ----------------------------- */

const MONTH_RES: [RegExp, number][] = [
  [/^(янв|jan)/, 1],
  [/^(фев|feb)/, 2],
  [/^(мар|mar)/, 3],
  [/^(апр|apr)/, 4],
  [/^(май|may)/, 5],
  [/^(июн|jun)/, 6],
  [/^(июл|jul)/, 7],
  [/^(авг|aug)/, 8],
  [/^(сен|sep|sen)/, 9],
  [/^(окт|oct)/, 10],
  [/^(ноя|nov)/, 11],
  [/^(дек|dec)/, 12],
];

interface MonthCell {
  month: number;
  year: number | null;
}

/** «Январь», «янв», «1», «01.2024», «2024-01», «01.01.2024», «Январь 2024» */
export function parseMonthCell(raw: string | null | undefined): MonthCell | null {
  if (!raw) return null;
  let s = normName(raw).replace(/^['"]|['"]$/g, "");
  if (!s) return null;

  let m = s.match(/^(20\d{2})[-./\s](\d{1,2})$/);
  if (m) return { month: Number(m[2]), year: Number(m[1]) };

  m = s.match(/^(\d{1,2})[-./\s](20\d{2})$/);
  if (m) return { month: Number(m[1]), year: Number(m[2]) };

  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](20\d{2})$/);
  if (m) return { month: Number(m[2]), year: Number(m[3]) };

  m = s.match(/^(20\d{2})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) return { month: Number(m[2]), year: Number(m[1]) };

  m = s.match(/^(20\d{2})\s+(.+)$/);
  if (m) {
    const inner = parseMonthCell(m[2]);
    if (inner) return { month: inner.month, year: Number(m[1]) };
  }
  m = s.match(/^(.+?)\s+(20\d{2})$/);
  if (m) {
    const inner = parseMonthCell(m[1]);
    if (inner) return { month: inner.month, year: Number(m[2]) };
  }

  s = s.replace(/[.,]?\s*г(од)?\.?$/, "").trim();
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? { month: n, year: null } : null;
  }
  for (const [re, num] of MONTH_RES) {
    if (re.test(s)) return { month: num, year: null };
  }
  return null;
}

function toMonthKey(cell: MonthCell, defaultYear: number): string | null {
  if (cell.month < 1 || cell.month > 12) return null;
  return `${cell.year ?? defaultYear}-${pad(cell.month)}`;
}

/* --------------------------- Вспомогательное -------------------------- */

const STORE_HEADER_RE = /(магазин|точк|филиал|подраздел|отдел|store|shop)/;
const NAME_HEADER_RE = /(сотрудник|фио|имя|фамил|работник|worker|name|персонал)/;
const TOTAL_ROW_RE = /^(итог|всего|total|сумма|подытог|подитог)/;

function detectDelimiter(lines: string[]): string {
  const candidates = ["\t", ";", "|", ","];
  let best = "\t";
  let bestScore = -1;
  for (const d of candidates) {
    let score = 0;
    for (const line of lines.slice(0, 20)) {
      const count = line.split(d).length - 1;
      if (count > 0) score += count;
    }
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return bestScore > 0 ? best : "\t";
}

function toMatrix(text: string): { matrix: string[][]; delimiter: string } {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");
  const delimiter = detectDelimiter(lines);
  const raw = lines.map((l) => l.split(delimiter).map((c) => c.trim()));
  const width = raw.reduce((max, r) => Math.max(max, r.length), 0);
  const matrix = raw.map((r) => {
    const copy = r.slice();
    while (copy.length < width) copy.push("");
    return copy;
  });
  return { matrix, delimiter };
}

function transpose(matrix: string[][]): string[][] {
  const w = matrix.reduce((max, r) => Math.max(max, r.length), 0);
  const out: string[][] = [];
  for (let c = 0; c < w; c += 1) out.push(matrix.map((r) => r[c] ?? ""));
  return out;
}

function looksTransposed(rows: string[][]): boolean {
  if (rows.length < 3) return false;
  const body = rows.slice(1);
  const monthInCol0 = body.filter((r) => parseMonthCell(r[0])).length;
  const textInRow0 = rows[0].slice(1).filter((c) => c && parseAmount(c) === null).length;
  const textInCol0 = body.filter(
    (r) => r[0] && parseAmount(r[0]) === null && !parseMonthCell(r[0]),
  ).length;
  return (
    monthInCol0 >= Math.max(2, Math.ceil(body.length * 0.6)) &&
    textInRow0 >= 1 &&
    textInCol0 < body.length * 0.5
  );
}

function looksLikeHeader(first: string[], body: string[][]): boolean {
  const monthCols = first.filter((c) => parseMonthCell(c)).length;
  if (monthCols >= 2) {
    let numeric = 0;
    let total = 0;
    first.forEach((cell, i) => {
      if (!parseMonthCell(cell)) return;
      for (const row of body.slice(0, 6)) {
        const v = row[i];
        if (!v) continue;
        total += 1;
        if (parseAmount(v) !== null) numeric += 1;
      }
    });
    return total === 0 || numeric / total >= 0.5;
  }
  const nameHeader = first.some((c) => NAME_HEADER_RE.test(normName(c)));
  const storeHeader = first.some((c) => STORE_HEADER_RE.test(normName(c)));
  return (nameHeader || storeHeader) && first.length >= 2;
}

/* ------------------------------- Парсер ------------------------------ */

export function parseClipboard(text: string, opts: ParseOptions): ParseResult {
  const warnings: string[] = [];
  const base: ParseResult = {
    months: [],
    rows: [],
    headerDetected: false,
    storeColumnDetected: false,
    transposed: false,
    delimiter: "\t",
    warnings,
  };
  if (!text || !text.trim()) return base;

  let { matrix, delimiter } = toMatrix(text);
  let transposed = false;
  if (looksTransposed(matrix)) {
    matrix = transpose(matrix);
    transposed = true;
  }

  const width = matrix[0]?.length ?? 0;
  if (!width) return base;

  const body = matrix.slice(1);
  const header = looksLikeHeader(matrix[0], body) ? matrix[0] : null;
  const dataRows = header ? body : matrix;
  if (!dataRows.length) return base;

  /* --- столбец с месяцами (по заголовку) --- */
  const monthByCol: (string | null)[] = new Array(width).fill(null);
  if (header) {
    header.forEach((cell, i) => {
      const parsed = parseMonthCell(cell);
      if (parsed) monthByCol[i] = toMonthKey(parsed, opts.defaultYear);
    });
  }
  let headerDetected = monthByCol.filter(Boolean).length >= 2;
  if (!headerDetected) {
    monthByCol.fill(null);
    if (header) {
      warnings.push(
        "В заголовке не найдены месяцы — столбцы считаются последовательными месяцами с указанного ниже.",
      );
    }
  }

  /* --- столбец с ФИО --- */
  const nonNumeric = new Array(width).fill(0);
  dataRows.forEach((r) =>
    r.forEach((c, i) => {
      if (c && parseAmount(c) === null) nonNumeric[i] += 1;
    }),
  );
  const textThreshold = Math.max(1, Math.ceil(dataRows.length * 0.6));
  let nameCol = -1;
  for (let i = 0; i < width; i += 1) {
    if (nonNumeric[i] >= textThreshold) {
      nameCol = i;
      break;
    }
  }
  // Если заголовки явно указывают, что слева магазин, а правее — сотрудники
  if (header && nameCol >= 0) {
    const h0 = normName(header[nameCol] ?? "");
    if (STORE_HEADER_RE.test(h0) && !NAME_HEADER_RE.test(h0)) {
      for (let i = nameCol + 1; i < width; i += 1) {
        if (NAME_HEADER_RE.test(normName(header[i] ?? "")) || nonNumeric[i] >= textThreshold) {
          nameCol = i;
          break;
        }
      }
    }
  }
  if (nameCol === -1) {
    for (let i = 0; i < width; i += 1) {
      if (dataRows.some((r) => r[i])) {
        nameCol = i;
        break;
      }
    }
  }

  /* --- столбец с магазином --- */
  const knownStores = new Map<string, string>();
  opts.storeNames.forEach((n) => knownStores.set(normName(n), n));
  let storeCol = -1;
  let bestScore = 0;
  for (let i = 0; i < width; i += 1) {
    if (i === nameCol) continue;
    if (headerDetected && monthByCol[i]) continue;
    const h = header ? normName(header[i] ?? "") : "";
    const headerIsStore = STORE_HEADER_RE.test(h);
    let filled = 0;
    let matched = 0;
    dataRows.forEach((r) => {
      const c = r[i];
      if (!c) return;
      filled += 1;
      const key = normName(c);
      if (knownStores.has(key)) matched += 1;
    });
    const score = matched * 2 + (headerIsStore ? 1 : 0);
    if (filled > 0 && matched > 0 && matched / filled >= 0.4 && score > bestScore) {
      bestScore = score;
      storeCol = i;
    }
  }
  if (storeCol === -1 && header) {
    for (let i = 0; i < width; i += 1) {
      if (i === nameCol) continue;
      if (STORE_HEADER_RE.test(normName(header[i] ?? ""))) {
        storeCol = i;
        break;
      }
    }
  }

  /* --- столбцы со значениями --- */
  let valueCols: number[] = [];
  if (headerDetected) {
    valueCols = monthByCol.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
  } else {
    for (let i = 0; i < width; i += 1) if (i !== nameCol && i !== storeCol) valueCols.push(i);
  }

  let months: string[] = [];
  if (headerDetected) {
    months = valueCols.map((i) => monthByCol[i] as string);
  } else {
    months = valueCols.map((_, k) => {
      const d = new Date(opts.defaultYear, opts.defaultStartMonth - 1 + k, 1);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    });
  }

  /* --- строки --- */
  const rows: ParsedRow[] = [];
  for (const r of dataRows) {
    const name = (nameCol >= 0 ? r[nameCol] : "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    if (TOTAL_ROW_RE.test(normName(name))) continue;
    const storeCell = storeCol >= 0 ? (r[storeCol] ?? "").replace(/\s+/g, " ").trim() : "";
    rows.push({
      name,
      storeName: storeCell || null,
      values: valueCols.map((i) => parseAmount(r[i] ?? "")),
    });
  }

  if (!rows.length) warnings.push("Не найдено ни одной строки с фамилией сотрудника.");
  if (!months.length) warnings.push("Не определён ни один месяц — проверьте формат таблицы.");
  if (transposed) {
    warnings.push("Таблица была транспонирована (месяцы в строках) — данные развернуты автоматически.");
  }

  return {
    months,
    rows,
    headerDetected,
    storeColumnDetected: storeCol >= 0,
    transposed,
    delimiter,
    warnings,
  };
}

export const PASTE_EXAMPLE = `Сотрудник\tМагазин\tЯнварь\tФевраль\tМарт
Аймашева А.А.\tЦентральный\t52000\t52000\t53500
Волков Д.С.\tСеверный\t61000\t61500\t61500
Козлова М.И.\tЦентральный\t47000\t47000\t48200`;
