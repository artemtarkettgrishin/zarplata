import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck, Wallet } from "lucide-react";
import { ADMIN_PASSWORD } from "@/lib/constants";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("salary-app-auth", "1");
      setError(null);
      onSuccess();
      return;
    }
    setError("Неверный пароль. Попробуйте ещё раз.");
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-900/40">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Учёт зарплат
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Зарплатная ведомость сотрудников с синхронизацией в Google Таблицы
          </p>
        </div>

        <form
          onSubmit={submit}
          className={`rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8 ${
            shake ? "animate-[shake_0.4s_ease-in-out]" : ""
          }`}
        >
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Lock className="h-4 w-4 text-indigo-400" />
              Пароль администратора
            </span>
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                value={password}
                autoFocus
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Введите пароль"
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 pr-12 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-400 hover:to-violet-500"
          >
            Войти в систему
          </button>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-900/60 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Все данные (магазины, сотрудники, зарплаты) доступны только после ввода пароля.
              Сессия сохраняется до закрытия вкладки браузера.
            </span>
          </div>
        </form>
      </div>

      <style>{`@keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
      }`}</style>
    </div>
  );
}
