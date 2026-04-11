# TorCalculator Architecture

## Overview

TorCalculator is a local desktop app with a Python host and a Next.js UI:

- `app.py` - desktop host (pywebview), local API, SQLite persistence, export/backup
- `ui/` - Next.js interface (tabs, components, styles)
- `scripts/build-exe.ps1` - reproducible Windows `.exe` build with Nuitka

## Runtime flow

1. `app.py` starts.
2. Desktop API (`DesktopApi`) initializes SQLite and exposes methods to UI.
3. UI is served either:
   - from production bundle (`ui/.next/BUILD_ID` exists), or
   - from dev server fallback (`npm run dev`).
4. pywebview opens UI and bridges JS <-> Python calls.

## Data model

- `transactions`:
  - income/expense records used by calculator
- `inventory_items`:
  - item registry with optional link to purchase transaction (`purchase_tx_id`)

If an item is created in "без калькулятора" mode, `purchase_tx_id = 0`.

## Frontend modules

- `ui/components/tor-calculator/tabs/calculator-tab.tsx`
  - calculator history and manual transaction input
- `ui/components/tor-calculator/tabs/items-tab.tsx`
  - inventory CRUD, image paste, sell flow, list/cards mode
- `ui/components/tor-calculator/tabs/settings-tab.tsx`
  - export, backup, cleanup

Shared event bus:
- `ui/lib/tor-events.ts` for transaction refresh notifications between tabs.

## Release build

Use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-exe.ps1
```

Options:

- `-OneFile` - build one-file executable (longer startup, simpler distribution).

Build output is placed in `release/`.
