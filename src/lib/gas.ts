import type { AppData } from "@/types";

interface GasResponse {
  ok?: boolean;
  data?: Partial<AppData>;
  error?: string;
  updated?: string;
}

export class GasError extends Error {}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/** Приводим ответ сервера к нашей модели данных */
function normalizeData(raw: Partial<AppData> | undefined): AppData {
  return {
    stores: asArray(raw?.stores)
      .map((s) => ({ id: str(s.id), name: str(s.name) }))
      .filter((s) => s.id),
    employees: asArray(raw?.employees)
      .map((e) => ({ id: str(e.id), name: str(e.name), storeId: str(e.storeId) }))
      .filter((e) => e.id),
    salaries: asArray(raw?.salaries)
      .map((s) => ({
        id: str(s.id),
        employeeId: str(s.employeeId),
        month: str(s.month).slice(0, 7),
        amount: Number(s.amount) || 0,
      }))
      .filter((s) => s.id && s.employeeId && /^\d{4}-\d{2}$/.test(s.month)),
  };
}

async function request(url: string, init?: RequestInit): Promise<GasResponse> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    throw new GasError(
      "Не удалось соединиться с Google Таблицами. Проверьте интернет-соединение и URL веб-приложения.",
    );
  }

  const text = await response.text();

  if (!text || text.trim().startsWith("<")) {
    throw new GasError(
      "Сервер вернул HTML вместо JSON. Скорее всего ссылка ведёт на страницу входа Google — проверьте, что вы скопировали URL веб-приложения (/exec) и доступ установлен как «Все».",
    );
  }

  let parsed: GasResponse;
  try {
    parsed = JSON.parse(text) as GasResponse;
  } catch {
    throw new GasError("Некорректный ответ сервера: ожидался JSON.");
  }

  if (parsed.ok === false) {
    throw new GasError(parsed.error || "Сервер Google Apps Script вернул ошибку.");
  }

  return parsed;
}

/** Загрузка данных из Google Sheets */
export async function gasPull(url: string): Promise<AppData> {
  if (!url) throw new GasError("Не указан URL веб-приложения Google Apps Script.");
  const target = `${normalizeUrl(url)}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const res = await request(target, { method: "GET", redirect: "follow" });
  return normalizeData(res.data);
}

/** Сохранение данных в Google Sheets */
export async function gasPush(url: string, data: AppData): Promise<void> {
  if (!url) throw new GasError("Не указан URL веб-приложения Google Apps Script.");
  await request(url, {
    method: "POST",
    // text/plain => простой CORS-запрос без preflight
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ data }),
    redirect: "follow",
  });
}
