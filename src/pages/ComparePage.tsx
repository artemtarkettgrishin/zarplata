import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  GitCompare,
  Minus,
  Repeat,
  Users,
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
  pctChange,
} from "@/lib/format";
import type { AppData } from "@/types";
import { cn } from "@/utils/cn";

type Gran = "month" | "quarter" | "year";

interface Range {
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function rangeOf(gran: Gran, year: string, period: string): Range {
  if (gran === "year") return { from: `${year}-01`, to: `${year}-12` };
  if (gran === "quarter") {
    const start = (Number(period) - 1) * 3 + 1;
    return { from: `${year}-${pad(start)}`, to: `${year}-${pad(start + 2)}` };
  }
  return { from: `${year}-${period}`, to: `${year}-${period}` };
}

function monthsOf(r: Range): string[] {
  const [fy, fm] = r.from.split("-").map(Number);
  const [ty, tm] = r.to.split("-").map(Number);
  const count = (ty - fy) * 12 + (tm - fm) + 1;
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(fy, fm - 1 + i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}

function shift(gran: Gran, year: string, period: string, delta: number) {
  if (gran === "year") return { year: String(Number(year) + delta), period };
  if (gran === "quarter") {
    const q = Number(period) + delta;
    if (q < 1) return { year: String(Number(year) - 1), period: "4" };
    if (q > 4) return { year: String(Number(year) + 1), period: "1" };
    return { year, period: String(q) };
  }
  const [y, m] = [Number(year), Number(period)];
  const d = new Date(y, m - 1 + delta, 1);
  return { year: String(d.getFullYear()), period: pad(d.getMonth() + 1) };
}

function label(gran: Gran, year: string, period: string): string {
  if (gran === "year") return `${year} год`;
  if (gran === "quarter") return `${period} квартал ${year}`;
  return monthYear(`${year}-${period}`);
}

export default function ComparePage({ data }: { data: AppData }) {
  const thisYear = new Date().getFullYear();
  const yearList = useMemo(
    () =>
      availableYears(data.salaries.map((s) => Number(s.month.slice(0, 4)))).map((y) => ({
        value: String(y),
        label: `${y}`,
      })),
    [data.salaries],
  );

  const [gran, setGran] = useState<Gran>("year");
  const [aYear, setAYear] = useState(String(thisYear - 1));
  const [aPeriod, setAPeriod] = useState(
    gran === "month" ? pad(new Date().getMonth() + 1) : String(Math.floor(new Date().getMonth() / 3) + 1),
  );
  const [bYear, setBYear] = useState(String(thisYear));
  const [bPeriod, setBPeriod] = useState(
    gran === "month" ? pad(new Date().getMonth() + 1) : String(Math.floor(new Date().getMonth() / 3) + 1),
  );
  const [storeId, setStoreId] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  const storeById = useMemo(() => new Map(data.stores.map((s) => [s.id, s])), [data.stores]);
  const visibleIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of data.employees) {
      if (storeId !== "all" && e.storeId !== storeId) continue;
      if (employeeId !== "all" && e.id !== employeeId) continue;
      set.add(e.id);
    }
    return set;
  }, [data.employees, storeId, employeeId]);

  const rangeA = useMemo(() => rangeOf(gran, aYear, aPeriod), [gran, aYear, aPeriod]);
  const rangeB = useMemo(() => rangeOf(gran, bYear, bPeriod), [gran, bYear, bPeriod]);
  const monthsA = useMemo(() => monthsOf(rangeA), [rangeA]);
  const monthsB = useMemo(() => monthsOf(rangeB), [rangeB]);

  const pick = useMemo(() => {
    const a = new Map<string, number>();
    const b = new Map<string, number>();
    const aByEmp = new Map<string, number>();
    const bByEmp = new Map<string, number>();
    for (const s of data.salaries) {
      if (!visibleIds.has(s.employeeId)) continue;
      const inA = s.month >= rangeA.from && s.month <= rangeA.to;
      const inB = s.month >= rangeB.from && s.month <= rangeB.to;
      if (inA) {
        a.set(s.month, (a.get(s.month) ?? 0) + s.amount);
        aByEmp.set(s.employeeId, (aByEmp.get(s.employeeId) ?? 0) + s.amount);
      }
      if (inB) {
        b.set(s.month, (b.get(s.month) ?? 0) + s.amount);
        bByEmp.set(s.employeeId, (bByEmp.get(s.employeeId) ?? 0) + s.amount);
      }
    }
    return { a, b, aByEmp, bByEmp };
  }, [data.salaries, visibleIds, rangeA, rangeB]);

  const totalA = useMemo(
    () => monthsA.reduce((sum, m) => sum + (pick.a.get(m) ?? 0), 0),
    [monthsA, pick],
  );
  const totalB = useMemo(
    () => monthsB.reduce((sum, m) => sum + (pick.b.get(m) ?? 0), 0),
    [monthsB, pick],
  );
  const delta = pctChange(totalA, totalB);
  const peopleA = new Set(
    data.salaries.filter(
      (s) =>
        visibleIds.has(s.employeeId) &&
        s.month >= rangeA.from &&
        s.month <= rangeA.to &&
        s.amount > 0,
    ).map((s) => s.employeeId),
  ).size;
  const peopleB = new Set(
    data.salaries.filter(
      (s) =>
        visibleIds.has(s.employeeId) &&
        s.month >= rangeB.from &&
        s.month <= rangeB.to &&
        s.amount > 0,
    ).map((s) => s.employeeId),
  ).size;

  const chartData = useMemo(() => {
    const len = Math.max(monthsA.length, monthsB.length);
    const keyA = `A · ${label(gran, aYear, aPeriod)}`;
    const keyB = `B · ${label(gran, bYear, bPeriod)}`;
    const rows = Array.from({ length: len }, (_, i) => ({
      label:
        gran === "month"
          ? monthShort(monthsA[0] ?? rangeA.from)
          : monthShort(monthsA[i] ?? monthsA[monthsA.length - 1]),
      [keyA]: pick.a.get(monthsA[i] ?? "") ?? 0,
      [keyB]: pick.b.get(monthsB[i] ?? "") ?? 0,
    }));
    return { rows, keyA, keyB };
  }, [monthsA, monthsB, pick, gran, aYear, aPeriod, bYear, bPeriod, rangeA.from]);

  const monthTable = useMemo(() => {
    const len = Math.max(monthsA.length, monthsB.length);
    return Array.from({ length: len }, (_, i) => {
      const ma = monthsA[i];
      const mb = monthsB[i];
      const va = ma ? (pick.a.get(ma) ?? 0) : 0;
      const vb = mb ? (pick.b.get(mb) ?? 0) : 0;
      return { ma, mb, va, vb, diff: vb - va, pct: pctChange(va, vb) };
    });
  }, [monthsA, monthsB, pick]);

  const byEmployee = useMemo(
    () =>
      data.employees
        .filter((e) => visibleIds.has(e.id))
        .map((e) => {
          const va = pick.aByEmp.get(e.id) ?? 0;
          const vb = pick.bByEmp.get(e.id) ?? 0;
          return {
            id: e.id,
            name: e.name,
            store: storeById.get(e.storeId)?.name ?? "—",
            va,
            vb,
            diff: vb - va,
            pct: pctChange(va, vb),
          };
        })
        .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)),
    [data.employees, visibleIds, pick, storeById],
  );

  const byStore = useMemo(() => {
    const map = new Map<string, { va: number; vb: number }>();
    for (const e of data.employees) {
      if (!visibleIds.has(e.id)) continue;
      const cur = map.get(e.storeId) ?? { va: 0, vb: 0 };
      cur.va += pick.aByEmp.get(e.id) ?? 0;
      cur.vb += pick.bByEmp.get(e.id) ?? 0;
      map.set(e.storeId, cur);
    }
    return data.stores
      .filter((s) => storeId === "all" || s.id === storeId)
      .map((s, i) => {
        const v = map.get(s.id) ?? { va: 0, vb: 0 };
        return {
          id: s.id,
          name: s.name,
          ...v,
          diff: v.vb - v.va,
          pct: pctChange(v.va, v.vb),
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [data, visibleIds, pick, storeId]);

  const periodOptions =
    gran === "year"
      ? [{ value: "1", label: "Год" }]
      : gran === "quarter"
        ? [1, 2, 3, 4].map((q) => ({ value: String(q), label: `${q} квартал` }))
        : MONTHS_RU.map((m, i) => ({ value: pad(i + 1), label: m }));

  const samePeriodShift = (delta: number) => {
    const a = shift(gran, aYear, aPeriod, delta);
    const b = shift(gran, bYear, bPeriod, delta);
    setAYear(a.year);
    setAPeriod(a.period);
    setBYear(b.year);
    setBPeriod(b.period);
  };

  const syncFromB = (delta: number) => {
    const a = shift(gran, bYear, bPeriod, delta);
    setAYear(a.year);
    setAPeriod(a.period);
  };

  const employeeOptions = useMemo(
    () =>
      data.employees
        .filter((e) => storeId === "all" || e.storeId === storeId)
        .map((e) => ({ value: e.id, label: `${e.name} · ${storeById.get(e.storeId)?.name ?? "—"}` })),
    [data.employees, storeId, storeById],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <GitCompare className="h-6 w-6 text-fuchsia-600" /> Сравнение периодов
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Месяц к месяцу, квартал к кварталу и год к году — с детализацией по месяцам,
            сотрудникам и магазинам
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => samePeriodShift(-1)}>
            <ArrowLeft className="h-4 w-4" /> Период назад
          </Button>
          <Button variant="secondary" size="sm" onClick={() => syncFromB(-1)}>
            <Repeat className="h-4 w-4" /> A = B − 1 период
          </Button>
          <Button variant="secondary" size="sm" onClick={() => samePeriodShift(1)}>
            Период вперёд <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardTitle
          icon={<GitCompare className="h-5 w-5" />}
          title="Что и с чем сравниваем"
          subtitle="Выберите тип периода и два интервала — изменения посчитаются автоматически"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Тип сравнения">
            <Select
              value={gran}
              onChange={(v) => {
                const next = v as Gran;
                setGran(next);
                const cur =
                  next === "month"
                    ? pad(new Date().getMonth() + 1)
                    : next === "quarter"
                      ? String(Math.floor(new Date().getMonth() / 3) + 1)
                      : "1";
                setAPeriod(cur);
                setBPeriod(cur);
              }}
              options={[
                { value: "month", label: "Месяц к месяцу" },
                { value: "quarter", label: "Квартал к кварталу" },
                { value: "year", label: "Год к году" },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2 md:col-span-1 xl:col-span-2">
            <Field label="Период A">
              <Select value={aYear} onChange={setAYear} options={yearList} />
            </Field>
            <Field label="&nbsp;">
              <Select
                value={aPeriod}
                onChange={setAPeriod}
                options={periodOptions}
                disabled={gran === "year"}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-1 xl:col-span-2">
            <Field label="Период B">
              <Select value={bYear} onChange={setBYear} options={yearList} />
            </Field>
            <Field label="&nbsp;">
              <Select
                value={bPeriod}
                onChange={setBPeriod}
                options={periodOptions}
                disabled={gran === "year"}
              />
            </Field>
          </div>

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

          <Field label="Сотрудник" className="md:col-span-2 xl:col-span-4">
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              options={[
                { value: "all", label: `Все сотрудники (${employeeOptions.length})` },
                ...employeeOptions,
              ]}
            />
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Период A</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {label(gran, aYear, aPeriod)}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatMoney(totalA)}
          </p>
          <p className="mt-1 text-xs text-slate-400">получателей: {peopleA}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Период B</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {label(gran, bYear, bPeriod)}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatMoney(totalB)}
          </p>
          <p className="mt-1 text-xs text-slate-400">получателей: {peopleB}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Разница</p>
          <div className="mt-2 flex items-center gap-2">
            {delta === null || delta === 0 ? (
              <Minus className="h-5 w-5 text-slate-400" />
            ) : delta > 0 ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-rose-600" />
            )}
            <span
              className={cn(
                "text-2xl font-bold tracking-tight",
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
            {totalB - totalA === 0
              ? "Изменений нет"
              : `${totalB - totalA > 0 ? "+" : ""}${formatMoney(totalB - totalA)}`}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Средняя зарплата
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {peopleB ? formatMoney(totalB / peopleB) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            A: {peopleA ? formatMoney(totalA / peopleA) : "—"}
            {peopleA && peopleB && peopleA !== peopleB
              ? ` · сотрудников ${peopleB > peopleA ? "+" : ""}${peopleB - peopleA}`
              : ""}
          </p>
        </Card>
      </div>

      {totalA === 0 && totalB === 0 ? (
        <EmptyState
          icon={<GitCompare className="h-6 w-6" />}
          title="Нет данных в выбранных периодах"
          description="Измените периоды или снимите фильтры по магазину и сотруднику."
        />
      ) : (
        <>
          <Card>
            <CardTitle
              icon={<GitCompare className="h-5 w-5" />}
              title="Суммы выплат по месяцам"
              subtitle={`${label(gran, aYear, aPeriod)} против ${label(gran, bYear, bPeriod)}`}
              right={
                <Badge tone={delta !== null && delta > 0 ? "green" : "red"}>
                  {formatPct(delta)}
                </Badge>
              }
            />
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.rows} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompact(Number(v))}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Bar
                    dataKey={chartData.keyA}
                    fill="#94a3b8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey={chartData.keyB}
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Месяц к месяцу</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Сравнение одноимённых месяцев внутри выбранных периодов
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Месяц</th>
                    <th className="px-3 py-3 text-right font-semibold">{label(gran, aYear, aPeriod)}</th>
                    <th className="px-3 py-3 text-right font-semibold">{label(gran, bYear, bPeriod)}</th>
                    <th className="px-3 py-3 text-right font-semibold">Разница</th>
                    <th className="px-5 py-3 text-right font-semibold">Изменение</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTable.map((r) => (
                    <tr key={`${r.ma}-${r.mb}`} className="border-t border-slate-100">
                      <td className="px-5 py-2.5 font-medium text-slate-800">
                        {r.ma ? monthYear(r.ma) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                        {formatMoney(r.va)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney(r.vb)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right tabular-nums",
                          r.diff > 0 ? "text-emerald-600" : r.diff < 0 ? "text-rose-600" : "text-slate-400",
                        )}
                      >
                        {r.diff === 0 ? "—" : `${r.diff > 0 ? "+" : ""}${formatMoney(r.diff)}`}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            (r.pct ?? 0) > 0
                              ? "text-emerald-600"
                              : (r.pct ?? 0) < 0
                                ? "text-rose-600"
                                : "text-slate-400",
                          )}
                        >
                          {r.pct === null ? (
                            "—"
                          ) : (
                            <>
                              {r.pct > 0 ? (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              ) : r.pct < 0 ? (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              ) : null}
                              {formatPct(r.pct)}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                    <td className="px-5 py-3">Итого</td>
                    <td className="px-3 py-3 text-right">{formatMoney(totalA)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(totalB)}</td>
                    <td className="px-3 py-3 text-right">
                      {totalB - totalA === 0 ? "—" : `${totalB - totalA > 0 ? "+" : ""}${formatMoney(totalB - totalA)}`}
                    </td>
                    <td className="px-5 py-3 text-right">{formatPct(delta)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card padded={false} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <Users className="h-4 w-4 text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900">По сотрудникам</h3>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {byEmployee.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-slate-800">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.store}</p>
                        </td>
                        <td className="px-2 py-2.5 text-right text-xs tabular-nums text-slate-500">
                          {formatMoney(r.va)}
                        </td>
                        <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                          {formatMoney(r.vb)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-2.5 text-right text-xs font-semibold tabular-nums",
                            r.diff > 0 ? "text-emerald-600" : r.diff < 0 ? "text-rose-600" : "text-slate-400",
                          )}
                        >
                          {r.diff === 0
                            ? "—"
                            : `${r.diff > 0 ? "+" : ""}${formatMoney(r.diff)}`}
                          <span className="ml-1 text-[10px] text-slate-400">
                            {formatPct(r.pct)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card padded={false} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <GitCompare className="h-4 w-4 text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900">По магазинам</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Магазин</th>
                      <th className="px-2 py-3 text-right font-semibold">A</th>
                      <th className="px-2 py-3 text-right font-semibold">B</th>
                      <th className="px-5 py-3 text-right font-semibold">Разница</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStore.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-5 py-2.5">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: r.color }}
                            />
                            <span className="font-medium text-slate-800">{r.name}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">
                          {formatMoney(r.va)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          {formatMoney(r.vb)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-2.5 text-right text-xs font-semibold tabular-nums",
                            r.diff > 0 ? "text-emerald-600" : r.diff < 0 ? "text-rose-600" : "text-slate-400",
                          )}
                        >
                          {r.diff === 0 ? "—" : `${r.diff > 0 ? "+" : ""}${formatMoney(r.diff)}`}
                          <span className="ml-1 text-[10px] text-slate-400">
                            {formatPct(r.pct)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
