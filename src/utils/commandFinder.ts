import fs from 'fs';
import path from 'path';

export function getAvailableCommands(): string[] {
  const paths = (process.env.PATH || '').split(path.delimiter);
  const commands = new Set<string>();
  for (const dir of paths) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && (stat.mode & 0o111) !== 0) {
            commands.add(file);
          }
        } catch (_e) {
          // ignore stat errors
        }
      }
    } catch (_e) {
      // ignore readdir errors
    }
  }
  return Array.from(commands);
}
