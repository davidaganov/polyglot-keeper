# Polyglot Keeper

🇺🇸 [English](README.md) | 🇷🇺 [Русский](docs/README_RU.md)

[![npm version](https://img.shields.io/npm/v/polyglot-keeper.svg?style=flat-square)](https://www.npmjs.com/package/polyglot-keeper)
[![npm downloads](https://img.shields.io/npm/dm/polyglot-keeper.svg?style=flat-square)](https://www.npmjs.com/package/polyglot-keeper)
[![License: MIT](https://img.shields.io/npm/l/polyglot-keeper.svg?style=flat-square)](https://github.com/davidaganov/polyglot-keeper/blob/main/LICENSE)

An AI-powered i18n synchronization tool that automatically translates missing keys and maintains perfect structural consistency across all your locale and markdown files.

Works seamlessly with any framework (React, Vue, Svelte, Angular) and any i18n library.

|                 Before                 |                After                 |
| :------------------------------------: | :----------------------------------: |
| ![Before](docs/screenshots/before.png) | ![After](docs/screenshots/after.png) |

## ✨ Features

- **AI Translation** — Translates missing keys using Gemini, OpenAI, or Anthropic.
- **Change Tracking** — Detects when source values change and updates translations (`off` / `on` / `carefully`).
- **Structure Mirroring** — Keeps target files perfectly aligned with the source key structure and order.
- **Clean Up** — Automatically removes obsolete keys that no longer exist in the primary locale.
- **Reliable Processing** — Built-in batch processing with configurable retry and backoff settings.
- **Interactive Setup** — Guided CLI wizard to get you started in seconds.

---

## 🚀 Quick Start

**1. Install the package**

```bash
npm install -D polyglot-keeper
```

**2. Initialize your project**

```bash
npx polyglot-keeper init
```

This creates `polyglot.config.json` and a `.env` file.

**3. Add your API key**

Open the newly created `.env` file and add your provider's API key (Gemini, OpenAI, or Anthropic).

```
POLYGLOT_API_KEY=your_api_key_here
```

**4. Run the sync**

```bash
# Sync JSON locales
npx polyglot-keeper sync

# Or sync Markdown files
npx polyglot-keeper sync --md
```

---

## ⚙️ Configuration

Your setup is managed via `polyglot.config.json`.

<details>
<summary><b>Click to view full configuration example</b></summary>

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
    "batchSize": 200,
    "batchDelay": 2000,
    "retryDelay": 35000,
    "maxRetries": 3
  }
}
```

</details>

### Locale Formats

- `short`: Simple locale codes (e.g., `en.json`, `ru.json`)
- `pair`: BCP 47 format (e.g., `en-US.json`, `ru-RU.json`)

### Change Tracking Modes

By default, the tool only translates missing keys. You can enable `trackChanges` in your config to handle source file modifications:

- `"off"` — Default. Only translate new keys, ignore changes to existing values.
- `"on"` — Automatically retranslate all target keys when the source key changes.
- `"carefully"` — Interactive review. The CLI will prompt you for each changed key to either retranslate, skip, or freeze it.

> **Note:** Enabling tracking creates a `.polyglot-lock.json` file. Freezing a key locks it from future retranslations (useful for manual overrides). Use `sync --force` to clear frozen keys.

---

## 💻 CLI Commands

| Command                            | Description                              |
| :--------------------------------- | :--------------------------------------- |
| `npx polyglot-keeper init`         | Start the interactive setup wizard       |
| `npx polyglot-keeper sync`         | Sync and translate JSON locale files     |
| `npx polyglot-keeper sync --md`    | Sync and translate Markdown files        |
| `npx polyglot-keeper sync --force` | Force retranslation of all existing keys |

---

## 🛠 Requirements

- Node.js 20+
- A valid API key for Google Gemini, OpenAI, or Anthropic

---

## 🤝 Contributing

1. Clone the repo and run `npm install`
2. Run quality checks before submitting a PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 📄 License

MIT © David Aganov
