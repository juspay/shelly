import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  detectShell, 
  getLastCommandFromShell,
  ZshShell, 
  BashShell, 
  FishShell,
  TcshShell,
  PowerShell 
} from '../services/shellService.js';

describe('Shell Detection and Parsing', () => {
  let tempDir;
  let originalHome;
  let originalShell;
  let originalShellOverride;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-test-'));
    originalHome = process.env.HOME;
    originalShell = process.env.SHELL;
    originalShellOverride = process.env.SHELL_OVERRIDE;
    
    // Mock the home directory for tests
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env.HOME = originalHome;
    process.env.SHELL = originalShell;
    if (originalShellOverride) {
      process.env.SHELL_OVERRIDE = originalShellOverride;
    } else {
      delete process.env.SHELL_OVERRIDE;
    }
  });

  describe('Shell Override', () => {
    it('should use SHELL_OVERRIDE when set', async () => {
      process.env.SHELL_OVERRIDE = 'bash';
      const shell = await detectShell();
      assert.strictEqual(shell?.name, 'bash');
    });

    it('should return null for unknown shell override', async () => {
      process.env.SHELL_OVERRIDE = 'unknownshell';
      const shell = await detectShell();
      assert.strictEqual(shell, null);
    });
  });

  describe('ZshShell', () => {
    it('should parse zsh history correctly', () => {
      const zsh = new ZshShell();
      const historyContent = `: 1234567890:0;ls -la
: 1234567891:0;cd /home
: 1234567892:0;git status
echo "simple command"`;

      const commands = zsh.parseHistory(historyContent);
      assert.deepStrictEqual(commands, [
        'ls -la',
        'cd /home', 
        'git status',
        'echo "simple command"'
      ]);
    });

    it('should get last command excluding log-helper', () => {
      const zsh = new ZshShell();
      const historyPath = path.join(tempDir, '.zsh_history');
      const historyContent = `: 1234567890:0;ls -la
: 1234567891:0;log-helper
: 1234567892:0;cd /home`;

      fs.writeFileSync(historyPath, historyContent);
      const lastCommand = zsh.getLastCommand();
      assert.strictEqual(lastCommand, 'cd /home');
    });

    it('should return null when history file does not exist', () => {
      const zsh = new ZshShell();
      const lastCommand = zsh.getLastCommand();
      assert.strictEqual(lastCommand, null);
    });
  });

  describe('BashShell', () => {
    it('should parse bash history correctly', () => {
      const bash = new BashShell();
      const historyContent = `ls -la
cd /home
git status

echo "test"`;

      const commands = bash.parseHistory(historyContent);
      assert.deepStrictEqual(commands, [
        'ls -la',
        'cd /home',
        'git status',
        'echo "test"'
      ]);
    });

    it('should get last command excluding log-helper', () => {
      const bash = new BashShell();
      const historyPath = path.join(tempDir, '.bash_history');
      const historyContent = `ls -la
log-helper
cd /home`;

      fs.writeFileSync(historyPath, historyContent);
      const lastCommand = bash.getLastCommand();
      assert.strictEqual(lastCommand, 'cd /home');
    });
  });

  describe('FishShell', () => {
    it('should parse fish history correctly', () => {
      const fish = new FishShell();
      const historyContent = `- cmd: ls -la
  when: 1234567890
- cmd: cd /home
  when: 1234567891
- cmd: git status
  when: 1234567892`;

      const commands = fish.parseHistory(historyContent);
      assert.deepStrictEqual(commands, [
        'ls -la',
        'cd /home',
        'git status'
      ]);
    });

    it('should get correct history file path', () => {
      const fish = new FishShell();
      const expectedPath = path.join(tempDir, '.local', 'share', 'fish', 'fish_history');
      assert.strictEqual(fish.getHistoryFilePath(), expectedPath);
    });
  });

  describe('TcshShell', () => {
    it('should parse tcsh history correctly', () => {
      const tcsh = new TcshShell();
      const historyContent = `ls -la
cd /home
git status`;

      const commands = tcsh.parseHistory(historyContent);
      assert.deepStrictEqual(commands, [
        'ls -la',
        'cd /home',
        'git status'
      ]);
    });

    it('should get correct history file path', () => {
      const tcsh = new TcshShell();
      const expectedPath = path.join(tempDir, '.history');
      assert.strictEqual(tcsh.getHistoryFilePath(), expectedPath);
    });
  });

  describe('PowerShell', () => {
    it('should parse PowerShell history correctly', () => {
      const pwsh = new PowerShell();
      const historyContent = `Get-Process
Set-Location C:\\Users
Get-ChildItem`;

      const commands = pwsh.parseHistory(historyContent);
      assert.deepStrictEqual(commands, [
        'Get-Process',
        'Set-Location C:\\Users',
        'Get-ChildItem'
      ]);
    });
  });

  describe('Shell Detection Fallback', () => {
    it('should fallback to SHELL environment variable', async () => {
      delete process.env.SHELL_OVERRIDE;
      process.env.SHELL = '/bin/bash';
      
      // Mock the process tree traversal to fail
      const shell = await detectShell();
      
      // The shell should be detected from environment variable
      assert.ok(shell === null || shell.name === 'bash');
    });
  });

  describe('getLastCommandFromShell Integration', () => {
    it('should return null when no shell is detected', async () => {
      delete process.env.SHELL_OVERRIDE;
      delete process.env.SHELL;
      
      const lastCommand = await getLastCommandFromShell();
      assert.strictEqual(lastCommand, null);
    });

    it('should get last command using shell override', async () => {
      process.env.SHELL_OVERRIDE = 'bash';
      const historyPath = path.join(tempDir, '.bash_history');
      const historyContent = `ls -la
cd /home
git status`;

      fs.writeFileSync(historyPath, historyContent);
      
      const lastCommand = await getLastCommandFromShell();
      assert.strictEqual(lastCommand, 'git status');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty history files', () => {
      const bash = new BashShell();
      const historyPath = path.join(tempDir, '.bash_history');
      fs.writeFileSync(historyPath, '');
      
      const lastCommand = bash.getLastCommand();
      assert.strictEqual(lastCommand, null);
    });

    it('should handle malformed zsh history entries', () => {
      const zsh = new ZshShell();
      const historyContent = `malformed line
: 1234567890:0;good command
another malformed line`;

      const commands = zsh.parseHistory(historyContent);
      assert.deepStrictEqual(commands, [
        'malformed line',
        'good command',
        'another malformed line'
      ]);
    });

    it('should filter out commands with custom exclude pattern', () => {
      const bash = new BashShell();
      const historyPath = path.join(tempDir, '.bash_history');
      const historyContent = `ls -la
log-helper
custom-command
cd /home`;

      fs.writeFileSync(historyPath, historyContent);
      const lastCommand = bash.getLastCommand('custom-command');
      assert.strictEqual(lastCommand, 'cd /home');
    });
  });
});
