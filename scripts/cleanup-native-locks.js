const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const currentPid = process.pid;
const nativeBinaryPath = path.join(
  workspaceRoot,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function escapePowerShellString(value) {
  return String(value).replace(/'/g, "''");
}

function stopWindowsProjectProcesses() {
  const escapedRoot = escapePowerShellString(workspaceRoot);
  const command = `
$root = '${escapedRoot}'
$nodePid = ${currentPid}
$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $nodePid -and
  $_.Name -in @('node.exe','electron.exe') -and
  $_.CommandLine -and
  ($_.CommandLine -like "*$root*" -or $_.CommandLine -like '*electron-rebuild*' -or $_.CommandLine -like '*better-sqlite3*')
}
if ($targets) {
  $targets | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
  }
  $targets | Select-Object ProcessId, Name | Format-Table -HideTableHeaders | Out-String
} else {
  'NO_PROCESSES'
}
`.trim();

  try {
    const output = execFileSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();

    if (output && output !== 'NO_PROCESSES') {
      console.log(`[cleanup-native-locks] Stopped stale processes:\n${output}`);
    } else {
      console.log('[cleanup-native-locks] No stale node/electron processes found for workspace.');
    }
  } catch (error) {
    const stderr = error?.stderr?.toString?.() || error?.message || String(error);
    console.warn('[cleanup-native-locks] Process cleanup warning:', stderr.trim());
  }
}

function stopWindowsFallbackProcesses() {
  const command = `
$nodePid = ${currentPid}
$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $nodePid -and (
    $_.Name -eq 'electron.exe' -or
    ($_.Name -eq 'node.exe' -and $_.CommandLine -and ($_.CommandLine -like '*electron*' -or $_.CommandLine -like '*vite*'))
  )
}
if ($targets) {
  $targets | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
  }
  'FALLBACK_STOPPED'
} else {
  'NO_FALLBACK_PROCESSES'
}
`.trim();

  try {
    const output = execFileSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
    if (output === 'FALLBACK_STOPPED') {
      console.warn(
        '[cleanup-native-locks] Fallback cleanup stopped additional electron/node processes.'
      );
    }
  } catch {
    // fallback cleanup is best-effort
  }
}

function canRenameFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  const tempPath = `${filePath}.unlock-check`;
  try {
    fs.renameSync(filePath, tempPath);
    fs.renameSync(tempPath, filePath);
    return true;
  } catch {
    if (fs.existsSync(tempPath) && !fs.existsSync(filePath)) {
      try {
        fs.renameSync(tempPath, filePath);
      } catch {
        // ignore restoration failure; rebuild will fail and expose issue
      }
    }
    return false;
  }
}

async function waitForNativeUnlock(filePath, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (canRenameFile(filePath)) {
      return true;
    }
    await sleep(250);
  }
  return canRenameFile(filePath);
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[cleanup-native-locks] Non-Windows platform detected; skipping lock cleanup.');
    return;
  }

  stopWindowsProjectProcesses();

  let unlocked = await waitForNativeUnlock(nativeBinaryPath);
  if (!unlocked) {
    stopWindowsFallbackProcesses();
    await sleep(350);
    unlocked = await waitForNativeUnlock(nativeBinaryPath, 12000);
  }

  if (!unlocked) {
    console.warn(
      '[cleanup-native-locks] better_sqlite3.node is still locked after cleanup; rebuild may fail.'
    );
  } else {
    console.log('[cleanup-native-locks] Native module lock check passed.');
  }
}

main().catch((error) => {
  console.warn('[cleanup-native-locks] Unexpected warning:', error?.message || String(error));
});
