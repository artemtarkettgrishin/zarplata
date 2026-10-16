import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  FileText,
  Filter,
  Minus,
} from "lucide-react";
import { Badge, Button, Card, CardTitle, EmptyState, Field, Select } from "@/components/ui";
import { CHART_COLORS, MONTHS_RU } from "@/lib/constants";
import {
  availableYears,
  formatCompact,
  formatMoney,
  formatPct,
  monthShort,
  monthYear,
  monthsOfYear,
  pctChange,
} from "@/lib/format";
import type { AppData } from "@/types";
import { cn } from "@/utils/cn";

type PeriodType = "month" | "quarter" | "year" | "custom";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

function rangeMonths(from: string, to: string): string[] {
  const out: string[] = [];
  const len = Math.max(0, monthDiff(from, to));
  for (let i = 0; i <= len; i++) out.push(shiftMonth(from, i));
  return out;
}

const TODAY = new Date();

export default function ReportsPage({ data }: { data: AppData }) {
  const years = useMemo(
    () =>
      availableYears(data.salaries.map((s) => Number(s.month.split("-")[0]))).map((y) => ({
        value: String(y),
        label: `${y}`,
      })),
    [data.salaries],
  );

  const [type, setType] = useState<PeriodType>("month");
  const [year, setYear] = useState(String(TODAY.getFullYear()));
  const [month, setMonth] = useState(String(TODAY.getMonth() + 1).padStart(2, "0"));
  const [quarter, setQuarter] = useState(String(Math.floor(TODAY.getMonth() / 3) + 1));
  const [fromYear, setFromYear] = useState(String(TODAY.getFullYear()));
  const [fromMonth, setFromMonth] = useState("01");
  const [toYear, setToYear] = useState(String(TODAY.getFullYear()));
  const [toMonth, setToMonth] = useState(String(TODAY.getMonth() + 1).padStart(2, "0"));
  const [employeeId, setEmployeeId] = useState("all");
  const [storeId, setStoreId] = useState("all");

  const range = useMemo(() => {
    const y = year;
    if (type === "month") return { from: `${y}-${month}`, to: `${y}-${month}` };
    if (type === "quarter") {
      const start = (Number(quarter) - 1) * 3 + 1;
      return { from: `${y}-${String(start).padStart(2, "0")}`, to: `${y}-${String(start + 2).padStart(2, "0")}` };
    }
    if (type === "year") return { from: `${y}-01`, to: `${y}-12` };
    const a = `${fromYear}-${fromMonth}`;
    const b = `${toYear}-${toMonth}`;
    return monthDiff(a, b) >= 0 ? { from: a, to: b } : { from: b, to: a };
  }, [type, year, month, quarter, fromYear, fromMonth, toYear, toMonth]);

  const prevRange = useMemo(() => {
    const len = monthDiff(range.from, range.to);
    const prevTo = shiftMonth(range.from, -1);
    return { from: shiftMonth(prevTo, -len), to: prevTo };
  }, [range]);

  const storeById = useMemo(() => new Map(data.stores.map((s) => [s.id, s])), [data.stores]);
  const employeeById = useMemo(
    () => new Map(data.employees.map((e) => [e.id, e])),
    [data.employees],
  );

  const visibleEmployees = useMemo(
    () =>
      data.employees.filter((e) => {
        if (employeeId !== "all" && e.id !== employeeId) return false;
        if (storeId !== "all" && e.storeId !== storeId) return false;
        return true;
      }),
    [data.employees, employeeId, storeId],
  );
  const visibleIds = useMemo(
    () => new Set(visibleEmployees.map((e) => e.id)),
    [visibleEmployees],
  );

  const inRange = useMemo(
    () =>
      data.salaries
        .filter((s) => s.month >= range.from && s.month <= range.to && visibleIds.has(s.employeeId))
        .slice()
        .sort((a, b) => (a.month === b.month ? 0 : a.month < b.month ? 1 : -1)),
    [data.salaries, range, visibleIds],
  );

  const inPrev = useMemo(
    () =>
      data.salaries.filter(
        (s) =>
          s.month >= prevRange.from && s.month <= prevRange.to && visibleIds.has(s.employeeId),
      ),
    [data.salaries, prevRange, visibleIds],
  );

  const total = inRange.reduce((a, s) => a + s.amount, 0);
  const prevTotal = inPrev.reduce((a, s) => a + s.amount, 0);
  const delta = pctChange(prevTotal, total);
  const peoplePaid = new Set(inRange.filter((s) => s.amount > 0).map((s) => s.employeeId)).size;

  const months = useMemo(() => rangeMonths(range.from, range.to), [range]);

  const dynamics = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const s of inRange) {
      const cur = map.get(s.month) ?? { total: 0, count: 0 };
      cur.total += s.amount;
      if (s.amount > 0) cur.count += 1;
      map.set(s.month, cur);
    }
    const rows = months.map((m) => ({
      month: monthShort(m),
      total: map.get(m)?.total ?? 0,
      people: map.get(m)?.count ?? 0,
    }));
    let running = 0;
    return rows.map((r) => {
      running += r.total;
      return { ...r, cumulative: running };
    });
  }, [inRange, months]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { total: number; months: number }>();
    for (const s of inRange) {
      const cur = map.get(s.employeeId) ?? { total: 0, months: 0 };
      cur.total += s.amount;
      if (s.amount > 0) cur.months += 1;
      map.set(s.employeeId, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: employeeById.get(id)?.name ?? "—",
        store: storeById.get(employeeById.get(id)?.storeId ?? "")?.name ?? "—",
        ...v,
      }))
      .sort((a, b) => b.total - a.total);
  }, [inRange, employeeById, storeById]);

  const byStore = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of inRange) {
      const store = employeeById.get(s.employeeId)?.storeId ?? "";
      map.set(store, (map.get(store) ?? 0) + s.amount);
    }
    return data.stores
      .filter((st) => (storeId === "all" ? true : st.id === storeId))
      .map((st, i) => ({
        name: st.name,
        total: map.get(st.id) ?? 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);
  }, [inRange, employeeById, data.stores, storeId]);

  const exportCsv = () => {
    const header = ["Сотрудник", "Магазин", "Месяц", "Сумма"];
    const lines = inRange.map((s) => {
      const emp = employeeById.get(s.employeeId);
      return [
        emp?.name ?? "",
        storeById.get(emp?.storeId ?? "")?.name ?? "",
        s.month,
        String(s.amount),
      ];
    });
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Отчёт_зарплаты_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = () => {
    if (type === "month") return monthYear(range.from);
    if (type === "quarter") return `${quarter} квартал ${year}`;
    if (type === "year") return `${year} год`;
    return `${monthYear(range.from)} — ${monthYear(range.to)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <BarChart3 className="h-6 w-6 text-amber-600" /> Отчёты
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Гибкие выборки по сотрудникам, магазинам и периодам
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!inRange.length}>
          <Download className="h-4 w-4" /> Экспорт CSV
        </Button>
      </div>

      <Card>
        <CardTitle
          icon={<Filter className="h-5 w-5" />}
          title="Фильтры и период"
          subtitle="Выберите сотрудника, магазин и интервал времени"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Тип периода">
            <Select
              value={type}
              onChange={(v) => setType(v as PeriodType)}
              options={[
                { value: "month", label: "Месяц" },
                { value: "quarter", label: "Квартал" },
                { value: "year", label: "Год" },
                { value: "custom", label: "Произвольный диапазон" },
              ]}
            />
          </Field>

          {type === "month" ? (
            <>
              <Field label="Год">
                <Select value={year} onChange={setYear} options={years} />
              </Field>
              <Field label="Месяц" className="xl:col-span-2">
                <Select
                  value={month}
                  onChange={setMonth}
                  options={monthsOfYear(Number(year)).map((m, i) => ({
                    value: String(i + 1).padStart(2, "0"),
                    label: monthYear(m),
                  }))}
                />
              </Field>
            </>
          ) : null}

          {type === "quarter" ? (
            <>
              <Field label="Год">
                <Select value={year} onChange={setYear} options={years} />
              </Field>
              <Field label="Квартал">
                <Select
                  value={quarter}
                  onChange={setQuarter}
                  options={[1, 2, 3, 4].map((q) => ({ value: String(q), label: `${q} квартал` }))}
                />
              </Field>
            </>
          ) : null}

          {type === "year" ? (
            <Field label="Год">
              <Select value={year} onChange={setYear} options={years} />
            </Field>
          ) : null}

          {type === "custom" ? (
            <>
              <Field label="Начало: год">
                <Select value={fromYear} onChange={setFromYear} options={years} />
              </Field>
              <Field label="Начало: месяц">
                <Select
                  value={fromMonth}
                  onChange={setFromMonth}
                  options={MONTHS_RU.map((m, i) => ({
                    value: String(i + 1).padStart(2, "0"),
                    label: m,
                  }))}
                />
              </Field>
              <Field label="Конец: год">
                <Select value={toYear} onChange={setToYear} options={years} />
              </Field>
              <Field label="Конец: месяц">
                <Select
                  value={toMonth}
                  onChange={setToMonth}
                  options={MONTHS_RU.map((m, i) => ({
                    value: String(i + 1).padStart(2, "0"),
                    label: m,
                  }))}
                />
              </Field>
            </>
          ) : null}

          <Field label="Магазин">
            <Select
              value={storeId}
              onChange={(v) => {
                setStoreId(v);
                setEmployeeId("all");
              }}
              options={[
                { value: "all", label: "Все магазины" },
                ...data.stores.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>

          <Field label="Сотрудник">
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              options={[
                { value: "all", label: `Все сотрудники (${visibleEmployees.length})` },
                ...visibleEmployees.map((e) => ({
                  value: e.id,
                  label: `${e.name} · ${storeById.get(e.storeId)?.name ?? "—"}`,
                })),
              ]}
            />
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Период</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{periodLabel()}</p>
          <p className="mt-1 text-xs text-slate-400">
            {months.length} мес. · записей: {inRange.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Выплачено за период</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(total)}</p>
          <p className="mt-1 text-xs text-slate-400">
            Получателей: {peoplePaid}
            {peoplePaid ? ` · в среднем ${formatMoney(total / peoplePaid)}` : ""}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Предыдущий период</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(prevTotal)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {monthYear(prevRange.from)} — {monthYear(prevRange.to)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Изменение</p>
          <div className="mt-1 flex items-center gap-2">
            {delta === null || delta === 0 ? (
              <Minus className="h-5 w-5 text-slate-400" />
            ) : delta > 0 ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-rose-600" />
            )}
            <span
              className={cn(
                "text-lg font-bold",
                delta === null || delta === 0
                  ? "text-slate-500"
                  : delta > 0
                    ? "text-emerald-600"
                    : "text-rose-600",
              )}
            >
              {formatPct(delta)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {total - prevTotal === 0
              ? "Изменений нет"
              : `${total - prevTotal > 0 ? "+" : ""}${formatMoney(total - prevTotal)}`}
          </p>
        </Card>
      </div>

      {inRange.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="За выбранный период данных нет"
          description="Попробуйте изменить период, магазин или сотрудника."
        />
      ) : (
        <>
          <Card>
            <CardTitle
              icon={<BarChart3 className="h-5 w-5" />}
              title="Динамика выплат в выбранном периоде"
              subtitle="Столбцы — сумма за месяц, линия — накопленный итог"
            />
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dynamics} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => formatCompact(Number(v))}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => formatCompact(Number(v))}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatMoney(Number(value)), name]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="total"
                    name="За месяц"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative"
                    name="Накоплено"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">По сотрудникам</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Суммарные выплаты за выбранный период
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {byEmployee.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-slate-800">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.store}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-slate-500">
                          {r.months} мес.
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold text-slate-900">
                          {formatMoney(r.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">По магазинам</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Распределение фонда за выбранный период
                </p>
              </div>
              <div className="space-y-3 px-5 py-4">
                {byStore.map((s) => {
                  const max = Math.max(...byStore.map((x) => x.total), 1);
                  return (
                    <div key={s.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="truncate text-slate-700">{s.name}</span>
                        <span className="font-semibold text-slate-900">{formatMoney(s.total)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(s.total / max) * 100}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Записи за период</h3>
                <p className="mt-0.5 text-sm text-slate-500">{inRange.length} записей</p>
              </div>
              <Badge tone="indigo">Итого: {formatMoney(total)}</Badge>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Сотрудник</th>
                    <th className="px-3 py-3 text-left font-semibold">Магазин</th>
                    <th className="px-3 py-3 text-left font-semibold">Месяц</th>
                    <th className="px-5 py-3 text-right font-semibold">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {inRange.map((s) => {
                    const emp = employeeById.get(s.employeeId);
                    return (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-5 py-2.5 font-medium text-slate-800">
                          {emp?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {storeById.get(emp?.storeId ?? "")?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{monthYear(s.month)}</td>
                        <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          {formatMoney(s.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
