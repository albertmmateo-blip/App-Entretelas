# App-Entretelas

Desktop business-manager application built with **Electron + React + SQLite**.

## Purpose

App-Entretelas is an internal tool for managing day-to-day business operations. It provides six core modules:

| Module | Description |
|---|---|
| **URGENTE!** | Aggregated view of all entries marked as urgent across Notas, Llamar and Encargar |
| **Notas** | Free-form note editor with optional contact/description fields |
| **Llamar** | Call/message reminders with contact and subject tracking |
| **Encargar** | Product reorder list with supplier references |
| **Facturas** | PDF invoice folders for purchases and sales (with thumbnail preview) |
| **E-mail** | Embedded Gmail access |

## Quick Start

```bash
# Install dependencies
npm install

# Start in development mode (hot reload)
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Build distributable
npm run build
```

## Documentation

| Document | Description |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Full feature requirements for every module |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technology choices, folder structure, IPC patterns |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Database schema and entity relationships |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md) | Layout, navigation, component specifications |
| [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) | Developer setup, build, test, and release workflow |
| [PROMPTS.md](PROMPTS.md) | Ordered AI agent prompts for incremental app construction |

## Contribution Rules

Every pull request that changes application behaviour **must**:

1. Update the relevant section(s) in `docs/`.
2. Mark the corresponding prompt in `PROMPTS.md` as completed and, if it spawns follow-on work, add new prompts.
3. Keep `docs/DATA_MODEL.md` in sync with any database schema changes.

See [PROMPTS.md](PROMPTS.md) for detailed agent instructions.