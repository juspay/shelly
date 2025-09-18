#!/usr/bin/env node

import { NeuroLink } from '@juspay/neurolink';
import fs from 'fs';
import { spawn } from 'child_process';
import inquirer from 'inquirer';

const historyFilePath = './.log_helper_history';

async function main() {
  const userArgs = process.argv.slice(2);

  if (userArgs.length === 0) {
    console.log('Usage: log-helper <command>');
    return;
  }

  const command = userArgs.join(' ');
  appendCommandToHistory(command);

  const { stdout, stderr, code } = await runCommand(command);

  if (code !== 0) {
    console.error(stderr);
    const history = getCommandHistory();
    if (stderr.toLowerCase().includes('command not found') || stderr.toLowerCase().includes('unknown command')) {
      await suggestAndRunCorrection(command, stderr, history);
    } else {
      const analysis = await analyzeError(stderr, history);
      console.log('\n--- Neurolink Analysis ---');
      console.log(analysis);
      console.log('--------------------------\n');
    }
  } else {
    console.log(stdout);
    await promptForManualError();
  }
}

function runCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

function appendCommandToHistory(command) {
  fs.appendFileSync(historyFilePath, command + '\n');
}

function getCommandHistory() {
  if (fs.existsSync(historyFilePath)) {
    return fs.readFileSync(historyFilePath, 'utf-8').split('\n').filter(Boolean);
  }
  return [];
}

async function analyzeError(error, history) {
  const neurolink = new NeuroLink();
  const prompt = `
    The following error occurred:
    \`\`\`
    ${error}
    \`\`\`

    Here is the command history:
    \`\`\`
    ${history.join('\n')}
    \`\`\`

    Please analyze the error and provide a solution.
  `;

  try {
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: 'google-ai', // Or any other provider
    });
    return result.content;
  } catch (e) {
    return 'Could not analyze the error with Neurolink.';
  }
}

async function suggestAndRunCorrection(command, error, history) {
  const neurolink = new NeuroLink();
  const prompt = `
    The command "${command}" failed with the error "${error}".
    The error indicates that the command was not found.
    Please provide a corrected version of the command.
    Only provide the corrected command, nothing else.
  `;

  try {
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: 'google-ai',
    });
    const correctedCommand = result.content.trim();
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Did you mean: ${correctedCommand}?`,
        default: true
      }
    ]);

    if (confirm) {
      const { stdout, stderr, code } = await runCommand(correctedCommand);
      if (code !== 0) {
        console.error(stderr);
      } else {
        console.log(stdout);
      }
    }
  } catch (e) {
    console.log('Could not suggest a correction.');
  }
}

async function promptForManualError() {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'The command executed successfully. Do you still want to analyze an error?',
            default: false
        }
    ]);

    if (confirm) {
        const { error } = await inquirer.prompt([
            {
                type: 'input',
                name: 'error',
                message: 'Please paste the error message:'
            }
        ]);
        const history = getCommandHistory();
        const analysis = await analyzeError(error, history);
        console.log('\n--- Neurolink Analysis ---');
        console.log(analysis);
        console.log('--------------------------\n');
    }
}

main();
main();
