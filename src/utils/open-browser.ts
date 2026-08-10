/**
 * Cross-platform helper to open a file or URL in the default browser.
 */

import { exec } from 'child_process';

/**
 * Open a file path or URL in the default system browser.
 * Fails silently if the browser cannot be opened.
 */
export function openInBrowser(target: string): void {
  const platform = process.platform;

  let command: string;

  if (platform === 'win32') {
    // Windows: use cmd.exe to ensure `start` works in both CMD and PowerShell
    command = `cmd.exe /c start "" "${target}"`;
  } else if (platform === 'darwin') {
    // macOS
    command = `open "${target}"`;
  } else {
    // Linux and other Unix-like systems
    command = `xdg-open "${target}"`;
  }

  exec(command, (error) => {
    // Fail silently — browser opening is best-effort
    if (error) {
      // Intentionally ignored
    }
  });
}
