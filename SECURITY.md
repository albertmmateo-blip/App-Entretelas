# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Known Vulnerabilities

### Production Dependencies

As of 2026-02-19, running `npm audit --production` reports:

#### Electron ASAR Integrity Bypass (Moderate Severity)

- **Package:** electron@30.5.1
- **Vulnerability:** ASAR Integrity Bypass via resource modification
- **Advisory:** [GHSA-vmqv-hx8q-j7mg](https://github.com/advisories/GHSA-vmqv-hx8q-j7mg)
- **Risk Assessment:** **ACCEPTED**
- **Justification:**
  - This vulnerability requires an attacker to have local file system access to modify application resources
  - Electron 30.x is the target version for this project to maintain compatibility with better-sqlite3 and other native modules
  - The vulnerability is fixed in Electron 35.7.5+, but upgrading would require significant testing and may introduce breaking changes
  - The application is designed for internal business use on trusted Windows 10+ machines
  - Standard Windows file permissions and user account controls provide adequate protection against unauthorized resource modification
  - Future updates will evaluate upgrading to Electron 35+ after thorough compatibility testing

**Active Mitigations in Place:**
- Application installed in protected directories (Program Files) with restricted write permissions
- Deployment uses code signing to ensure authenticity and detect tampering
- Windows UAC prevents unauthorized modification without administrator privileges
- Regular file integrity monitoring can be implemented via scheduled tasks
- See [VULNERABILITY_TROUBLESHOOTING.md](./VULNERABILITY_TROUBLESHOOTING.md) for detailed detection and mitigation guidance

### Development Dependencies

Development dependencies are not included in production builds and therefore pose no risk to end users. As of 2026-02-19, running `npm audit` (including dev dependencies) reports 36 vulnerabilities:

#### ajv <8.18.0 (Moderate Severity)

- **Vulnerability:** ReDoS when using `$data` option
- **Advisory:** [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
- **Affected Tools:** ESLint (via @eslint/eslintrc), electron-builder toolchain
- **Risk Assessment:** **ACCEPTED**
- **Justification:**
  - Only affects development tooling (ESLint, electron-builder)
  - Does not ship with the final application
  - Upgrading would require `npm audit fix --force` with breaking changes to ESLint 10.x
  - ESLint 8.x is still supported and adequate for project needs

#### esbuild <=0.24.2 (Moderate Severity)

- **Vulnerability:** Dev server can accept requests from any website
- **Advisory:** [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- **Affected Tools:** Vite (development server)
- **Risk Assessment:** **ACCEPTED**
- **Justification:**
  - Only affects the Vite development server during local development
  - Does not affect production builds
  - Developers should only run dev server on trusted networks
  - Upgrading would require `npm audit fix --force` with breaking changes to Vite 7.x
  - Vite 5.x is stable and meets project requirements

#### minimatch <10.2.1 (High Severity)

- **Vulnerability:** ReDoS via repeated wildcards with non-matching literal
- **Advisory:** [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26)
- **Affected Tools:** Multiple build tools (glob, ESLint plugins, electron-builder chain)
- **Risk Assessment:** **ACCEPTED**
- **Justification:**
  - Only affects development and build-time tooling
  - Does not ship with the final application
  - Used for file pattern matching during builds, not user input
  - Upgrading would require `npm audit fix --force` with multiple breaking changes
  - Current toolchain is stable and functional

#### Summary of Development Risk Posture

All development dependency vulnerabilities are accepted because:

1. **No Runtime Exposure:** None of these packages are included in the final Electron application distributed to users
2. **Build-Time Only:** Vulnerabilities only affect the development and build process, not the running application
3. **Controlled Environment:** Development occurs on trusted developer machines with controlled inputs
4. **Breaking Changes:** Fixing these would require major version upgrades (ESLint 10.x, Vite 7.x) that introduce breaking changes
5. **Cost-Benefit Analysis:** The risk of breaking the development toolchain outweighs the minimal security benefit given these are dev-only dependencies

Regular updates to development dependencies will be performed during routine maintenance cycles when major version upgrades are planned and can be properly tested.

## Security Best Practices

This application follows these security guidelines:

1. **Context Isolation:** All BrowserWindow instances use `contextIsolation: true` and `nodeIntegration: false`
2. **IPC Security:** All IPC handlers validate input payloads before processing
3. **SQL Injection Prevention:** All database queries use parameterized statements
4. **Content Security Policy:** Strict CSP is enforced in the renderer process
5. **File Upload Validation:** PDF uploads are validated for file type, size, and sanitized paths
6. **Webview Sandboxing:** Gmail webview uses partition isolation and navigation restrictions

## Reporting a Vulnerability

If you discover a security vulnerability in App-Entretelas, please report it by:

1. Creating a private security advisory on GitHub: https://github.com/albertmmateo-blip/App-Entretelas/security/advisories
2. Or emailing the maintainers with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work with you to address the issue promptly.

## Security Updates

Run `npm run audit:security` regularly (recommended monthly) to check for new vulnerabilities in production dependencies.

### Troubleshooting npm audit Warnings

When you run `npm audit --omit=dev` or `npm run audit:security`, you will see:

```
electron  <35.7.5
Severity: moderate
Electron has ASAR Integrity Bypass via resource modification
fix available via `npm audit fix --force`
Will install electron@40.6.0, which is a breaking change
```

**This is expected and documented.** Do NOT run `npm audit fix --force` as it will:
- Upgrade Electron to 40.x, breaking compatibility with better-sqlite3
- Require extensive testing and potentially rewriting native module bindings
- Introduce breaking changes in Electron APIs

For detailed troubleshooting guidance, see [VULNERABILITY_TROUBLESHOOTING.md](./VULNERABILITY_TROUBLESHOOTING.md).

### For Critical Security Updates

For critical security updates:

1. Update the affected package(s)
2. Run `npm run rebuild-natives` if native modules are affected
3. Test thoroughly before deploying
4. Update this document with any accepted risks
