# App-Entretelas

Desktop business-manager application built with **Electron + React + SQLite**.

## Purpose

App-Entretelas is an internal tool for managing day-to-day business operations. It provides six core modules:

| Module       | Description                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **URGENTE!** | Aggregated view of all entries marked as urgent across Notas, Llamar and Encargar                |
| **Notas**    | Free-form note editor with optional contact/description fields                                   |
| **Llamar**   | Call/message reminders with contact and subject tracking                                         |
| **Encargar** | Product reorder list with supplier references                                                    |
| **Facturas** | Purchase/sales invoice folders with PDF upload, thumbnail preview, and payment metadata tracking |
| **E-mail**   | Embedded Gmail access                                                                            |

### Naming convention note

- In the UI, this module is shown as **Contabilidad**.
- In code and technical artifacts, keep the original **Facturas** namespace (`facturas`): identifiers, files/folders, IPC channels, DB tables, and storage paths.
- Do not rename technical paths from `facturas` to `contabilidad`.

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

### Release installer (quick)

- For a fast release checklist (including how to ensure users install the latest version), see [docs/DEVELOPMENT_GUIDE.md §7](docs/DEVELOPMENT_GUIDE.md#7-building-a-distributable).

### Testing note

- `npm run test:coverage` runs **Vitest** unit/component/integration suites and excludes `tests/e2e/**`.
- Run end-to-end tests separately with `npm run test:e2e` (Playwright).

## Documentation

| Document                                                             | Description                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)                         | Full feature requirements for every module                      |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                         | Technology choices, folder structure, IPC patterns              |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)                             | Database schema and entity relationships                        |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md)                               | Layout, navigation, component specifications                    |
| [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)               | Developer setup, build, test, and release workflow              |
| [SECURITY.md](SECURITY.md)                                           | Security policy, vulnerability assessments, and risk acceptance |
| [VULNERABILITY_TROUBLESHOOTING.md](VULNERABILITY_TROUBLESHOOTING.md) | Detailed npm audit troubleshooting and vulnerability guidance   |
| [PROMPTS.md](PROMPTS.md)                                             | Ordered AI agent prompts for incremental app construction       |

## Contribution Rules

Every pull request that changes application behaviour **must**:

1. Update the relevant section(s) in `docs/`.
2. Mark the corresponding prompt in `PROMPTS.md` as completed and, if it spawns follow-on work, add new prompts.
3. Keep `docs/DATA_MODEL.md` in sync with any database schema changes.
4. Keep the snapshot commit-safe: verify `npm run lint` and `npm test` pass after final edits so husky/lint-staged cannot block the commit.

See [PROMPTS.md](PROMPTS.md) for detailed agent instructions.
