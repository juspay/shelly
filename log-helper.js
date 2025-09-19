#!/usr/bin/env node
import { NeuroLink } from '@juspay/neurolink';
import fs from 'fs';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';
const historyFilePath = './.log_helper_history';
async function main() {
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
    if (code !== 0) {
      const history = getCommandHistory();
      const errorOutput = stderr || stdout;
      const analysis = await analyzeError(errorOutput, history);
      console.log('\n--- Neurolink Analysis ---');
      console.log(analysis);
      console.log('--------------------------\n');
      if (errorOutput.toLowerCase().includes('command not found') || analysis.toLowerCase().includes("command not found")) {
          await suggestCorrections(lastCommand);
      }
    } else {
      console.log(`The last command "${lastCommand}" ran successfully. Nothing to analyze.`);
      console.log(stdout);
      await promptForManualError();
    }
    return;
  }
  const command = userArgs.join(' ');
  appendCommandToHistory(command);
  const { stdout, stderr, code } = await runCommand(command);
  if (code !== 0) {
    console.error(stderr);
    const history = getCommandHistory();
    const analysis = await analyzeError(stderr, history);
    console.log('\n--- Neurolink Analysis ---');
    console.log(analysis);
    console.log('--------------------------\n');
    if (stderr.toLowerCase().includes('command not found') || stderr.toLowerCase().includes('unknown command') || analysis.toLowerCase().includes("command not found")) {
      await suggestCorrections(command);
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
      if (code !== 0 && !stderr) {
        resolve({ stdout: '', stderr: stdout, code });
      } else {
        resolve({ stdout, stderr, code });
      }
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
function getCodeSnippet(filePath, lineNumber, context = 5) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8').split('\n');
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(fileContent.length, lineNumber + context);
    const snippet = fileContent.slice(start, end).map((line, index) => {
      const currentLine = start + index + 1;
      const isErrorLine = currentLine === lineNumber;
      return `${isErrorLine ? '>' : ' '} ${currentLine.toString().padStart(4)}: ${line}`;
    }).join('\n');
    return `\n--- Code from ${filePath}:${lineNumber} ---\n${snippet}\n--------------------------------------\n`;
  } catch (e) {
    return null; // Could not read or parse the file
  }
}
function extractCodeFromStacktrace(error) {
  const stacktraceRegex = /(?:at\s|file:\/\/)?([\/].*?):(\d+):(\d+)/g;
  let match;
  while ((match = stacktraceRegex.exec(error)) !== null) {
    const [_, filePath, lineNumberStr] = match;
    const lineNumber = parseInt(lineNumberStr, 10);
    // Ignore files from node_modules
    if (filePath.includes('node_modules')) {
      continue;
    }
    const snippet = getCodeSnippet(filePath, lineNumber);
    if (snippet) {
      return snippet; // Return the first valid snippet found
    }
  }
  return null;
}
function getAvailableCommands() {
  const paths = process.env.PATH.split(path.delimiter);
  const commands = new Set();
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
        } catch (e) {
          // ignore stat errors
        }
      }
    } catch (e) {
      // ignore readdir errors
    }
  }
  return Array.from(commands);
}
async function analyzeError(error, history) {
  const neurolink = new NeuroLink();
  const codeSnippet = extractCodeFromStacktrace(error);
  const prompt = `
    The following error occurred:
    \`\`\`
    ${error}
    \`\`\`
    ${codeSnippet ? `The error appears to be in the following code snippet:\n${codeSnippet}` : ''}
    Here is the command history:
    \`\`\`
    ${history.join('\n')}
    \`\`\`
    Please analyze the error and provide a solution. If the error is in the code, suggest a fix.
  `;
  try {
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: "googlevertex",
      model: "gemini-2.5-flash",
    });
    return result.content;
  } catch (e) {
    return 'Could not analyze the error with Neurolink.';
  }
}
async function suggestCorrections(command) {
  const availableCommands = getAvailableCommands();
  const neurolink = new NeuroLink();
  const prompt = `
    The command "${command}" was not found.
    From the following list of available commands, please suggest up to 5 most likely commands the user intended to run.
    Provide the suggestions as a comma-separated list (e.g., git,node,npm). If you can't find good matches, return an empty string.
    Available commands:
    ${availableCommands.join(', ')}
  `;
  try {
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: "googlevertex",
      model: "gemini-2.5-flash",
    });
    const suggestions = result.content.trim().split(',').filter(s => s.length > 0);
    if (suggestions.length > 0) {
      console.log('\nDid you mean one of these?');
      suggestions.forEach(s => console.log(`- ${s}`));
    } else {
      console.log('\nCould not find any similar commands.');
    }
  } catch (e) {
    console.log('\nCould not suggest a correction.');
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
async function getLastCommandFromShellHistory() {
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
main();