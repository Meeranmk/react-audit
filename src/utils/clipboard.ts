import { execFile } from 'child_process';

/**
 * Zero-dependency native clipboard writer.
 * Uses system utilities: pbcopy (macOS), clip (Windows), xclip/wl-copy (Linux).
 */
export async function writeToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    let cmd = '';
    let args: string[] = [];

    if (process.platform === 'darwin') {
      cmd = 'pbcopy';
    } else if (process.platform === 'win32') {
      cmd = 'clip';
    } else {
      cmd = 'xclip';
      args = ['-selection', 'clipboard'];
    }

    try {
      const proc = execFile(cmd, args, (err) => {
        if (err) resolve(false);
        else resolve(true);
      });

      if (proc.stdin) {
        proc.stdin.write(text);
        proc.stdin.end();
      } else {
        resolve(false);
      }
    } catch {
      resolve(false);
    }
  });
}
