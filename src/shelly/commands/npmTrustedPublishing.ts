import { NpmService } from '../services/npmService.js';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { platform } from 'os';

interface NpmTrustedPublishingOptions {
  cwd?: string;
  force?: boolean;
  dryRun?: boolean;
}

export class NpmTrustedPublishingCommand {
  private options: {
    cwd: string;
    force: boolean;
    dryRun: boolean;
  };
  private npmService: NpmService;

  constructor(options: NpmTrustedPublishingOptions = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      force: options.force || false,
      dryRun: options.dryRun || false,
    };
    this.npmService = new NpmService(this.options.cwd);
  }

  /**
   * Execute the setup subcommand
   */
  async executeSetup(): Promise<void> {
    console.log('🔐 NPM Trusted Publishing Setup');
    console.log('================================\n');

    try {
      // Step 1: Check npm version
      await this.checkNpmVersion();

      // Step 2: Get package info
      const packageInfo = await this.getPackageInfo();
      if (!packageInfo) return;

      // Step 3: Get repository info
      const repoInfo = await this.getRepoInfo();
      if (!repoInfo) return;

      // Step 4: Find and analyze release workflow
      const workflow = await this.findReleaseWorkflow();
      if (!workflow) return;

      // Step 5: Check if package exists on npm
      await this.checkPackageOnNpm(packageInfo.name);

      // Step 6: Show current status
      this.displayCurrentStatus(workflow);

      // Step 7: Confirm and update workflow
      if (!this.options.force) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Update workflow file for OIDC trusted publishing?',
            default: true,
          },
        ]);

        if (!proceed) {
          console.log('\nOperation cancelled.');
          return;
        }
      }

      // Step 8: Update workflow
      await this.updateWorkflow(workflow.path);

      console.log('🎉 Workflow updated successfully!\n');

      // Step 9: Interactive npmjs.com configuration guide
      await this.runInteractiveNpmSetup(packageInfo.name, {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        workflowFilename: workflow.filename,
      });
    } catch (error) {
      console.error('\n❌ Setup failed:', (error as Error).message);
      if (process.env.DEBUG) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  }

  /**
   * Execute the status subcommand
   */
  async executeStatus(): Promise<void> {
    console.log('🔍 NPM Trusted Publishing Status');
    console.log('=================================\n');

    try {
      // Check npm version
      const versionInfo = await this.npmService.checkNpmVersionSupport();
      console.log(`📦 npm version: ${versionInfo.version}`);
      console.log(
        `   OIDC support: ${versionInfo.supported ? '✅ Supported' : `❌ Requires npm >= ${versionInfo.minRequired}`}`
      );

      // Get package info
      const packageInfo = await this.npmService.getPackageInfo();
      if (packageInfo) {
        console.log(`\n📋 Package: ${packageInfo.name}`);
        console.log(`   Version: ${packageInfo.version}`);
        console.log(`   Public: ${packageInfo.isPublic ? '✅ Yes' : '❌ No (private)'}`);
        console.log(`   Scoped: ${packageInfo.isScoped ? `✅ Yes (${packageInfo.scope})` : '➖ No'}`);

        // Check if package exists on npm
        const exists = await this.npmService.checkPackageExists(packageInfo.name);
        console.log(`   On npm: ${exists ? '✅ Published' : '⚠️  Not yet published'}`);
      } else {
        console.log('\n❌ No package.json found');
      }

      // Get repo info
      const repoInfo = await this.npmService.getGitRepoInfo();
      if (repoInfo) {
        console.log(`\n🔗 Repository: ${repoInfo.owner}/${repoInfo.repo}`);
      }

      // Find and analyze workflows
      const workflow = await this.npmService.findReleaseWorkflow();
      if (workflow) {
        console.log(`\n📄 Release workflow: ${workflow.filename}`);
        console.log(
          `   id-token permission: ${workflow.hasIdTokenPermission ? '✅ Configured' : '❌ Missing'}`
        );
        console.log(
          `   NPM_TOKEN secret: ${workflow.hasNpmTokenSecret ? '⚠️  Still in use' : '✅ Not used'}`
        );

        if (workflow.usesSemanticRelease) {
          console.log('   Publishing method: semantic-release');
          console.log(
            `   NPM_CONFIG_PROVENANCE: ${workflow.hasProvenanceConfig ? '✅ Configured' : '❌ Missing'}`
          );
        }

        if (workflow.publishCommands.length > 0) {
          console.log(`   Publish commands found:`);
          workflow.publishCommands.forEach((cmd) => {
            const hasProvenance = cmd.includes('--provenance') || cmd.includes('semantic-release');
            console.log(`     ${hasProvenance ? '✅' : '⚠️ '} ${cmd.trim()}`);
          });
        }

        // Overall status - check for semantic-release or direct npm publish
        console.log('\n📊 Overall Status:');
        const isProperlyConfigured = workflow.usesSemanticRelease
          ? workflow.hasIdTokenPermission && workflow.hasProvenanceConfig
          : workflow.hasIdTokenPermission &&
            workflow.publishCommands.some((c) => c.includes('--provenance'));

        if (isProperlyConfigured && !workflow.hasNpmTokenSecret) {
          console.log('   ✅ Workflow is configured for OIDC trusted publishing');
          console.log(
            '\n💡 Make sure trusted publisher is configured on npmjs.com:'
          );
          console.log(
            `   https://www.npmjs.com/package/${packageInfo?.name}/access`
          );
        } else {
          console.log('   ⚠️  Workflow needs updates for OIDC trusted publishing');
          if (!workflow.hasIdTokenPermission) {
            console.log('      - Missing id-token: write permission');
          }
          if (workflow.usesSemanticRelease && !workflow.hasProvenanceConfig) {
            console.log('      - Missing NPM_CONFIG_PROVENANCE: true');
          }
          if (workflow.hasNpmTokenSecret) {
            console.log('      - NPM_TOKEN still in use (can be removed after setup)');
          }
          console.log('\n💡 Run "shelly npm trusted-publishing setup" to configure');
        }
      } else {
        console.log('\n⚠️  No release workflow found');
        console.log('   Looking for: release.yml, publish.yml, npm-publish.yml, ci.yml');
      }
    } catch (error) {
      console.error('\n❌ Status check failed:', (error as Error).message);
      if (process.env.DEBUG) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  }

  /**
   * Display help information
   */
  displayHelp(): void {
    console.log('🔐 NPM Trusted Publishing');
    console.log('=========================\n');
    console.log(
      'Automate the setup of OIDC-based npm publishing without tokens.\n'
    );
    console.log('Usage:');
    console.log('  shelly npm trusted-publishing <subcommand>\n');
    console.log('Subcommands:');
    console.log('  setup   - Configure workflow for OIDC trusted publishing');
    console.log('  status  - Check current trusted publishing configuration\n');
    console.log('Options:');
    console.log('  -f, --force     Skip confirmation prompts');
    console.log('  --dry-run       Show changes without applying them');
    console.log('  -d, --directory Target directory\n');
    console.log('Examples:');
    console.log('  shelly npm trusted-publishing setup');
    console.log('  shelly npm trusted-publishing status');
    console.log('  shelly npm trusted-publishing setup --dry-run\n');
    console.log('Learn more: https://docs.npmjs.com/trusted-publishers');
  }

  /**
   * Check npm version compatibility
   */
  private async checkNpmVersion(): Promise<void> {
    console.log('🔍 Checking npm version...');
    const versionInfo = await this.npmService.checkNpmVersionSupport();

    if (versionInfo.supported) {
      console.log(`   ✅ npm ${versionInfo.version} supports OIDC trusted publishing\n`);
      return;
    }

    // Version is too low - show interactive options
    console.log(`   ⚠️  npm ${versionInfo.version} detected`);
    console.log(`   💡 OIDC trusted publishing requires npm >= ${versionInfo.minRequired}\n`);

    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log('  │  NPM VERSION UPGRADE OPTIONS                               │');
    console.log('  └────────────────────────────────────────────────────────────┘\n');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'How would you like to proceed?',
        choices: [
          {
            name: '🔄  Update npm now (npm install -g npm@latest)',
            value: 'update',
          },
          {
            name: '⏭️   Continue anyway (CI workflow will use its own npm)',
            value: 'continue',
          },
          {
            name: '🔍  Check for dependency issues first',
            value: 'check',
          },
          {
            name: '❌  Cancel setup',
            value: 'cancel',
          },
        ],
      },
    ]);

    switch (action) {
      case 'update':
        await this.updateNpm();
        break;
      case 'check':
        await this.checkDependencyIssues();
        break;
      case 'cancel':
        console.log('\n   ❌ Setup cancelled.\n');
        process.exit(0);
        break;
      case 'continue':
      default:
        console.log('\n   ℹ️  Continuing setup (your CI workflow will use its own npm version)\n');
        console.log('   💡 Note: GitHub Actions runners typically have npm >= 11.5\n');
        break;
    }
  }

  /**
   * Update npm to latest version
   */
  private async updateNpm(): Promise<void> {
    console.log('\n   🔄 Updating npm to latest version...\n');

    const { execSync } = await import('child_process');

    try {
      console.log('   $ npm install -g npm@latest\n');
      execSync('npm install -g npm@latest', {
        stdio: 'inherit',
        encoding: 'utf8',
      });

      // Verify the update
      const newVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`\n   ✅ npm updated to ${newVersion}\n`);

      // Check if new version supports OIDC
      const versionInfo = await this.npmService.checkNpmVersionSupport();
      if (versionInfo.supported) {
        console.log(`   ✅ npm ${newVersion} supports OIDC trusted publishing\n`);
      } else {
        console.log(`   ⚠️  npm ${newVersion} still below ${versionInfo.minRequired}`);
        console.log('   💡 Your CI workflow will use its own npm version\n');
      }
    } catch {
      console.log('   ❌ Failed to update npm\n');
      console.log('   💡 Try running manually with sudo:');
      console.log('      sudo npm install -g npm@latest\n');
      console.log('   💡 Or use nvm to manage Node.js versions:');
      console.log('      nvm install 24');
      console.log('      nvm use 24\n');

      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Continue with setup anyway?',
          default: true,
        },
      ]);

      if (!proceed) {
        console.log('\n   ❌ Setup cancelled.\n');
        process.exit(0);
      }
      console.log('\n   ℹ️  Continuing setup (your CI workflow will use its own npm version)\n');
    }
  }

  /**
   * Check for dependency issues before npm update
   */
  private async checkDependencyIssues(): Promise<void> {
    console.log('\n   🔍 Checking for potential issues...\n');

    const { execSync } = await import('child_process');

    // Check current Node.js version
    const nodeVersion = process.version;
    console.log(`   📦 Node.js version: ${nodeVersion}`);

    // Check if using nvm
    const nvmDir = process.env.NVM_DIR;
    if (nvmDir) {
      console.log(`   📦 nvm detected: ${nvmDir}`);
      console.log('   💡 You can use: nvm install 24 && nvm use 24\n');
    }

    // Check global npm packages that might be affected
    try {
      console.log('   📦 Checking global packages...');
      const globalPackages = execSync('npm list -g --depth=0 2>/dev/null || true', {
        encoding: 'utf8',
      });
      const packageCount = globalPackages.split('\n').filter((line) => line.includes('├──') || line.includes('└──')).length;
      console.log(`   ✅ Found ${packageCount} global packages\n`);
    } catch {
      console.log('   ℹ️  Could not check global packages\n');
    }

    // Show recommendations
    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log('  │  RECOMMENDATIONS                                          │');
    console.log('  └────────────────────────────────────────────────────────────┘\n');

    console.log('   1. Your local npm version doesn\'t affect CI publishing');
    console.log('   2. GitHub Actions runners have npm >= 11.5 by default');
    console.log('   3. The workflow will work even with older local npm\n');

    console.log('   🔗 npm OIDC docs: https://docs.npmjs.com/trusted-publishers');
    console.log('   🔗 Node.js releases: https://nodejs.org/en/about/releases/\n');

    const { proceed } = await inquirer.prompt([
      {
        type: 'list',
        name: 'proceed',
        message: 'What would you like to do?',
        choices: [
          { name: '⏭️   Continue with setup (recommended)', value: 'continue' },
          { name: '🔄  Update npm now', value: 'update' },
          { name: '❌  Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (proceed === 'update') {
      await this.updateNpm();
    } else if (proceed === 'cancel') {
      console.log('\n   ❌ Setup cancelled.\n');
      process.exit(0);
    } else {
      console.log('\n   ℹ️  Continuing setup...\n');
    }
  }

  /**
   * Get and validate package info
   */
  private async getPackageInfo() {
    console.log('📦 Checking package.json...');
    const packageInfo = await this.npmService.getPackageInfo();

    if (!packageInfo) {
      console.error('   ❌ No package.json found');
      console.error('   💡 Run this command from your npm package directory');
      return null;
    }

    console.log(`   ✅ Package: ${packageInfo.name}`);

    if (!packageInfo.isPublic) {
      console.error('   ❌ Package is marked as private');
      console.error('   💡 Set "private": false in package.json to enable publishing');
      return null;
    }

    console.log(`   ✅ Package is public and publishable\n`);
    return packageInfo;
  }

  /**
   * Get repository info
   */
  private async getRepoInfo() {
    console.log('🔗 Detecting repository...');
    const repoInfo = await this.npmService.getGitRepoInfo();

    if (!repoInfo) {
      console.error('   ❌ Could not detect GitHub repository');
      console.error('   💡 Make sure you have a git remote named "origin" pointing to GitHub');
      return null;
    }

    console.log(`   ✅ Repository: ${repoInfo.owner}/${repoInfo.repo}\n`);
    return repoInfo;
  }

  /**
   * Find release workflow
   */
  private async findReleaseWorkflow() {
    console.log('📄 Finding release workflow...');
    const workflow = await this.npmService.findReleaseWorkflow();

    if (!workflow) {
      console.error('   ❌ No release workflow found');
      console.error('   💡 Looking for: release.yml, publish.yml, npm-publish.yml, ci.yml');
      console.error('   💡 Create a workflow that runs "npm publish"\n');
      return null;
    }

    console.log(`   ✅ Found: ${workflow.filename}`);
    if (workflow.publishCommands.length > 0) {
      console.log(`   ✅ Contains npm publish commands\n`);
    } else {
      console.log('   ⚠️  No npm publish commands found (workflow may use reusable workflows)\n');
    }

    return workflow;
  }

  /**
   * Check if package exists on npm
   */
  private async checkPackageOnNpm(packageName: string): Promise<void> {
    console.log('🌐 Checking npm registry...');
    const exists = await this.npmService.checkPackageExists(packageName);

    if (exists) {
      console.log(`   ✅ Package "${packageName}" exists on npm\n`);
    } else {
      console.log(`   ⚠️  Package "${packageName}" not yet published to npm`);
      console.log('   💡 You must publish the package at least once before configuring trusted publishing');
      console.log('   💡 Run: npm publish --access public\n');
    }
  }

  /**
   * Display current workflow status
   */
  private displayCurrentStatus(workflow: {
    hasIdTokenPermission: boolean;
    hasNpmTokenSecret: boolean;
    publishCommands: string[];
    usesSemanticRelease?: boolean;
    hasProvenanceConfig?: boolean;
  }): void {
    console.log('📊 Current workflow status:');
    console.log(
      `   id-token permission: ${workflow.hasIdTokenPermission ? '✅ Present' : '❌ Missing'}`
    );
    console.log(
      `   NPM_TOKEN usage: ${workflow.hasNpmTokenSecret ? '⚠️  Found (will be commented out)' : '✅ Not used'}`
    );

    if (workflow.usesSemanticRelease) {
      console.log('   Publishing method: semantic-release');
      console.log(
        `   NPM_CONFIG_PROVENANCE: ${workflow.hasProvenanceConfig ? '✅ Present' : '❌ Missing (will be added)'}`
      );
    } else {
      const hasProvenance = workflow.publishCommands.some((c) =>
        c.includes('--provenance')
      );
      console.log(
        `   --provenance flag: ${hasProvenance ? '✅ Present' : '❌ Missing (will be added)'}`
      );
    }
    console.log('');
  }

  /**
   * Update the workflow file
   */
  private async updateWorkflow(workflowPath: string): Promise<void> {
    console.log('🔧 Updating workflow...');

    if (this.options.dryRun) {
      const { changes } = await this.simulateWorkflowUpdate(workflowPath);
      console.log('   🔍 DRY RUN - Changes that would be made:');
      changes.forEach((change) => console.log(`      • ${change}`));
      return;
    }

    const { updated, changes } =
      await this.npmService.updateWorkflowForOIDC(workflowPath);

    if (updated) {
      changes.forEach((change) => console.log(`   ✅ ${change}`));
    } else {
      console.log('   ✅ Workflow already configured for OIDC');
    }
  }

  /**
   * Simulate workflow update for dry-run
   */
  private async simulateWorkflowUpdate(
    workflowPath: string
  ): Promise<{ changes: string[] }> {
    const workflow = await this.npmService.analyzeWorkflow(workflowPath);
    const changes: string[] = [];

    if (!workflow.hasIdTokenPermission) {
      changes.push('Add id-token: write permission');
    }

    if (workflow.usesSemanticRelease && !workflow.hasProvenanceConfig) {
      changes.push('Add NPM_CONFIG_PROVENANCE: true for semantic-release');
    }

    if (
      workflow.publishCommands.length > 0 &&
      !workflow.publishCommands.some((c) => c.includes('--provenance'))
    ) {
      changes.push('Add --provenance flag to npm publish commands');
    }

    if (workflow.hasNpmTokenSecret) {
      changes.push('Comment out NODE_AUTH_TOKEN environment variable');
    }

    if (changes.length === 0) {
      changes.push('No changes needed - workflow already configured');
    }

    return { changes };
  }

  /**
   * Run interactive npm trusted publisher setup guide
   */
  private async runInteractiveNpmSetup(
    packageName: string,
    config: { owner: string; repo: string; workflowFilename: string }
  ): Promise<void> {
    const settingsUrl = `https://www.npmjs.com/package/${packageName}`;

    // Header
    console.log('\n');
    console.log('  ╭──────────────────────────────────────────────────────────────╮');
    console.log('  │                                                              │');
    console.log('  │   🔐  NPM TRUSTED PUBLISHING SETUP                           │');
    console.log('  │                                                              │');
    console.log('  │   Configure OIDC authentication on npmjs.com                 │');
    console.log('  │                                                              │');
    console.log('  ╰──────────────────────────────────────────────────────────────╯');
    console.log('\n');

    // Step 1: Open npm website
    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log('  │  STEP 1: Open Package Settings                             │');
    console.log('  └────────────────────────────────────────────────────────────┘\n');

    const { openBrowser } = await inquirer.prompt([
      {
        type: 'list',
        name: 'openBrowser',
        message: 'How would you like to proceed?',
        choices: [
          { name: '🌐  Open npmjs.com in browser (recommended)', value: 'open' },
          { name: '📋  Just show me the URL', value: 'url' },
          { name: '⏭️   Skip - I\'ll do this later', value: 'skip' },
        ],
      },
    ]);

    if (openBrowser === 'skip') {
      this.displayQuickReference(packageName, config, settingsUrl);
      return;
    }

    if (openBrowser === 'open') {
      console.log(`\n  🌐 Opening: ${settingsUrl}\n`);
      await this.openUrl(settingsUrl);
      console.log('  ⏳ Waiting for browser to open...\n');
      await this.sleep(2000);
    } else {
      console.log(`\n  🔗 Open this URL in your browser:\n`);
      console.log(`     ${settingsUrl}\n`);
    }

    // Step 2: Navigate to Settings
    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log('  │  STEP 2: Navigate to Trusted Publisher                     │');
    console.log('  └────────────────────────────────────────────────────────────┘\n');

    console.log('  📍 On the npm package page:\n');
    console.log('     1. Click the "Settings" tab (gear icon) ⚙️');
    console.log('     2. Scroll down to find "Trusted Publisher" section');
    console.log('     3. Click the "GitHub Actions" button\n');

    console.log('  ┌─────────────────────────────────────────────────────┐');
    console.log('  │  npm Package Page                                   │');
    console.log('  │  ┌─────────────────────────────────────────────┐    │');
    console.log('  │  │ [Readme] [Code] [Dependencies] [⚙️ Settings] │    │');
    console.log('  │  └─────────────────────────────────────────────┘    │');
    console.log('  │                          ↑                          │');
    console.log('  │                    Click here                       │');
    console.log('  └─────────────────────────────────────────────────────┘\n');

    await this.waitForUserConfirmation('Found the Settings tab and Trusted Publisher section?');

    // Step 3: Fill the form
    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log('  │  STEP 3: Fill in the Form                                  │');
    console.log('  └────────────────────────────────────────────────────────────┘\n');

    console.log('  📝 Enter these exact values in the npm form:\n');
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                                                             │');
    console.log(`  │   Organization/User:   ${this.highlight(config.owner)}`);
    console.log('  │                                                             │');
    console.log(`  │   Repository:          ${this.highlight(config.repo)}`);
    console.log('  │                                                             │');
    console.log(`  │   Workflow filename:   ${this.highlight(config.workflowFilename)}`);
    console.log('  │                                                             │');
    console.log('  │   Environment:         (leave empty)                        │');
    console.log('  │                                                             │');
    console.log('  └─────────────────────────────────────────────────────────────┘\n');

    console.log('  💡 Tip: Copy-paste values to avoid typos!\n');

    await this.waitForUserConfirmation('Filled in all the form fields?');

    // Step 4: Submit
    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log('  │  STEP 4: Save Configuration                                │');
    console.log('  └────────────────────────────────────────────────────────────┘\n');

    console.log('  🖱️  Click "Set up connection" or "Add" button to save\n');

    await this.waitForUserConfirmation('Clicked save and configuration is complete?');

    // Success!
    console.log('\n');
    console.log('  ╭──────────────────────────────────────────────────────────────╮');
    console.log('  │                                                              │');
    console.log('  │   🎉  TRUSTED PUBLISHER CONFIGURED!                          │');
    console.log('  │                                                              │');
    console.log('  ╰──────────────────────────────────────────────────────────────╯');
    console.log('\n');

    // Next steps
    console.log('  📋 What\'s Next:\n');
    console.log('  ┌────┬─────────────────────────────────────────────────────────┐');
    console.log('  │ 1  │ Commit and push the updated workflow file               │');
    console.log('  ├────┼─────────────────────────────────────────────────────────┤');
    console.log('  │ 2  │ Trigger a release to test OIDC publishing               │');
    console.log('  ├────┼─────────────────────────────────────────────────────────┤');
    console.log('  │ 3  │ (Optional) Remove NPM_TOKEN secret from GitHub          │');
    console.log('  └────┴─────────────────────────────────────────────────────────┘\n');

    console.log(`  🔗 Remove token: https://github.com/${config.owner}/${config.repo}/settings/secrets/actions\n`);
    console.log('  📖 Docs: https://docs.npmjs.com/trusted-publishers\n');
  }

  /**
   * Display quick reference when user skips interactive setup
   */
  private displayQuickReference(
    _packageName: string,
    config: { owner: string; repo: string; workflowFilename: string },
    settingsUrl: string
  ): void {
    console.log('\n');
    console.log('  ╭──────────────────────────────────────────────────────────────╮');
    console.log('  │  📋 QUICK REFERENCE - Complete Setup Later                   │');
    console.log('  ╰──────────────────────────────────────────────────────────────╯\n');

    console.log(`  🔗 URL: ${settingsUrl}\n`);

    console.log('  📝 Values to enter:\n');
    console.log(`     • Organization/User:  ${config.owner}`);
    console.log(`     • Repository:         ${config.repo}`);
    console.log(`     • Workflow filename:  ${config.workflowFilename}`);
    console.log('     • Environment:        (leave empty)\n');

    console.log('  📖 Docs: https://docs.npmjs.com/trusted-publishers\n');
  }

  /**
   * Wait for user confirmation with nice formatting
   */
  private async waitForUserConfirmation(message: string): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `${message}`,
        default: true,
      },
    ]);

    if (confirmed) {
      console.log('  ✅ Done!\n');
    }
    return confirmed;
  }

  /**
   * Highlight text for emphasis
   */
  private highlight(text: string): string {
    // Add padding to align values
    return `${text.padEnd(35)}│`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Open URL in default browser (cross-platform)
   */
  private async openUrl(url: string): Promise<void> {
    const os = platform();
    let command: string;

    switch (os) {
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'win32':
        command = `start "" "${url}"`;
        break;
      default:
        command = `xdg-open "${url}"`;
    }

    return new Promise((resolve) => {
      exec(command, (error) => {
        if (error) {
          console.log(`   ⚠️  Could not open browser automatically`);
          console.log(`   🔗 Please open manually: ${url}`);
        }
        resolve();
      });
    });
  }
}
