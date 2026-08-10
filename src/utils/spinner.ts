import pc from 'picocolors';

export interface Spinner {
  start(): Spinner;
  succeed(message?: string): Spinner;
  fail(message?: string): Spinner;
}

/**
 * Zero-dependency lightweight terminal spinner.
 */
export function createSpinner(text: string, prefixText: string = ''): Spinner {
  const frames =
    process.platform === 'win32' && !process.env.WT_SESSION
      ? ['-', '\\', '|', '/']
      : ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  let index = 0;
  let timer: NodeJS.Timeout | null = null;
  const prefix = prefixText ? prefixText : '';

  return {
    start() {
      if (process.stdout.isTTY) {
        timer = setInterval(() => {
          process.stdout.write(`\r${prefix}${pc.cyan(frames[index])} ${text}`);
          index = (index + 1) % frames.length;
        }, 80);
      } else {
        console.log(`${prefix}${text}`);
      }
      return this;
    },
    succeed(message?: string) {
      if (timer) clearInterval(timer);
      const msg = message || text;
      if (process.stdout.isTTY) {
        process.stdout.write(`\r\x1b[K${prefix}${pc.green('✔')} ${msg}\n`);
      } else {
        console.log(`${prefix}✔ ${msg}`);
      }
      return this;
    },
    fail(message?: string) {
      if (timer) clearInterval(timer);
      const msg = message || text;
      if (process.stdout.isTTY) {
        process.stdout.write(`\r\x1b[K${prefix}${pc.red('✖')} ${msg}\n`);
      } else {
        console.log(`${prefix}✖ ${msg}`);
      }
      return this;
    },
  };
}
