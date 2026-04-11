# 🔥 TorCalculator

**Локальный калькулятор для учёта перепродаж**  
Специально создано для [Ettore](https://youtube.com/@ETTOREE) 👑

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📸 Скриншоты

Приложение имеет современный тёмный интерфейс с удобной навигацией:

- 🏠 **Главная** — обзор последних операций
- 🧮 **Калькулятор** — добавление доходов/расходов
- ⚙️ **Настройки** — экспорт данных, очистка

---

## 🚀 Возможности

- ✅ Добавление транзакций (доходы/расходы)
- 💾 Локальное хранение данных (SQLite)
- 📤 Экспорт в CSV и JSON
- 🎯 Удобный интерфейс
- 🔒 Работает полностью офлайн
- ⌨️ Горячие клавиши (F5 — перезагрузка, F12 — devtools)

---

## 📦 Установка

### Клонирование репозитория

```bash
git clone https://github.com/triazov/tor-calculator.git
cd tor-calculator
```

### Установка зависимостей Python

```bash
pip install -r requirements.txt
pip install -r requirements-build.txt
```

### Установка зависимостей Node.js

```bash
cd ui
pnpm install
```

---

## 🎮 Запуск

### Режим разработки

```bash
python app.py --dev
```

### Релиз (использует готовую сборку UI)

```bash
python app.py
```

---

## 🔨 Сборка UI

```bash
cd ui
pnpm install
pnpm build
```

---

## 🧱 Сборка `.exe` (Nuitka, Windows)

Иконка для exe берется из файла `icon.png` в корне проекта.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-exe.ps1
```

По умолчанию скрипт собирает **один файл exe**.

Вариант папкой (standalone):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-exe.ps1 -Standalone
```

Готовые артефакты:
- onefile: `release/TorCalculator.exe`
- standalone: папка `release/`

---

## 📁 Структура

```
tor-calculator/
├── app.py              # Главный файл приложения (pywebview)
├── scripts/            # Скрипты сборки и обслуживания
│   └── build-exe.ps1   # Сборка exe через Nuitka
├── ARCHITECTURE.md     # Краткое описание архитектуры
├── ui/                 # Next.js фронтенд
│   ├── app/           # Страницы приложения
│   ├── components/    # React компоненты
│   └── public/        # Статические файлы
├── .gitignore         # Игнорируемые файлы
├── README.md          # Этот файл
└── requirements.txt   # Python зависимости
```

---

## 🎯 Для пользователей

Программа создана для удобного учёта перепродаж. Всё хранится локально на вашем компьютере — никаких серверов и облаков.

### Как пользоваться:

1. Запустите `app.py`
2. Перейдите на вкладку **Калькулятор**
3. Введите сумму и комментарий
4. Нажмите **Добавить**

Все данные сохраняются автоматически в SQLite базе.

---

## 🤝 Вклад в проект

PR приветствуются! Если нашли баг или есть идея — открывайте issue.

---

## 📜 Лицензия

MIT License — свободное использование и модификация.

---

**Сделано с ❤️ для ETTORE и его комьюнити** 🎉

*Автор: Triazov Кирилл t.me/triazovkirill* 
