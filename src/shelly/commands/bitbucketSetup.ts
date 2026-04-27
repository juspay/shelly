import { BitbucketService } from '../services/bitbucketService.js';
import inquirer from 'inquirer';

interface BitbucketSetupOptions {
  cwd?: string;
  force?: boolean;
  dryRun?: boolean;
  repoSlug?: string;
  workspace?: string;
}

interface RepoUpdateSettings {
  description?: string;
  is_private?: boolean;
  has_issues?: boolean;
  has_wiki?: boolean;
  fork_policy?: 'allow_forks' | 'no_public_forks' | 'no_forks';
}

export class BitbucketSetupCommand {
  options: {
    cwd: string;
    force: boolean;
    dryRun: boolean;
    repoSlug?: string;
    workspace?: string;
  };

  constructor(options: BitbucketSetupOptions = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      force: options.force || false,
      dryRun: options.dryRun || false,
      repoSlug: options.repoSlug,
      workspace: options.workspace,
    };
  }

  async execute() {
    console.log('🚀 BitBucket Repository Setup (Juspay Internal)');
    console.log('===============================================\n');

    try {
      // Step 1: Determine workspace and repository
      let workspace: string | undefined = this.options.workspace;
      let repoSlug: string | undefined = this.options.repoSlug;

      // If workspace or repoSlug not provided, try to detect from git remote
      if (!workspace || !repoSlug) {
        console.log('🔍 Detecting workspace/repository from git remote...');
        try {
          // Detect from git config without creating service
          const repoInfo = await BitbucketService.detectRepositoryFromGit(
            this.options.cwd
          );

          if (!workspace) {
            workspace = repoInfo.workspace;
          }
          if (!repoSlug) {
            repoSlug = repoInfo.repoSlug;
          }

          console.log(`✅ Detected from git remote: ${workspace}/${repoSlug}`);
        } catch (error) {
          if (!this.options.workspace && !this.options.repoSlug) {
            throw new Error(
              'Could not determine workspace and repository.\n\n' +
                '❌ Not in a git repository or no BitBucket remote configured.\n\n' +
                '💡 Solutions:\n' +
                '   1. Run from a directory with BitBucket git remote, or\n' +
                '   2. Specify explicitly: --workspace <workspace> --repo-slug <repo>\n' +
                '   3. Set environment variable: export BITBUCKET_WORKSPACE=<workspace>'
            );
          }
          throw error;
        }
      }

      // Ensure we have both workspace and repoSlug
      if (!workspace || !repoSlug) {
        throw new Error(
          'Both workspace and repository slug are required.\n\n' +
            '💡 Specify: --workspace <workspace> --repo-slug <repo>'
        );
      }

      // Step 2: Initialize BitBucket service with confirmed workspace
      const bitbucketService = new BitbucketService(
        undefined,
        undefined,
        workspace
      );

      // Validate credentials
      console.log('🔍 Validating BitBucket credentials...');
      const userInfo = await bitbucketService.validateCredentials();
      console.log(
        `✅ Authenticated as: ${userInfo.displayName} (@${userInfo.username})`
      );
      console.log(`📋 Workspace: ${workspace}`);

      // Get repository details
      const repo = await bitbucketService.getRepository(workspace, repoSlug);
      const mainBranch = await bitbucketService.getMainBranch(
        workspace,
        repoSlug
      );
      console.log(`📋 Main branch: ${mainBranch}`);
      console.log(`📋 Repository: ${repo.name}`);
      console.log(`📋 Private: ${repo.is_private ? 'Yes' : 'No'}`);

      // Check permissions
      const permissions = await bitbucketService.checkRepositoryPermissions(
        workspace,
        repoSlug
      );
      if (!permissions.admin && !permissions.write) {
        console.error(
          '❌ Write or admin permissions required for repository configuration'
        );
        console.error(
          '💡 You need at least write access to configure repository settings'
        );
        process.exit(1);
      }

      if (!this.options.force) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Configure BitBucket repository ${workspace}/${repoSlug} with Juspay best practices?`,
            default: true,
          },
        ]);

        if (!proceed) {
          console.log('Operation cancelled.');
          return;
        }
      }

      console.log('\n🔧 Starting repository configuration...\n');

      // 1. Configure Branch Protection
      await this.configureBranchProtection(
        bitbucketService,
        workspace,
        repoSlug,
        mainBranch
      );

      // 2. Setup Default Reviewers
      await this.setupDefaultReviewers(bitbucketService, workspace, repoSlug);

      // 3. Configure Repository Settings
      await this.configureRepositorySettings(
        bitbucketService,
        workspace,
        repoSlug
      );

      console.log('\n🎉 BitBucket repository setup completed successfully!');
      console.log('\n📋 Summary of changes:');
      console.log('   ✅ Branch protection configured for main branch');
      console.log('   ✅ Default reviewers configured');
      console.log('   ✅ Repository settings updated');
      console.log('\n💡 Next steps:');
      console.log('   1. Test creating a PR to verify branch protection');
      console.log('   2. Verify default reviewers are automatically added');
      console.log('   3. Review repository settings on BitBucket');
      console.log(
        `   4. Repository URL: https://bitbucket.org/${workspace}/${repoSlug}`
      );
      console.log('\n💡 To setup CI/CD:');
      console.log('   • Run: shelly organize --ci jenkins');
      console.log('   • This will generate a Jenkinsfile for your project');
    } catch (error) {
      console.error('\n❌ BitBucket setup failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Configure branch protection for main branch
   */
  async configureBranchProtection(
    bitbucketService: BitbucketService,
    workspace: string,
    repoSlug: string,
    mainBranch: string
  ) {
    console.log('🛡️  Configuring branch protection...');

    try {
      if (this.options.dryRun) {
        console.log(
          `   🔍 DRY RUN: Would configure branch protection for ${mainBranch}`
        );
        return;
      }

      const results = await bitbucketService.configureBranchProtection(
        workspace,
        repoSlug,
        mainBranch
      );

      const created = results.filter((r) => r.status === 'created').length;
      const existing = results.filter((r) => r.status === 'exists').length;
      const failed = results.filter((r) => r.status === 'failed').length;

      console.log(
        `   ✅ Branch protection configured: ${created} created, ${existing} already existed`
      );
      if (failed > 0) {
        console.warn(`   ⚠️  ${failed} restrictions failed to create`);
      }

      console.log(`   🔒 Protected branch: ${mainBranch}`);
      console.log('   📋 Applied restrictions:');
      console.log('      • Prevent direct pushes');
      console.log('      • Prevent force pushes');
      console.log('      • Prevent branch deletion');
    } catch (error) {
      console.error(
        '   ❌ Failed to configure branch protection:',
        error.message
      );
      console.log('\n   💡 Manual branch protection setup:');
      console.log(
        `      1. Go to: https://bitbucket.org/${workspace}/${repoSlug}/admin/branch-restrictions`
      );
      console.log(`      2. Add restrictions for branch: ${mainBranch}`);
      console.log('      3. Recommended restrictions:');
      console.log('         • Prevent deletion');
      console.log('         • Prevent rewriting history (force push)');
      console.log('         • Require pull requests');
    }
  }

  /**
   * Setup default reviewers for pull requests
   */
  async setupDefaultReviewers(
    bitbucketService: BitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('👥 Setting up default reviewers...');

    try {
      // Get existing reviewers
      const existingReviewers = await bitbucketService.getDefaultReviewers(
        workspace,
        repoSlug
      );

      if (existingReviewers.length > 0) {
        console.log(
          `   ℹ️  Found ${existingReviewers.length} existing default reviewer(s)`
        );
        existingReviewers.forEach((r) => {
          console.log(`      • ${r.display_name || r.username}`);
        });
      }

      // Prompt for additional reviewers
      if (!this.options.force) {
        const { addReviewers } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'addReviewers',
            message: 'Would you like to add default reviewers?',
            default: existingReviewers.length === 0,
          },
        ]);

        if (!addReviewers) {
          console.log('   ⏭️  Skipping default reviewers setup');
          return;
        }

        const { reviewerInput } = await inquirer.prompt([
          {
            type: 'input',
            name: 'reviewerInput',
            message:
              'Enter reviewer usernames (comma-separated) or leave empty to skip:',
            default: '',
          },
        ]);

        if (!reviewerInput.trim()) {
          console.log('   ⏭️  No reviewers specified');
          return;
        }

        const reviewers = reviewerInput
          .split(',')
          .map((r) => r.trim())
          .filter((r) => r.length > 0);

        if (reviewers.length === 0) {
          console.log('   ⏭️  No valid reviewers provided');
          return;
        }

        if (this.options.dryRun) {
          console.log(
            `   🔍 DRY RUN: Would add reviewers: ${reviewers.join(', ')}`
          );
          return;
        }

        const results = await bitbucketService.setupDefaultReviewers(
          workspace,
          repoSlug,
          reviewers
        );

        const added = results.filter((r) => r.status === 'added').length;
        const existing = results.filter((r) => r.status === 'exists').length;
        const failed = results.filter((r) => r.status === 'failed').length;

        console.log(
          `   ✅ Default reviewers configured: ${added} added, ${existing} already existed`
        );
        if (failed > 0) {
          console.warn(`   ⚠️  ${failed} reviewers failed to add`);
        }
      } else {
        console.log('   ⏭️  Skipping interactive reviewer setup (force mode)');
        console.log(
          '   💡 You can add reviewers manually on BitBucket or run without --force'
        );
      }
    } catch (error) {
      console.error('   ❌ Failed to setup default reviewers:', error.message);
      console.log('\n   💡 Manual default reviewers setup:');
      console.log(
        `      1. Go to: https://bitbucket.org/${workspace}/${repoSlug}/admin/default-reviewers`
      );
      console.log('      2. Add team members as default reviewers');
      console.log(
        '      3. They will be automatically added to all new pull requests'
      );
    }
  }

  /**
   * Configure repository settings
   */
  async configureRepositorySettings(
    bitbucketService: BitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('⚙️  Configuring repository settings...');

    try {
      const settings: RepoUpdateSettings = {
        has_issues: true,
        has_wiki: true,
        fork_policy: 'no_public_forks', // Juspay internal - no public forks
      };

      if (this.options.dryRun) {
        console.log(
          '   🔍 DRY RUN: Would configure repository settings:',
          settings
        );
        return;
      }

      await bitbucketService.updateRepositorySettings(
        workspace,
        repoSlug,
        settings
      );
      console.log('   ✅ Repository settings configured successfully');
      console.log('   📋 Applied settings:');
      console.log('      • Issues tracker: Enabled');
      console.log('      • Wiki: Enabled');
      console.log('      • Fork policy: No public forks (internal use)');
    } catch (error) {
      console.error(
        '   ❌ Failed to configure repository settings:',
        error.message
      );
      console.log('\n   💡 Manual repository settings:');
      console.log(
        `      1. Go to: https://bitbucket.org/${workspace}/${repoSlug}/admin`
      );
      console.log('      2. Configure repository details and features');
      console.log(
        '      3. Set fork policy appropriately for internal projects'
      );
    }
  }
}
