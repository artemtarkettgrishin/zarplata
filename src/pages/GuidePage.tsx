import { useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  ClipboardPaste,
  GitCompare,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  Lightbulb,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { Badge, Card, CardTitle } from "@/components/ui";
import { GAS_SCRIPT } from "@/lib/gasScript";
import { cn } from "@/utils/cn";

const WORKFLOW_YML = `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4`;

function CopyButton({ text, label = "Копировать" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
        copied
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-800 text-slate-200 hover:bg-slate-700",
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Скопировано" : label}
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-900 p-3">
      <pre className="min-w-0 flex-1 overflow-x-auto text-[11px] leading-relaxed text-slate-200">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

function Step({
  n,
  title,
  children,
  hint,
}: {
  n: number;
  title: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="relative pl-12">
      <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
        {n}
      </span>
      <div className="border-l border-dashed border-slate-200 pb-8 pl-2 sm:pl-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
        {hint ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs leading-relaxed text-indigo-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{hint}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <span className="text-sm font-medium text-slate-800">{q}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm leading-relaxed text-slate-600">
          {a}
        </div>
      ) : null}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <BookOpen className="h-6 w-6 text-violet-600" /> Инструкция
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Пошаговая настройка синхронизации с Google Таблицами и публикация приложения — всё для
          новичка
        </p>
      </div>

      <Card>
        <CardTitle
          icon={<Lightbulb className="h-5 w-5" />}
          title="Как это работает"
          subtitle="30 секунд теории перед настройкой"
        />
        <ul className="grid gap-3 text-sm leading-relaxed text-slate-600 sm:grid-cols-3">
          <li className="rounded-xl bg-slate-50 p-4">
            <Badge tone="indigo">1. Хранилище</Badge>
            <p className="mt-2">
              Все данные всегда лежат в <b>localStorage</b> браузера — приложение работает даже без
              интернета.
            </p>
          </li>
          <li className="rounded-xl bg-slate-50 p-4">
            <Badge tone="cyan">2. Облако</Badge>
            <p className="mt-2">
              Google Таблица выступает сервером: <b>Apps Script</b> читает и пишет три листа —
              Stores, Employees, Salaries.
            </p>
          </li>
          <li className="rounded-xl bg-slate-50 p-4">
            <Badge tone="green">3. Синхронизация</Badge>
            <p className="mt-2">
              Автозагрузка при старте + автосохранение через 1,5 с после любого изменения. Плюс
              кнопки «Загрузить / Сохранить».
            </p>
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle
          icon={<Terminal className="h-5 w-5" />}
          title="Шаг 1–6: подключение Google Таблиц"
          subtitle="Займёт примерно 5 минут"
        />
        <div className="mt-2">
          <Step
            n={1}
            title="Создайте новую Google Таблицу"
            hint="Название можно любое, например «Зарплаты 2026». Листы создавать вручную не нужно — скрипт сделает это сам."
          >
            <p>
              Откройте{" "}
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 hover:underline"
              >
                sheets.new <ExternalLink className="inline h-3.5 w-3.5" />
              </a>{" "}
              и войдите в свой Google-аккаунт.
            </p>
          </Step>

          <Step
            n={2}
            title="Откройте редактор Apps Script"
            hint="Если пункта «Apps Script» не видно — установите расширение из Google Workspace Marketplace."
          >
            <p>
              В меню таблицы выберите <b>Расширения → Apps Script</b>. Откроется редактор кода с
              файлом <code className="rounded bg-slate-100 px-1">Code.gs</code>.
            </p>
          </Step>

          <Step
            n={3}
            title="Вставьте код сервера"
            hint="Функцию setup() запускать не обязательно — листы создадутся при первом запросе."
          >
            <p>
              Удалите содержимое <code className="rounded bg-slate-100 px-1">Code.gs</code> и
              вставьте код ниже (кнопка копирования в разделе «Настройки» дублирует его):
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-slate-900 p-3">
              <pre className="max-h-56 min-w-0 flex-1 overflow-auto text-[11px] leading-relaxed text-slate-200">
                <code>{GAS_SCRIPT}</code>
              </pre>
              <CopyButton text={GAS_SCRIPT} />
            </div>
            <p>Нажмите значок 💾 (Сохранить) в панели редактора.</p>
          </Step>

          <Step
            n={4}
            title="Разверните веб-приложение"
            hint="Обязательно выбирайте «Выполнить как: я» и «Доступ: все». Иначе приложение не сможет обращаться к скрипту."
          >
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>
                Нажмите <b>Развернуть → Новое развертывание</b>.
              </li>
              <li>
                Справа от «Выберите тип» нажмите шестерёнку и выберите <b>Веб-приложение</b>.
              </li>
              <li>
                Описание: любое, например <code className="rounded bg-slate-100 px-1">salary-api</code>.
              </li>
              <li>
                <b>Выполнить как:</b> пользователь, от имени которого создан скрипт (то есть вы).
              </li>
              <li>
                <b>Доступ:</b> <span className="font-semibold text-rose-600">Все</span>.
              </li>
              <li>
                Нажмите <b>Развернуть</b> и подтвердите разрешение доступа (Google покажет
                предупреждение — нажмите «Дополнительно → Перейти»).
              </li>
            </ol>
          </Step>

          <Step
            n={5}
            title="Скопируйте URL веб-приложения"
            hint="Ссылка должна заканчиваться на /exec. Если заканчивается на /dev — это черновик, он не подойдёт."
          >
            <p>
              После развертывания появится окно с адресом вида:
            </p>
            <Code>{"https://script.google.com/macros/s/AKfycb.../exec"}</Code>
            <p>
              Скопируйте его и вставьте в разделе <b>Настройки</b> → «URL веб-приложения», затем
              нажмите «Сохранить URL».
            </p>
          </Step>

          <Step
            n={6}
            title="Проверьте связь"
            hint="При ошибке смотрите раздел «Частые проблемы» ниже — там разобраны все типовые случаи."
          >
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>Включите переключатель «Автосинхронизация».</li>
              <li>Нажмите «Загрузить из Google» — должны подтянуться пустые данные (0 записей).</li>
              <li>Добавьте магазин и сотрудника, заполните зарплату.</li>
              <li>Через пару секунд откройте таблицу — в ней появятся три заполненных листа.</li>
            </ol>
          </Step>
        </div>
      </Card>

      <Card>
        <CardTitle
          icon={<ClipboardPaste className="h-5 w-5" />}
          title="Как массово перенести готовую таблицу (Ctrl+V)"
          subtitle="Скопировали из Excel — вставили — все сотрудники и зарплаты на месте"
        />
        <div className="mt-2">
          <Step
            n={1}
            title="Скопируйте диапазон в Excel или Google Таблицах"
            hint="Не обязательно выделять заголовки — приложение само определит, где месяцы, а где фамилии."
          >
            <p>
              Выделите мышью нужный диапазон (сотрудники в строках, месяцы в столбцах) и нажмите{" "}
              <b>Ctrl+C</b> (или ⌘C на Mac).
            </p>
            <Code>{"Сотрудник\tМагазин\tЯнварь\tФевраль\tМарт\nАймашева А.А.\tЦентральный\t52000\t52000\t53500"}</Code>
          </Step>

          <Step
            n={2}
            title="Вставьте на странице «Зарплаты»"
            hint="Ctrl+V работает в любом месте страницы «Зарплаты» — окно импорта откроется само."
          >
            <p>
              Откройте раздел <b>Зарплаты</b> и нажмите <b>Ctrl+V</b> (или кнопку «Вставить
              таблицу»). Перед импортом появится предпросмотр: список сотрудников, определённые
              магазины и суммы по месяцам.
            </p>
          </Step>

          <Step
            n={3}
            title="Проверьте и подтвердите"
            hint="Сотрудники сопоставляются по фамилии — повторная вставка не создаёт дубликатов."
          >
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <b>Магазин по умолчанию</b> — присваивается тем, у кого магазин в таблице не указан.
              </li>
              <li>
                <b>Создавать магазины</b> — незнакомые названия из таблицы появятся в справочнике.
              </li>
              <li>
                <b>Перезаписывать суммы</b> — если выключить, существующие значения не изменятся.
              </li>
              <li>
                <b>Обновлять магазин</b> — переносит существующего сотрудника в магазин из таблицы
                (так «Аймашева» останется именно в том магазине, который указан в строке).
              </li>
            </ul>
          </Step>

          <Step n={4} title="Что ещё умеет распознаватель">
            <ul className="ml-4 list-disc space-y-1.5">
              <li>Месяцы в заголовках: «Январь», «янв», «1», «01.2024», «2024-01», «01.01.2024».</li>
              <li>Суммы: «52 000», «52000,50», «52,000», «(1200)» — как минус, «—» — как пусто.</li>
              <li>Разделители: табуляция, «;», «|», «,».</li>
              <li>Транспонированные таблицы (месяцы в строках) разворачиваются автоматически.</li>
              <li>Столбцы «Итого», «Всего» и строки «Итого» пропускаются.</li>
              <li>Если заголовков нет — месяцы считаются по порядку с выбранного месяца.</li>
            </ul>
          </Step>
        </div>
      </Card>

      <Card>
        <CardTitle
          icon={<GitCompare className="h-5 w-5" />}
          title="Как сравнивать периоды"
          subtitle="Месяц к месяцу, квартал к кварталу, год к году"
        />
        <ul className="ml-4 list-disc space-y-1.5 text-sm leading-relaxed text-slate-600">
          <li>
            Откройте раздел <b>Сравнение</b> и выберите тип: «Месяц к месяцу», «Квартал к кварталу»
            или «Год к году».
          </li>
          <li>
            Задайте период A (например, 2 квартал 2024) и период B (2 квартал 2025) — изменение в
            рублях и процентах посчитается сразу.
          </li>
          <li>Кнопка «A = B − 1 период» мгновенно берёт предыдущий год/квартал/месяц.</li>
          <li>Стрелки «Период назад / вперёд» сдвигают оба периода одновременно.</li>
          <li>Ниже — разбивка по месяцам, по сотрудникам и по магазинам с разницами.</li>
          <li>Фильтры по магазину и сотруднику позволяют сравнить, например, только один филиал.</li>
        </ul>
      </Card>

      <Card>
        <CardTitle
          icon={<Terminal className="h-5 w-5" />}
          title="Публикация на GitHub Pages"
          subtitle="Через GitHub Actions — автоматически при каждом push в main"
        />
        <div className="mt-2">
          <Step n={1} title="Создайте репозиторий и загрузите проект">
            <Code>{`git init
git add .
git commit -m "feat: приложение учёта зарплат"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/salary-app.git
git push -u origin main`}</Code>
          </Step>
          <Step
            n={2}
            title="Добавьте workflow"
            hint="Папка .github/workflows должна лежать в корне репозитория. Название файла — любое, например deploy.yml."
          >
            <p>
              Создайте файл <code className="rounded bg-slate-100 px-1">.github/workflows/deploy.yml</code>{" "}
              с содержимым:
            </p>
            <Code>{WORKFLOW_YML}</Code>
            <p>Команда сборки — <code className="rounded bg-slate-100 px-1">npm run build</code>, результат — папка <code className="rounded bg-slate-100 px-1">dist</code>.</p>
          </Step>
          <Step n={3} title="Включите Pages и проверьте">
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>
                В репозитории: <b>Settings → Pages → Source: GitHub Actions</b>.
              </li>
              <li>
                Откройте вкладку <b>Actions</b> и дождитесь зелёной галочки на workflow «Deploy to
                GitHub Pages».
              </li>
              <li>
                Сайт доступен по адресу{" "}
                <code className="rounded bg-slate-100 px-1">
                  https://ВАШ_ЛОГИН.github.io/salary-app/
                </code>
                .
              </li>
            </ol>
          </Step>
        </div>
      </Card>

      <Card>
        <CardTitle
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Частые проблемы"
          subtitle="Нажмите на вопрос, чтобы раскрыть ответ"
        />
        <div className="space-y-2">
          <Faq
            q="Пишет «Сервер вернул HTML вместо JSON»"
            a={
              <>
                В развертывании установлен доступ не для всех, либо скопирована неправильная ссылка.
                Откройте <b>Развернуть → Управление развертываниями</b>, выберите развертывание,
                нажмите «Изменить» (карандаш) и поставьте <b>Доступ: Все</b>. Затем скопируйте
                ссылку ещё раз — она должна заканчиваться на <code>/exec</code>.
              </>
            }
          />
          <Faq
            q="Ошибка 403 / «Нет доступа к проекту»"
            a={
              <>
                Такое бывает, если выбрано «Выполнить как: пользователь, обращающийся к
                приложению». Пересоздайте развертывание с параметром <b>«Выполнить как: я»</b>.
              </>
            }
          />
          <Faq
            q="Данные сохранились, но в таблице их не видно"
            a={
              <>
                Обновите страницу таблицы (F5). Листы создаются автоматически при первой записи:
                <b> Stores</b>, <b>Employees</b>, <b>Salaries</b>. Проверьте, что вы смотрите в ту
                таблицу, к которой привязан скрипт (Расширения → Apps Script).
              </>
            }
          />
          <Faq
            q="Изменил код скрипта, но ничего не поменялось"
            a={
              <>
                Apps Script кеширует развертывание. После правок кода нужно выбрать{" "}
                <b>Развернуть → Управление развертываниями → Изменить → Версия: Новая версия →
                Развернуть</b>. Ссылка при этом останется прежней.
              </>
            }
          />
          <Faq
            q="При загрузке всё исчезло и стало пустым"
            a={
              <>
                Кнопка «Загрузить» полностью заменяет локальные данные тем, что лежит в таблице.
                Если таблица пустая — данные обнулятся. Чтобы вернуть, воспользуйтесь экспортом JSON
                заранее или отключите автосинхронизацию перед экспериментами.
              </>
            }
          />
          <Faq
            q="Квоты и лимиты Google"
            a={
              <>
                У Apps Script есть дневные лимиты на URL Fetch и триггеры, но для обычного учёта
                зарплат их более чем достаточно: приложение отправляет один POST-запрос не чаще, чем
                раз в 1,5 секунды после изменений.
              </>
            }
          />
          <Faq
            q="Как сбросить пароль администратора?"
            a={
              <>
                Пароль задаётся константой <code>ADMIN_PASSWORD</code> в файле{" "}
                <code>src/lib/constants.ts</code> и пересобирается проект командой{" "}
                <code>npm run build</code>. Сессия хранится в <code>sessionStorage</code> и
                сбрасывается при закрытии вкладки.
              </>
            }
          />
          <Faq
            q="Работает ли приложение на телефоне?"
            a={
              <>
                Да, интерфейс адаптивный. Единственное ограничение — таблица зарплат прокручивается
                по горизонтали, это нормально на узких экранах.
              </>
            }
          />
        </div>
      </Card>
    </div>
  );
}
