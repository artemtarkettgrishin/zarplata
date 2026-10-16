import {
  BookOpen,
  CheckCircle2,
  CloudOff,
  Database,
  GitCompare,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Settings as SettingsIcon,
  Store as StoreIcon,
  Users,
  Wallet,
  X,
  CloudUpload,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { PageKey, SyncState } from "@/types";
import { cn } from "@/utils/cn";

const NAV: { key: PageKey; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { key: "dashboard", label: "Дашборд", icon: LayoutDashboard, hint: "Сводка и графики" },
  { key: "stores", label: "Магазины", icon: StoreIcon, hint: "Точки и филиалы" },
  { key: "employees", label: "Сотрудники", icon: Users, hint: "Штат и привязка" },
  { key: "salaries", label: "Зарплаты", icon: Wallet, hint: "Сетка и Ctrl+V" },
  { key: "compare", label: "Сравнение", icon: GitCompare, hint: "Месяц · квартал · год" },
  { key: "reports", label: "Отчёты", icon: Database, hint: "Фильтры и периоды" },
  { key: "settings", label: "Настройки", icon: SettingsIcon, hint: "Синхронизация" },
  { key: "guide", label: "Инструкция", icon: BookOpen, hint: "Как настроить" },
];

interface Props {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  sync: SyncState;
  autoSync: boolean;
  onPull: () => void;
  onPush: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SyncIcon({ status }: { status: SyncState["status"] }) {
  if (status === "loading" || status === "saving")
    return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "error") return <AlertTriangle className="h-4 w-4 text-rose-500" />;
  return <CloudOff className="h-4 w-4 text-slate-400" />;
}

export default function Sidebar({
  page,
  onNavigate,
  sync,
  autoSync,
  onPull,
  onPush,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">Учёт зарплат</p>
          <p className="truncate text-xs text-slate-400">Зарплатная ведомость</p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Закрыть меню"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNavigate(item.key);
                onCloseMobile();
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                active
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                  : "hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-white" : "text-slate-400 group-hover:text-indigo-300",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                <span
                  className={cn(
                    "block truncate text-[11px]",
                    active ? "text-indigo-100" : "text-slate-500",
                  )}
                >
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/5 px-4 py-4">
        <div className="rounded-xl bg-slate-800/70 p-3">
          <div className="flex items-start gap-2">
            <SyncIcon status={sync.status} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100">
                {sync.status === "loading" && "Загрузка данных…"}
                {sync.status === "saving" && "Сохранение…"}
                {sync.status === "ok" && "Синхронизировано"}
                {sync.status === "error" && "Ошибка синхронизации"}
                {sync.status === "idle" && (autoSync ? "Автосинхронизация" : "Локальный режим")}
              </p>
              <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-slate-400">
                {sync.message}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onPull}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Загрузить
            </button>
            <button
              type="button"
              onClick={onPush}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
            >
              <CloudUpload className="h-3.5 w-3.5" /> Сохранить
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Обновление: {formatDateTime(sync.lastPull)}
            <br />
            Сохранение: {formatDateTime(sync.lastPush)}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" /> Выйти
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-72">{content}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-label="Закрыть меню"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl">{content}</div>
        </div>
      ) : null}
    </>
  );
}

export function MobileHeader({ onOpen, title }: { onOpen: () => void; title: string }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>
      <p className="truncate font-semibold text-slate-900">{title}</p>
    </div>
  );
}
