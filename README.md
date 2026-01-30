# tor-calculator
tor-calculator - это мощный перекуп калькулятор сделанный на python

## Запуск UI (Next.js)

- Требования: Node.js **>= 18** (рекомендуется 20 LTS), пакетный менеджер **pnpm** (или npm).

```bash
cd ui
pnpm install
pnpm dev
```

Если `pnpm` не установлен, можно через `npm`:

```bash
cd ui
npm install
npm run dev
```

## Запуск desktop (pywebview)

```bash
pip install -r requirements.txt
python app.py --dev
```
