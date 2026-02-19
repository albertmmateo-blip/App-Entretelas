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

### Development Dependencies

Development dependencies are not included in production builds and therefore pose no risk to end users. Regular updates to development dependencies will be performed during routine maintenance cycles.

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

For critical security updates:

1. Update the affected package(s)
2. Run `npm run rebuild-natives` if native modules are affected
3. Test thoroughly before deploying
4. Update this document with any accepted risks
