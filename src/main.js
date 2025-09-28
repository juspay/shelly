#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { runCommand } from './services/commandService.js';
import {
  appendCommandToHistory,
  getCommandHistory,
  getLastCommandFromShellHistory,
} from './services/historyService.js';
import { loadRules } from './services/ruleService.js';
import {
  analyzeError,
  suggestCorrections,
} from './services/analysisService.js';
import { promptForManualError } from './services/uiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateShellAlias() {
  const scriptPath = path.resolve(__filename);
  const cliPath = path.resolve(__dirname, 'shelly', 'cli.js');

  // Generate a POSIX-compatible function that works across multiple shells
  return `log_helper() {
    # Get the last command using history or fc depending on shell capabilities
    if command -v fc >/dev/null 2>&1; then
        if [ -n "\$ZSH_VERSION" ]; then
            # Zsh: get the most recent non-shelly command
            last_command=\$(fc -ln -2 2>/dev/null | tail -n1 | sed 's/^[[:space:]]*//')
        elif [ -n "\$BASH_VERSION" ]; then
            # Bash: get the command before shelly
            last_command=\$(fc -ln -2 2>/dev/null | head -n1 | sed 's/^[[:space:]]*//')
        else
            # Other shells: try to get previous command
            last_command=\$(fc -ln -1 2>/dev/null | sed 's/^[[:space:]]*//')
            if [ "\$last_command" = "shelly" ] || [ "\$last_command" = "shelly" ]; then
                last_command=\$(fc -ln -2 2>/dev/null | head -n1 | sed 's/^[[:space:]]*//')
            fi
        fi
    else
        echo "This shell does not support the fc command required for shelly."
        return 1
    fi
    
    # Check if we got a command
    if [ -z "\$last_command" ]; then
        echo "Could not retrieve the last command from history."
        return 1
    fi
    
    # Prevent analyzing shelly itself
    case "\$last_command" in
        *shelly*|*SHELLY_DEBUG*)
            echo "shelly cannot analyze itself. Please run another command first."
            return 1
            ;;
    esac
    
    # Call the actual shelly script with the last command
    node "${scriptPath}" "\$last_command"
}

# Create shelly function that handles both CLI commands and error analysis
shelly() {
    # If arguments are provided, use the CLI tool
    if [ \$# -gt 0 ]; then
        node "${cliPath}" "\$@"
    else
        # No arguments, run error analysis on last command
        log_helper
    fi
}`;
}

async function main() {
  try {
    const userArgs = process.argv.slice(2);

    // Handle --alias flag
    if (userArgs.length === 1 && userArgs[0] === '--alias') {
      console.log(generateShellAlias());
      return;
    }

    const rules = await loadRules();

    if (userArgs.length === 0) {
      const lastCommand = await getLastCommandFromShellHistory();

      // Prevent the script from analyzing its own invocation
      if (
        lastCommand &&
        (lastCommand.includes('./src/main.js') ||
          lastCommand.includes('shelly'))
      ) {
        console.log('The shelly script cannot analyze its own invocation.');
        console.log(
          'Please run shelly with a command to analyze, or run another command first.'
        );
        return; // Exit gracefully
      }

      if (!lastCommand) {
        console.log('Could not determine the last command from history.');
        console.log('Usage: shelly <command>');
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
      if (
        output.toLowerCase().includes('command not found') ||
        analysis.toLowerCase().includes('command not found')
      ) {
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
    if (
      output.toLowerCase().includes('command not found') ||
      (analysis && analysis.toLowerCase().includes('command not found'))
    ) {
      await suggestCorrections(command);
    }
    if (code === 0) {
      await promptForManualError();
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  }
}
main();
