# TorCalculator

**Версия:** `0.0.6`

Локальное desktop-приложение для учёта сделок, имущества и финансовой цели.
Сделано для ETTORE-комьюнити.

## Возможности

- **Сделки**: доходы, расходы, история операций, очистка с подтверждением.
- **Имущество**: добавление предметов с фото, ценой и количеством, продажа с указанием количества.
- **Звуки сделок**: выбранные сигналы добавления и удаления готовы сразу после запуска.
- **Быстрый вызов**: глобальная клавиша с настраиваемым числом нажатий показывает окно поверх других программ, а повторная комбинация сворачивает его.
- **Цель**: создание цели с названием, картинкой, суммой и сроком.
- **Прогресс цели**: круговой индикатор, последние пополнения и график за 30 дней.
- **Автозачисление в цель**: положительные сделки можно автоматически заносить в активную цель.
- **Настройки внешнего вида**: выбор акцентного цвета и фона.
- **Экспорт**: сделки в CSV, резервная копия в JSON.
- **Локальное хранение**: основные данные сохраняются на компьютере в SQLite.
- **Desktop UI**: кастомный title bar, горизонтальное меню, тёмный минималистичный интерфейс.
- **Горячие клавиши**: `F5` для перезагрузки, `F12` для devtools.

## Хранение Данных

В desktop-режиме данные хранятся локально:

- сделки и имущество: SQLite;
- цель, прогресс цели, палитра и фон: SQLite settings;
- web fallback: `localStorage`.

База создаётся автоматически в пользовательской папке приложения.

## Запуск

### Установка Python-зависимостей

```bash
pip install -r requirements.txt
pip install -r requirements-build.txt
```

### Установка UI-зависимостей

```bash
cd ui
pnpm install
```

Можно использовать `npm install`, если `pnpm` не установлен.

### Режим разработки

```bash
python app.py --dev
```

### Desktop-режим с готовой сборкой

```bash
python app.py
```

## Сборка UI

```bash
cd ui
pnpm build
```

или:

```bash
npm run build
```

## Сборка EXE

Иконка для exe берётся из `icon.png` в корне проекта.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-exe.ps1
```

Standalone-вариант:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-exe.ps1 -Standalone
```

Готовые артефакты:

- `release/TorCalculator.exe`
- `release/` для standalone-сборки
- `sounds/transaction-add/` — звуки добавления сделки
- `sounds/transaction-delete/` — звуки удаления сделки

## Структура

```text
tor-calculator/
├── app.py
├── ARCHITECTURE.md
├── scripts/
│   └── build-exe.ps1
├── ui/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
├── requirements.txt
├── requirements-build.txt
└── README.md
```

## Проверка

```bash
cd ui
npm exec tsc -- --noEmit
npm run build
```

`npm run lint` может не запускаться, если в окружении не установлен `eslint`.

## Автор

Triazov Кирилл
t.me/triazovkirill
