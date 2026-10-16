/* Смоук-тест: рендерим приложение и все страницы в строку, чтобы поймать ошибки рантайма. */
import React from "react";
import { renderToString } from "react-dom/server";
import App from "@/App";
import Dashboard from "@/pages/Dashboard";
import StoresPage from "@/pages/StoresPage";
import EmployeesPage from "@/pages/EmployeesPage";
import SalariesPage from "@/pages/SalariesPage";
import ComparePage from "@/pages/ComparePage";
import ReportsPage from "@/pages/ReportsPage";
import GuidePage from "@/pages/GuidePage";
import { demoData } from "@/lib/storage";
import { parseClipboard } from "@/lib/paste";

const noop = () => {};

function render(name: string, node: React.ReactElement, min = 800) {
  const html = renderToString(node) as string;
  if (html.length < min) throw new Error(`${name}: подозрительно пустой вывод (${html.length})`);
  console.log(`OK: ${name} — ${html.length} символов`);
}

render("App", <App />);

const data = demoData();

render(
  "Dashboard",
  <Dashboard data={data} onNavigate={noop} onLoadDemo={noop} />,
);
render("Stores", <StoresPage data={data} addStore={noop} renameStore={noop} deleteStore={noop} onGoEmployees={noop} />);
render(
  "Employees",
  <EmployeesPage
    data={data}
    addEmployee={noop}
    updateEmployee={noop}
    deleteEmployee={noop}
    onGoStores={noop}
  />,
);
render("Salaries", <SalariesPage data={data} setSalary={noop} applyPaste={(() => ({})) as never} />);
render("Compare", <ComparePage data={data} />);
render("Reports", <ReportsPage data={data} />);
render("Guide", <GuidePage />);

/* Проверка парсера вставки */
const parsed = parseClipboard(
  "Сотрудник\tМагазин\tЯнварь\tФевраль\tМарт\nАймашева А.А.\tЦентральный\t52000\t52 000,00\t53500",
  { defaultYear: 2025, defaultStartMonth: 1, storeNames: ["Центральный"] },
);
if (parsed.months.join(",") !== "2025-01,2025-02,2025-03") throw new Error("paste: неверные месяцы");
if (parsed.rows[0]?.values.join(",") !== "52000,52000,53500") throw new Error("paste: неверные суммы");
if (parsed.rows[0]?.storeName !== "Центральный") throw new Error("paste: магазин не определён");
console.log("OK: парсер вставки —", parsed.rows.length, "сотрудник,", parsed.months.length, "месяца");

console.log("OK: демо-данные —", data.stores.length, "магазинов,", data.employees.length, "сотрудников");
