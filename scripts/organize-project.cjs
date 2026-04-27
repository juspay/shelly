#!/usr/bin/env node
/**
 * Project Organization Script for @juspay/shelly
 *
 * Validates and organizes project structure.
 * Ensures consistent file organization and naming conventions.
 *
 * @generated 2026-02-08
 * @owner juspay
 *
 * Usage:
 *   node scripts/organize-project.cjs          # Fix issues
 *   node scripts/organize-project.cjs --check  # Check only (CI mode)
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Required directories
  requiredDirs: ['src', 'tests', 'docs', 'scripts'],

  // Required files
  requiredFiles: [
    'package.json',
    'tsconfig.json',
    'README.md',
    '.gitignore',
    '.env.example',
  ],

  // Recommended files (warn if missing)
  recommendedFiles: [
    'CLAUDE.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'LICENSE',
    '.editorconfig',
    '.prettierrc',
    '.eslintrc.json',
  ],

  // Directory structure validation
  structure: {
    src: {
      required: ['index.ts'],
      recommended: ['types.ts', 'utils', 'services', 'commands'],
    },
    tests: {
      recommended: ['setup.ts'],
    },
    docs: {
      recommended: ['memory-bank'],
    },
  },

  // Naming conventions
  naming: {
    // Files that should be kebab-case
    kebabCase: ['src/**/*.ts', '!src/**/*.d.ts'],
    // Files that should be camelCase
    camelCase: ['tests/**/*.test.ts'],
    // Files that should be PascalCase
    pascalCase: ['src/components/**/*.tsx'],
  },

  // Files that should not exist
  forbidden: [
    '.env',
    '.env.local',
    'node_modules',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
  ],
};

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
  };
  console.log(`${prefix[type] || prefix.info} ${message}`);
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  if (!exists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// ============================================================================
// CHECKS
// ============================================================================

const issues = [];
const warnings = [];
const fixes = [];

/**
 * Check required directories.
 */
function checkRequiredDirs() {
  for (const dir of config.requiredDirs) {
    if (!exists(dir)) {
      issues.push(`Missing required directory: ${dir}`);
    }
  }
}

/**
 * Check required files.
 */
function checkRequiredFiles() {
  for (const file of config.requiredFiles) {
    if (!exists(file)) {
      issues.push(`Missing required file: ${file}`);
    }
  }
}

/**
 * Check recommended files.
 */
function checkRecommendedFiles() {
  for (const file of config.recommendedFiles) {
    if (!exists(file)) {
      warnings.push(`Missing recommended file: ${file}`);
    }
  }
}

/**
 * Check directory structure.
 */
function checkStructure() {
  for (const [dir, rules] of Object.entries(config.structure)) {
    if (!exists(dir)) continue;

    if (rules.required) {
      for (const file of rules.required) {
        const filePath = path.join(dir, file);
        if (!exists(filePath)) {
          issues.push(`Missing required file: ${filePath}`);
        }
      }
    }

    if (rules.recommended) {
      for (const item of rules.recommended) {
        const itemPath = path.join(dir, item);
        if (!exists(itemPath)) {
          warnings.push(`Missing recommended: ${itemPath}`);
        }
      }
    }
  }
}

/**
 * Check for forbidden files.
 */
function checkForbidden() {
  for (const pattern of config.forbidden) {
    // Simple glob matching
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const files = fs.readdirSync('.').filter((f) => regex.test(f));
      for (const file of files) {
        warnings.push(`Found potentially sensitive file: ${file}`);
      }
    } else if (exists(pattern)) {
      if (pattern === '.env' || pattern === '.env.local') {
        warnings.push(
          `Found environment file that should not be committed: ${pattern}`
        );
      } else {
        warnings.push(`Found unwanted file/directory: ${pattern}`);
      }
    }
  }
}

/**
 * Check package.json validity.
 */
function checkPackageJson() {
  if (!exists('package.json')) return;

  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'main'];
    for (const field of requiredFields) {
      if (!pkg[field]) {
        issues.push(`package.json missing required field: ${field}`);
      }
    }

    // Check recommended fields
    const recommendedFields = ['license', 'author', 'repository', 'engines'];
    for (const field of recommendedFields) {
      if (!pkg[field]) {
        warnings.push(`package.json missing recommended field: ${field}`);
      }
    }

    // Check scripts
    const recommendedScripts = ['build', 'test', 'lint'];
    for (const script of recommendedScripts) {
      if (!pkg.scripts?.[script]) {
        warnings.push(`package.json missing recommended script: ${script}`);
      }
    }
  } catch (error) {
    issues.push(`Invalid package.json: ${error.message}`);
  }
}

/**
 * Check tsconfig.json validity.
 */
function checkTsConfig() {
  if (!exists('tsconfig.json')) return;

  try {
    const content = fs.readFileSync('tsconfig.json', 'utf-8');
    // Remove comments for JSON parsing
    const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    JSON.parse(jsonContent);
  } catch (error) {
    issues.push(`Invalid tsconfig.json: ${error.message}`);
  }
}

// ============================================================================
// FIXES
// ============================================================================

/**
 * Create missing directories.
 */
function fixMissingDirs() {
  for (const dir of config.requiredDirs) {
    if (!exists(dir)) {
      ensureDir(dir);
      fixes.push(`Created directory: ${dir}`);
    }
  }
}

/**
 * Create placeholder files for required items.
 */
function fixMissingFiles() {
  // Create .gitkeep in empty directories
  for (const dir of config.requiredDirs) {
    if (exists(dir)) {
      const files = fs.readdirSync(dir);
      if (files.length === 0) {
        fs.writeFileSync(path.join(dir, '.gitkeep'), '');
        fixes.push(`Created .gitkeep in empty directory: ${dir}`);
      }
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check') || args.includes('-c');

  console.log('\n📁 Project Organization Check\n');
  console.log(`   Mode: ${checkOnly ? 'Check only' : 'Auto-fix enabled'}\n`);

  // Run all checks
  checkRequiredDirs();
  checkRequiredFiles();
  checkRecommendedFiles();
  checkStructure();
  checkForbidden();
  checkPackageJson();
  checkTsConfig();

  // Apply fixes if not in check-only mode
  if (!checkOnly && issues.length > 0) {
    console.log('🔧 Applying fixes...\n');
    fixMissingDirs();
    fixMissingFiles();
  }

  // Report results
  console.log('\n📊 Results:\n');

  if (fixes.length > 0) {
    console.log(`${colors.green}Fixes applied:${colors.reset}`);
    fixes.forEach((fix) => log(fix, 'success'));
    console.log('');
  }

  if (issues.length > 0) {
    console.log(`${colors.red}Issues found:${colors.reset}`);
    issues.forEach((issue) => log(issue, 'error'));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}Warnings:${colors.reset}`);
    warnings.forEach((warning) => log(warning, 'warn'));
    console.log('');
  }

  if (issues.length === 0 && warnings.length === 0) {
    log('Project structure looks good!', 'success');
  }

  // Exit with error code if issues remain
  const remainingIssues = issues.length;
  if (remainingIssues > 0) {
    console.log(
      `\n${colors.red}${remainingIssues} issue(s) need attention${colors.reset}\n`
    );
    process.exit(1);
  }

  console.log('');
}

main();
