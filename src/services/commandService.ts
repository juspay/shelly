import pty from 'node-pty';
import os from 'os';

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
  timedOut?: boolean;
}

export function runCommand(command: string): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const term = pty.spawn(shell, ['-c', command], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env as any,
    }) as any;

    let output = '';
    let resolved = false;

    // Capture all output from the pseudo-terminal
    term.on('data', (data: string) => {
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
    term.on('exit', (code: number) => {
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
