import { GitHubService } from '../services/githubService.js';
import inquirer from 'inquirer';

export class GitHubSetupCommand {
  constructor(options = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      force: options.force || false,
      dryRun: options.dryRun || false,
      ...options,
    };
  }

  async execute() {
    console.log('🚀 GitHub Repository Setup');
    console.log('============================\n');

    try {
      // Validate GitHub token
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.error('❌ GITHUB_TOKEN environment variable is required');
        console.error(
          '💡 Get your token from: https://github.com/settings/tokens'
        );
        console.error(
          '💡 Required scopes: repo, admin:repo_hook, write:packages'
        );
        process.exit(1);
      }

      const githubService = new GitHubService(token);

      // Validate token and check permissions
      console.log('🔍 Validating GitHub token...');
      const tokenInfo = await githubService.validateToken();
      console.log(`✅ Authenticated as: ${tokenInfo.user}`);

      // Get repository information
      console.log('📂 Detecting repository...');
      const { owner, repo } = await githubService.getRepositoryInfo(
        this.options.cwd
      );
      console.log(`✅ Repository: ${owner}/${repo}`);

      // Check repository permissions
      const permissions = await githubService.checkRepositoryPermissions(
        owner,
        repo
      );
      if (!permissions.admin) {
        console.error(
          '❌ Admin permissions required for repository configuration'
        );
        console.error(
          '💡 You need admin access to configure repository settings'
        );
        process.exit(1);
      }

      // Get default branch
      const defaultBranch = await githubService.getDefaultBranch(owner, repo);
      console.log(`📋 Default branch: ${defaultBranch}`);

      if (!this.options.force) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Configure GitHub repository ${owner}/${repo} with best practices?`,
            default: true,
          },
        ]);

        if (!proceed) {
          console.log('Operation cancelled.');
          return;
        }
      }

      console.log('\n🔧 Starting repository configuration...\n');

      // 1. Configure Repository Settings
      await this.configureRepositorySettings(githubService, owner, repo);

      // 2. Create Branch Protection Ruleset
      await this.createBranchProtection(
        githubService,
        owner,
        repo,
        defaultBranch
      );

      // 3. Setup NPM Token Guidance
      await this.setupNpmTokenGuidance(githubService, owner, repo);

      // 4. Setup GitHub Pages (required)
      await this.setupGitHubPages(githubService, owner, repo, defaultBranch);

      // 5. Configure GitHub Actions workflow approval settings
      await this.configureActionsWorkflowApproval(githubService, owner, repo);

      console.log('\n🎉 GitHub repository setup completed successfully!');
      console.log('\n📋 Summary of changes:');
      console.log('   ✅ Repository pull request settings configured');
      console.log('   ✅ Branch protection ruleset "release" created');
      console.log('   ✅ NPM token setup guidance provided');
      console.log('   ✅ GitHub Pages configured');
      console.log('   ✅ GitHub Actions workflow permissions configured');
      console.log('\n💡 Next steps:');
      console.log('   1. Follow the NPM token setup instructions above');
      console.log('   2. Commit and push the docs folder for GitHub Pages');
      console.log('   3. Verify GitHub Actions fork PR approval settings');
      console.log('   4. Test your CI/CD workflows');
      console.log('   5. Review your repository settings on GitHub');
    } catch (error) {
      console.error('\n❌ GitHub setup failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Configure repository-level pull request settings
   */
  async configureRepositorySettings(githubService, owner, repo) {
    console.log('🔧 Configuring repository settings...');

    try {
      // Get repository info to check if it's org-owned
      const repoInfo = await githubService.octokit.repos.get({ owner, repo });
      const isOrgOwned = repoInfo.data.owner.type === 'Organization';

      const settings = {
        // Merge options
        allow_merge_commit: false,
        allow_squash_merge: false,
        allow_rebase_merge: true,

        // Branch management
        allow_update_branch: true,
        delete_branch_on_merge: true,
        allow_auto_merge: false,

        // Additional security settings
        web_commit_signoff_required: false,
      };

      if (isOrgOwned) {
        settings.allow_forking = true;
      }

      if (this.options.dryRun) {
        console.log(
          '   🔍 DRY RUN: Would configure repository settings:',
          settings
        );
        return;
      }

      await githubService.updateRepositorySettings(owner, repo, settings);
      console.log('   ✅ Repository settings configured successfully');
    } catch (error) {
      console.error(
        '   ❌ Failed to configure repository settings:',
        error.message
      );
      throw error;
    }
  }

  /**
   * Create branch protection ruleset
   */
  async createBranchProtection(githubService, owner, repo, defaultBranch) {
    console.log('🛡️  Creating branch protection ruleset...');

    try {
      if (this.options.dryRun) {
        console.log(
          `   🔍 DRY RUN: Would create "${defaultBranch}-protection" ruleset for ${defaultBranch} branch`
        );
        return;
      }

      await githubService.createBranchProtectionRuleset(
        owner,
        repo,
        defaultBranch
      );
      console.log(
        `   ✅ Branch protection ruleset "${defaultBranch}-protection" created successfully`
      );
      console.log(`   🔒 Protected branch: ${defaultBranch}`);
      console.log('   📋 Applied rules:');
      console.log('      • Restrict deletions');
      console.log('      • Require linear history');
      console.log('      • Require pull request before merging (1 approval required)');
      console.log('      • Block force pushes');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(
          `   ℹ️  Branch protection ruleset "${defaultBranch}-protection" already exists`
        );
      } else {
        console.error(
          '   ❌ Failed to create branch protection ruleset:',
          error.message
        );
        throw error;
      }
    }
  }

  /**
   * Setup NPM token guidance
   */
  async setupNpmTokenGuidance(githubService, owner, repo) {
    console.log('📦 Checking NPM configuration...');

    try {
      const packageInfo = await githubService.checkPackageJson(
        this.options.cwd
      );

      if (!packageInfo.exists) {
        console.log('   ℹ️  No package.json found - skipping NPM setup');
        return;
      }

      if (!packageInfo.isPublic) {
        console.log('   ℹ️  Package is private - skipping NPM token setup');
        return;
      }

      console.log(`   📋 Package: ${packageInfo.name} (public)`);

      if (this.options.dryRun) {
        console.log('   🔍 DRY RUN: Would provide NPM token setup guidance');
        return;
      }

      await githubService.setupNpmTokenGuidance(owner, repo);
    } catch (error) {
      console.error('   ❌ Failed to check NPM configuration:', error.message);
    }
  }

  /**
   * Setup GitHub Pages
   */
  async setupGitHubPages(githubService, owner, repo, defaultBranch) {
    console.log('📄 Setting up GitHub Pages...');

    try {
      if (this.options.dryRun) {
        console.log('   🔍 DRY RUN: Would configure GitHub Pages');
        return;
      }

      const result = await githubService.setupGitHubPages(
        owner,
        repo,
        defaultBranch,
        this.options.cwd
      );

      if (result) {
        console.log('   ✅ GitHub Pages configured successfully');
        console.log('   🌐 Build and deployment source: GitHub Actions');
        console.log(`   🔗 Site URL: https://${owner}.github.io/${repo}`);
      } else {
        console.log('   ℹ️  GitHub Pages already configured');
      }
    } catch (error) {
      console.error('   ❌ Failed to setup GitHub Pages:', error.message);

      console.log('\n   💡 Manual GitHub Pages setup required:');
      console.log(
        `      1. Go to: https://github.com/${owner}/${repo}/settings/pages`
      );
      console.log(`      2. Source: Deploy from a branch → ${defaultBranch} → /docs`);
      console.log(
        '      3. Or set Build and deployment source to "GitHub Actions"'
      );
      console.log(
        `      4. Your site will be available at: https://${owner}.github.io/${repo}`
      );
    }
  }

  /**
   * Configure GitHub Actions workflow approval settings
   */
  async configureActionsWorkflowApproval(githubService, owner, repo) {
    console.log('⚙️  Configuring GitHub Actions workflow permissions...');

    try {
      if (this.options.dryRun) {
        console.log(
          '   🔍 DRY RUN: Would configure GitHub Actions workflow approval settings'
        );
        return;
      }

      await githubService.configureActionsWorkflowApproval(owner, repo);
    } catch (error) {
      console.error(
        '   ❌ Failed to configure Actions workflow permissions:',
        error.message
      );

      console.log('\n   💡 Manual GitHub Actions setup required:');
      console.log(
        `      1. Go to: https://github.com/${owner}/${repo}/settings/actions`
      );
      console.log(
        '      2. Under "Fork pull request workflows from outside collaborators"'
      );
      console.log(
        '      3. Select: "Require approval for first-time contributors who are new to GitHub"'
      );
      console.log(
        '         (This provides balanced security for new GitHub users while allowing experienced contributors)'
      );
      console.log('      4. Click "Save"');
    }
  }
}
