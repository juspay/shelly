import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyFilePath = path.join(__dirname, '..', '.log_helper_history');

export function appendCommandToHistory(command, exitCode) {
  const history = getCommandHistory();
  history.push({ command, exitCode, timestamp: new Date().toISOString() });
  fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
}

export function getCommandHistory() {
  if (fs.existsSync(historyFilePath)) {
    try {
      const data = fs.readFileSync(historyFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function getLastCommandFromShellHistory() {
  const homeDir = os.homedir();
  const zshHistoryPath = `${homeDir}/.zsh_history`;
  if (fs.existsSync(zshHistoryPath)) {
    try {
      const historyContent = fs.readFileSync(zshHistoryPath, 'utf-8');
      const lines = historyContent.split('\n').filter(Boolean);
      if (lines.length >= 2) {
        const previousLine = lines[lines.length - 2];
        const commandMatch = previousLine.match(/;(.*)/);
        if (commandMatch && commandMatch[1]) {
          return commandMatch[1];
        }
        return previousLine; // Fallback for plain history
      }
    } catch (error) {
      console.error('Error reading shell history:', error);
      return null;
    }
  }
  return null;
}
