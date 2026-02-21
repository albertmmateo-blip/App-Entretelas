const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const lockfilePath = path.join(projectRoot, 'package-lock.json');
const allowedRegistryHost = 'registry.npmjs.org';

function fail(message, details = []) {
  console.error('\n[SECURITY] Official source policy check failed.');
  console.error(message);
  if (details.length > 0) {
    details.forEach((item) => console.error(` - ${item}`));
  }
  console.error('\nOnly official npmjs registry sources are allowed in this repository.');
  process.exit(1);
}

function safeReadJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found: ${path.basename(filePath)}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${path.basename(filePath)}: ${error.message}`);
  }

  return null;
}

function hasDisallowedSpec(spec) {
  const lowered = String(spec || '')
    .trim()
    .toLowerCase();
  const disallowedPrefixes = ['git+', 'github:', 'http:', 'https:', 'file:', 'link:', 'workspace:'];
  return disallowedPrefixes.some((prefix) => lowered.startsWith(prefix));
}

function checkManifestSpecs(packageJson) {
  const badSpecs = [];
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

  sections.forEach((section) => {
    const deps = packageJson[section] || {};
    Object.entries(deps).forEach(([name, spec]) => {
      if (hasDisallowedSpec(spec)) {
        badSpecs.push(`${section}.${name} -> ${spec}`);
      }
    });
  });

  if (badSpecs.length > 0) {
    fail('Disallowed dependency specifiers found in package.json.', badSpecs);
  }
}

function isAllowedRegistryUrl(urlValue) {
  try {
    const parsed = new URL(urlValue);
    return parsed.hostname === allowedRegistryHost;
  } catch {
    return false;
  }
}

function checkLockfileSources(lockfile) {
  const packages = lockfile.packages || {};
  const violations = [];

  Object.entries(packages).forEach(([pkgPath, pkgMeta]) => {
    if (!pkgPath || !pkgPath.startsWith('node_modules/')) {
      return;
    }

    if (pkgMeta.resolved && !isAllowedRegistryUrl(pkgMeta.resolved)) {
      violations.push(`${pkgPath} resolved from non-official source: ${pkgMeta.resolved}`);
    }

    if (pkgMeta.resolved && !pkgMeta.integrity) {
      violations.push(`${pkgPath} is missing integrity metadata in package-lock.json`);
    }
  });

  if (violations.length > 0) {
    fail('Disallowed lockfile sources detected.', violations.slice(0, 25));
  }
}

const packageJson = safeReadJson(packageJsonPath, 'Manifest');
const lockfile = safeReadJson(lockfilePath, 'Lockfile');

checkManifestSpecs(packageJson);
checkLockfileSources(lockfile);

console.log('[SECURITY] Official source policy check passed.');
