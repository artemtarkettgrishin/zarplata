import { parseClipboard } from "@/lib/paste";

function show(title: string, text: string, opts: { defaultYear: number; defaultStartMonth: number; storeNames: string[] }) {
  const r = parseClipboard(text, opts);
  console.log("\n===", title, "===");
  console.log("months:", r.months.join(", "));
  console.log("header:", r.headerDetected, "| storeCol:", r.storeColumnDetected, "| transposed:", r.transposed);
  r.rows.forEach((row) => console.log(" -", row.name, "|", row.storeName ?? "—", "|", row.values.join(", ")));
  if (r.warnings.length) console.log("warnings:", r.warnings);
}

const stores = ["Центральный", "Северный"];

show("Табуляция + заголовок месяцами + столбец магазина", 
"Сотрудник\tМагазин\tЯнварь\tФевраль\tМарт\tИтого\nАймашева А.А.\tЦентральный\t52000\t52 000,00\t53500\t157500\nВолков Д.С.\tСеверный\t61000\t61500\t(62000)\t184500",
{ defaultYear: 2025, defaultStartMonth: 1, storeNames: stores });

show("Точка с запятой, заголовок 1..12, без магазина",
"ФИО;1;2;3;4\nАймашева А.А.;50000;50000;51000;52000\nКозлова М.И.;40000;41000;42000;43000",
{ defaultYear: 2024, defaultStartMonth: 1, storeNames: stores });

show("Без заголовка (только данные)",
"Аймашева А.А.\t44000\t45000\t46000\nВолков Д.С.\t55000\t56000\t57000",
{ defaultYear: 2026, defaultStartMonth: 3, storeNames: stores });

show("Транспонированная (месяцы в строках)",
"\tАймашева А.А.\tВолков Д.С.\nЯнварь 2025\t50000\t60000\nФевраль 2025\t51000\t61000\nМарт 2025\t52000\t62000",
{ defaultYear: 2025, defaultStartMonth: 1, storeNames: stores });

show("Заголовки с датами и итоговая строка",
"Сотрудник\t01.01.2025\t01.02.2025\tВсего\nАймашева А.А.\t50 000\t50 500\t100 500\nИтого\t50000\t50500\t100500",
{ defaultYear: 2025, defaultStartMonth: 1, storeNames: stores });

show("Магазин слева, сотрудник справа",
"Магазин\tСотрудник\tЯнв\tФев\nЦентральный\tАймашева А.А.\t30000\t31000\nСеверный\tВолков Д.С.\t40000\t41000",
{ defaultYear: 2025, defaultStartMonth: 1, storeNames: stores });
