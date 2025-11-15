import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLastCommandFromShell } from './shellService.js';

export interface HistoryEntry {
  command: string;
  exitCode: number;
  timestamp: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyFilePath = path.join(__dirname, '..', '.log_helper_history');

export function appendCommandToHistory(
  command: string,
  exitCode: number
): void {
  const history = getCommandHistory();
  history.push({ command, exitCode, timestamp: new Date().toISOString() });
  fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
}

export function getCommandHistory(): HistoryEntry[] {
  if (fs.existsSync(historyFilePath)) {
    try {
      const data = fs.readFileSync(historyFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (_e) {
      return [];
    }
  }
  return [];
}

export async function getLastCommandFromShellHistory(): Promise<string | null> {
  // Check if debug mode is enabled
  const debug = process.env.LOG_HELPER_DEBUG === 'true';

  try {
    const lastCommand = await getLastCommandFromShell(debug);

    if (debug) {
      console.log(`Retrieved last command: ${lastCommand}`);
    }

    return lastCommand;
  } catch (error) {
    if (debug) {
      console.error('Error getting last command from shell history:', error);
    }
    return null;
  }
}
