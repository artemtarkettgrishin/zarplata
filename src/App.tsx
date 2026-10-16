import { useCallback, useEffect, useState } from "react";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import Login from "@/components/Login";
import Dashboard from "@/pages/Dashboard";
import StoresPage from "@/pages/StoresPage";
import EmployeesPage from "@/pages/EmployeesPage";
import SalariesPage from "@/pages/SalariesPage";
import ComparePage from "@/pages/ComparePage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import GuidePage from "@/pages/GuidePage";
import { SESSION_KEY } from "@/lib/constants";
import { useAppData } from "@/store/useAppData";
import type { PageKey } from "@/types";

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: "Дашборд",
  stores: "Магазины",
  employees: "Сотрудники",
  salaries: "Зарплаты",
  compare: "Сравнение периодов",
  reports: "Отчёты",
  settings: "Настройки",
  guide: "Инструкция",
};

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [page, setPage] = useState<PageKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const store = useAppData();

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }, []);

  const handlePull = useCallback(() => void store.pull(), [store]);
  const handlePush = useCallback(() => void store.push(), [store]);

  /* Блокируем потерю несохранённых изменений при закрытии вкладки */
  useEffect(() => {
    if (!authed) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (store.sync.status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [authed, store.sync.status]);

  useEffect(() => {
    if (!authed) return;
    document.title = `${PAGE_TITLES[page]} · Учёт зарплат`;
  }, [authed, page]);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar
        page={page}
        onNavigate={setPage}
        sync={store.sync}
        autoSync={store.settings.autoSync && Boolean(store.settings.gasUrl)}
        onPull={handlePull}
        onPush={handlePush}
        onLogout={logout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
        <MobileHeader onOpen={() => setMobileOpen(true)} title={PAGE_TITLES[page]} />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {page === "dashboard" ? (
            <Dashboard data={store.data} onNavigate={setPage} onLoadDemo={store.loadDemo} />
          ) : null}
          {page === "stores" ? (
            <StoresPage
              data={store.data}
              addStore={store.addStore}
              renameStore={store.renameStore}
              deleteStore={store.deleteStore}
              onGoEmployees={() => setPage("employees")}
            />
          ) : null}
          {page === "employees" ? (
            <EmployeesPage
              data={store.data}
              addEmployee={store.addEmployee}
              updateEmployee={store.updateEmployee}
              deleteEmployee={store.deleteEmployee}
              onGoStores={() => setPage("stores")}
            />
          ) : null}
          {page === "salaries" ? (
            <SalariesPage
              data={store.data}
              setSalary={store.setSalary}
              applyPaste={store.applyPaste}
            />
          ) : null}
          {page === "compare" ? <ComparePage data={store.data} /> : null}
          {page === "reports" ? <ReportsPage data={store.data} /> : null}
          {page === "settings" ? (
            <SettingsPage
              data={store.data}
              settings={store.settings}
              sync={store.sync}
              updateSettings={store.updateSettings}
              onPull={handlePull}
              onPush={handlePush}
              replaceData={store.replaceData}
              clearAll={store.clearAll}
              loadDemo={store.loadDemo}
            />
          ) : null}
          {page === "guide" ? <GuidePage /> : null}

          <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
            Учёт зарплат · React + Vite + Tailwind CSS · синхронизация через Google Apps Script
          </footer>
        </main>
      </div>
    </div>
  );
}
