import { spawn } from 'child_process';

export function runCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('close', (code) => {
      if (code !== 0 && !stderr) {
        resolve({ stdout: '', stderr: stdout, code });
      } else {
        resolve({ stdout, stderr, code });
      }
    });
  });
}
