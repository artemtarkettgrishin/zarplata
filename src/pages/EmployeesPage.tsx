import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Select,
  TextInput,
} from "@/components/ui";
import { formatMoney, monthYear } from "@/lib/format";
import type { AppData, Employee } from "@/types";

type SortKey = "name" | "store" | "total" | "months";

export default function EmployeesPage({
  data,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  onGoStores,
}: {
  data: AppData;
  addEmployee: (name: string, storeId: string) => void;
  updateEmployee: (id: string, patch: { name?: string; storeId?: string }) => void;
  deleteEmployee: (id: string) => void;
  onGoStores: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStore, setNewStore] = useState("");

  const [editing, setEditing] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editStore, setEditStore] = useState("");
  const [pending, setPending] = useState<Employee | null>(null);

  const storeById = useMemo(() => new Map(data.stores.map((s) => [s.id, s])), [data.stores]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const agg = new Map<string, { total: number; months: number; last: string }>();
    for (const s of data.salaries) {
      const cur = agg.get(s.employeeId) ?? { total: 0, months: 0, last: "" };
      cur.total += s.amount;
      if (s.amount > 0) cur.months += 1;
      if (s.month > cur.last) cur.last = s.month;
      agg.set(s.employeeId, cur);
    }
    const list = data.employees
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .filter((e) => (filterStore === "all" ? true : e.storeId === filterStore))
      .map((e) => ({
        employee: e,
        storeName: storeById.get(e.storeId)?.name ?? "— без магазина —",
        ...agg.get(e.id),
        total: agg.get(e.id)?.total ?? 0,
        months: agg.get(e.id)?.months ?? 0,
        last: agg.get(e.id)?.last ?? "",
      }));

    const dir = asc ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "name") return a.employee.name.localeCompare(b.employee.name, "ru") * dir;
      if (sortKey === "store") return a.storeName.localeCompare(b.storeName, "ru") * dir;
      if (sortKey === "months") return (a.months - b.months) * dir;
      return (a.total - b.total) * dir;
    });
    return list;
  }, [data, query, filterStore, sortKey, asc, storeById]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const storeOptions = [
    { value: "all", label: `Все магазины (${data.employees.length})` },
    ...data.stores.map((s) => ({
      value: s.id,
      label: `${s.name} (${data.employees.filter((e) => e.storeId === s.id).length})`,
    })),
  ];

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${
        sortKey === k ? "text-indigo-600" : ""
      }`}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <Users className="h-6 w-6 text-indigo-600" /> Сотрудники
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.employees.length} сотрудников в {data.stores.length} магазинах
          </p>
        </div>
        <Button
          onClick={() => {
            setNewStore(data.stores[0]?.id ?? "");
            setCreating(true);
          }}
          disabled={data.stores.length === 0}
          title={data.stores.length === 0 ? "Сначала создайте магазин" : undefined}
        >
          <UserPlus className="h-4 w-4" /> Добавить сотрудника
        </Button>
      </div>

      {data.stores.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Сначала добавьте магазин"
          description="Сотрудник всегда привязывается к конкретному магазину, поэтому начните с раздела «Магазины»."
          action={<Button onClick={onGoStores}>Перейти в магазины</Button>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput
                value={query}
                onChange={setQuery}
                placeholder="Поиск по имени…"
                className="pl-10"
              />
            </div>
            <div className="sm:w-72">
              <Select value={filterStore} onChange={setFilterStore} options={storeOptions} />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="Сотрудники не найдены"
              description="Измените условия поиска или добавьте нового сотрудника."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Добавить сотрудника
                </Button>
              }
            />
          ) : (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 pb-3 pt-4 text-left font-semibold">
                        <SortBtn label="Сотрудник" k="name" />
                      </th>
                      <th className="px-3 pb-3 pt-4 text-left font-semibold">
                        <SortBtn label="Магазин" k="store" />
                      </th>
                      <th className="px-3 pb-3 pt-4 text-right font-semibold">
                        <SortBtn label="Выплачено" k="total" />
                      </th>
                      <th className="px-3 pb-3 pt-4 text-right font-semibold">
                        <SortBtn label="Месяцев" k="months" />
                      </th>
                      <th className="px-3 pb-3 pt-4 text-right font-semibold">
                        Последняя выплата
                      </th>
                      <th className="px-5 pb-3 pt-4 text-right font-semibold">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.employee.id}
                        className="border-t border-slate-100 transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                              {r.employee.name
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {r.employee.name}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {r.employee.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone="cyan">{r.storeName}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">
                          {formatMoney(r.total)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{r.months}</td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {r.last ? monthYear(r.last) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(r.employee);
                                setEditName(r.employee.name);
                                setEditStore(r.employee.storeId);
                              }}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                              title="Редактировать"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPending(r.employee)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                      <td className="px-5 py-3">Итого: {rows.length}</td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right">
                        {formatMoney(rows.reduce((a, b) => a + b.total, 0))}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {rows.reduce((a, b) => a + b.months, 0)}
                      </td>
                      <td className="px-3 py-3" />
                      <td className="px-5 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Новый сотрудник"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!newName.trim() || !newStore) return;
                addEmployee(newName, newStore);
                setNewName("");
                setCreating(false);
              }}
            >
              <Plus className="h-4 w-4" /> Добавить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="ФИО сотрудника" hint="Например: Иванов Иван Иванович">
            <TextInput
              value={newName}
              onChange={setNewName}
              autoFocus
              placeholder="Введите имя"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim() && newStore) {
                  addEmployee(newName, newStore);
                  setNewName("");
                  setCreating(false);
                }
              }}
            />
          </Field>
          <Field label="Магазин">
            <Select
              value={newStore}
              onChange={setNewStore}
              options={data.stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактировать сотрудника"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!editing || !editName.trim() || !editStore) return;
                updateEmployee(editing.id, { name: editName.trim(), storeId: editStore });
                setEditing(null);
              }}
            >
              <Pencil className="h-4 w-4" /> Сохранить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="ФИО сотрудника">
            <TextInput value={editName} onChange={setEditName} autoFocus />
          </Field>
          <Field label="Магазин" hint="При переводе в другой магазин история зарплат сохраняется.">
            <Select
              value={editStore}
              onChange={setEditStore}
              options={data.stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Удалить сотрудника?"
        message={`«${pending?.name ?? ""}» будет удалён вместе со всеми записями о его зарплатах.`}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) deleteEmployee(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
