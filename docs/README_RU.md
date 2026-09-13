# Polyglot Keeper

🇺🇸 [English](../README.md) | 🇷🇺 [Русский](README_RU.md)

[![npm version](https://img.shields.io/npm/v/polyglot-keeper.svg?style=flat-square)](https://www.npmjs.com/package/polyglot-keeper)
[![npm downloads](https://img.shields.io/npm/dm/polyglot-keeper.svg?style=flat-square)](https://www.npmjs.com/package/polyglot-keeper)
[![License: MIT](https://img.shields.io/npm/l/polyglot-keeper.svg?style=flat-square)](https://github.com/davidaganov/polyglot-keeper/blob/main/LICENSE)

**Polyglot Keeper** — инструмент i18n на базе ИИ с двумя взаимодополняющими режимами:

- **CLI / Build-time** — автоматическая синхронизация JSON-локалей и Markdown-контента на все языки.
- **Runtime API** — перевод любой строки, массива или структуры данных прямо внутри приложения (Vue, React, Svelte, Astro, нативный JS, Node.js, Edge Workers).

Работает с любым фреймворком и любой i18n-библиотекой. Никакой привязки к вендору.

|               До                |               После               |
| :-----------------------------: | :-------------------------------: |
| ![До](./screenshots/before.png) | ![После](./screenshots/after.png) |

---

## ✨ Возможности

- **Перевод с помощью ИИ** — Gemini, OpenAI или Anthropic. Ваш выбор.
- **Runtime API** — перевод строк, массивов и вложенных объектов в рантайме в любой среде.
- **Proxy Mode** — API-ключ остаётся на сервере. Браузерный клиент переводит через ваш эндпоинт без лишних сложностей.
- **LRU-кэш** — повторные переводы мгновенны и бесплатны (без дополнительных API-вызовов).
- **Отслеживание изменений** — обнаруживает изменения исходных значений и выборочно перепереводит (`off` / `on` / `carefully`).
- **Зеркалирование структуры** — целевые файлы локалей всегда соответствуют структуре и порядку ключей источника.
- **Очистка** — автоматически удаляет устаревшие ключи, которых больше нет в основной локали.
- **Поддержка Markdown** — переводит целые `.md`-файлы, сохраняя форматирование.
- **Интерактивная настройка** — пошаговый мастер CLI. Готово к работе менее чем за минуту.
- **AI Agent Skill** — готовый навык для ИИ-ассистентов (Antigravity IDE, Cursor, Claude Code) для быстрой генерации и безопасной интеграции кода переводов.

---

## 🚀 Быстрый старт — CLI

### 1. Установка

```bash
npm install -D polyglot-keeper
```

### 2. Инициализация

```bash
npx polyglot-keeper init
```

Команда создаёт `polyglot.config.json` и файл `.env`.

### 3. Добавьте API-ключ

```bash
# .env
POLYGLOT_API_KEY=ваш_api_ключ
```

### 4. Синхронизация

```bash
npx polyglot-keeper sync        # JSON-локали
npx polyglot-keeper sync --md   # Markdown-файлы
```

---

## ⚡ Runtime API

Используйте `polyglot-keeper/runtime` для перевода контента внутри приложения в рантайме — без шага сборки.

### Установка

Runtime включён в пакет. Дополнительная установка не требуется.

### Инициализация

Вызовите `polyglot.init()` один раз в точке входа приложения.

```ts
import { polyglot, API_PROVIDER } from "polyglot-keeper/runtime"

// Серверная сторона / SSR (Direct Mode) — ключ безопасен здесь
polyglot.init({
  provider: API_PROVIDER.GEMINI,
  apiKey: process.env.GEMINI_API_KEY,
  defaultLocale: "en"
})

// Браузер / SPA (Proxy Mode) — ключ не попадает в бандл
polyglot.init({
  provider: API_PROVIDER.GEMINI,
  endpoint: "/api/translate" // ваш серверный эндпоинт
})
```

### Перевод строки

```ts
const text = await polyglot.t("Hello, world!", { to: "ru" })
// → "Привет, мир!"
```

### Перевод массива

```ts
const tags = await polyglot.translate(["Technology", "Design", "Business"], { to: "de" })
// → ["Technologie", "Design", "Business"]
```

### Перевод вложенного объекта (тип TypeScript сохраняется)

```ts
const product = await polyglot.translate(
  {
    name: "Wireless Headphones",
    description: "Premium sound quality.",
    specs: { battery: "30 hours", weight: "250g" }
  },
  { to: "ru" }
)

// → { name: "Беспроводные наушники", description: "...", specs: { battery: "30 часов", weight: "250 г" } }
```

### Перевод целого файла локали

```ts
import locale from "./i18n/en.json"

const ruLocale = await polyglot.translate(locale, { to: "ru" })
```

### Кэш

Переводы кэшируются в памяти (LRU, по умолчанию 200 записей). Повторный вызов для тех же данных мгновенен.

```ts
// Принудительный свежий перевод, минуя кэш
await polyglot.t("Hello", { to: "ru", bypassCache: true })

// Очистить весь кэш
polyglot.clearCache()
```

---

## 🔐 Proxy Mode (Браузер / SPA)

В браузерных приложениях API-ключ никогда не должен попадать в клиентский бандл. Proxy Mode решает эту задачу: клиент обращается к вашему серверному эндпоинту, который хранит ключ и проксирует запрос к AI-провайдеру.

### Серверный эндпоинт

Создайте маршрут с помощью `createTranslateHandler`. Он возвращает стандартный обработчик [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) `Request → Response`, совместимый с Astro, SvelteKit, Nuxt, Next.js App Router, Hono, Cloudflare Workers и Express.

```ts
// src/pages/api/translate.ts — Astro API Route
import { createTranslateHandler, API_PROVIDER } from "polyglot-keeper/runtime"

export const POST = createTranslateHandler({
  keys: { [API_PROVIDER.GEMINI]: import.meta.env.GEMINI_API_KEY },
  allowedLocales: ["ru", "de", "zh", "fr"] // опциональный белый список
})
```

```ts
// server/api/translate.post.ts — Nuxt server route
import { createTranslateHandler, API_PROVIDER } from "polyglot-keeper/runtime"

const handler = createTranslateHandler({
  keys: { [API_PROVIDER.GEMINI]: process.env.GEMINI_API_KEY! }
})

export default defineEventHandler((event) => handler(toWebRequest(event)))
```

### Инициализация клиента

```ts
// main.ts
import { polyglot, API_PROVIDER } from "polyglot-keeper/runtime"

polyglot.init({
  provider: API_PROVIDER.GEMINI,
  endpoint: "/api/translate" // без apiKey!
})
```

### Пример Vue-компонента

```vue
<script setup lang="ts">
import { ref, watchEffect } from "vue"
import { polyglot } from "polyglot-keeper/runtime"

const props = defineProps<{ text: string; locale: string }>()

const translated = ref(props.text)
const loading = ref(false)

const handleTranslate = async () => {
  loading.value = true
  try {
    translated.value = await polyglot.t(props.text, { to: props.locale })
  } finally {
    loading.value = false
  }
}

watchEffect(handleTranslate)
</script>

<template>
  <span :class="{ 'opacity-50': loading }">{{ translated }}</span>
</template>
```

---

## ⚙️ Конфигурация (CLI)

Настройки хранятся в `polyglot.config.json`.

<details>
<summary><b>Полный пример конфигурации</b></summary>

```json
{
  "envFile": ".env",
  "json": {
    "provider": "gemini",
    "model": "gemini-flash-latest",
    "envVarName": "POLYGLOT_API_KEY",
    "localeFormat": "short",
    "locales": ["EN", "RU"],
    "defaultLocale": "EN",
    "localesDir": "src/i18n",
    "trackChanges": "carefully",
    "batchSize": 200,
    "batchDelay": 2000,
    "retryDelay": 35000,
    "maxRetries": 3
  },
  "markdown": {
    "provider": "gemini",
    "model": "gemini-flash-latest",
    "envVarName": "POLYGLOT_MD_API_KEY",
    "contentDir": "content",
    "defaultLocale": "en",
    "locales": ["en", "ru"],
    "trackChanges": "carefully",
    "batchDelay": 2000,
    "retryDelay": 35000,
    "maxRetries": 3,
    "exclude": ["drafts/**", "private/**", "README.md"]
  }
}
```

</details>

### Форматы локалей

| Значение | Примеры имён файлов        |
| -------- | -------------------------- |
| `short`  | `en.json`, `ru.json`       |
| `pair`   | `en-EN.json`, `ru-RU.json` |

### Режимы отслеживания изменений

| Значение      | Поведение                                                                           |
| ------------- | ----------------------------------------------------------------------------------- |
| `"off"`       | По умолчанию. Переводить только недостающие ключи.                                  |
| `"on"`        | Автоматически перепереводить ключи, значение которых изменилось в источнике.        |
| `"carefully"` | Интерактивный пересмотр каждого ключа: перевести заново, пропустить или заморозить. |

> **Примечание:** при включённом отслеживании создаётся `.polyglot-lock.json`. Замороженный ключ навсегда исключается из перепереводов (удобно для ручных правок). Используйте `sync --force` для разморозки всех ключей.

### Исключения для Markdown

```json
{
  "markdown": {
    "exclude": ["drafts/**", "private/**", "README.md", "**/*.draft.md"]
  }
}
```

---

## 💻 Команды CLI

| Команда                            | Описание                                              |
| :--------------------------------- | :---------------------------------------------------- |
| `npx polyglot-keeper init`         | Запустить интерактивный мастер настройки              |
| `npx polyglot-keeper sync`         | Синхронизировать и перевести JSON-локали              |
| `npx polyglot-keeper sync --md`    | Синхронизировать и перевести Markdown-файлы           |
| `npx polyglot-keeper sync --force` | Принудительно перевести все существующие ключи заново |

---

## 📦 Справочник импортов

| Путь импорта              | Содержимое                                                                             | Среда                                    |
| ------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| `polyglot-keeper`         | `run()`, `API_PROVIDER`, `TRACK_CHANGES`, `LOCALE_FORMAT`, типы конфигурации           | Только Node.js                           |
| `polyglot-keeper/runtime` | `polyglot`, `PolyglotRuntime`, `createTranslateHandler`, `API_PROVIDER`, типы рантайма | Универсальная (браузер + Node.js + Edge) |

---

## 🤖 AI Agent Skill

В состав `polyglot-keeper` входит готовый **AI Skill** для ИИ-ассистентов (Google Antigravity IDE, Cursor, Claude Code, GitHub Copilot и др.), расположенный в `skills/polyglot-keeper/`.

Этот навык обучает вашего ИИ-помощника всем лучшим практикам интеграции библиотеки:

- Грамотный выбор между **Direct Mode** (бэкенд/SSR) и **Proxy Mode** (браузер/клиент).
- Полная защита от утечки API-ключа в клиентский бандл (Vue, React, SPA).
- Быстрая настройка прокси-хэндлера (`createTranslateHandler`) для Nuxt, Astro, Next.js и Express.
- Типобезопасный перевод сложных вложенных объектов и списков через `polyglot.translate()`.
- Паттерны кэширования, управления жизненным циклом и синхронизации локалей через CLI.

---

## 🛠 Требования

- Node.js 20+
- API-ключ для [Google Gemini](https://aistudio.google.com/), [OpenAI](https://platform.openai.com/) или [Anthropic](https://www.anthropic.com/)

---

## 🤝 Участие в разработке

```bash
git clone https://github.com/davidaganov/polyglot-keeper.git
cd polyglot-keeper
npm install

npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 📄 Лицензия

MIT © [David Aganov](https://aganov.dev)
