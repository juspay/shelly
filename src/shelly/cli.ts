#!/usr/bin/env node

import { Command } from 'commander';
import { OrganizeCommand } from './commands/organize.js';
import { MemoryCommand } from './commands/memory.js';
import { GitHubSetupCommand } from './commands/githubSetup.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import path from 'path';
import { aiConfigService } from '../services/aiConfigService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

// Get package.json for version info
async function getPackageInfo() {
  try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    return JSON.parse(packageContent);
  } catch (_error) {
    return {
      version: '1.0.0',
      description: 'AI-assisted repository organization tool',
    };
  }
}

async function setupCLI() {
  const packageInfo = await getPackageInfo();

  program
    .name('shelly')
    .description(
      'AI-assisted repository organization tool for publishing-ready projects'
    )
    .version(packageInfo.version);

  // Organize command
  program
    .command('organize')
    .description('Organize repository structure and enhance project files')
    .option('-f, --force', 'overwrite existing files without prompting')
    .option('-u, --update', 'only add missing files, preserve existing ones')
    .option('-m, --move', 'move misplaced files to their correct directories')
    .option(
      '-d, --directory <path>',
      'target directory (defaults to current directory)'
    )
    .action(async (options) => {
      try {
        // Handle current working directory access safely
        let targetDirectory;
        if (options.directory) {
          targetDirectory = path.resolve(options.directory);
        } else {
          try {
            targetDirectory = process.cwd();
          } catch (error) {
            if (error.code === 'EPERM' || error.code === 'ENOENT') {
              console.error(
                `❌ Cannot access current directory: ${error.message}\n`
              );
              console.error(`💡 Solutions:`);
              console.error(
                `   1. Use: shelly organize --directory /path/to/your/project`
              );
              console.error(`   2. Navigate to a directory you have access to`);
              console.error(`   3. Check directory permissions\n`);
              console.error(
                `📁 Current directory issue: ${error.code === 'EPERM' ? 'Permission denied' : 'Directory not found'}`
              );
              process.exit(1);
            }
            throw error;
          }
        }

        const organizeCommand = new OrganizeCommand({
          force: options.force,
          update: options.update,
          move: options.move,
          cwd: targetDirectory,
        });

        await organizeCommand.execute();
      } catch (error) {
        console.error('❌ Error executing organize command:', error.message);
        if (process.env.DEBUG) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // Init command (for creating new projects)
  program
    .command('init')
    .description('Initialize a new project with shelly structure')
    .argument('<project-name>', 'name of the new project')
    .option('-t, --template <type>', 'project template type', 'basic')
    .option('-d, --directory <path>', 'parent directory for the new project')
    .action(async (projectName, options) => {
      try {
        console.log('🚀 Initializing new project...');

        const projectDir = path.join(
          options.directory ? path.resolve(options.directory) : process.cwd(),
          projectName
        );

        // Create project directory
        await fs.mkdir(projectDir, { recursive: true });
        console.log(`📁 Created project directory: ${projectDir}`);

        // Create basic package.json
        const basicPackageJson = {
          name: projectName,
          version: '1.0.0',
          description: '',
          main: 'src/index.js',
          type: 'module',
          scripts: {
            test: 'echo "Error: no test specified" && exit 1',
          },
          keywords: [],
          author: '',
          license: 'ISC',
        };

        await fs.writeFile(
          path.join(projectDir, 'package.json'),
          JSON.stringify(basicPackageJson, null, 2) + '\n',
          'utf8'
        );

        console.log('📦 Created package.json');

        // Run organize command on the new project
        const organizeCommand = new OrganizeCommand({
          force: true,
          cwd: projectDir,
        });

        await organizeCommand.execute();

        console.log(`\n✅ Project "${projectName}" initialized successfully!`);
        console.log(`\nTo get started:`);
        console.log(`   cd ${projectName}`);
        console.log(`   npm install`);
        console.log(`   npm run prepare`);
      } catch (error) {
        console.error('❌ Error initializing project:', error.message);
        if (process.env.DEBUG) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // Status command (check repository status)
  program
    .command('status')
    .description('Check the current repository organization status')
    .option(
      '-d, --directory <path>',
      'target directory (defaults to current directory)'
    )
    .action(async (options) => {
      try {
        const targetDir = options.directory
          ? path.resolve(options.directory)
          : process.cwd();
        await checkRepositoryStatus(targetDir);
      } catch (error) {
        console.error('❌ Error checking status:', error.message);
        process.exit(1);
      }
    });

  // Memory Bank command
  program
    .command('memory')
    .description('Manage project Memory Bank for AI-assisted development')
    .argument(
      '[subcommand]',
      'memory subcommand (init, update, show, status, list)'
    )
    .argument('[filename]', 'filename for show command')
    .option('-f, --force', 'force operation (overwrite existing files)')
    .option('--file <name>', 'specify a specific file for update operations')
    .option(
      '-d, --directory <path>',
      'target directory (defaults to current directory)'
    )
    .action(async (subcommand, filename, options) => {
      try {
        const targetDir = options.directory
          ? path.resolve(options.directory)
          : process.cwd();

        const memoryCommand = new MemoryCommand({
          cwd: targetDir,
        });

        // Handle filename for show command
        if (subcommand === 'show' && filename) {
          options.file = filename;
        }

        await memoryCommand.execute(subcommand || 'help', options);
      } catch (error) {
        console.error('❌ Error executing memory command:', error.message);
        if (process.env.DEBUG) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // GitHub setup command
  program
    .command('github')
    .description(
      'Configure GitHub repository with best practices for publishing and collaboration'
    )
    .argument('[subcommand]', 'github subcommand (setup)', 'setup')
    .option('-f, --force', 'skip confirmation prompts')
    .option('--dry-run', 'show what would be configured without making changes')
    .option(
      '-d, --directory <path>',
      'target directory (defaults to current directory)'
    )
    .action(async (subcommand, options) => {
      try {
        if (subcommand !== 'setup') {
          console.error(`❌ Unknown subcommand: ${subcommand}`);
          console.error('Available subcommands: setup');
          process.exit(1);
        }

        const targetDir = options.directory
          ? path.resolve(options.directory)
          : process.cwd();

        const githubSetupCommand = new GitHubSetupCommand({
          cwd: targetDir,
          force: options.force,
          dryRun: options.dryRun,
        });

        await githubSetupCommand.execute();
      } catch (error) {
        console.error(
          '❌ Error executing GitHub setup command:',
          error.message
        );
        if (process.env.DEBUG) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // Shortcut commands for GitHub setup
  program
    .command('gh')
    .description('Shortcut for GitHub setup (alias for "github setup")')
    .option('-f, --force', 'skip confirmation prompts')
    .option('--dry-run', 'show what would be configured without making changes')
    .option(
      '-d, --directory <path>',
      'target directory (defaults to current directory)'
    )
    .action(async (options) => {
      try {
        const targetDir = options.directory
          ? path.resolve(options.directory)
          : process.cwd();

        const githubSetupCommand = new GitHubSetupCommand({
          cwd: targetDir,
          force: options.force,
          dryRun: options.dryRun,
        });

        await githubSetupCommand.execute();
      } catch (error) {
        console.error(
          '❌ Error executing GitHub setup command:',
          error.message
        );
        if (process.env.DEBUG) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // Quick setup command
  program
    .command('setup')
    .description('Quick repository setup (GitHub + organize)')
    .option('-f, --force', 'skip confirmation prompts')
    .option('--dry-run', 'show what would be configured without making changes')
    .option(
      '-d, --directory <path>',
      'target directory (defaults to current directory)'
    )
    .option('--github-only', 'only run GitHub setup, skip organize')
    .option('--organize-only', 'only run organize, skip GitHub setup')
    .action(async (options) => {
      try {
        const targetDir = options.directory
          ? path.resolve(options.directory)
          : process.cwd();

        if (!options.organizeOnly) {
          console.log('🔧 Running GitHub setup...\n');
          const githubSetupCommand = new GitHubSetupCommand({
            cwd: targetDir,
            force: options.force,
            dryRun: options.dryRun,
          });
          await githubSetupCommand.execute();
        }

        if (!options.githubOnly) {
          console.log('\n📁 Running repository organization...\n');
          const organizeCommand = new OrganizeCommand({
            cwd: targetDir,
            force: options.force,
            update: !options.force,
          });
          await organizeCommand.execute();
        }

        console.log('\n🎉 Complete repository setup finished!');
      } catch (error) {
        console.error('❌ Error executing setup command:', error.message);
        if (process.env.DEBUG) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  // AI Config command
  program
    .command('config')
    .description('View and manage AI configuration for Shelly')
    .argument('[subcommand]', 'config subcommand (show, providers)', 'show')
    .option('--disable-ai', 'disable AI features (use templates only)')
    .option('--enable-ai', 'enable AI features')
    .action(async (subcommand, options) => {
      try {
        if (options.disableAi) {
          aiConfigService.disableAI();
          console.log(
            '✅ AI features disabled. Shelly will use template-based generation.'
          );
          return;
        }

        if (options.enableAi) {
          aiConfigService.enableAI();
          console.log('✅ AI features enabled.');
          return;
        }

        if (subcommand === 'providers') {
          console.log('🤖 Available AI Providers:\n');
          const providers = aiConfigService.getAvailableProviders();

          for (const p of providers) {
            const status = p.available ? '✅' : '❌';
            console.log(`   ${status} ${p.provider.padEnd(10)} - ${p.reason}`);
          }

          console.log(
            '\n💡 To use a specific provider, set environment variables:'
          );
          console.log(
            '   SHELLY_AI_PROVIDER=google|ollama|openrouter|mistral|openai'
          );
          console.log('   SHELLY_AI_MODEL=<model-name>');
          console.log('   SHELLY_AI_TIER=free|paid');
          console.log('\n🔑 API Key environment variables:');
          console.log('   GOOGLE_GENERATIVE_AI_API_KEY - for Google Gemini');
          console.log(
            '   OPENROUTER_API_KEY - for OpenRouter (has free models)'
          );
          console.log('   MISTRAL_API_KEY - for Mistral AI');
          console.log('   OPENAI_API_KEY - for OpenAI');
          console.log('   (Ollama runs locally - no API key needed)');
        } else {
          // Default: show current config
          console.log('🤖 Current AI Configuration:\n');
          console.log(`   ${aiConfigService.getConfigDescription()}`);

          const config = aiConfigService.getConfig();
          console.log(`\n📋 Details:`);
          console.log(`   Provider: ${config.provider}`);
          console.log(`   Model: ${config.model}`);
          console.log(`   Tier: ${config.tier}`);
          console.log(
            `   AI Enabled: ${aiConfigService.isAIEnabled() ? 'Yes' : 'No'}`
          );
          console.log(
            `   API Key Set: ${aiConfigService.hasValidApiKey() ? 'Yes' : 'No'}`
          );

          if (
            !aiConfigService.hasValidApiKey() &&
            config.provider !== 'ollama'
          ) {
            console.log(
              '\n⚠️  No API key configured. AI features will use fallback templates.'
            );
            console.log(
              '   Run "shelly config providers" to see setup instructions.'
            );
          }

          console.log('\n💡 Free tier options:');
          console.log(
            '   1. Ollama (local, completely free): Install from ollama.ai'
          );
          console.log(
            '   2. OpenRouter (has free models): Get API key from openrouter.ai'
          );
          console.log(
            '   3. Google AI (free tier): Get API key from aistudio.google.com'
          );
        }
      } catch (error) {
        console.error('❌ Error executing config command:', error.message);
        process.exit(1);
      }
    });

  // Parse command line arguments
  program.parse();
}

/**
 * Check repository organization status
 */
async function checkRepositoryStatus(targetDir) {
  console.log('🔍 Checking repository status...\n');

  const requiredFiles = [
    'package.json',
    'README.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    '.gitignore',
    '.eslintrc.js',
    '.prettierrc',
    'CHANGELOG.md',
  ];

  const requiredDirs = [
    '.github/ISSUE_TEMPLATE',
    '.github/workflows',
    'src',
    'docs',
  ];

  const githubFiles = [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/CODEOWNERS',
    '.github/workflows/ci.yml',
  ];

  let score = 0;
  const maxScore =
    requiredFiles.length + requiredDirs.length + githubFiles.length;

  console.log('📋 Required Files:');
  for (const file of requiredFiles) {
    const exists = await fileExists(path.join(targetDir, file));
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (exists) score++;
  }

  console.log('\n📁 Required Directories:');
  for (const dir of requiredDirs) {
    const exists = await dirExists(path.join(targetDir, dir));
    console.log(`   ${exists ? '✅' : '❌'} ${dir}/`);
    if (exists) score++;
  }

  console.log('\n🔧 GitHub Templates:');
  for (const file of githubFiles) {
    const exists = await fileExists(path.join(targetDir, file));
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (exists) score++;
  }

  const percentage = Math.round((score / maxScore) * 100);
  console.log(`\n📊 Organization Score: ${score}/${maxScore} (${percentage}%)`);

  if (percentage < 100) {
    console.log(
      '\n💡 Run "shelly organize" to complete repository organization'
    );
  } else {
    console.log('\n🎉 Repository is fully organized!');
  }

  // Check package.json for @juspay/ prefix
  try {
    const packagePath = path.join(targetDir, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    console.log('\n📦 Package Information:');
    console.log(`   Name: ${packageJson.name}`);
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   License: ${packageJson.license || 'Not specified'}`);

    if (!packageJson.name.startsWith('@juspay/')) {
      console.log('\n⚠️  Package name is not prefixed with @juspay/');
      console.log('   Run "shelly organize" to fix this');
    }
  } catch (_error) {
    console.log('\n❌ Could not read package.json');
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 */
async function dirExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Run the CLI
setupCLI().catch((error) => {
  console.error('❌ Failed to start CLI:', error.message);
  process.exit(1);
});
