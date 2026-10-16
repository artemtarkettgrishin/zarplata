import { MAX_YEAR, MIN_YEAR, MONTHS_RU, MONTHS_RU_SHORT } from "./constants";

const nf = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${nf.format(Math.round(value))} ₽`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return nf.format(value);
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)} млн ₽`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)} тыс ₽`;
  return `${Math.round(value)} ₽`;
}

/** Текущий месяц в формате YYYY-MM */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthYear(month: string): string {
  const [y, m] = month.split("-");
  const idx = Number(m) - 1;
  return `${MONTHS_RU[idx] ?? m} ${y}`;
}

export function monthShort(month: string): string {
  const [y, m] = month.split("-");
  const idx = Number(m) - 1;
  return `${MONTHS_RU_SHORT[idx] ?? m} ${String(y).slice(2)}`;
}

export function monthNumber(month: string): number {
  return Number(month.split("-")[1] ?? 1);
}

/** Список месяцев года в формате YYYY-MM */
export function monthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * Все доступные годы: полный диапазон MIN_YEAR…MAX_YEAR
 * плюс годы, уже встречающиеся в данных (чтобы ничего не потерять).
 */
export function availableYears(dataYears: Iterable<number> = []): number[] {
  const set = new Set<number>();
  for (let y = MIN_YEAR; y <= MAX_YEAR; y += 1) set.add(y);
  for (const y of dataYears) if (Number.isFinite(y)) set.add(y);
  return Array.from(set).sort((a, b) => b - a);
}

/** Все месяцы диапазона MIN_YEAR…MAX_YEAR в формате YYYY-MM */
export function allMonthsRange(): string[] {
  const out: string[] = [];
  for (let y = MIN_YEAR; y <= MAX_YEAR; y += 1) out.push(...monthsOfYear(y));
  return out;
}

/** Проверяет, что год входит в поддерживаемый диапазон */
export function isYearAllowed(year: number): boolean {
  return year >= MIN_YEAR && year <= MAX_YEAR;
}

/** Последние N месяцев, заканчивая текущим (или указанным) */
export function lastMonths(n: number, endMonth: string = currentMonth()): string[] {
  const [y, m] = endMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function pctChange(prev: number, next: number): number | null {
  if (!prev) return next ? 100 : null;
  return ((next - prev) / prev) * 100;
}

export function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function quarterOfMonth(month: string): number {
  return Math.ceil(monthNumber(month) / 3);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
