import pty, { IPty } from 'node-pty';
import os from 'os';

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
  timedOut?: boolean;
}

export function runCommand(command: string): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve) => {
    const isWin = os.platform() === 'win32';
    const shell = isWin
      ? process.env.PWSH_PATH || 'pwsh.exe' // fallback to modern PowerShell if available
      : process.env.SHELL || 'bash';
    const args = isWin
      ? ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command]
      : ['-lc', command];
    // strip undefineds so pty gets Record<string,string>
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined)
    ) as Record<string, string>;
    const term: IPty = pty.spawn(shell, args, {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env,
    });

    let output = '';
    let resolved = false;

    // Capture all output from the pseudo-terminal
    term.onData((data: string) => {
      output += data;
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        term.kill('SIGTERM');
        // When timing out, we assume the output contains the error
        resolve({ stdout: '', stderr: output, code: 1, timedOut: true });
      }
    }, 15000); // 15-second timeout

    // Handle process exit
    term.onExit(({ exitCode: code }) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        if (code === 0) {
          resolve({ stdout: output, stderr: '', code: 0 });
        } else {
          resolve({ stdout: '', stderr: output, code });
        }
      }
    });
  });
}
