#!/usr/bin/env node
/**
 * MCP Server Connectivity Test for @juspay/shelly
 *
 * Tests connectivity to configured MCP servers.
 * Validates that servers are accessible and responding.
 *
 * @generated 2026-02-08
 * @owner juspay
 *
 * Usage:
 *   node scripts/mcp-test.cjs              # Test all enabled servers
 *   node scripts/mcp-test.cjs github       # Test specific server
 *   node scripts/mcp-test.cjs --all        # Test all servers (even disabled)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================================================
// CONFIGURATION
// ============================================================================

const MCP_CONFIG_PATHS = [
  '.mcp-servers.json',
  '.mcp-servers.local.json',
  path.join(process.env.HOME || '', '.config', 'mcp', 'servers.json'),
];

const TIMEOUT = 10000; // 10 seconds

// ============================================================================
// HELPERS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(message, type = 'info') {
  const prefix = {
    error: `${colors.red}✖${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    success: `${colors.green}✔${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    pending: `${colors.yellow}○${colors.reset}`,
  };
  console.log(`${prefix[type] || prefix.info} ${message}`);
}

/**
 * Load MCP configuration.
 */
function loadConfig() {
  for (const configPath of MCP_CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        // Remove comments
        const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        const config = JSON.parse(jsonContent);
        log(`Loaded config from: ${configPath}`, 'info');
        return config;
      } catch (error) {
        log(`Failed to parse ${configPath}: ${error.message}`, 'error');
      }
    }
  }

  log('No MCP configuration found', 'warn');
  log('Expected locations:', 'info');
  MCP_CONFIG_PATHS.forEach((p) => console.log(`   - ${p}`));

  return null;
}

/**
 * Substitute environment variables in config values.
 */
function substituteEnvVars(value) {
  if (typeof value !== 'string') return value;

  return value.replace(/\{\{(\w+)\}\}/g, (match, envVar) => {
    return process.env[envVar] || match;
  });
}

/**
 * Test an MCP server connection.
 */
function testServer(name, serverConfig) {
  return new Promise((resolve) => {
    const { command, args = [], env = {} } = serverConfig;

    // Substitute environment variables
    const processedArgs = args.map(substituteEnvVars);
    const processedEnv = {};
    for (const [key, value] of Object.entries(env)) {
      processedEnv[key] = substituteEnvVars(value);
    }

    log(`Testing ${name}...`, 'pending');

    // Check if command exists (use 'where' on Windows, 'which' on Unix-like systems)
    const commandFinder = process.platform === 'win32' ? 'where' : 'which';
    const which = spawn(commandFinder, [command], { shell: true });

    which.on('close', (code) => {
      if (code !== 0) {
        resolve({
          name,
          success: false,
          error: `Command not found: ${command}`,
        });
        return;
      }

      // Try to spawn the server briefly
      const serverProcess = spawn(command, processedArgs, {
        env: { ...process.env, ...processedEnv },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      serverProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      serverProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeout = setTimeout(() => {
        // If process is still running after timeout, it's likely working
        serverProcess.kill('SIGTERM');
        resolve({
          name,
          success: true,
          message: 'Server started successfully',
        });
      }, TIMEOUT);

      serverProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0 || code === null) {
          resolve({
            name,
            success: true,
            message: 'Server responded OK',
          });
        } else {
          resolve({
            name,
            success: false,
            error: stderr || `Exit code: ${code}`,
          });
        }
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          name,
          success: false,
          error: error.message,
        });
      });
    });
  });
}

/**
 * Check required environment variables for a server.
 */
function checkEnvVars(name, serverConfig) {
  const missing = [];
  const env = serverConfig.env || {};

  for (const [key, value] of Object.entries(env)) {
    // Check if value references an environment variable
    const match = value.match(/\{\{(\w+)\}\}/);
    if (match && !process.env[match[1]]) {
      missing.push(match[1]);
    }
  }

  return missing;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const testAll = args.includes('--all') || args.includes('-a');
  const specificServer = args.find((a) => !a.startsWith('-'));

  console.log('\n🔌 MCP Server Connectivity Test\n');

  // Load configuration
  const config = loadConfig();
  if (!config || !config.mcpServers) {
    process.exit(1);
  }

  const servers = config.mcpServers;
  const serverNames = Object.keys(servers).filter(
    (name) => !name.startsWith('_') // Skip metadata keys
  );

  // Filter servers
  let toTest = serverNames;

  if (specificServer) {
    if (!servers[specificServer]) {
      log(`Server not found: ${specificServer}`, 'error');
      log(`Available servers: ${serverNames.join(', ')}`, 'info');
      process.exit(1);
    }
    toTest = [specificServer];
  } else if (!testAll) {
    toTest = serverNames.filter((name) => servers[name].enabled !== false);
  }

  if (toTest.length === 0) {
    log('No servers to test', 'warn');
    log('Use --all to test disabled servers', 'info');
    process.exit(0);
  }

  console.log(`Testing ${toTest.length} server(s)...\n`);

  // Test each server
  const results = [];

  for (const name of toTest) {
    const serverConfig = servers[name];

    // Check environment variables first
    const missingEnv = checkEnvVars(name, serverConfig);
    if (missingEnv.length > 0) {
      results.push({
        name,
        success: false,
        error: `Missing env vars: ${missingEnv.join(', ')}`,
        skipped: true,
      });
      continue;
    }

    const result = await testServer(name, serverConfig);
    results.push(result);
  }

  // Print results
  console.log('\n📊 Results:\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success && !r.skipped);
  const skipped = results.filter((r) => r.skipped);

  if (successful.length > 0) {
    console.log(
      `${colors.green}Successful (${successful.length}):${colors.reset}`
    );
    successful.forEach((r) => log(`${r.name}: ${r.message}`, 'success'));
    console.log('');
  }

  if (skipped.length > 0) {
    console.log(`${colors.yellow}Skipped (${skipped.length}):${colors.reset}`);
    skipped.forEach((r) => log(`${r.name}: ${r.error}`, 'warn'));
    console.log('');
  }

  if (failed.length > 0) {
    console.log(`${colors.red}Failed (${failed.length}):${colors.reset}`);
    failed.forEach((r) => log(`${r.name}: ${r.error}`, 'error'));
    console.log('');
  }

  // Summary
  console.log('─'.repeat(40));
  console.log(
    `Total: ${results.length} | ` +
      `${colors.green}Pass: ${successful.length}${colors.reset} | ` +
      `${colors.yellow}Skip: ${skipped.length}${colors.reset} | ` +
      `${colors.red}Fail: ${failed.length}${colors.reset}`
  );
  console.log('');

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
