import { useCallback, useEffect, useRef, useState } from "react";
import { gasPull, gasPush, GasError } from "@/lib/gas";
import {
  demoData,
  emptyData,
  loadData,
  loadSettings,
  persistData,
  persistSettings,
} from "@/lib/storage";
import { uid } from "@/lib/format";
import { normName, type ParsedRow } from "@/lib/paste";
import type { AppData, Settings, SyncState } from "@/types";

const PUSH_DEBOUNCE_MS = 1500;

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [sync, setSync] = useState<SyncState>({
    status: "idle",
    message: "Локальный режим",
    lastPull: null,
    lastPush: null,
  });

  const skipPush = useRef(true);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const settingsRef = useRef(settings);
  const didInit = useRef(false);

  dataRef.current = data;
  settingsRef.current = settings;

  const setSyncStatus = useCallback(
    (patch: Partial<SyncState>) => setSync((prev) => ({ ...prev, ...patch })),
    [],
  );

  /* ---------------- Синхронизация ---------------- */

  const push = useCallback(
    async (silent = false) => {
      const url = settingsRef.current.gasUrl.trim();
      if (!url) {
        if (!silent) {
          setSyncStatus({
            status: "error",
            message: "Не указан URL веб-приложения Google Apps Script",
          });
        }
        return false;
      }
      setSyncStatus({ status: "saving", message: "Сохранение в Google Таблицы…" });
      try {
        await gasPush(url, dataRef.current);
        setSyncStatus({
          status: "ok",
          message: "Данные сохранены в Google Таблицы",
          lastPush: new Date().toISOString(),
        });
        return true;
      } catch (e) {
        setSyncStatus({
          status: "error",
          message: e instanceof GasError ? e.message : "Ошибка сохранения в Google Таблицы",
        });
        return false;
      }
    },
    [setSyncStatus],
  );

  const pull = useCallback(
    async (silent = false) => {
      const url = settingsRef.current.gasUrl.trim();
      if (!url) {
        if (!silent) {
          setSyncStatus({
            status: "error",
            message: "Не указан URL веб-приложения Google Apps Script",
          });
        }
        return false;
      }
      setSyncStatus({ status: "loading", message: "Загрузка из Google Таблиц…" });
      try {
        const remote = await gasPull(url);
        skipPush.current = true;
        setData(remote);
        setSyncStatus({
          status: "ok",
          message: `Загружено: ${remote.stores.length} магазинов, ${remote.employees.length} сотрудников, ${remote.salaries.length} записей ЗП`,
          lastPull: new Date().toISOString(),
        });
        return true;
      } catch (e) {
        setSyncStatus({
          status: "error",
          message: e instanceof GasError ? e.message : "Ошибка загрузки из Google Таблиц",
        });
        return false;
      }
    },
    [setSyncStatus],
  );

  /* Сохранение в localStorage + автосохранение в Google Sheets (debounce 1.5 c) */
  useEffect(() => {
    persistData(data);

    if (skipPush.current) {
      skipPush.current = false;
      return;
    }

    if (!settings.gasUrl.trim() || !settings.autoSync) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void push(true);
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [data, settings.gasUrl, settings.autoSync, push]);

  /* Автозагрузка при старте */
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (settings.gasUrl.trim() && settings.autoSync) {
      void pull(true);
    }
  }, [pull, settings.autoSync, settings.gasUrl]);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  /* ---------------- Настройки ---------------- */

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ---------------- CRUD: магазины ---------------- */

  const addStore = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setData((prev) => ({
      ...prev,
      stores: [...prev.stores, { id: uid("st"), name: clean }],
    }));
  }, []);

  const renameStore = useCallback((id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setData((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => (s.id === id ? { ...s, name: clean } : s)),
    }));
  }, []);

  const deleteStore = useCallback((id: string) => {
    setData((prev) => {
      const employeeIds = new Set(
        prev.employees.filter((e) => e.storeId === id).map((e) => e.id),
      );
      return {
        stores: prev.stores.filter((s) => s.id !== id),
        employees: prev.employees.filter((e) => e.storeId !== id),
        salaries: prev.salaries.filter((s) => !employeeIds.has(s.employeeId)),
      };
    });
  }, []);

  /* ---------------- CRUD: сотрудники ---------------- */

  const addEmployee = useCallback((name: string, storeId: string) => {
    const clean = name.trim();
    if (!clean || !storeId) return;
    setData((prev) => ({
      ...prev,
      employees: [...prev.employees, { id: uid("emp"), name: clean, storeId }],
    }));
  }, []);

  const updateEmployee = useCallback(
    (id: string, patch: { name?: string; storeId?: string }) => {
      setData((prev) => ({
        ...prev,
        employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [],
  );

  const deleteEmployee = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
      salaries: prev.salaries.filter((s) => s.employeeId !== id),
    }));
  }, []);

  /* ---------------- Зарплаты ---------------- */

  const setSalary = useCallback((employeeId: string, month: string, amount: number) => {
    setData((prev) => {
      const existing = prev.salaries.find((s) => s.employeeId === employeeId && s.month === month);
      if (!Number.isFinite(amount) || amount <= 0) {
        if (!existing) return prev;
        return {
          ...prev,
          salaries: prev.salaries.filter((s) => s !== existing),
        };
      }
      if (existing) {
        return {
          ...prev,
          salaries: prev.salaries.map((s) =>
            s === existing ? { ...s, amount: Math.round(amount) } : s,
          ),
        };
      }
      return {
        ...prev,
        salaries: [...prev.salaries, { id: uid("sal"), employeeId, month, amount: Math.round(amount) }],
      };
    });
  }, []);

  /* ------- Массовый импорт вставленной таблицы (Ctrl+V) ------- */

  const applyPaste = useCallback(
    (params: {
      rows: ParsedRow[];
      months: string[];
      defaultStoreId: string;
      createMissingStores: boolean;
      overwrite: boolean;
      reassignStore: boolean;
    }) => {
      const prev = dataRef.current;
      const stores = prev.stores.slice();
      const employees = prev.employees.slice();
      const salaries = prev.salaries.slice();

      const storeByKey = new Map<string, (typeof stores)[number]>();
      stores.forEach((s) => storeByKey.set(normName(s.name), s));
      const storeById = new Map(stores.map((s) => [s.id, s]));
      const empByKey = new Map<string, (typeof employees)[number]>();
      employees.forEach((e) => empByKey.set(normName(e.name), e));

      const summary = {
        createdStores: 0,
        createdEmployees: 0,
        written: 0,
        skipped: 0,
        withoutStore: [] as string[],
      };

      const defaultStore = params.defaultStoreId ? storeById.get(params.defaultStoreId) : undefined;

      for (const row of params.rows) {
        const name = row.name.replace(/\s+/g, " ").trim();
        if (!name) continue;

        /* Магазин: сначала столбец из таблицы, потом магазин по умолчанию */
        let store = defaultStore;
        if (row.storeName) {
          const key = normName(row.storeName);
          const found = storeByKey.get(key);
          if (found) {
            store = found;
          } else if (params.createMissingStores) {
            const created = { id: uid("st"), name: row.storeName.replace(/\s+/g, " ").trim() };
            stores.push(created);
            storeByKey.set(normName(created.name), created);
            summary.createdStores += 1;
            store = created;
          }
        }

        let employee = empByKey.get(normName(name));
        if (!employee) {
          const storeId = store?.id ?? stores[0]?.id ?? "";
          if (!storeId) {
            summary.withoutStore.push(name);
            continue;
          }
          employee = { id: uid("emp"), name, storeId };
          employees.push(employee);
          empByKey.set(normName(name), employee);
          summary.createdEmployees += 1;
        } else if (store && params.reassignStore && employee.storeId !== store.id) {
          employee = { ...employee, storeId: store.id };
          const idx = employees.findIndex((e) => e.id === employee!.id);
          employees[idx] = employee;
        }

        const empId = employee.id;
        params.months.forEach((month, i) => {
          const raw = row.values[i];
          if (raw === null || raw === undefined || !Number.isFinite(raw)) return;
          const value = Math.round(raw);
          const existingIdx = salaries.findIndex((s) => s.employeeId === empId && s.month === month);
          if (existingIdx >= 0) {
            if (!params.overwrite) {
              summary.skipped += 1;
              return;
            }
            if (salaries[existingIdx].amount === value) return;
            salaries[existingIdx] = { ...salaries[existingIdx], amount: value };
            summary.written += 1;
          } else if (value > 0) {
            salaries.push({ id: uid("sal"), employeeId: empId, month, amount: value });
            summary.written += 1;
          }
        });
      }

      setData({ stores, employees, salaries });
      return summary;
    },
    [],
  );

  /* ---------------- Служебные ---------------- */

  const replaceData = useCallback((next: AppData) => {
    skipPush.current = true;
    setData(next);
  }, []);

  const clearAll = useCallback(() => {
    skipPush.current = true;
    setData(emptyData);
  }, []);

  const loadDemo = useCallback(() => {
    skipPush.current = true;
    setData(demoData());
  }, []);

  return {
    data,
    settings,
    sync,
    updateSettings,
    pull,
    push,
    addStore,
    renameStore,
    deleteStore,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setSalary,
    applyPaste,
    replaceData,
    clearAll,
    loadDemo,
  };
}

export type AppStore = ReturnType<typeof useAppData>;
