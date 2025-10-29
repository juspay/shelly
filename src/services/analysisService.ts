import { NeuroLink } from '@juspay/neurolink';
import { getAvailableCommands } from '../utils/commandFinder.js';
import { extractCodeFromStacktrace } from './fileService.js';
import type { HistoryEntry } from './historyService.js';

export async function analyzeError(
  output: string,
  history: HistoryEntry[],
  exitCode: number
): Promise<string> {
  const neurolink = new NeuroLink();
  const codeSnippet = extractCodeFromStacktrace(output);

  const MAX_OUTPUT_LENGTH = 8000; // Max length for the output
  if (output.length > MAX_OUTPUT_LENGTH) {
    const halfLength = Math.floor(MAX_OUTPUT_LENGTH / 2);
    output = `${output.substring(0, halfLength)}... (truncated) ...${output.substring(output.length - halfLength)}`;
  }

  const prompt =
    exitCode === 0
      ? `The following command executed successfully with exit code 0. Please analyze the output and provide any relevant insights or suggestions for improvement.
    Output:
    \`\`\`
    ${output}
    \`\`\`
    Here is the command history:
    \`\`\`
    ${history.map((h: HistoryEntry) => `[${h.timestamp}] ${h.command} (exit code: ${h.exitCode})`).join('\n')}
    \`\`\`
    `
      : `The following error occurred with exit code ${exitCode}:
    \`\`\`
    ${output}
    \`\`\`
    ${codeSnippet ? `The error appears to be in the following code snippet:\n${codeSnippet}` : ''}
    Here is the command history:
    \`\`\`
    ${history.map((h: HistoryEntry) => `[${h.timestamp}] ${h.command} (exit code: ${h.exitCode})`).join('\n')}
    \`\`\`
    Please analyze the error and provide a solution. If the error is in the code, suggest a fix.
  `;
  try {
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: 'googlevertex',
      model: 'gemini-2.5-flash',
    });
    return result.content;
  } catch (e) {
    return 'Could not analyze the error with Neurolink.';
  }
}

export async function suggestCorrections(command: string): Promise<void> {
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
      provider: 'googlevertex',
      model: 'gemini-2.5-flash',
    });
    const suggestions = result.content
      .trim()
      .split(',')
      .filter((s) => s.length > 0);
    if (suggestions.length > 0) {
      console.log('\nDid you mean one of these?');
      suggestions.forEach((s) => console.log(`- ${s}`));
    } else {
      console.log('\nCould not find any similar commands.');
    }
  } catch (e) {
    console.log('\nCould not suggest a correction.');
  }
}
