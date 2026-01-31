import { NeuroLink } from '@juspay/neurolink';
import { getAvailableCommands } from '../utils/commandFinder.js';
import { extractCodeFromStacktrace } from './fileService.js';
import type { HistoryEntry } from './historyService.js';
import { aiConfigService } from './aiConfigService.js';

export async function analyzeError(
  output: string,
  history: HistoryEntry[],
  exitCode: number
): Promise<string> {
  // Check if AI is enabled
  if (!aiConfigService.isAIEnabled()) {
    return getBasicErrorAnalysis(output, exitCode);
  }

  const neurolink = new NeuroLink();
  const codeSnippet = extractCodeFromStacktrace(output);
  const aiConfig = aiConfigService.getNeuroLinkOptions();

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
      provider: aiConfig.provider,
      model: aiConfig.model,
      ...(aiConfig.baseURL && { baseURL: aiConfig.baseURL }),
    });
    return result.content;
  } catch (e) {
    const details =
      e instanceof Error ? ` ${e.message}` : e ? ` ${String(e)}` : '';

    // If AI fails, provide basic analysis as fallback
    if (!aiConfigService.hasValidApiKey()) {
      return (
        getBasicErrorAnalysis(output, exitCode) +
        `\n\n(AI analysis unavailable - set up an API key for enhanced suggestions. Run 'shelly config' for options.)`
      );
    }
    return `Could not analyze the error with Neurolink.${details}`;
  }
}

/**
 * Strip ANSI escape codes from a string
 * These codes are used for terminal colors/formatting and break pattern matching
 */
function stripAnsi(str: string): string {
  // Match ANSI escape sequences: ESC[ followed by parameters and a letter
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence stripping requires control character
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Provide basic error analysis without AI
 */
function getBasicErrorAnalysis(output: string, exitCode: number): string {
  // Strip ANSI codes for pattern matching (terminal colors break string matching)
  const cleanOutput = stripAnsi(output);

  const lines = cleanOutput.split('\n').filter((line) => line.trim());
  const errorLines = lines.filter(
    (line) =>
      line.toLowerCase().includes('error') ||
      line.toLowerCase().includes('failed') ||
      line.toLowerCase().includes('not found') ||
      line.toLowerCase().includes('is not a') ||
      line.toLowerCase().includes('unknown') ||
      line.toLowerCase().includes('invalid') ||
      line.toLowerCase().includes('permission denied')
  );

  let analysis = `Exit code: ${exitCode}\n\n`;

  if (errorLines.length > 0) {
    analysis += `Key error messages found:\n`;
    errorLines.slice(0, 5).forEach((line) => {
      analysis += `  - ${line.trim()}\n`;
    });
  }

  // Common error patterns and suggestions (case-insensitive)
  const lowerOutput = cleanOutput.toLowerCase();
  if (lowerOutput.includes('command not found')) {
    analysis += `\nSuggestion: The command may not be installed. Try installing it or check the spelling.`;
  } else if (lowerOutput.includes('permission denied')) {
    analysis += `\nSuggestion: Try running with sudo or check file permissions.`;
  } else if (
    lowerOutput.includes('enoent') ||
    lowerOutput.includes('no such file')
  ) {
    analysis += `\nSuggestion: File or directory not found. Check the path exists.`;
  } else if (lowerOutput.includes('econnrefused')) {
    analysis += `\nSuggestion: Connection refused. Check if the service is running.`;
  } else if (
    lowerOutput.includes('npm err!') ||
    lowerOutput.includes('npm error')
  ) {
    analysis += `\nSuggestion: npm error. Check the script name with 'npm run' or try 'npm cache clean --force'.`;
  }

  return analysis;
}

export async function suggestCorrections(command: string): Promise<void> {
  const availableCommands = getAvailableCommands();

  // Check if AI is enabled
  if (!aiConfigService.isAIEnabled()) {
    // Use basic string matching for suggestions
    const suggestions = findSimilarCommands(command, availableCommands);
    if (suggestions.length > 0) {
      console.log('\nDid you mean one of these?');
      suggestions.forEach((s) => {
        console.log(`- ${s}`);
      });
    } else {
      console.log('\nCould not find any similar commands.');
    }
    return;
  }

  const neurolink = new NeuroLink();
  const aiConfig = aiConfigService.getNeuroLinkOptions();
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
      provider: aiConfig.provider,
      model: aiConfig.model,
      ...(aiConfig.baseURL && { baseURL: aiConfig.baseURL }),
    });
    const suggestions = result.content
      .trim()
      .split(',')
      .filter((s) => s.length > 0);
    if (suggestions.length > 0) {
      console.log('\nDid you mean one of these?');
      suggestions.forEach((s) => {
        console.log(`- ${s}`);
      });
    } else {
      console.log('\nCould not find any similar commands.');
    }
  } catch (_e) {
    // Fallback to basic string matching
    const suggestions = findSimilarCommands(command, availableCommands);
    if (suggestions.length > 0) {
      console.log('\nDid you mean one of these?');
      suggestions.forEach((s) => {
        console.log(`- ${s}`);
      });
    } else {
      console.log('\nCould not suggest a correction.');
    }
  }
}

/**
 * Find similar commands using Levenshtein distance
 */
function findSimilarCommands(input: string, commands: string[]): string[] {
  const maxDistance = Math.max(2, Math.floor(input.length / 2));

  const matches = commands
    .map((cmd) => ({
      command: cmd,
      distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()),
    }))
    .filter((m) => m.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map((m) => m.command);

  return matches;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
