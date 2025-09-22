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
  const shell = process.env.SHELL || '';
  let historyPath;

  if (shell.includes('zsh')) {
    historyPath = `${homeDir}/.zsh_history`;
  } else if (shell.includes('bash')) {
    historyPath = `${homeDir}/.bash_history`;
  } else {
    // Fallback or default shell handling
    historyPath = `${homeDir}/.zsh_history`; // or some other default
  }

  if (fs.existsSync(historyPath)) {
    try {
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      const lines = historyContent.split('\n').filter(Boolean);
      
      if (lines.length > 0) {
        if (shell.includes('zsh')) {
          if (lines.length >= 2) {
            const zshPreviousLine = lines[lines.length - 2];
            const commandMatch = zshPreviousLine.match(/;(.*)/);
            if (commandMatch && commandMatch[1]) {
              return commandMatch[1].trim();
            }
            return zshPreviousLine.trim();
          }
        } else if (shell.includes('bash')) {
          // For bash, the last line is the most recent command from the history file,
          // as the current command ('log-helper') is not written to the history file
          // until the shell session exits.
          return lines[lines.length - 1].trim();
        }
        // Fallback for other shells or weird states
        return lines[lines.length - 1].trim();
      }
    } catch (error) {
      console.error('Error reading shell history:', error);
      return null;
    }
  }
  return null;
}
