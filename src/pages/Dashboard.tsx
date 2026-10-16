import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarRange,
  Coins,
  Crown,
  LayoutDashboard,
  Store as StoreIcon,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Card, CardTitle, EmptyState, Select } from "@/components/ui";
import { CHART_COLORS } from "@/lib/constants";
import {
  availableYears,
  currentMonth,
  formatCompact,
  formatMoney,
  formatPct,
  lastMonths,
  monthShort,
  monthsOfYear,
  pctChange,
} from "@/lib/format";
import type { AppData } from "@/types";

export default function Dashboard({
  data,
  onNavigate,
  onLoadDemo,
}: {
  data: AppData;
  onNavigate: (page: "stores" | "employees" | "salaries" | "reports") => void;
  onLoadDemo: () => void;
}) {
  const thisYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () =>
      availableYears(data.salaries.map((s) => Number(s.month.split("-")[0]))).map((y) => ({
        value: String(y),
        label: `${y} год`,
      })),
    [data.salaries],
  );

  const [year, setYear] = useState(String(thisYear));
  const selectedYear = Number(year);

  const storeById = useMemo(
    () => new Map(data.stores.map((s) => [s.id, s])),
    [data.stores],
  );

  const months = useMemo(() => monthsOfYear(selectedYear), [selectedYear]);

  const monthTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data.salaries) map.set(s.month, (map.get(s.month) ?? 0) + s.amount);
    return map;
  }, [data.salaries]);

  const yearMonths = useMemo(
    () => months.filter((m) => (monthTotals.get(m) ?? 0) > 0),
    [months, monthTotals],
  );

  const yearTotal = useMemo(
    () => months.reduce((sum, m) => sum + (monthTotals.get(m) ?? 0), 0),
    [months, monthTotals],
  );

  const currentMonthTotal = monthTotals.get(currentMonth()) ?? 0;
  const prevMonthTotal = monthTotals.get(lastMonths(2)[0]) ?? 0;
  const momDelta = pctChange(prevMonthTotal, currentMonthTotal);

  const activeEmployeeIds = useMemo(() => {
    const inYear = new Set<string>();
    for (const s of data.salaries) {
      if (s.month.startsWith(String(selectedYear))) inYear.add(s.employeeId);
    }
    return inYear;
  }, [data.salaries, selectedYear]);

  const avgPerEmployee = activeEmployeeIds.size
    ? yearTotal / activeEmployeeIds.size
    : 0;

  const monthlyChartData = useMemo(
    () =>
      months.map((m) => {
        const total = monthTotals.get(m) ?? 0;
        const count = data.salaries.filter((s) => s.month === m && s.amount > 0).length;
        return {
          month: monthShort(m),
          total,
          avg: count ? Math.round(total / count) : 0,
          people: count,
        };
      }),
    [months, monthTotals, data.salaries],
  );

  const storeData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const s of data.salaries) {
      if (!s.month.startsWith(String(selectedYear))) continue;
      const emp = data.employees.find((e) => e.id === s.employeeId);
      if (!emp) continue;
      totals.set(emp.storeId, (totals.get(emp.storeId) ?? 0) + s.amount);
    }
    return data.stores
      .map((st, i) => ({
        name: st.name,
        value: totals.get(st.id) ?? 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
        people: data.employees.filter((e) => e.storeId === st.id).length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedYear]);

  const topEmployees = useMemo(() => {
    const totals = new Map<string, number>();
    for (const s of data.salaries) {
      if (!s.month.startsWith(String(selectedYear))) continue;
      totals.set(s.employeeId, (totals.get(s.employeeId) ?? 0) + s.amount);
    }
    return data.employees
      .map((e) => ({
        id: e.id,
        name: e.name,
        store: storeById.get(e.storeId)?.name ?? "—",
        value: totals.get(e.id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data, selectedYear, storeById]);

  const momData = useMemo(() => {
    const rows: { month: string; delta: number | null; total: number }[] = [];
    months.forEach((m, i) => {
      const total = monthTotals.get(m) ?? 0;
      const prev = i === 0 ? 0 : (monthTotals.get(months[i - 1]) ?? 0);
      const withPrev = i > 0 && prev > 0;
      rows.push({
        month: monthShort(m),
        delta: withPrev ? pctChange(prev, total) : null,
        total,
      });
    });
    return rows;
  }, [months, monthTotals]);

  const bestMonth = useMemo(() => {
    const filled = months
      .map((m) => ({ m, v: monthTotals.get(m) ?? 0 }))
      .filter((x) => x.v > 0);
    if (!filled.length) return null;
    return filled.reduce((a, b) => (b.v > a.v ? b : a));
  }, [months, monthTotals]);

  const hasData = data.salaries.length > 0;

  const kpis = [
    {
      label: "Сотрудников",
      value: String(data.employees.length),
      hint: data.stores.length
        ? `${(data.employees.length / data.stores.length).toFixed(1)} в среднем на магазин`
        : "Магазины не добавлены",
      icon: Users,
      tone: "from-indigo-500 to-violet-600",
      action: () => onNavigate("employees"),
    },
    {
      label: "Магазинов",
      value: String(data.stores.length),
      hint: "Точек / филиалов",
      icon: StoreIcon,
      tone: "from-cyan-500 to-blue-600",
      action: () => onNavigate("stores"),
    },
    {
      label: "ЗП за текущий месяц",
      value: formatMoney(currentMonthTotal),
      hint:
        momDelta === null
          ? "Нет данных для сравнения"
          : `${formatPct(momDelta)} к предыдущему месяцу`,
      icon: Wallet,
      tone: "from-emerald-500 to-teal-600",
      action: () => onNavigate("salaries"),
    },
    {
      label: `ЗП за ${selectedYear} год`,
      value: formatMoney(yearTotal),
      hint: avgPerEmployee ? `≈ ${formatMoney(avgPerEmployee)} на сотрудника` : "Нет выплат",
      icon: Coins,
      tone: "from-amber-500 to-orange-600",
      action: () => onNavigate("reports"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <LayoutDashboard className="h-6 w-6 text-indigo-600" /> Дашборд
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ключевые показатели и аналитика по зарплатам
          </p>
        </div>
        <div className="w-40">
          <Select value={year} onChange={setYear} options={yearOptions} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              type="button"
              onClick={k.action}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${k.tone} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {k.label === "ЗП за текущий месяц" && momDelta !== null ? (
                  <Badge tone={momDelta >= 0 ? "green" : "red"}>
                    {momDelta >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {formatPct(momDelta)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{k.value}</p>
              <p className="text-sm font-medium text-slate-600">{k.label}</p>
              <p className="mt-1 text-xs text-slate-400">{k.hint}</p>
            </button>
          );
        })}
      </div>

      {!hasData ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="Пока нет ни одной выплаты"
          description="Добавьте магазины и сотрудников, затем заполните сетку зарплат — дашборд сразу наполнится графиками. Или загрузите демо-данные, чтобы посмотреть, как всё выглядит."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate("stores")}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Начать с магазинов
              </button>
              <button
                type="button"
                onClick={onLoadDemo}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Загрузить демо-данные
              </button>
            </div>
          }
        />
      ) : (
        <>
          <Card>
            <CardTitle
              icon={<CalendarRange className="h-5 w-5" />}
              title={`Зарплата по месяцам · ${selectedYear}`}
              subtitle="Столбцы — сумма выплат за месяц, линия — средняя зарплата на сотрудника"
              right={
                bestMonth ? (
                  <Badge tone="amber">
                    <Crown className="h-3.5 w-3.5" /> Пик: {monthShort(bestMonth.m)}
                  </Badge>
                ) : null
              }
            />
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
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
                    formatter={(value, name) =>
                      name === "Сотрудников" ? [String(value), name] : [formatMoney(Number(value)), name]
                    }
                    labelStyle={{ fontWeight: 600, color: "#0f172a" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="total"
                    name="Сумма выплат"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg"
                    name="Средняя ЗП"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle
                icon={<Building2 className="h-5 w-5" />}
                title={`Распределение по магазинам · ${selectedYear}`}
                subtitle="Доля каждого магазина в фонде оплаты труда"
              />
              {storeData.some((s) => s.value > 0) ? (
                <>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={storeData.filter((s) => s.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="52%"
                          outerRadius="80%"
                          paddingAngle={2}
                        >
                          {storeData
                            .filter((s) => s.value > 0)
                            .map((s) => (
                              <Cell key={s.name} fill={s.color} />
                            ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {storeData.map((s) => {
                      const total = storeData.reduce((a, b) => a + b.value, 0) || 1;
                      const pct = (s.value / total) * 100;
                      return (
                        <div key={s.name} className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: s.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                            {s.name}
                            <span className="ml-2 text-xs text-slate-400">
                              {s.people} чел.
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatMoney(s.value)}
                          </span>
                          <span className="w-14 text-right text-xs text-slate-400">
                            {pct.toFixed(1)} %
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<StoreIcon className="h-6 w-6" />}
                  title="Нет выплат за выбранный год"
                  description={`За ${selectedYear} год не найдено ни одной записи о зарплате.`}
                />
              )}
            </Card>

            <Card>
              <CardTitle
                icon={<Crown className="h-5 w-5" />}
                title={`Топ-5 сотрудников · ${selectedYear}`}
                subtitle="Наибольшие суммарные выплаты за год"
              />
              {topEmployees.some((e) => e.value > 0) ? (
                <>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topEmployees}
                        layout="vertical"
                        margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => formatCompact(Number(v))}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={130}
                          tick={{ fontSize: 12, fill: "#334155" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                        />
                        <Bar dataKey="value" name="Выплачено" radius={[0, 6, 6, 0]} maxBarSize={26}>
                          {topEmployees.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {topEmployees.map((e, i) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {e.name}
                          </span>
                          <span className="block truncate text-xs text-slate-400">{e.store}</span>
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatMoney(e.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="Нет данных по сотрудникам"
                  description="Добавьте сотрудников и заполните их зарплаты."
                />
              )}
            </Card>
          </div>

          <Card>
            <CardTitle
              icon={<TrendingUp className="h-5 w-5" />}
              title={`Динамика месяц-к-месяцу · ${selectedYear}`}
              subtitle="Процент изменения фонда оплаты труда относительно предыдущего месяца"
              right={
                <Badge tone={(() => {
                  const last = [...momData].reverse().find((d) => d.delta !== null);
                  return last && last.delta !== null && last.delta >= 0 ? "green" : "red";
                })()}>
                  {(() => {
                    const last = [...momData].reverse().find((d) => d.delta !== null);
                    return last?.delta !== null && last?.delta !== undefined
                      ? formatPct(last.delta)
                      : "—";
                  })()}
                </Badge>
              }
            />
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={momData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                  <YAxis
                    tickFormatter={(v) => `${Number(v).toFixed(0)} %`}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value) => formatPct(Number(value))}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="delta"
                    name="Изменение"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#06b6d4" }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {momData
                .filter((d) => d.delta !== null)
                .map((d) => (
                  <div
                    key={d.month}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <span className="text-sm text-slate-600">{d.month}</span>
                    <span
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        (d.delta ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {(d.delta ?? 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPct(d.delta)}
                    </span>
                  </div>
                ))}
              {momData.every((d) => d.delta === null) ? (
                <p className="text-sm text-slate-500">
                  Недостаточно данных для расчёта динамики — нужны выплаты минимум за два месяца.
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardTitle
              icon={<CalendarRange className="h-5 w-5" />}
              title="Сводная таблица по месяцам"
              subtitle={`Итого за ${selectedYear} год: ${formatMoney(yearTotal)} · затронуто месяцев: ${yearMonths.length}`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-semibold">Месяц</th>
                    <th className="pb-2 text-right font-semibold">Выплачено</th>
                    <th className="pb-2 text-right font-semibold">Сотрудников</th>
                    <th className="pb-2 text-right font-semibold">Средняя ЗП</th>
                    <th className="pb-2 text-right font-semibold">Доля года</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyChartData.map((row) => (
                    <tr key={row.month} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 font-medium text-slate-800">{row.month}</td>
                      <td className="py-2.5 text-right text-slate-700">{formatMoney(row.total)}</td>
                      <td className="py-2.5 text-right text-slate-600">{row.people}</td>
                      <td className="py-2.5 text-right text-slate-600">
                        {row.avg ? formatMoney(row.avg) : "—"}
                      </td>
                      <td className="py-2.5 text-right text-slate-600">
                        {yearTotal ? `${((row.total / yearTotal) * 100).toFixed(1)} %` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
                    <td className="pt-3">Итого</td>
                    <td className="pt-3 text-right">{formatMoney(yearTotal)}</td>
                    <td className="pt-3 text-right">
                      {monthlyChartData.reduce((a, b) => Math.max(a, b.people), 0)}
                    </td>
                    <td className="pt-3 text-right">
                      {avgPerEmployee ? formatMoney(yearTotal / (yearMonths.length || 1)) : "—"}
                    </td>
                    <td className="pt-3 text-right">100 %</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
