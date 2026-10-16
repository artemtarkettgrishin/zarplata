import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Code2,
  Copy,
  Database,
  Download,
  FileJson,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge, Button, Card, CardTitle, ConfirmDialog, Field, TextInput } from "@/components/ui";
import { GAS_SCRIPT } from "@/lib/gasScript";
import { formatDateTime } from "@/lib/format";
import type { AppData, Settings, SyncState } from "@/types";
import { cn } from "@/utils/cn";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-slate-50"
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
          checked ? "bg-indigo-600" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
    </button>
  );
}

export default function SettingsPage({
  data,
  settings,
  sync,
  updateSettings,
  onPull,
  onPush,
  replaceData,
  clearAll,
  loadDemo,
}: {
  data: AppData;
  settings: Settings;
  sync: SyncState;
  updateSettings: (patch: Partial<Settings>) => void;
  onPull: () => void;
  onPush: () => void;
  replaceData: (data: AppData) => void;
  clearAll: () => void;
  loadDemo: () => void;
}) {
  const [urlDraft, setUrlDraft] = useState(settings.gasUrl);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [askClear, setAskClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveUrl = () => {
    updateSettings({ gasUrl: urlDraft.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(GAS_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = GAS_SCRIPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zarplaty-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>;
        const stores = Array.isArray(parsed.stores) ? parsed.stores : [];
        const employees = Array.isArray(parsed.employees) ? parsed.employees : [];
        const salaries = Array.isArray(parsed.salaries) ? parsed.salaries : [];
        replaceData({
          stores: stores
            .filter((s) => s && s.id && s.name)
            .map((s) => ({ id: String(s.id), name: String(s.name) })),
          employees: employees
            .filter((e) => e && e.id && e.name)
            .map((e) => ({ id: String(e.id), name: String(e.name), storeId: String(e.storeId ?? "") })),
          salaries: salaries
            .filter((s) => s && s.id && s.employeeId && s.month)
            .map((s) => ({
              id: String(s.id),
              employeeId: String(s.employeeId),
              month: String(s.month).slice(0, 7),
              amount: Number(s.amount) || 0,
            })),
        });
      } catch {
        setImportError("Не удалось прочитать файл: это не корректный JSON.");
      }
    };
    reader.onerror = () => setImportError("Ошибка чтения файла.");
    reader.readAsText(file);
  };

  const busy = sync.status === "loading" || sync.status === "saving";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Database className="h-6 w-6 text-slate-700" /> Настройки
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Синхронизация с Google Таблицами, резервные копии и служебные действия
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle
              icon={<Link2 className="h-5 w-5" />}
              title="Подключение к Google Таблицам"
              subtitle="URL веб-приложения, который возвращает Apps Script после развертывания"
            />
            <div className="space-y-4">
              <Field
                label="URL веб-приложения (заканчивается на /exec)"
                hint="Расширения → Apps Script → Развернуть → Новое развертывание → Веб-приложение → скопировать URL."
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <TextInput
                    value={urlDraft}
                    onChange={(v) => setUrlDraft(v)}
                    placeholder="https://script.google.com/macros/s/AKfy.../exec"
                  />
                  <Button onClick={saveUrl} className="shrink-0">
                    {saved ? (
                      <>
                        <Check className="h-4 w-4" /> Сохранено
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Сохранить URL
                      </>
                    )}
                  </Button>
                </div>
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onPull} disabled={busy}>
                  {sync.status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Загрузить из Google
                </Button>
                <Button variant="secondary" onClick={onPush} disabled={busy}>
                  {sync.status === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  Сохранить в Google
                </Button>
                {saved ? (
                  <Badge tone="green">
                    <Check className="h-3.5 w-3.5" /> URL обновлён
                  </Badge>
                ) : null}
              </div>

              <Toggle
                checked={settings.autoSync}
                onChange={(v) => updateSettings({ autoSync: v })}
                label="Автосинхронизация"
                description="При старте приложения данные автоматически загружаются из Google Таблиц, а каждое изменение отправляется обратно через 1,5 секунды. Внимание: загрузка перезаписывает локальные данные, сохранение перезаписывает данные в таблице."
              />

              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  sync.status === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : sync.status === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                )}
              >
                <p className="flex items-center gap-2 font-medium">
                  {sync.status === "error" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {sync.status === "loading" && "Загрузка данных…"}
                  {sync.status === "saving" && "Сохранение данных…"}
                  {sync.status === "ok" && "Готово"}
                  {sync.status === "error" && "Проблема с синхронизацией"}
                  {sync.status === "idle" &&
                    (settings.gasUrl ? "Ожидание изменений" : "Локальный режим")}
                </p>
                <p className="mt-1 text-xs leading-relaxed">{sync.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Последняя загрузка: {formatDateTime(sync.lastPull)}
                  <br />
                  Последнее сохранение: {formatDateTime(sync.lastPush)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle
              icon={<Code2 className="h-5 w-5" />}
              title="Google Apps Script для вашей таблицы"
              subtitle="Скопируйте код в редактор Apps Script — он создаёт листы Stores, Employees, Salaries"
              right={
                <Button variant={copied ? "success" : "primary"} onClick={copyScript}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Копировать
                    </>
                  )}
                </Button>
              }
            />
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
              <code>{GAS_SCRIPT}</code>
            </pre>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Скрипт отвечает на GET-запрос данными всех трёх листов, а на POST-запрос полностью
              перезаписывает листы присланними данными. Доступ к развертыванию нужно выставить
              «Всем», иначе браузер получит страницу входа вместо JSON.
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle icon={<FileJson className="h-5 w-5" />} title="Данные" subtitle="Текущее состояние" />
            <dl className="space-y-2 text-sm">
              {[
                ["Магазинов", data.stores.length],
                ["Сотрудников", data.employees.length],
                ["Записей о зарплатах", data.salaries.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardTitle
              icon={<Download className="h-5 w-5" />}
              title="Резервные копии"
              subtitle="Экспорт и импорт JSON"
            />
            <div className="space-y-2">
              <Button variant="secondary" onClick={exportJson} className="w-full">
                <Download className="h-4 w-4" /> Экспортировать JSON
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">
                <Upload className="h-4 w-4" /> Импортировать JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importJson(file);
                  e.target.value = "";
                }}
              />
              {importError ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{importError}</p>
              ) : null}
              <p className="text-xs leading-relaxed text-slate-500">
                Импорт полностью заменяет текущие данные. Рекомендуется сначала сделать экспорт.
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle
              icon={<Sparkles className="h-5 w-5" />}
              title="Демо и очистка"
              subtitle="Полезно для тестирования"
            />
            <div className="space-y-2">
              <Button variant="secondary" onClick={loadDemo} className="w-full">
                <Sparkles className="h-4 w-4" /> Загрузить демо-данные
              </Button>
              <Button variant="danger" onClick={() => setAskClear(true)} className="w-full">
                <Trash2 className="h-4 w-4" /> Удалить все данные
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={askClear}
        title="Удалить все данные?"
        message="Будут удалены все магазины, сотрудники и записи о зарплатах как локально, так и (при включённой автосинхронизации) в Google Таблицах."
        confirmLabel="Удалить всё"
        onCancel={() => setAskClear(false)}
        onConfirm={() => {
          clearAll();
          setAskClear(false);
        }}
      />
    </div>
  );
}
