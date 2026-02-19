# Development Guide

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| OS | Windows 10 (64-bit) | **Windows only** — the app is not supported on macOS or Linux |
| Node.js | 20 LTS | Use [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage versions |
| npm | 10+ | Bundled with Node.js 20 |
| Git | 2.40+ | [git-scm.com/download/win](https://git-scm.com/download/win) |
| Visual Studio Build Tools | 2022 | Required by `better-sqlite3` native bindings; install the "Desktop development with C++" workload |

> **Note:** Python 3 is also required by `node-gyp` (included in Visual Studio Build Tools installer). Run `npm config set python python3` after installation.

---

## 2. Initial Setup

```powershell
# 1. Clone the repository
git clone https://github.com/albertmmateo-blip/App-Entretelas.git
cd App-Entretelas

# 2. Install dependencies (native modules will be compiled for Electron)
npm install

# 3. Verify the dev build starts correctly
npm run dev
```

If `better-sqlite3` fails to build, ensure the Visual Studio Build Tools are installed and run:

```powershell
npm run rebuild-natives
# Internally: npx electron-rebuild -f -w better-sqlite3
```

---

## 3. Available Scripts

| Script | Command | Description |
|---|---|---|
| Dev | `npm run dev` | Starts Vite dev server + Electron with hot reload |
| Build | `npm run build` | Compiles renderer (Vite) + packages Electron app via electron-builder |
| Dist | `npm run dist` | Produces a Windows installer (NSIS) in `dist/` |
| Test | `npm test` | Runs Vitest (unit + component tests) |
| Lint | `npm run lint` | ESLint + Prettier check |
| Lint fix | `npm run lint:fix` | ESLint auto-fix + Prettier format |
| Rebuild natives | `npm run rebuild-natives` | Recompiles native Node modules for the current Electron version |

---

## 4. Project Structure Quick Reference

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full folder tree. Key entry points:

| File | Role |
|---|---|
| `src/main/index.js` | Electron main process entry |
| `src/preload/index.js` | contextBridge definitions |
| `src/renderer/main.jsx` | React DOM entry |
| `src/renderer/App.jsx` | Router + sidebar layout |
| `src/main/db/connection.js` | SQLite connection + migration runner |

---

## 5. Environment Variables

Create a `.env` file at the project root (not committed — add to `.gitignore`):

```env
# Optional: override the userData path during development
ENTRETELAS_DATA_DIR=C:\Users\<YourUser>\AppData\Local\App-Entretelas-dev
```

In production the app uses `app.getPath('userData')` automatically.

---

## 6. Database

- Location (production): `%APPDATA%\App-Entretelas\entretelas.db`
- Location (dev, if `ENTRETELAS_DATA_DIR` is set): the path defined above.
- To reset the database during development, stop the app and delete the `.db` file; migrations will recreate it on next start.
- PDF storage root: `%APPDATA%\App-Entretelas\facturas\`

---

## 7. Building a Distributable

```powershell
npm run dist
```

This invokes `electron-builder` which:
1. Runs `npm run build` (Vite production build).
2. Packages the app into `dist/win-unpacked/`.
3. Creates an NSIS installer at `dist/App-Entretelas Setup x.y.z.exe`.

`electron-builder` configuration lives in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.entretelas.app",
    "productName": "App-Entretelas",
    "win": {
      "target": "nsis",
      "icon": "src/renderer/assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 8. Testing

Tests live in `tests/`:

```
tests/
├── unit/           # Pure function tests (db helpers, path sanitisers, etc.)
└── component/      # React Testing Library tests for UI components
```

Run all tests:

```powershell
npm test
```

Run tests in watch mode:

```powershell
npm run test:watch
```

Generate a coverage report:

```powershell
npm run test:coverage
```

---

## 9. Linting & Formatting

The project uses **ESLint** (airbnb config) and **Prettier**. Both run as a pre-commit hook via `lint-staged`.

To check manually:

```powershell
npm run lint
```

To auto-fix:

```powershell
npm run lint:fix
```

---

## 10. Branching & PR Rules

1. Work on a feature branch: `git checkout -b feature/<short-description>`.
2. Keep PRs focused on a single feature or fix.
3. Every PR **must** pass `npm run lint` and `npm test` in CI before merging.
4. After merging, follow the documentation update rules in [PROMPTS.md](../PROMPTS.md).

---

## 11. Troubleshooting

| Problem | Solution |
|---|---|
| `better-sqlite3` fails to install | Run `npm run rebuild-natives`; ensure Visual Studio Build Tools 2022 are installed |
| Blank white window on dev start | Wait for the Vite server to fully start; Electron retries automatically |
| PDFs not loading | Check that `ENTRETELAS_DATA_DIR` points to an existing directory |
| Gmail webview blocked | Ensure the Content Security Policy in `index.html` allows `https://mail.google.com` |
