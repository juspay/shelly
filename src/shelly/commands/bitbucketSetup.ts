import { BitbucketService } from '../services/bitbucketService.js';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { generatePipelinesYaml } from '../templates/bitbucketPipelines.js';

interface BitbucketSetupOptions {
  cwd?: string;
  force?: boolean;
  dryRun?: boolean;
}

export class BitbucketSetupCommand {
  options: {
    cwd: string;
    force: boolean;
    dryRun: boolean;
  };

  constructor(options: BitbucketSetupOptions = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      force: options.force || false,
      dryRun: options.dryRun || false,
    };
  }

  async execute() {
    console.log('🚀 Bitbucket Repository Setup');
    console.log('===============================\n');

    try {
      const isGitRepo = await this.isInsideGitRepo();
      if (!isGitRepo) {
        this.printCloneGuidance();
        process.exit(1);
      }

      const { token, username } = this.getCredentials();
      const bitbucketService = new BitbucketService(token, username);

      console.log('🔍 Validating Bitbucket token...');
      const authInfo = await bitbucketService.validateAuth();
      console.log(`✅ Authenticated as: ${authInfo.user}`);

      console.log('📂 Detecting repository...');
      const { owner, repo } = await this.detectRepository(bitbucketService);
      console.log(`✅ Repository: ${owner}/${repo}`);

      await this.checkAdminAccess(bitbucketService, owner, repo);

      const defaultBranch = await bitbucketService.getDefaultBranch(owner, repo);
      console.log(`📋 Default branch: ${defaultBranch}`);

      if (!this.options.force) {
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: `Configure Bitbucket repository ${owner}/${repo} with best practices?`,
          default: true,
        }]);
        if (!proceed) { console.log('Operation cancelled.'); return; }
      }

      console.log('\n🔧 Starting repository configuration...\n');

      await this.configureRepositorySettings(bitbucketService, owner, repo);
      await this.createBranchRestrictions(bitbucketService, owner, repo, defaultBranch);
      await this.enablePipelines(bitbucketService, owner, repo);
      await this.setupNpmTokenGuidance(bitbucketService, owner, repo);
      await this.createPipelinesFile(this.options.cwd);
      await this.setupNpmRepositoryVariable(bitbucketService, owner, repo);
      await this.commitAndPushChanges(this.options.cwd);
      await this.promptVersionTag(this.options.cwd);

      this.printSummary(owner, repo, defaultBranch);
    } catch (error) {
      console.error('\n❌ Bitbucket setup failed:', (error as Error).message);
      if (process.env.DEBUG) console.error((error as Error).stack);
      process.exit(1);
    }
  }

  private getCredentials() {
    const token = process.env.BITBUCKET_ACCESS_TOKEN || process.env.BITBUCKET_TOKEN;
    const username = process.env.BITBUCKET_USERNAME;
    if (!token) {
      console.error('❌ BITBUCKET_ACCESS_TOKEN or BITBUCKET_TOKEN environment variable is required');
      console.error('💡 Create an App Password at: https://bitbucket.org/account/settings/app-passwords/');
      console.error('💡 Required scopes: Account (Read), Repositories (Admin), Pipelines (Read/Write)');
      console.error('');
      console.error('   export BITBUCKET_TOKEN=your_app_password');
      console.error('   export BITBUCKET_USERNAME=your_username');
      process.exit(1);
    }
    return { token, username };
  }

  private printCloneGuidance() {
    console.log('📋 You are not inside a Git repository.\n');
    console.log('💡 Clone your Bitbucket repo:');
    console.log('   git clone git@bitbucket.org:<workspace>/<repo>.git\n');
    console.log('💡 Multiple accounts? Use ~/.ssh/config with Host aliases.');
    console.log('Then re-run this command from inside the cloned repo.');
  }

  private async detectRepository(service: BitbucketService) {
    const originalRemote = await this.normalizeGitRemote(this.options.cwd);
    try {
      return await service.getRepositoryInfo(this.options.cwd);
    } finally {
      if (originalRemote) await this.restoreGitRemote(this.options.cwd, originalRemote);
    }
  }

  private async checkAdminAccess(service: BitbucketService, owner: string, repo: string) {
    const permissions = await service.checkRepositoryPermissions(owner, repo);
    if (!permissions.admin) {
      console.error('❌ Admin permissions required');
      process.exit(1);
    }
  }

  private printSummary(owner: string, repo: string, defaultBranch: string) {
    console.log('\n🎉 Bitbucket repository setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Repository settings configured');
    console.log(`   ✅ Branch restrictions for "${defaultBranch}"`);
    console.log('   ✅ bitbucket-pipelines.yml created (with release/tags)');
    console.log('   ✅ Changes committed and pushed');
    console.log(`\n💡 Check pipelines: https://bitbucket.org/${owner}/${repo}/pipelines`);
    console.log('\n📦 To publish a release to NPM:');
    console.log('   1. Update version:  npm version patch   (or minor / major)');
    console.log('   2. Push with tags:  git push && git push --tags');
    console.log('   3. Pipeline auto-publishes to NPM on v* tags');
    console.log('\n   Or manually:');
    console.log('   git tag v1.0.0 && git push --tags');
  }

  /**
   * Optionally create and push a version tag to trigger release pipeline
   */
  private async promptVersionTag(cwd: string): Promise<void> {
    if (this.options.dryRun) {
      console.log('   🔍 DRY RUN: Would prompt for version tag');
      return;
    }
    if (this.options.force) return;

    const packageJsonPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const version = pkg.version || '1.0.0';

    const { execSync } = await import('child_process');

    // Check if tag already exists
    const existing = execSync(`git tag -l "v${version}"`, { cwd, encoding: 'utf-8' }).trim();
    if (existing) {
      console.log(`   ℹ️  Tag v${version} already exists`);

      // Suggest bumping version
      const parts = version.split('.').map(Number);
      const nextPatch = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;

      const { bumpAndTag } = await inquirer.prompt([{
        type: 'confirm',
        name: 'bumpAndTag',
        message: `Tag v${version} exists. Bump to v${nextPatch} and create tag?`,
        default: false,
      }]);

      if (!bumpAndTag) {
        console.log(`   💡 Bump manually: npm version patch && git push --tags`);
        return;
      }

      try {
        // Update package.json version
        pkg.version = nextPatch;
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        execSync('git add package.json', { cwd, stdio: 'ignore' });
        execSync(`git commit -m "chore: bump version to ${nextPatch}"`, { cwd, stdio: 'ignore' });
        execSync(`git tag v${nextPatch}`, { cwd, stdio: 'ignore' });
        console.log(`   ✅ Bumped to v${nextPatch} and created tag`);

        await this.pushToRemote(cwd);
        try {
          execSync('git push --tags', { cwd, stdio: 'pipe' });
        } catch {
          // pushToRemote already set the alias, try again
          execSync('git push --tags', { cwd, stdio: 'pipe' });
        }
        console.log(`   ✅ Pushed tag v${nextPatch} — release pipeline will trigger!`);
      } catch (err) {
        console.error('   ❌ Failed:', (err as Error).message);
        console.log(`   💡 Run manually: npm version patch && git push && git push --tags`);
      }
      return;
    }

    const { createTag } = await inquirer.prompt([{
      type: 'confirm',
      name: 'createTag',
      message: `Create and push version tag v${version} to trigger release pipeline?`,
      default: false,
    }]);

    if (!createTag) {
      console.log('   ℹ️  Skipping version tag');
      console.log(`   💡 Run later: git tag v${version} && git push --tags`);
      return;
    }

    try {
      execSync(`git tag v${version}`, { cwd, stdio: 'ignore' });
      console.log(`   ✅ Created tag v${version}`);

      try {
        execSync('git push --tags', { cwd, stdio: 'pipe' });
        console.log(`   ✅ Pushed tag v${version} — release pipeline will trigger!`);
      } catch {
        await this.pushToRemote(cwd);
        execSync('git push --tags', { cwd, stdio: 'pipe' });
        console.log(`   ✅ Pushed tag v${version} (via alias)`);
      }
    } catch (error) {
      console.error('   ❌ Failed to create tag:', (error as Error).message);
      console.log(`   💡 Run manually: git tag v${version} && git push --tags`);
    }
  }

  /**
   * Configure repository settings (merge strategy, etc.)
   */
  private async configureRepositorySettings(
    service: BitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('🔧 Configuring repository settings...');

    try {
      if (this.options.dryRun) {
        console.log(
          '   🔍 DRY RUN: Would configure repository merge settings'
        );
        return;
      }

      // Bitbucket Cloud API uses these fields (not has_issues/has_wiki like GitHub)
      await service.updateRepositorySettings(workspace, repoSlug, {
        fork_policy: 'no_public_forks',
        is_private: true,
      });
      console.log('   ✅ Repository settings configured:');
      console.log('      • Fork policy: no public forks');
      console.log('      • Visibility: private');
    } catch (error) {
      console.error(
        '   ❌ Failed to configure repository settings:',
        (error as Error).message
      );
      throw error;
    }
  }

  /**
   * Create branch restrictions
   */
  private async createBranchRestrictions(
    service: BitbucketService,
    workspace: string,
    repoSlug: string,
    defaultBranch: string
  ) {
    console.log('🛡️  Creating branch restrictions...');

    try {
      if (this.options.dryRun) {
        console.log(
          `   🔍 DRY RUN: Would create branch restrictions for "${defaultBranch}"`
        );
        return;
      }

      const restrictions = [
        {
          kind: 'require_approvals_to_merge',
          pattern: defaultBranch,
          value: 1,
        },
        {
          kind: 'require_passing_builds_to_merge',
          pattern: defaultBranch,
          value: 1,
        },
      ];

      for (const restriction of restrictions) {
        try {
          await service.createBranchRestriction(
            workspace,
            repoSlug,
            restriction
          );
          console.log(
            `   ✅ Branch restriction "${restriction.kind}" created for ${defaultBranch}`
          );
        } catch (error) {
          const msg = (error as Error).message;
          if (msg.includes('already exists') || msg.includes('409')) {
            console.log(
              `   ℹ️  Branch restriction "${restriction.kind}" already exists`
            );
          } else {
            console.error(
              `   ❌ Failed to create "${restriction.kind}":`,
              msg
            );
          }
        }
      }

      console.log(`   🔒 Protected branch: ${defaultBranch}`);
      console.log('   📋 Applied restrictions:');
      console.log('      • Require 1 approval before merging');
      console.log('      • Require passing builds before merging');
    } catch (error) {
      console.error(
        '   ❌ Failed to create branch restrictions:',
        (error as Error).message
      );
      throw error;
    }
  }

  /**
   * Enable Bitbucket Pipelines
   */
  private async enablePipelines(
    service: BitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('⚙️  Enabling Bitbucket Pipelines...');

    try {
      if (this.options.dryRun) {
        console.log('   🔍 DRY RUN: Would enable Bitbucket Pipelines');
        return;
      }

      await service.enablePipelines(workspace, repoSlug);
      console.log('   ✅ Bitbucket Pipelines enabled');
      console.log(
        `   💡 Add a bitbucket-pipelines.yml to start building`
      );
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('already enabled') || msg.includes('409')) {
        console.log('   ℹ️  Bitbucket Pipelines already enabled');
      } else {
        console.error(
          '   ❌ Failed to enable Pipelines:',
          msg
        );
        console.log('\n   💡 Manual setup:');
        console.log(
          `      Go to: https://bitbucket.org/${workspace}/${repoSlug}/admin/pipelines/settings`
        );
        console.log('      Toggle "Enable Pipelines"');
      }
    }
  }

  /**
   * Setup NPM token guidance
   */
  private async setupNpmTokenGuidance(
    service: BitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('📦 Checking NPM configuration...');

    try {
      const packageJsonExists = await service.checkPath(
        `${this.options.cwd}/package.json`
      );

      if (!packageJsonExists) {
        console.log(
          '   ℹ️  No package.json found - skipping NPM setup'
        );
        return;
      }

      if (this.options.dryRun) {
        console.log(
          '   🔍 DRY RUN: Would provide NPM token setup guidance'
        );
        return;
      }

      await service.setupNpmTokenGuidance(workspace, repoSlug);
    } catch (error) {
      console.error(
        '   ❌ Failed to check NPM configuration:',
        (error as Error).message
      );
    }
  }

  /**
   * Create bitbucket-pipelines.yml file
   */
  private async createPipelinesFile(cwd: string): Promise<void> {
    console.log('📝 Creating bitbucket-pipelines.yml...');
    const pipelinesPath = path.join(cwd, 'bitbucket-pipelines.yml');

    const content = generatePipelinesYaml(cwd);

    if (fs.existsSync(pipelinesPath)) {
      const existing = fs.readFileSync(pipelinesPath, 'utf-8');
      if (existing === content) {
        console.log('   ℹ️  bitbucket-pipelines.yml already up to date — skipping');
        return;
      }
      if (!this.options.force) {
        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: 'bitbucket-pipelines.yml already exists. Overwrite with updated template?',
          default: false,
        }]);
        if (!overwrite) {
          console.log('   ℹ️  Keeping existing bitbucket-pipelines.yml');
          return;
        }
      }
    }

    if (this.options.dryRun) {
      console.log('   🔍 DRY RUN: Would create bitbucket-pipelines.yml');
      return;
    }

    fs.writeFileSync(pipelinesPath, content, 'utf-8');
    console.log('   ✅ bitbucket-pipelines.yml created (includes release tags)');
  }

  /**
   * Set NPM_TOKEN as a secured repository variable
   */
  private async setupNpmRepositoryVariable(
    service: BitbucketService,
    workspace: string,
    repoSlug: string
  ): Promise<void> {
    const packageJsonPath = path.join(this.options.cwd, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    if (this.options.dryRun) {
      console.log('   🔍 DRY RUN: Would prompt for NPM_TOKEN repository variable');
      return;
    }

    if (this.options.force) return;

    const { setupNpm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'setupNpm',
      message: 'Do you want to set up NPM_TOKEN as a secured repository variable?',
      default: false,
    }]);

    if (!setupNpm) {
      console.log('   ℹ️  Skipping NPM_TOKEN setup');
      return;
    }

    const { npmToken } = await inquirer.prompt([{
      type: 'password',
      name: 'npmToken',
      message: 'Enter your NPM access token:',
      mask: '*',
    }]);

    if (!npmToken) {
      console.log('   ℹ️  No token provided — skipping');
      return;
    }

    console.log('🔐 Setting NPM_TOKEN repository variable...');
    try {
      const token = process.env.BITBUCKET_ACCESS_TOKEN || process.env.BITBUCKET_TOKEN;
      const username = process.env.BITBUCKET_USERNAME;
      const auth = Buffer.from(`${username}:${token}`).toString('base64');
      const baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pipelines_config/variables/`;
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      };

      // Try creating first
      const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'NPM_TOKEN', value: npmToken, secured: true }),
      });

      if (createRes.ok) {
        console.log('   ✅ NPM_TOKEN set as secured repository variable');
        return;
      }

      // If conflict (already exists), find and update it
      if (createRes.status === 409) {
        console.log('   ℹ️  NPM_TOKEN already exists — updating...');
        const listRes = await fetch(baseUrl, { headers });
        if (listRes.ok) {
          const data = await listRes.json() as { values: Array<{ uuid: string; key: string }> };
          const existing = data.values?.find((v: { key: string }) => v.key === 'NPM_TOKEN');
          if (existing) {
            const updateRes = await fetch(`${baseUrl}${existing.uuid}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ key: 'NPM_TOKEN', value: npmToken, secured: true }),
            });
            if (updateRes.ok) {
              console.log('   ✅ NPM_TOKEN updated successfully');
              return;
            }
          }
        }
        console.log('   ℹ️  NPM_TOKEN already exists — no changes made');
        return;
      }

      const errorText = await createRes.text();
      throw new Error(`${createRes.status}: ${errorText}`);
    } catch (error) {
      console.error('   ❌ Failed to set NPM_TOKEN:', (error as Error).message);
      console.log(`   💡 Set manually: https://bitbucket.org/${workspace}/${repoSlug}/admin/pipelines/repository-variables`);
    }
  }

  /**
   * Commit and push pipeline changes
   */
  private async commitAndPushChanges(cwd: string): Promise<void> {
    if (this.options.dryRun) {
      console.log('   🔍 DRY RUN: Would commit and push changes');
      return;
    }

    console.log('📤 Committing and pushing changes...');

    try {
      const { execSync } = await import('child_process');

      // Check for any changes (staged, unstaged, or untracked pipeline file)
      const hasUntracked = execSync(
        'git ls-files --others --exclude-standard -- bitbucket-pipelines.yml',
        { cwd, encoding: 'utf-8' }
      ).trim();

      let hasModified = false;
      try {
        execSync('git diff --quiet -- bitbucket-pipelines.yml', { cwd, stdio: 'ignore' });
      } catch {
        hasModified = true;
      }

      if (!hasUntracked && !hasModified) {
        console.log('   ℹ️  No changes to commit');
        return;
      }

      execSync('git add bitbucket-pipelines.yml', { cwd, stdio: 'ignore' });
      execSync('git commit -m "chore: add bitbucket-pipelines.yml via Shelly setup"', {
        cwd, stdio: 'ignore',
      });
      console.log('   ✅ Changes committed');

      // Push with SSH alias fallback
      await this.pushToRemote(cwd);
    } catch (error) {
      console.error('   ❌ Failed to commit:', (error as Error).message);
      console.log('   💡 Commit manually:');
      console.log('      git add bitbucket-pipelines.yml');
      console.log('      git commit -m "chore: add bitbucket-pipelines.yml"');
      console.log('      git push');
    }
  }

  private async pushToRemote(cwd: string): Promise<void> {
    const { execSync } = await import('child_process');
    try {
      execSync('git push', { cwd, stdio: 'pipe' });
      console.log('   ✅ Pushed to remote');
    } catch {
      console.log('   ⚠️  Default push failed, trying SSH alias...');
      const remoteUrl = execSync('git remote get-url origin', { cwd, encoding: 'utf-8' }).trim();
      const match = remoteUrl.match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
      if (match) {
        const personalUrl = `git@bitbucket-personal:${match[1]}/${match[2]}.git`;
        try {
          execSync(`git remote set-url origin "${personalUrl}"`, { cwd, stdio: 'ignore' });
          execSync('git push', { cwd, stdio: 'pipe' });
          console.log('   ✅ Pushed to remote (via bitbucket-personal)');
          return;
        } catch {
          execSync(`git remote set-url origin "${remoteUrl}"`, { cwd, stdio: 'ignore' });
        }
      }
      console.error('   ❌ Push failed — run: git push');
    }
  }

  /**
   * Check if the current directory is inside a git repository
   */
  private async isInsideGitRepo(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('git rev-parse --is-inside-work-tree', {
        cwd: this.options.cwd,
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize custom SSH host aliases to bitbucket.org in the git remote URL
   * Returns the original URL so it can be restored later
   */
  private async normalizeGitRemote(cwd: string): Promise<string | null> {
    try {
      const { execSync } = await import('child_process');
      const remoteUrl = execSync('git remote get-url origin', {
        cwd,
        encoding: 'utf-8',
      }).trim();

      const customAliasMatch = remoteUrl.match(
        /^git@(?!bitbucket\.org)[^:]+:(.+\/.+)$/
      );

      if (customAliasMatch) {
        const normalizedUrl = `git@bitbucket.org:${customAliasMatch[1]}`;
        console.log(`   ℹ️  Normalized remote: ${remoteUrl} → ${normalizedUrl}`);
        execSync(`git remote set-url origin "${normalizedUrl}"`, {
          cwd,
          stdio: 'ignore',
        });
        return remoteUrl;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async restoreGitRemote(cwd: string, originalUrl: string): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      execSync(`git remote set-url origin "${originalUrl}"`, {
        cwd,
        stdio: 'ignore',
      });
      console.log(`   ℹ️  Restored remote to: ${originalUrl}`);
    } catch {
      // Ignore
    }
  }
}
