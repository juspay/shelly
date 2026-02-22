/**
 * CLI Command Template for @juspay/shelly
 *
 * This template provides a boilerplate for creating commander-based CLI commands.
 * Customize this file for your specific command requirements.
 *
 * @generated 2026-02-08
 * @owner juspay
 *
 * Usage:
 *   1. Copy this file to src/commands/<your-command>.ts
 *   2. Rename the exported function and update the command name
 *   3. Update description, examples, and implement the action handler
 *   4. Import and register in your main CLI entry point
 */

import { Command, Option } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Command options passed from CLI flags.
 * Extend this interface for your command-specific options.
 */
interface CommandOptions {
  verbose: boolean;
  format: 'json' | 'table' | 'plain';
  output?: string;
  force: boolean;
  limit: number;
}

/**
 * Generic result type for command execution.
 * Use this pattern for consistent error handling.
 */
interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Log debug message (only when verbose mode is enabled).
 *
 * @param message - The debug message to log
 * @param verbose - Whether verbose mode is enabled
 */
function logDebug(message: string, verbose: boolean): void {
  if (verbose || process.env.DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Log warning message with visual indicator.
 *
 * @param message - The warning message to log
 */
function logWarning(message: string): void {
  console.warn(`[WARNING] ${message}`);
}

/**
 * Log error message and optionally exit.
 *
 * @param message - The error message to log
 * @param exit - Whether to exit the process (default: true)
 */
function logError(message: string, exit: boolean = true): void {
  console.error(`Error: ${message}`);
  if (exit) {
    process.exit(1);
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format data as a table string.
 *
 * @param data - Data to format (array or object)
 * @returns Formatted table string
 */
function formatAsTable(data: unknown): string {
  if (Array.isArray(data)) {
    // Format array as numbered list
    return data.map((row, i) => `${i + 1}. ${JSON.stringify(row)}`).join('\n');
  }

  // Format object as key-value pairs
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return '(empty)';
    }
    const maxKeyLength = Math.max(...keys.map((k) => k.length));
    return Object.entries(data)
      .map(([key, value]) => `${key.padEnd(maxKeyLength)} : ${value}`)
      .join('\n');
  }

  return String(data);
}

/**
 * Format data as plain text.
 *
 * @param data - Data to format
 * @returns Formatted plain text string
 */
function formatAsPlain(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Write output to a file.
 *
 * @param filepath - Path to write to
 * @param data - Data to write
 * @param format - Output format
 */
function writeOutput(filepath: string, data: unknown, format: string): void {
  let content: string;
  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
  } else if (format === 'table') {
    content = formatAsTable(data);
  } else {
    content = formatAsPlain(data);
  }

  const resolvedPath = path.resolve(filepath);
  fs.writeFileSync(resolvedPath, content, 'utf-8');
  console.log(`Output written to: ${resolvedPath}`);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate command input.
 * Add your custom validation logic here.
 *
 * @param input - The input to validate
 * @returns true if valid, false otherwise
 */
function validateInput(input: string): boolean {
  if (!input || input.trim().length === 0) {
    return false;
  }

  // Add additional validation as needed:
  // - Check file exists
  // - Validate path patterns
  // - Check for forbidden characters
  return true;
}

// ============================================================================
// CORE COMMAND LOGIC
// ============================================================================

/**
 * Main command execution logic.
 * This is where you implement your command's functionality.
 *
 * @param input - Primary input argument
 * @param target - Optional target argument
 * @param options - Parsed command options
 * @param startTime - Command start timestamp for duration calculation
 * @returns Command result with success status and data
 */
async function execute(
  input: string,
  target: string | undefined,
  options: CommandOptions,
  startTime: number
): Promise<CommandResult> {
  // Validate input
  if (!validateInput(input)) {
    return { success: false, error: `Invalid input: ${input}` };
  }

  // [TEMPLATE] Implement your command logic here
  // Example:
  // const processor = new DataProcessor(options);
  // const result = await processor.process(input, target);

  // Placeholder implementation - replace with actual logic
  const data = {
    input,
    target: target || 'default',
    processed: true,
    timestamp: new Date().toISOString(),
  };

  return {
    success: true,
    data,
    // Calculate elapsed time from start
    duration: Date.now() - startTime,
  };
}

/**
 * Handle successful command execution.
 * Formats and outputs the result based on options.
 *
 * @param result - The command result
 * @param options - Command options for formatting
 */
function handleSuccess(result: CommandResult, options: CommandOptions): void {
  const { data } = result;

  // Format output based on selected format
  switch (options.format) {
    case 'json':
      console.log(JSON.stringify(data, null, 2));
      break;

    case 'table':
      console.log(formatAsTable(data));
      break;

    case 'plain':
    default:
      console.log(formatAsPlain(data));
      break;
  }

  // Write to file if output path specified
  if (options.output) {
    writeOutput(options.output, data, options.format);
  }
}

// ============================================================================
// COMMAND ACTION HANDLER
// ============================================================================

/**
 * Command action handler - the main entry point for the command.
 * This function is called by commander when the command is executed.
 *
 * @param input - Primary input argument (required)
 * @param target - Target argument (optional)
 * @param options - Parsed command options
 */
async function actionHandler(
  input: string,
  target: string | undefined,
  options: CommandOptions
): Promise<void> {
  const startTime = Date.now();

  try {
    // Log startup info in verbose mode
    logDebug('Starting command execution...', options.verbose);
    logDebug(`Input: ${input}`, options.verbose);
    logDebug(`Options: ${JSON.stringify(options)}`, options.verbose);

    // Execute main logic
    const result = await execute(input, target, options, startTime);

    // Handle result
    if (result.success) {
      handleSuccess(result, options);
    } else {
      logError(result.error || 'Unknown error');
    }

    // Log duration in verbose mode
    if (options.verbose) {
      const duration = Date.now() - startTime;
      console.log(`\nCompleted in ${duration}ms`);
    }
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// COMMAND REGISTRATION
// ============================================================================

/**
 * Register the example command with a Commander program.
 *
 * This function creates and configures a subcommand that can be added
 * to your main CLI program. It demonstrates common commander patterns:
 * - Required and optional arguments
 * - Boolean flags with short aliases
 * - String options with choices
 * - Integer options with parsing
 *
 * @param program - The Commander program instance to add the command to
 *
 * @example
 * // In your main CLI entry point (e.g., cli.ts):
 * import { Command } from 'commander';
 * import { registerExampleCommand } from './commands/example.js';
 *
 * const program = new Command();
 * program.name('shelly').version('1.0.0');
 *
 * registerExampleCommand(program);
 *
 * program.parse();
 *
 * @example
 * // Command usage:
 * # Basic usage
 * $ shelly example input.txt
 *
 * # With options
 * $ shelly example input.txt --verbose --format json
 *
 * # Output to file
 * $ shelly example input.txt --output result.json
 *
 * # With target argument
 * $ shelly example input.txt output/ --force
 */
export function registerExampleCommand(program: Command): void {
  program
    .command('example')
    .description('Example command description - customize this')
    .summary('Short summary for help listing')

    // --------------------------------------------------------------------------
    // ARGUMENTS
    // --------------------------------------------------------------------------
    // Arguments are positional parameters. Order matters.
    // Use <name> for required, [name] for optional.

    .argument('<input>', 'Input file or directory path (required)')
    .argument('[target]', 'Target path (optional)')

    // --------------------------------------------------------------------------
    // FLAGS AND OPTIONS
    // --------------------------------------------------------------------------
    // Options are named parameters that can appear in any order.
    // Use -s, --long for short and long forms.

    // Boolean flag: presence means true
    .option('-v, --verbose', 'Enable verbose output', false)

    // Boolean flag with short alias
    .option('-f, --force', 'Force operation without confirmation', false)

    // String option with choices (uses commander's Option class for choices)
    .addOption(
      new Option('-F, --format <type>', 'Output format')
        .choices(['json', 'table', 'plain'])
        .default('plain')
    )

    // Optional string option
    .option('-o, --output <path>', 'Output file path')

    // Integer option with custom parsing
    .option(
      '-l, --limit <number>',
      'Maximum number of results (1-1000)',
      (value: string) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
          throw new Error('Limit must be a number between 1 and 1000');
        }
        return parsed;
      },
      100
    )

    // --------------------------------------------------------------------------
    // ACTION HANDLER
    // --------------------------------------------------------------------------
    // The action receives arguments first (in order), then options object.

    .action(
      async (
        input: string,
        target: string | undefined,
        options: CommandOptions
      ) => {
        await actionHandler(input, target, options);
      }
    );
}

/**
 * Create a standalone Command instance.
 * Use this when you want to create the command without immediately
 * registering it to a parent program.
 *
 * @returns A configured Command instance
 *
 * @example
 * // Creating a standalone command:
 * const exampleCmd = createExampleCommand();
 *
 * // Later, add it to your program:
 * program.addCommand(exampleCmd);
 */
export function createExampleCommand(): Command {
  const cmd = new Command('example');

  cmd
    .description('Example command description - customize this')
    .argument('<input>', 'Input file or directory path')
    .argument('[target]', 'Target path (optional)')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('-f, --force', 'Force operation without confirmation', false)
    .addOption(
      new Option('-F, --format <type>', 'Output format')
        .choices(['json', 'table', 'plain'])
        .default('plain')
    )
    .option('-o, --output <path>', 'Output file path')
    .option(
      '-l, --limit <number>',
      'Maximum number of results',
      (value: string) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 1) {
          throw new Error('Limit must be a positive number');
        }
        return parsed;
      },
      100
    )
    .action(
      async (
        input: string,
        target: string | undefined,
        options: CommandOptions
      ) => {
        await actionHandler(input, target, options);
      }
    );

  return cmd;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CommandOptions,
  CommandResult,
  actionHandler,
  execute,
  validateInput,
  formatAsTable,
  formatAsPlain,
  logDebug,
  logWarning,
  logError,
};
