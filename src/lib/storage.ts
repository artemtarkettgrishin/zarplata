import { DATA_KEY, SETTINGS_KEY } from "./constants";
import type { AppData, Settings } from "@/types";

export const emptyData: AppData = { stores: [], employees: [], salaries: [] };

export const defaultSettings: Settings = { gasUrl: "", autoSync: false };

export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadData(): AppData {
  const parsed = safeParse<Partial<AppData> | null>(localStorage.getItem(DATA_KEY), null);
  if (!parsed) return emptyData;
  return {
    stores: Array.isArray(parsed.stores) ? parsed.stores : [],
    employees: Array.isArray(parsed.employees) ? parsed.employees : [],
    salaries: Array.isArray(parsed.salaries)
      ? parsed.salaries.map((s) => ({
          ...s,
          amount: Number(s.amount) || 0,
        }))
      : [],
  };
}

export function persistData(data: AppData) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Не удалось сохранить данные в localStorage", e);
  }
}

export function loadSettings(): Settings {
  const parsed = safeParse<Partial<Settings> | null>(
    localStorage.getItem(SETTINGS_KEY),
    null,
  );
  return {
    gasUrl: typeof parsed?.gasUrl === "string" ? parsed.gasUrl : "",
    autoSync: Boolean(parsed?.autoSync),
  };
}

export function persistSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Не удалось сохранить настройки", e);
  }
}

/** Демонстрационные данные для первого запуска */
export function demoData(): AppData {
  const year = new Date().getFullYear();
  const stores = [
    { id: "st_demo1", name: "Магазин «Центральный»" },
    { id: "st_demo2", name: "Магазин «Северный»" },
    { id: "st_demo3", name: "Склад «Восток»" },
  ];
  const people: [string, string, number][] = [
    ["Анна Смирнова", "st_demo1", 62000],
    ["Игорь Петров", "st_demo1", 58000],
    ["Мария Козлова", "st_demo1", 51000],
    ["Дмитрий Волков", "st_demo2", 64000],
    ["Елена Соколова", "st_demo2", 47000],
    ["Сергей Морозов", "st_demo3", 55000],
    ["Ольга Новикова", "st_demo3", 43000],
  ];
  const employees = people.map(([name, storeId], i) => ({
    id: `emp_demo${i + 1}`,
    name,
    storeId,
  }));
  const salaries = [] as AppData["salaries"];
  employees.forEach((emp, idx) => {
    const [, , base] = people[idx];
    for (let m = 1; m <= new Date().getMonth() + 1; m++) {
      const wobble = 1 + ((idx + m) % 5) * 0.035;
      salaries.push({
        id: `sal_demo${idx + 1}_${m}`,
        employeeId: emp.id,
        month: `${year}-${String(m).padStart(2, "0")}`,
        amount: Math.round((base * wobble) / 100) * 100,
      });
    }
  });
  return { stores, employees, salaries };
}
