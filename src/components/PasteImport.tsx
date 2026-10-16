import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  Columns3,
  Info,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge, Button, Field, Modal, Select } from "@/components/ui";
import { MONTHS_RU } from "@/lib/constants";
import { formatMoney, monthShort } from "@/lib/format";
import { PASTE_EXAMPLE, parseClipboard } from "@/lib/paste";
import type { Store } from "@/types";

interface ApplyParams {
  rows: { name: string; storeName: string | null; values: (number | null)[] }[];
  months: string[];
  defaultStoreId: string;
  createMissingStores: boolean;
  overwrite: boolean;
  reassignStore: boolean;
}

interface ApplySummary {
  createdStores: number;
  createdEmployees: number;
  written: number;
  skipped: number;
  withoutStore: string[];
}

export default function PasteImport({
  open,
  onClose,
  initialText,
  defaultYear,
  stores,
  defaultStoreId,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initialText: string;
  defaultYear: number;
  stores: Store[];
  defaultStoreId: string;
  onApply: (params: ApplyParams) => ApplySummary;
}) {
  const [text, setText] = useState("");
  const [storeDraft, setStoreDraft] = useState(defaultStoreId);
  const [startMonth, setStartMonth] = useState("01");
  const [createStores, setCreateStores] = useState(true);
  const [overwrite, setOverwrite] = useState(true);
  const [reassignStore, setReassignStore] = useState(true);
  const [result, setResult] = useState<ApplySummary | null>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setStoreDraft(defaultStoreId || stores[0]?.id || "");
      setResult(null);
    }
  }, [open, initialText, defaultStoreId, stores]);

  const parsed = useMemo(
    () =>
      parseClipboard(text, {
        defaultYear,
        defaultStartMonth: Number(startMonth),
        storeNames: stores.map((s) => s.name),
      }),
    [text, defaultYear, startMonth, stores],
  );

  const totalValues = parsed.rows.reduce(
    (sum, r) => sum + r.values.filter((v) => v !== null && v > 0).length,
    0,
  );

  const readClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip);
    } catch {
      /* нет доступа к буферу — пользователь вставит вручную */
    }
  };

  const previewMonths = parsed.months.slice(0, 6);
  const previewRows = parsed.rows.slice(0, 8);

  const storeLabel = (row: { storeName: string | null }) => {
    if (row.storeName) return row.storeName;
    return stores.find((s) => s.id === storeDraft)?.name ?? "— не выбран —";
  };

  const apply = () => {
    const summary = onApply({
      rows: parsed.rows,
      months: parsed.months,
      defaultStoreId: storeDraft,
      createMissingStores: createStores,
      overwrite,
      reassignStore,
    });
    setResult(summary);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Вставка таблицы сотрудников и зарплат"
      width="max-w-4xl"
      footer={
        result ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
            <Button
              onClick={() => {
                setText("");
                setResult(null);
              }}
            >
              Вставить ещё
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={apply} disabled={!parsed.rows.length || !parsed.months.length}>
              <ClipboardPaste className="h-4 w-4" /> Импортировать{" "}
              {parsed.rows.length ? `${parsed.rows.length} сотр.` : ""}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm leading-relaxed">
              <p className="font-semibold">Данные импортированы</p>
              <ul className="mt-2 space-y-1">
                <li>создано сотрудников: <b>{result.createdEmployees}</b></li>
                <li>создано магазинов: <b>{result.createdStores}</b></li>
                <li>записей о зарплатах записано: <b>{result.written}</b></li>
                {result.skipped ? (
                  <li>пропущено (уже есть значения): <b>{result.skipped}</b></li>
                ) : null}
              </ul>
            </div>
          </div>
          {result.withoutStore.length ? (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Не удалось добавить сотрудников без магазина</p>
                <p className="mt-1">{result.withoutStore.join(", ")}</p>
                <p className="mt-1 text-xs">
                  Создайте магазин или выберите «Магазин по умолчанию» и повторите вставку.
                </p>
              </div>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">
            Результат сразу виден в сетке зарплат — переключите год при необходимости.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-indigo-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Скопируйте диапазон из Excel или Google Таблиц (сотрудники в строках, месяцы в
                столбцах) и вставьте в поле ниже — <b>Ctrl+V</b>. Можно вставить и всю таблицу
                целиком: недостающие сотрудники и магазины будут созданы автоматически.
              </span>
            </p>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Сотрудник\tМагазин\tЯнварь\tФевраль\tМарт…"}
              rows={6}
              className="w-full rounded-xl border border-slate-300 bg-white p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={readClipboard}>
              <ClipboardPaste className="h-4 w-4" /> Вставить из буфера
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText(PASTE_EXAMPLE)}>
              <Sparkles className="h-4 w-4" /> Пример
            </Button>
            {text ? (
              <Button variant="ghost" size="sm" onClick={() => setText("")}>
                Очистить
              </Button>
            ) : null}
          </div>

          {text ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone={parsed.headerDetected ? "green" : "amber"}>
                  {parsed.headerDetected ? "Заголовок с месяцами найден" : "Заголовков нет — месяцы по порядку"}
                </Badge>
                <Badge tone={parsed.storeColumnDetected ? "green" : "slate"}>
                  {parsed.storeColumnDetected ? "Столбец с магазином найден" : "Магазин берётся из настроек"}
                </Badge>
                {parsed.transposed ? <Badge tone="cyan">Таблица транспонирована</Badge> : null}
                <Badge tone="indigo">
                  <Columns3 className="h-3.5 w-3.5" />
                  {parsed.months.length} мес.
                </Badge>
                <Badge tone="indigo">
                  <Users className="h-3.5 w-3.5" />
                  {parsed.rows.length} сотр.
                </Badge>
                <Badge tone="slate">Сумм: {totalValues}</Badge>
              </div>

              {parsed.warnings.length ? (
                <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                  {parsed.warnings.map((w) => (
                    <li key={w} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Магазин по умолчанию"
                  hint="Присваивается сотрудникам, у которых в таблице магазин не указан."
                >
                  <Select
                    value={storeDraft}
                    onChange={setStoreDraft}
                    options={[
                      { value: "", label: "— не выбран —" },
                      ...stores.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </Field>
                {!parsed.headerDetected ? (
                  <Field label="Первый месяц таблицы" hint="Столбцы считаются месяцами по порядку.">
                    <Select
                      value={startMonth}
                      onChange={setStartMonth}
                      options={MONTHS_RU.map((m, i) => ({
                        value: String(i + 1).padStart(2, "0"),
                        label: `${m} ${defaultYear}`,
                      }))}
                    />
                  </Field>
                ) : (
                  <div className="flex items-end">
                    <p className="text-xs leading-relaxed text-slate-500">
                      Месяцы определены по заголовку: с {monthShort(parsed.months[0] ?? "")} по{" "}
                      {monthShort(parsed.months[parsed.months.length - 1] ?? "")}{" "}
                      {parsed.months.length > 1
                        ? `(${parsed.months.length} столбцов)`
                        : ""}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    checked: overwrite,
                    onChange: setOverwrite,
                    label: "Перезаписывать суммы",
                    hint: "Иначе существующие значения остаются без изменений.",
                  },
                  {
                    checked: createStores,
                    onChange: setCreateStores,
                    label: "Создавать магазины",
                    hint: "Если в таблице указан незнакомый магазин.",
                  },
                  {
                    checked: reassignStore,
                    onChange: setReassignStore,
                    label: "Обновлять магазин",
                    hint: "Переносить существующего сотрудника в магазин из таблицы.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => opt.onChange(!opt.checked)}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-slate-50"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-white ${
                        opt.checked ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      {opt.checked ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{opt.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                        {opt.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {parsed.rows.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Сотрудник</th>
                        <th className="px-3 py-2 text-left font-semibold">Магазин</th>
                        {previewMonths.map((m) => (
                          <th key={m} className="px-2 py-2 text-right font-semibold">
                            {monthShort(m)}
                          </th>
                        ))}
                        {parsed.months.length > previewMonths.length ? (
                          <th className="px-2 py-2 text-right font-semibold">
                            +{parsed.months.length - previewMonths.length}
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row.name} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
                          <td className="px-3 py-2 text-slate-500">{storeLabel(row)}</td>
                          {previewMonths.map((m, i) => (
                            <td key={m} className="px-2 py-2 text-right tabular-nums text-slate-700">
                              {row.values[i] === null ? "—" : formatMoney(row.values[i] ?? 0)}
                            </td>
                          ))}
                          {parsed.months.length > previewMonths.length ? (
                            <td className="px-2 py-2 text-right text-slate-400">…</td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > previewRows.length ? (
                    <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      и ещё {parsed.rows.length - previewRows.length} строк
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Не удалось распознать сотрудников. Убедитесь, что в первом столбце — фамилии,
                  а дальше идут суммы по месяцам.
                </div>
              )}
            </>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Подсказка: вставить таблицу можно прямо на странице «Зарплаты» — просто нажмите{" "}
              <b>Ctrl+V</b>, окно откроется автоматически. Существующие сотрудники сопоставляются
              по фамилии, поэтому повторная вставка не создаёт дубликатов.
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}
