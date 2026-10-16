import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClipboardPaste, Grid3x3, Info, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState, Select } from "@/components/ui";
import PasteImport from "@/components/PasteImport";
import { MONTHS_RU_SHORT } from "@/lib/constants";
import { availableYears, formatMoney, monthsOfYear } from "@/lib/format";
import type { AppData } from "@/types";
import type { ParsedRow } from "@/lib/paste";
import { cn } from "@/utils/cn";

/* ------------------------- Редактируемая ячейка ------------------------ */

function SalaryCell({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const commit = () => {
    if (draft === null) return;
    const clean = draft.trim().replace(/\s+/g, "").replace(",", ".");
    const parsed = clean === "" ? 0 : Number(clean);
    setDraft(null);
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed);
  };

  return (
    <input
      ref={ref}
      inputMode="decimal"
      value={draft ?? (value ? String(value) : "")}
      placeholder="—"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        setDraft(value ? String(value) : "");
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          ref.current?.blur();
        } else if (e.key === "Escape") {
          setDraft(null);
          ref.current?.blur();
        }
      }}
      className={cn(
        "h-9 w-full rounded-lg border px-2 text-right text-sm tabular-nums transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
        draft !== null
          ? "border-indigo-400 bg-white text-slate-900"
          : value > 0
            ? "border-transparent bg-transparent text-slate-700 hover:border-slate-300 hover:bg-white"
            : "border-transparent bg-transparent text-slate-300 hover:border-slate-300 hover:bg-white",
      )}
    />
  );
}

/* ------------------------------- Страница ------------------------------ */

export default function SalariesPage({
  data,
  setSalary,
  applyPaste,
}: {
  data: AppData;
  setSalary: (employeeId: string, month: string, amount: number) => void;
  applyPaste: (params: {
    rows: ParsedRow[];
    months: string[];
    defaultStoreId: string;
    createMissingStores: boolean;
    overwrite: boolean;
    reassignStore: boolean;
  }) => {
    createdStores: number;
    createdEmployees: number;
    written: number;
    skipped: number;
    withoutStore: string[];
  };
}) {
  const thisYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of data.salaries) {
      const y = s.month.slice(0, 4);
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return availableYears(data.salaries.map((s) => Number(s.month.slice(0, 4)))).map((y) => {
      const count = counts.get(String(y)) ?? 0;
      return {
        value: String(y),
        label: `${y} год${count ? ` · записей: ${count}` : ""}`,
      };
    });
  }, [data.salaries]);

  const [year, setYear] = useState(String(thisYear));
  const [storeId, setStoreId] = useState("all");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const selectedYear = Number(year);
  const months = useMemo(() => monthsOfYear(selectedYear), [selectedYear]);

  useEffect(() => {
    if (storeId !== "all" && !data.stores.some((s) => s.id === storeId)) setStoreId("all");
  }, [data.stores, storeId]);

  /* Ctrl+V в любом месте страницы открывает окно импорта таблицы */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text || !/[\t\n;]/.test(text)) return;
      e.preventDefault();
      setPasteText(text);
      setPasteOpen(true);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const handleApplyPaste: typeof applyPaste = (params) => {
    const summary = applyPaste(params);
    const firstMonth = params.months[0];
    if (firstMonth) setYear(firstMonth.slice(0, 4));
    return summary;
  };

  const salaryIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data.salaries) map.set(`${s.employeeId}|${s.month}`, s.amount);
    return map;
  }, [data.salaries]);

  const storeById = useMemo(() => new Map(data.stores.map((s) => [s.id, s])), [data.stores]);

  const employees = useMemo(
    () =>
      data.employees
        .filter((e) => (storeId === "all" ? true : e.storeId === storeId))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [data.employees, storeId],
  );

  const grid = useMemo(
    () =>
      employees.map((emp) => {
        const values = months.map((m) => salaryIndex.get(`${emp.id}|${m}`) ?? 0);
        return {
          emp,
          values,
          total: values.reduce((a, b) => a + b, 0),
          filled: values.filter((v) => v > 0).length,
        };
      }),
    [employees, months, salaryIndex],
  );

  const columnTotals = useMemo(
    () => months.map((_, i) => grid.reduce((sum, row) => sum + row.values[i], 0)),
    [grid, months],
  );
  const grandTotal = columnTotals.reduce((a, b) => a + b, 0);

  const pasteButton = (
    <Button onClick={() => setPasteOpen(true)} title="Вставить таблицу из Excel / Google Таблиц">
      <ClipboardPaste className="h-4 w-4" /> Вставить таблицу
      <span className="ml-1 hidden rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
        Ctrl+V
      </span>
    </Button>
  );

  const pasteModal = (
    <PasteImport
      open={pasteOpen}
      onClose={() => setPasteOpen(false)}
      initialText={pasteText}
      defaultYear={selectedYear}
      stores={data.stores}
      defaultStoreId={storeId === "all" ? data.stores[0]?.id ?? "" : storeId}
      onApply={handleApplyPaste}
    />
  );

  if (data.employees.length === 0) {
    return (
      <div className="space-y-6">
        <Header
          year={year}
          setYear={setYear}
          years={yearOptions}
          count={0}
          action={pasteButton}
        />
        <EmptyState
          icon={<Grid3x3 className="h-6 w-6" />}
          title="Нет сотрудников"
          description="Добавьте сотрудников вручную или вставьте готовую таблицу из Excel — сотрудники, магазины и зарплаты создадутся автоматически."
          action={pasteButton}
        />
        {pasteModal}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        year={year}
        setYear={setYear}
        years={yearOptions}
        count={employees.length}
        storeId={storeId}
        setStoreId={setStoreId}
        stores={data.stores.map((s) => ({
          value: s.id,
          label: `${s.name} (${data.employees.filter((e) => e.storeId === s.id).length})`,
        }))}
        action={pasteButton}
      />
      {pasteModal}

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <Badge tone="indigo">
            <Wallet className="h-3.5 w-3.5" /> Итого за {selectedYear}: {formatMoney(grandTotal)}
          </Badge>
          <Badge tone="slate">Сотрудников: {grid.length}</Badge>
          <Badge tone="slate">
            Заполнено ячеек: {grid.reduce((a, r) => a + r.filled, 0)} из {grid.length * 12}
          </Badge>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[220px] border-b border-r border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Сотрудник
                </th>
                {months.map((m, i) => (
                  <th
                    key={m}
                    className={cn(
                      "sticky top-0 z-10 min-w-[104px] border-b border-slate-200 bg-white px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500",
                      i === new Date().getMonth() &&
                        selectedYear === new Date().getFullYear() &&
                        "bg-indigo-50 text-indigo-700",
                    )}
                  >
                    {MONTHS_RU_SHORT[i]}
                  </th>
                ))}
                <th className="sticky right-0 z-20 min-w-[124px] border-b border-l border-slate-200 bg-slate-50 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Итого
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.emp.id} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-1.5 group-hover:bg-slate-50">
                    <p className="truncate text-sm font-medium text-slate-900">{row.emp.name}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {storeById.get(row.emp.storeId)?.name ?? "— без магазина —"}
                    </p>
                  </td>
                  {months.map((m, i) => (
                    <td
                      key={m}
                      className={cn(
                        "border-b border-slate-100 px-1 py-1 text-center",
                        i === new Date().getMonth() &&
                          selectedYear === new Date().getFullYear() &&
                          "bg-indigo-50/40",
                      )}
                    >
                      <SalaryCell
                        value={row.values[i]}
                        onCommit={(next) => setSalary(row.emp.id, m, next)}
                      />
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-slate-50 px-3 py-1.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {formatMoney(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 z-20 border-r border-t-2 border-slate-300 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Итого по месяцу
                </td>
                {columnTotals.map((t, i) => (
                  <td
                    key={i}
                    className={cn(
                      "border-t-2 border-slate-300 bg-slate-50 px-2 py-3 text-right text-xs font-semibold tabular-nums text-slate-700",
                      i === new Date().getMonth() &&
                        selectedYear === new Date().getFullYear() &&
                        "bg-indigo-100/60 text-indigo-800",
                    )}
                  >
                    {t ? formatMoney(t) : "—"}
                  </td>
                ))}
                <td className="sticky right-0 z-20 border-t-2 border-l border-slate-300 bg-indigo-600 px-3 py-3 text-right text-sm font-bold tabular-nums text-white">
                  {formatMoney(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-start gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            Вводите сумму в ячейке и нажимайте <b>Enter</b> или переходите к другой ячейке — значение
            сохранится автоматически. Очистка ячейки или ввод <b>0</b> удаляет запись. Подсветка
            столбца — текущий месяц. Массовое заполнение: скопируйте таблицу из Excel и нажмите{" "}
            <b>Ctrl+V</b> — все сотрудники и зарплаты добавятся сразу.
          </span>
        </div>
      </Card>
    </div>
  );
}

function Header({
  year,
  setYear,
  years,
  count,
  storeId,
  setStoreId,
  stores,
  action,
}: {
  year: string;
  setYear: (v: string) => void;
  years: { value: string; label: string }[];
  count: number;
  storeId?: string;
  setStoreId?: (v: string) => void;
  stores?: { value: string; label: string }[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Grid3x3 className="h-6 w-6 text-emerald-600" /> Зарплаты
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Сетка «сотрудники × месяцы» · {count} сотрудников в выборке
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {action}
        {stores && setStoreId && storeId ? (
          <div className="w-56">
            <Select
              value={storeId}
              onChange={setStoreId}
              options={[{ value: "all", label: "Все магазины" }, ...stores]}
            />
          </div>
        ) : null}
        <div className="w-40">
          <Select value={year} onChange={setYear} options={years} />
        </div>
      </div>
    </div>
  );
}
