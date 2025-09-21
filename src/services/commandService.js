import pty from 'node-pty';
import os from 'os';

export function runCommand(command) {
  return new Promise((resolve) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const term = pty.spawn(shell, ['-c', command], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });

    let output = '';
    let resolved = false;

    // Capture all output from the pseudo-terminal
    term.on('data', (data) => {
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
    term.on('exit', (code) => {
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
