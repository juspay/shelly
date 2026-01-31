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
  /* eslint-disable no-useless-escape */
  const scriptPath = path.resolve(__filename);
  const cliPath = path.resolve(__dirname, 'shelly', 'cli.js');

  // Generate a POSIX-compatible function that works across multiple shells
  return `log_helper() {
    # For Bash: ensure history is written to file immediately and get real-time command
    if [ -n "\$BASH_VERSION" ]; then
        history -a  # Append current session history to history file
        # For bash, we need to get the command that was just executed
        # Use history command to get the last few commands from memory
        last_command=\$(history 3 | head -n 1 | sed 's/^[[:space:]]*[0-9]*[[:space:]]*//')
        
        # If we didn't get anything or got shelly itself, try different approaches
        if [ -z "\$last_command" ] || [[ "\$last_command" =~ shelly ]]; then
            # Try using fc with explicit bash execution
            last_command=\$(bash -c 'history -r; fc -ln -2 | head -n1' 2>/dev/null | sed 's/^[[:space:]]*//')
        fi
        
        # Last resort: try reading from the history file directly after history -a
        if [ -z "\$last_command" ] || [[ "\$last_command" =~ shelly ]]; then
            if [ -f "\$HOME/.bash_history" ]; then
                last_command=\$(tail -n 2 "\$HOME/.bash_history" | head -n 1)
            fi
        fi
    elif [ -n "\$ZSH_VERSION" ]; then
        # Zsh: get the most recent non-shelly command
        last_command=\$(fc -ln -2 2>/dev/null | tail -n1 | sed 's/^[[:space:]]*//')
    elif command -v fc >/dev/null 2>&1; then
        # Other shells: try to get previous command
        last_command=\$(fc -ln -1 2>/dev/null | sed 's/^[[:space:]]*//')
        if [ "\$last_command" = "shelly" ] || [ "\$last_command" = "shelly" ]; then
            last_command=\$(fc -ln -2 2>/dev/null | head -n1 | sed 's/^[[:space:]]*//')
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
    
    # Pass command via environment variable to work with global binary installations
    # This ensures real-time command analysis works even when shelly is installed globally
    SHELLY_LAST_CMD="\$last_command" node "${scriptPath}"
}

# Create shelly function that handles both CLI commands and error analysis
shelly() {
    # If arguments are provided, check if it's a CLI command or a shell command to analyze
    if [ \$# -gt 0 ]; then
        case "\$1" in
            organize|memory|github|gh|setup|init|status|config|help|--help|-h|--version|-v|--alias)
                # Known CLI commands - route to CLI tool
                node "${cliPath}" "\$@"
                ;;
            *)
                # Unknown command - treat as shell command to run and analyze
                node "${scriptPath}" "\$@"
                ;;
        esac
    else
        # No arguments, run error analysis on last command
        log_helper
    fi
}`;
  /* eslint-enable no-useless-escape */
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
      const result = await runCommand(lastCommand);
      const { stdout, stderr, code } = result as {
        stdout: string;
        stderr: string;
        code: number;
      };
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
    const result = await runCommand(command);
    const { stdout, stderr, code } = result as {
      stdout: string;
      stderr: string;
      code: number;
    };
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
