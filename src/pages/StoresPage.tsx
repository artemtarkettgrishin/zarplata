import { useMemo, useState } from "react";
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Store as StoreIcon,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  TextInput,
} from "@/components/ui";
import { CHART_COLORS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { AppData, Store } from "@/types";

export default function StoresPage({
  data,
  addStore,
  renameStore,
  deleteStore,
  onGoEmployees,
}: {
  data: AppData;
  addStore: (name: string) => void;
  renameStore: (id: string, name: string) => void;
  deleteStore: (id: string) => void;
  onGoEmployees: () => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Store | null>(null);
  const [editName, setEditName] = useState("");
  const [pending, setPending] = useState<Store | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const salaryByEmployee = new Map<string, number>();
    for (const s of data.salaries) {
      salaryByEmployee.set(
        s.employeeId,
        (salaryByEmployee.get(s.employeeId) ?? 0) + s.amount,
      );
    }
    return data.stores
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .map((store, i) => {
        const employees = data.employees.filter((e) => e.storeId === store.id);
        const total = employees.reduce(
          (sum, e) => sum + (salaryByEmployee.get(e.id) ?? 0),
          0,
        );
        return {
          store,
          employees,
          total,
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      });
  }, [data, query]);

  const totalFund = rows.reduce((a, r) => a + r.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <StoreIcon className="h-6 w-6 text-cyan-600" /> Магазины
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.stores.length} точек · {data.employees.length} сотрудников · фонд{" "}
            {formatMoney(totalFund)}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Добавить магазин
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Поиск по названию магазина…"
          className="pl-10"
        />
      </div>

      {data.stores.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="Магазинов пока нет"
          description="Добавьте первую точку — затем привяжите к ней сотрудников в разделе «Сотрудники»."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Добавить магазин
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="Ничего не найдено" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ store, employees, total, color }) => (
            <Card key={store.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: color }}
                >
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {store.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400">ID: {store.id}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(store);
                      setEditName(store.name);
                    }}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Переименовать"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(store)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Удалить магазин"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" /> Сотрудников
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{employees.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Wallet className="h-3.5 w-3.5" /> Выплачено
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatMoney(total)}</p>
                </div>
              </div>

              {employees.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {employees.slice(0, 4).map((e) => (
                    <Badge key={e.id} tone="slate">
                      {e.name}
                    </Badge>
                  ))}
                  {employees.length > 4 ? (
                    <Badge tone="indigo">+{employees.length - 4}</Badge>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-400">
                  Сотрудники не привязаны.{" "}
                  <button
                    type="button"
                    onClick={onGoEmployees}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Добавить
                  </button>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Новый магазин"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                addStore(newName);
                setNewName("");
                setCreating(false);
              }}
            >
              <Plus className="h-4 w-4" /> Создать
            </Button>
          </>
        }
      >
        <Field label="Название магазина" hint="Например: Магазин «Центральный»">
          <TextInput
            value={newName}
            onChange={setNewName}
            autoFocus
            placeholder="Введите название"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                addStore(newName);
                setNewName("");
                setCreating(false);
              }
            }}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Переименовать магазин"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!editing || !editName.trim()) return;
                renameStore(editing.id, editName);
                setEditing(null);
              }}
            >
              <Pencil className="h-4 w-4" /> Сохранить
            </Button>
          </>
        }
      >
        <Field label="Название магазина">
          <TextInput value={editName} onChange={setEditName} autoFocus />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Удалить магазин?"
        message={`Магазин «${pending?.name ?? ""}» будет удалён вместе со всеми сотрудниками и их зарплатами. Действие необратимо.`}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) deleteStore(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
