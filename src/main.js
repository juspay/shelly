#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { runCommand } from './services/commandService.js';
import { appendCommandToHistory, getCommandHistory, getLastCommandFromShellHistory } from './services/historyService.js';
import { loadRules } from './services/ruleService.js';
import { analyzeError, suggestCorrections } from './services/analysisService.js';
import { promptForManualError } from './services/uiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rules = await loadRules();
  const userArgs = process.argv.slice(2);
  if (userArgs.length === 0) {
    const lastCommand = await getLastCommandFromShellHistory();
    if (!lastCommand) {
      console.log('Could not determine the last command from history.');
      console.log('Usage: log-helper <command>');
      return;
    }
    console.log(`Analyzing previous command: "${lastCommand}"`);
    const { stdout, stderr, code } = await runCommand(lastCommand);
    for (const rule of rules) {
      if (rule.match({ script: lastCommand }, stdout, stderr, code)) {
        const newCommand = rule.get_new_command({ script: lastCommand });
        console.log(`\nMaybe you meant: ${newCommand}`);
        return;
      }
    }
    const history = getCommandHistory();
    const output = stderr || stdout;
    const analysis = await analyzeError(output, history, code);
    console.log('\n--- Neurolink Analysis ---');
    console.log(analysis);
    console.log('--------------------------\n');
    if (output.toLowerCase().includes('command not found') || analysis.toLowerCase().includes("command not found")) {
        await suggestCorrections(lastCommand);
    }
    if (code === 0) {
      console.log(`The last command "${lastCommand}" ran successfully.`);
      console.log(stdout);
      await promptForManualError();
    }
    return;
  }
  const command = userArgs.join(' ');
  const { stdout, stderr, code } = await runCommand(command);
  appendCommandToHistory(command, code);
  for (const rule of rules) {
    if (rule.match({ script: command }, stdout, stderr, code)) {
      const newCommand = rule.get_new_command({ script: command });
      console.log(`\nMaybe you meant: ${newCommand}`);
      return;
    }
  }
  const output = stderr || stdout;
  if (output) {
    console.log(output);
  }
  const history = getCommandHistory();
  const analysis = await analyzeError(output, history, code);
  console.log('\n--- Neurolink Analysis ---');
  console.log(analysis);
  console.log('--------------------------\n');
  if (output.toLowerCase().includes('command not found') || (analysis && analysis.toLowerCase().includes("command not found"))) {
    await suggestCorrections(command);
  }
  if (code === 0) {
    await promptForManualError();
  }
}
main();
