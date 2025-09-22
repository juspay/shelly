import psTree from 'ps-tree';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { execSync } from 'child_process';

const psTreeAsync = promisify(psTree);

// Base Shell class
class Shell {
  constructor(name) {
    this.name = name;
  }

  getHistoryFilePath() {
    throw new Error('getHistoryFilePath must be implemented by subclass');
  }

  parseHistory(content) {
    throw new Error('parseHistory must be implemented by subclass');
  }

  getLastCommand(excludePattern = null) {
    const debug = process.env.LOG_HELPER_DEBUG === 'true';
    
    // First, try to get the most recent command from current shell session
    if (debug) {
      console.log('Trying to get current shell command...');
    }
    
    const currentCommand = getCurrentShellCommand(debug);
    if (currentCommand) {
      if (debug) {
        console.log(`Using current shell command: "${currentCommand}"`);
      }
      return currentCommand;
    }
    
    // Fallback to reading from history file
    if (debug) {
      console.log('Falling back to history file...');
    }
    
    const historyPath = this.getHistoryFilePath();
    
    if (!fs.existsSync(historyPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(historyPath, 'utf-8');
      const commands = this.parseHistory(content);
      
      if (commands.length === 0) {
        return null;
      }

      if (debug) {
        console.log(`Total commands in history: ${commands.length}`);
        console.log(`Last 10 commands:`, commands.slice(-10));
      }

      // More precise filtering - only exclude exact matches or commands that start with log-helper
      for (let i = commands.length - 1; i >= 0; i--) {
        const cmd = commands[i].trim();
        
        if (debug) {
          console.log(`Checking command at index ${i}: "${cmd}"`);
        }
        
        // Skip empty commands
        if (!cmd) {
          continue;
        }

        // Be more precise about what we exclude
        const isLogHelper = cmd === 'log-helper' || 
                           cmd.startsWith('log-helper ') ||
                           cmd.startsWith('./src/main.js') ||
                           cmd.includes('LOG_HELPER_DEBUG=true') ||
                           cmd.startsWith('LOG_HELPER_DEBUG=true');

        if (debug) {
          console.log(`Command "${cmd}" is log-helper: ${isLogHelper}`);
        }

        if (!isLogHelper && (!excludePattern || !cmd.includes(excludePattern))) {
          if (debug) {
            console.log(`Selected command: "${cmd}"`);
          }
          return cmd;
        }
      }

      return null; // No valid previous command found
    } catch (error) {
      console.error(`Error reading shell history for ${this.name}:`, error);
      return null;
    }
  }
}

// Zsh shell implementation
class ZshShell extends Shell {
  constructor() {
    super('zsh');
  }

  getHistoryFilePath() {
    return path.join(os.homedir(), '.zsh_history');
  }

  parseHistory(content) {
    const lines = content.split('\n').filter(Boolean);
    const commands = [];

    for (const line of lines) {
      // Zsh history format: ': timestamp:duration;command'
      const match = line.match(/^:\s*\d+:\d+;(.*)$/);
      if (match) {
        commands.push(match[1].trim());
      } else {
        // Fallback for lines that don't match the expected format
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith(':')) {
          commands.push(trimmed);
        }
      }
    }

    return commands;
  }
}

// Bash shell implementation
class BashShell extends Shell {
  constructor() {
    super('bash');
  }

  getHistoryFilePath() {
    // Check for HISTFILE environment variable first
    const histFile = process.env.HISTFILE;
    if (histFile) {
      return histFile;
    }
    return path.join(os.homedir(), '.bash_history');
  }

  parseHistory(content) {
    return content.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());
  }
}

// Fish shell implementation
class FishShell extends Shell {
  constructor() {
    super('fish');
  }

  getHistoryFilePath() {
    return path.join(os.homedir(), '.local', 'share', 'fish', 'fish_history');
  }

  parseHistory(content) {
    const lines = content.split('\n').filter(Boolean);
    const commands = [];

    for (const line of lines) {
      // Fish history format: '- cmd: command'
      if (line.startsWith('- cmd: ')) {
        commands.push(line.substring(7).trim());
      }
    }

    return commands;
  }
}

// Tcsh shell implementation
class TcshShell extends Shell {
  constructor() {
    super('tcsh');
  }

  getHistoryFilePath() {
    return path.join(os.homedir(), '.history');
  }

  parseHistory(content) {
    return content.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());
  }
}

// PowerShell implementation
class PowerShell extends Shell {
  constructor() {
    super('powershell');
  }

  getHistoryFilePath() {
    const appData = process.env.APPDATA || os.homedir();
    return path.join(appData, 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt');
  }

  parseHistory(content) {
    return content.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());
  }
}

// Shell factory
const SHELL_CLASSES = {
  'zsh': ZshShell,
  'bash': BashShell,
  'fish': FishShell,
  'tcsh': TcshShell,
  'csh': TcshShell, // csh uses same history format as tcsh
  'pwsh': PowerShell,
  'powershell': PowerShell,
};

function createShell(shellName) {
  const ShellClass = SHELL_CLASSES[shellName];
  return ShellClass ? new ShellClass() : null;
}

// Shell detection logic
export async function detectShell(debug = false) {
  // Check for manual override first
  const shellOverride = process.env.SHELL_OVERRIDE;
  if (shellOverride) {
    if (debug) {
      console.log(`Using shell override: ${shellOverride}`);
    }
    return createShell(shellOverride);
  }

  try {
    // Try the process tree method first
    const shell = await walkProcessTree(process.pid, debug);
    if (shell) {
      return shell;
    }
  }
  catch (error) {
    if (debug) {
      console.error('Error walking process tree:', error);
    }
  }

  try {
    // Fallback: Try using ps command directly
    const shell = await detectShellUsingPs(debug);
    if (shell) {
      return shell;
    }
  }
  catch (error) {
    if (debug) {
      console.error('Error detecting shell using ps:', error);
    }
  }

  // Fallback to SHELL environment variable
  const envShell = process.env.SHELL;
  if (envShell) {
    const shellName = path.basename(envShell);
    if (debug) {
      console.log(`Falling back to SHELL environment variable: ${shellName}`);
    }
    return createShell(shellName);
  }

  if (debug) {
    console.log('No shell detected, returning null');
  }
  return null;
}

async function walkProcessTree(pid, debug = false, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) {
    if (debug) {
      console.log(`Reached maximum depth (${maxDepth}) in process tree traversal`);
    }
    return null;
  }

  try {
    // Get process information
    const processes = await psTreeAsync(pid);
    
    if (debug && processes.length > 0) {
      console.log(`Process tree at depth ${depth}:`, processes.map(p => ({ pid: p.PID, command: p.COMMAND })));
    }

    // Check if any of the processes in the tree are known shells
    for (const proc of processes) {
      // FIX: Add a check for proc.COMMAND before calling toLowerCase()
      if (!proc.COMMAND) {
        if (debug) {
          console.log(`Skipping process with PID ${proc.PID} due to undefined COMMAND`);
        }
        continue; // Skip to the next process
      }
      const command = proc.COMMAND.toLowerCase();
      const knownShells = Object.keys(SHELL_CLASSES);
      
      for (const shellName of knownShells) {
        if (command.includes(shellName)) {
          if (debug) {
            console.log(`Found PREV shell "${shellName}" in process tree at depth ${depth}`);
          }
          return createShell(shellName);
        }
      }
    }

    // If we have a parent process, continue walking up the tree
    if (processes.length > 0) {
      const parentPid = processes[0].PPID;
      if (parentPid && parentPid !== '0' && parentPid !== pid.toString()) {
        return await walkProcessTree(parseInt(parentPid), debug, depth + 1, maxDepth);
      }
    }
  } catch (error) {
    if (debug) {
      console.error(`Error getting process tree for PID ${pid}:`, error);
    }
  }

  return null;
}

// Try to get the most recent command from the current shell session
function getCurrentShellCommand(debug = false) {
  // Skip the real-time history methods for now since they don't work reliably with execSync
  // The fallback to history file is actually working well and is more reliable
  if (debug) {
    console.log('Skipping real-time history methods, using fallback to history file for reliability');
  }
  return null;
}

// Alternative shell detection using ps command directly
async function detectShellUsingPs(debug = false) {
  try {
    let pid = process.ppid; // Start from Node's parent
    let depth = 0;

    while (pid && depth < 10) { // Prevent infinite loops
      if (debug) {
        console.log(`Checking PID ${pid} at depth ${depth}`);
      }

      // Get process command
      const comm = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).toString().trim();
      
      if (debug) {
        console.log(`Process ${pid} command: ${comm}`);
      }

      // Check if this process is a known shell
      const knownShells = Object.keys(SHELL_CLASSES);
      for (const shellName of knownShells) {
        if (comm === shellName || comm.endsWith(`/${shellName}`)) {
          if (debug) {
            console.log(`Found shell "${shellName}" using ps command at depth ${depth}`);
          }
          return createShell(shellName);
        }
      }

      // Get the parent of the current pid
      const ppid = execSync(`ps -p ${pid} -o ppid=`, { encoding: 'utf8' }).toString().trim();
      if (ppid === '' || ppid === pid.toString() || ppid === '1') break;

      pid = parseInt(ppid, 10);
      depth++;
    }

    if (debug) {
      console.log('No shell found using ps command');
    }
    return null;
  } catch (err) {
    if (debug) {
      console.error('Failed to get shell info using ps:', err);
    }
    return null;
  }
}

// Main function to get the last command from shell history
export async function getLastCommandFromShell(debug = false) {
  const shell = await detectShell(debug);
  
  if (!shell) {
    if (debug) {
      console.log('No shell detected, cannot retrieve command history');
    }
    return null;
  }

  if (debug) {
    console.log(`Using ${shell.name} shell for history retrieval`);
  }

  return shell.getLastCommand();
}

export { Shell, ZshShell, BashShell, FishShell, TcshShell, PowerShell };
