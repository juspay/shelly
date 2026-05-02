import { BitbucketService } from '../services/bitbucketService.js';
import { BitbucketDCService } from '../services/bitbucketDCService.js';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';

type AnyBitbucketService = BitbucketService | BitbucketDCService;

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

const JENKINS_PLACEHOLDERS = [
  {
    key: 'FILL_IN_JIRA_CREDENTIAL_ID',
    desc: 'Jenkins credential ID for JIRA access',
  },
  {
    key: 'FILL_IN_BITBUCKET_CREDENTIAL_ID',
    desc: 'Jenkins credential ID for Bitbucket basic auth',
  },
  {
    key: 'FILL_IN_BOT_EMAIL',
    desc: 'Bot account email (e.g. titan.a@juspay.in)',
  },
  {
    key: 'FILL_IN_BITBUCKET_TOKEN_ID',
    desc: 'Jenkins credential ID for Bitbucket Bearer token',
  },
  {
    key: 'FILL_IN_TITAN_CREDENTIAL_ID',
    desc: 'Jenkins credential ID for Titan hosted git',
  },
  { key: 'FILL_IN_BOT_NAME', desc: 'Bot display name (e.g. Titan)' },
  {
    key: 'FILL_IN_GCP_PROJECT',
    desc: 'Google Cloud project ID (e.g. dev-ai-eta)',
  },
  { key: 'FILL_IN_DEPLOY_COMMAND', desc: "Your project's build/deploy script" },
];

export class BitbucketSetupCommand {
  options: {
    cwd: string;
    force: boolean;
    dryRun: boolean;
    repoSlug?: string;
    workspace?: string;
  };
  private detectedHost = 'bitbucket.org'; // updated during execute() from git remote

  constructor(options: BitbucketSetupOptions = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      force: options.force || false,
      dryRun: options.dryRun || false,
      repoSlug: options.repoSlug,
      workspace: options.workspace,
    };
  }

  private makeService(
    auth: { token?: string; username?: string; password?: string },
    workspace: string
  ): AnyBitbucketService {
    const isDataCenter = BitbucketService.isDataCenterHost(this.detectedHost);
    if (isDataCenter) {
      return auth.token
        ? BitbucketDCService.fromToken(this.detectedHost, auth.token, workspace)
        : BitbucketDCService.fromAppPassword(
            this.detectedHost,
            auth.username!,
            auth.password!,
            workspace
          );
    }
    return auth.token
      ? BitbucketService.fromToken(auth.token, workspace)
      : BitbucketService.fromAppPassword(
          auth.username!,
          auth.password!,
          workspace
        );
  }

  /**
   * Prompt user for Bitbucket credentials if not in environment.
   * Prefers Bearer token; falls back to username + App Password.
   * Returns null if the user chooses to skip — caller should fall back to offline mode.
   */
  async promptForCredentials(): Promise<AnyBitbucketService | null> {
    const envToken =
      process.env.BITBUCKET_TOKEN || process.env.BITBUCKET_ACCESS_TOKEN;
    const envUsername = process.env.BITBUCKET_USERNAME;
    const envAppPassword = process.env.BITBUCKET_APP_PASSWORD;
    const envWorkspace =
      process.env.BITBUCKET_WORKSPACE || this.options.workspace;

    const isDataCenter = BitbucketService.isDataCenterHost(this.detectedHost);
    const tokenLabel = isDataCenter
      ? 'HTTP access token (BBDC-*)'
      : 'Personal access token';
    const tokenSettingsPath = isDataCenter
      ? `https://${this.detectedHost}/plugins/servlet/access-tokens/manage`
      : 'bitbucket.org → Settings → Personal access tokens';

    if (envToken && envWorkspace) {
      console.log('✅ Using Bearer token from environment');
      return this.makeService({ token: envToken }, envWorkspace);
    }

    if (envUsername && envAppPassword && envWorkspace) {
      console.log('✅ Using App Password credentials from environment');
      return this.makeService(
        { username: envUsername, password: envAppPassword },
        envWorkspace
      );
    }

    console.log('\n🔑 Bitbucket Authentication');
    console.log(
      `   ${isDataCenter ? '🏢 Data Center / Server' : '☁️  Cloud'} instance: ${this.detectedHost}`
    );
    console.log(`   ${tokenLabel} recommended  (${tokenSettingsPath})`);
    console.log('   App password also works   (Settings → App passwords)\n');

    const { authType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'authType',
        message: 'How would you like to authenticate?',
        choices: [
          { name: 'Bearer token (recommended)', value: 'token' },
          { name: 'Username + App Password', value: 'basic' },
          { name: 'Skip — show me the setup commands', value: 'skip' },
        ],
      },
    ]);

    if (authType === 'skip') return null;

    if (authType === 'token') {
      const { token, workspace } = await inquirer.prompt([
        {
          type: 'password',
          name: 'token',
          message: 'Bitbucket Bearer token:',
          mask: '*',
          validate: (v: string) => (v.trim() ? true : 'Token is required'),
        },
        {
          type: 'input',
          name: 'workspace',
          message: 'Bitbucket workspace slug:',
          default: envWorkspace || '',
          validate: (v: string) => (v.trim() ? true : 'Workspace is required'),
        },
      ]);
      return this.makeService({ token: token.trim() }, workspace.trim());
    } else {
      const { username, appPassword, workspace } = await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: 'Bitbucket username (email):',
          default: envUsername || '',
          validate: (v: string) => (v.trim() ? true : 'Username is required'),
        },
        {
          type: 'password',
          name: 'appPassword',
          message: 'Bitbucket App Password:',
          mask: '*',
          validate: (v: string) =>
            v.trim() ? true : 'App Password is required',
        },
        {
          type: 'input',
          name: 'workspace',
          message: 'Bitbucket workspace slug:',
          default: envWorkspace || '',
          validate: (v: string) => (v.trim() ? true : 'Workspace is required'),
        },
      ]);
      return this.makeService(
        { username: username.trim(), password: appPassword.trim() },
        workspace.trim()
      );
    }
  }

  async execute() {
    console.log('🚀 BitBucket Repository Setup (Juspay Internal)');
    console.log('===============================================\n');

    try {
      // Step 1: Resolve workspace and repoSlug from git remote
      let workspace: string | undefined = this.options.workspace;
      let repoSlug: string | undefined = this.options.repoSlug;

      if (!workspace || !repoSlug) {
        console.log('🔍 Detecting workspace/repository from git remote...');
        try {
          const repoInfo = await BitbucketService.detectRepositoryFromGit(
            this.options.cwd
          );
          if (!workspace) workspace = repoInfo.workspace;
          if (!repoSlug) repoSlug = repoInfo.repoSlug;
          this.detectedHost = repoInfo.host;
          const variant = BitbucketService.isDataCenterHost(repoInfo.host)
            ? 'Data Center'
            : 'Cloud';
          const displayWorkspace = workspace.replace(/^~/, '');
          console.log(
            `✅ Detected: ${displayWorkspace}/${repoSlug} (${variant}: ${repoInfo.host})`
          );
        } catch (error) {
          if (!this.options.workspace && !this.options.repoSlug) {
            throw new Error(
              'Could not determine workspace and repository.\n\n' +
                '❌ Not in a git repository or no BitBucket remote configured.\n\n' +
                '💡 Solutions:\n' +
                '   1. Run from a directory with a BitBucket git remote, or\n' +
                '   2. Specify: --workspace <workspace> --repo-slug <repo>'
            );
          }
          throw error;
        }
      }

      if (!workspace || !repoSlug) {
        throw new Error('Both workspace and repository slug are required.');
      }

      // Step 2: Authenticate (user may skip → offline mode)
      const bitbucketService = await this.promptForCredentials();

      if (!bitbucketService) {
        await this.runOfflineMode(workspace, repoSlug);
        return;
      }

      // Sync workspace from auto-detection
      bitbucketService.workspace = workspace;

      console.log('🔍 Validating credentials...');
      const userInfo = await bitbucketService.validateCredentials();
      console.log(
        `✅ Authenticated as: ${userInfo.displayName} (@${userInfo.username})`
      );
      console.log(`📋 Workspace: ${workspace}`);

      const repo = await bitbucketService.getRepository(workspace, repoSlug);
      const mainBranch = await bitbucketService.getMainBranch(
        workspace,
        repoSlug
      );
      console.log(`📋 Repository: ${repo.name}`);
      console.log(`📋 Main branch: ${mainBranch}`);
      console.log(`📋 Private: ${repo.is_private ? 'Yes' : 'No'}`);

      const permissions = await bitbucketService.checkRepositoryPermissions(
        workspace,
        repoSlug
      );
      if (!permissions.admin && !permissions.write) {
        console.error('❌ Write or admin permissions required');
        process.exit(1);
      }

      if (!this.options.force) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Configure ${workspace}/${repoSlug} with Juspay best practices?`,
            default: true,
          },
        ]);
        if (!proceed) {
          console.log('Operation cancelled.');
          return;
        }
      }

      console.log('\n🔧 Starting repository configuration...\n');

      // Clean up stale read-only restrictions (from older shelly runs) before creating branches
      if ('removeReadOnlyRestrictions' in bitbucketService) {
        const dcSvc =
          bitbucketService as import('../services/bitbucketDCService.js').BitbucketDCService;
        for (const b of ['beta', 'release', mainBranch]) {
          await dcSvc.removeReadOnlyRestrictions(workspace, repoSlug, b);
        }
      }

      // Ensure release and beta branches exist before protecting them
      await this.ensureReleaseBetaBranches(
        bitbucketService,
        workspace,
        repoSlug,
        mainBranch
      );

      await this.configureBranchProtection(
        bitbucketService,
        workspace,
        repoSlug,
        mainBranch
      );
      await this.setupDefaultReviewers(bitbucketService, workspace, repoSlug);
      await this.configureRepositorySettings(
        bitbucketService,
        workspace,
        repoSlug
      );

      // Step 3: Jenkins CI/CD setup — PR targets beta
      await this.setupJenkinsCI(
        bitbucketService,
        workspace,
        repoSlug,
        mainBranch
      );

      console.log('\n🎉 BitBucket repository setup completed!');
      console.log('\n📋 Summary:');
      console.log('   ✅ release + beta branches created');
      console.log('   ✅ Branch protection configured (release, beta, main)');
      console.log('   ✅ Default reviewers configured');
      console.log('   ✅ Repository settings updated');
      console.log('\n💡 Branch flow: feature/* → beta → release');
      console.log('\n💡 Next steps:');
      console.log(
        '   1. Fill in FILL_IN_* placeholders in Jenkinsfile, then merge the Jenkins PR'
      );
      console.log(
        `   2. Repository: https://${this.detectedHost}/${workspace}/${repoSlug}`
      );
    } catch (error) {
      console.error('\n❌ BitBucket setup failed:', error.message);
      if (process.env.DEBUG) console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Offline mode: no credentials provided.
   * Generates the Jenkinsfile locally and prints manual setup commands.
   */
  async runOfflineMode(workspace: string, repoSlug: string) {
    console.log('\n📋 No credentials provided — running offline setup\n');

    // Print credential setup commands
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Step 1 — Set credentials and re-run');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   Option A — Bearer token (recommended):');
    console.log('     1. Go to: https://bitbucket.org/account/settings/api');
    console.log(
      '     2. Create a token with: Repositories (Read/Write/Admin) + Pull Requests (Read/Write)'
    );
    console.log('     3. Run:');
    console.log('        export BITBUCKET_TOKEN=<your-token>');
    console.log(`        export BITBUCKET_WORKSPACE=${workspace}`);
    console.log('        shelly bitbucket\n');
    console.log('   Option B — App Password:');
    console.log(
      '     1. Go to: https://bitbucket.org/account/settings/app-passwords/'
    );
    console.log(
      '     2. Create with: Repositories (Read/Write/Admin) + Pull Requests (Read/Write)'
    );
    console.log('     3. Run:');
    console.log('        export BITBUCKET_USERNAME=<your-email@juspay.in>');
    console.log('        export BITBUCKET_APP_PASSWORD=<your-app-password>');
    console.log(`        export BITBUCKET_WORKSPACE=${workspace}`);
    console.log('        shelly bitbucket\n');

    // Generate Jenkinsfile locally
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 Step 2 — Jenkinsfile (generated locally)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const jenkinsPath = path.join(this.options.cwd, 'Jenkinsfile');
    let exists = false;
    try {
      await fs.access(jenkinsPath);
      exists = true;
    } catch {
      /* doesn't exist */
    }

    let writeFile = true;
    if (exists) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Jenkinsfile already exists. Overwrite?',
          default: false,
        },
      ]);
      writeFile = overwrite;
    }

    if (writeFile) {
      const content = this.generateJenkinsfileContent(workspace, repoSlug);
      await fs.writeFile(jenkinsPath, content, 'utf8');
      console.log(`   ✅ Jenkinsfile written to: ${jenkinsPath}`);
    } else {
      console.log('   ⏭️  Keeping existing Jenkinsfile');
    }

    console.log('\n   📝 Fill in these placeholders before pushing:');
    JENKINS_PLACEHOLDERS.forEach((p) => {
      console.log(`      • ${p.key}`);
      console.log(`        → ${p.desc}`);
    });

    console.log('\n   Then push a PR to beta manually:');
    console.log(
      '      git checkout -b setup/jenkins-ci beta  # branch from beta'
    );
    console.log(
      '      git add Jenkinsfile && git commit -m "chore: add Jenkins CI/CD pipeline"'
    );
    console.log('      git push origin setup/jenkins-ci');
    console.log(
      `      # Open PR → beta at: https://bitbucket.org/${workspace}/${repoSlug}/pull-requests/new`
    );

    // Print manual branch protection steps
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛡️  Step 3 — Branch protection (manual)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(
      `   URL: https://bitbucket.org/${workspace}/${repoSlug}/admin/branch-restrictions`
    );
    console.log('   Add these restrictions for branches: release, beta');
    console.log('      • Prevent direct pushes');
    console.log('      • Prevent force pushes');
    console.log('      • Prevent deletion');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 Step 4 — Default reviewers (manual)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(
      `   URL: https://bitbucket.org/${workspace}/${repoSlug}/admin/default-reviewers`
    );
    console.log(
      '   Add your team members so they are auto-added to every PR.\n'
    );

    console.log(
      'Once credentials are set, re-run `shelly bitbucket` to apply API settings automatically.'
    );
  }

  /**
   * Create beta and release branches via API if they don't exist, then set release as default branch.
   * Uses the Bitbucket REST API — no git push needed, so branch protection won't block this.
   */
  async ensureReleaseBetaBranches(
    bitbucketService: AnyBitbucketService,
    workspace: string,
    repoSlug: string,
    mainBranch: string
  ) {
    console.log('🌿 Ensuring release and beta branches exist...');

    if (this.options.dryRun) {
      console.log(
        `   🔍 DRY RUN: Would create branches: beta, release (from ${mainBranch}), set default → release`
      );
      return;
    }

    // Get the current HEAD commit to use as startPoint
    let startPoint = `refs/heads/${mainBranch}`;
    try {
      const { execSync } = await import('child_process');
      const sha = execSync('git rev-parse HEAD', {
        cwd: this.options.cwd,
        stdio: 'pipe',
      })
        .toString()
        .trim();
      if (sha) startPoint = sha;
    } catch {
      /* use branch ref fallback */
    }

    for (const branchName of ['beta', 'release']) {
      try {
        const exists = await bitbucketService.branchExists(
          workspace,
          repoSlug,
          branchName
        );
        if (exists) {
          console.log(`   ✅ ${branchName} already exists`);
          continue;
        }

        // If the branch doesn't exist but old read-only restrictions block creation, remove them first
        if ('removeReadOnlyRestrictions' in bitbucketService) {
          await (
            bitbucketService as import('../services/bitbucketDCService.js').BitbucketDCService
          ).removeReadOnlyRestrictions(workspace, repoSlug, branchName);
        }

        await bitbucketService.createBranch(
          workspace,
          repoSlug,
          branchName,
          startPoint
        );
        console.log(`   ✅ Created: ${branchName}`);
      } catch (err) {
        console.warn(`   ⚠️  Could not create ${branchName}: ${err.message}`);
      }
    }

    // Set release as the default branch
    try {
      await bitbucketService.setDefaultBranch(workspace, repoSlug, 'release');
      console.log('   ✅ Default branch set to: release');
    } catch (err) {
      console.warn(`   ⚠️  Could not set default branch: ${err.message}`);
    }
  }

  async configureBranchProtection(
    bitbucketService: AnyBitbucketService,
    workspace: string,
    repoSlug: string,
    mainBranch: string
  ) {
    console.log('🛡️  Configuring branch protection...');

    try {
      if (this.options.dryRun) {
        console.log(
          `   🔍 DRY RUN: Would protect branches: release, beta, ${mainBranch}`
        );
        return;
      }

      // Only protect branches that actually exist in the repo (avoid DELETED badge in UI)
      const candidates = [...new Set([mainBranch, 'release', 'beta'])];
      const branchesToProtect: string[] = [];
      for (const b of candidates) {
        const exists = await bitbucketService.branchExists(
          workspace,
          repoSlug,
          b
        );
        if (exists) {
          branchesToProtect.push(b);
        } else {
          console.log(
            `   ⏭️  Skipping protection for ${b} (branch does not exist yet)`
          );
        }
      }

      for (const branch of branchesToProtect) {
        const results = await bitbucketService.configureBranchProtection(
          workspace,
          repoSlug,
          branch
        );
        const created = results.filter((r) => r.status === 'created').length;
        const existing = results.filter((r) => r.status === 'exists').length;
        console.log(
          `   🔒 ${branch}: ${created} created, ${existing} already existed`
        );
      }
    } catch (error) {
      console.error(
        '   ❌ Failed to configure branch protection:',
        error.message
      );
      console.log(
        `   💡 Manual: https://bitbucket.org/${workspace}/${repoSlug}/admin/branch-restrictions`
      );
    }
  }

  async setupDefaultReviewers(
    bitbucketService: AnyBitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('👥 Setting up default reviewers...');

    try {
      const existingReviewers = await bitbucketService.getDefaultReviewers(
        workspace,
        repoSlug
      );
      if (existingReviewers.length > 0) {
        console.log(`   ℹ️  ${existingReviewers.length} existing reviewer(s):`);
        existingReviewers.forEach(
          (r: { display_name?: string; username?: string; name?: string }) =>
            console.log(`      • ${r.display_name || r.username || r.name}`)
        );
      }

      if (this.options.force) {
        console.log('   ⏭️  Skipping interactive reviewer setup (force mode)');
        return;
      }

      const { addReviewers } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addReviewers',
          message: 'Add default reviewers?',
          default: existingReviewers.length === 0,
        },
      ]);
      if (!addReviewers) {
        console.log('   ⏭️  Skipping default reviewers');
        return;
      }

      const { reviewerInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'reviewerInput',
          message:
            'Reviewer usernames/slugs (comma-separated, not display names e.g. john.doe, not "John Doe"):',
          default: '',
        },
      ]);

      const reviewers = reviewerInput
        .split(',')
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);
      if (reviewers.length === 0) {
        console.log('   ⏭️  No reviewers specified');
        return;
      }

      if (this.options.dryRun) {
        console.log(`   🔍 DRY RUN: Would add: ${reviewers.join(', ')}`);
        return;
      }

      const results = await bitbucketService.setupDefaultReviewers(
        workspace,
        repoSlug,
        reviewers
      );
      const added = results.filter((r) => r.status === 'added').length;
      const unsupported = results.filter(
        (r) => r.status === 'unsupported'
      ).length;
      if (unsupported > 0) {
        console.log(
          `   ℹ️  Set reviewers manually: ${this.detectedHost ? `https://${this.detectedHost}` : 'https://bitbucket.org'}/projects/${workspace}/repos/${repoSlug}/settings/default-reviewers`
        );
      } else if (added > 0) {
        console.log(`   ✅ ${added} reviewer(s) added`);
      }
    } catch (error) {
      console.error('   ❌ Failed to setup reviewers:', error.message);
    }
  }

  async configureRepositorySettings(
    bitbucketService: AnyBitbucketService,
    workspace: string,
    repoSlug: string
  ) {
    console.log('⚙️  Configuring repository settings...');

    try {
      const settings: RepoUpdateSettings = {
        has_issues: true,
        has_wiki: true,
        fork_policy: 'no_public_forks',
      };

      if (this.options.dryRun) {
        console.log('   🔍 DRY RUN: Would apply:', settings);
        return;
      }

      await bitbucketService.updateRepositorySettings(
        workspace,
        repoSlug,
        settings
      );
      console.log(
        '   ✅ Issues enabled, wiki enabled, fork policy: no public forks'
      );
    } catch (error) {
      console.error('   ❌ Failed to configure settings:', error.message);
    }
  }

  /**
   * Generate a cadence-style Jenkinsfile with FILL_IN placeholders.
   * workspace and repoSlug are auto-filled; everything else needs manual input.
   */
  generateJenkinsfileContent(workspace: string, repoSlug: string): string {
    return `pipeline {
  agent {
    label 'vayu'
  }
  parameters {
    booleanParam(defaultValue: true, description: 'Enable AI Review', name: 'isAIReviewNeeded')
    booleanParam(defaultValue: true, description: 'Enable AI Description', name: 'isAIDescriptionNeeded')
  }
  environment {
    JIRA            = credentials('FILL_IN_JIRA_CREDENTIAL_ID')
    BITBUCKET       = credentials('FILL_IN_BITBUCKET_CREDENTIAL_ID')
    BITBUCKET_USERNAME = 'FILL_IN_BOT_EMAIL'
    BITBUCKET_TOKEN = credentials('FILL_IN_BITBUCKET_TOKEN_ID')
    TITAN           = credentials('FILL_IN_TITAN_CREDENTIAL_ID')
    GIT_AUTHOR_NAME    = 'FILL_IN_BOT_NAME'
    GIT_AUTHOR_EMAIL   = 'FILL_IN_BOT_EMAIL'
    GIT_COMMITTER_NAME = 'FILL_IN_BOT_NAME'
    GIT_COMMITTER_EMAIL = 'FILL_IN_BOT_EMAIL'
    GIT_USERNAME    = 'FILL_IN_BOT_NAME'
    GIT_EMAIL       = 'FILL_IN_BOT_EMAIL'
    PNPM_STORE_DIR  = "\${JENKINS_HOME}/.pnpm-store"
    GIT_URL         = 'bitbucket.juspay.net/scm/${workspace}/${repoSlug}.git'
    GOOGLE_AI_API_KEY               = credentials('GEMINI_API_KEY')
    GOOGLE_APPLICATION_CREDENTIALS = credentials('VERTEX_COUNT')
    GOOGLE_VERTEX_PROJECT  = 'FILL_IN_GCP_PROJECT'
    VERTEX_MODEL_ID        = 'gemini-2.5-pro'
    GOOGLE_VERTEX_LOCATION = 'us-central1'
  }
  stages {
    stage('Setup') {
      when {
        allOf {
          anyOf {
            branch '${workspace}-*'
            branch 'beta'
            branch 'release'
          }
          not { expression { shouldSkipCI() } }
        }
      }
      steps {
        script {
          env.TITAN_USER  = URLEncoder.encode(TITAN_USR, 'UTF-8')
          env.TITAN_TOKEN = URLEncoder.encode(TITAN_PSW, 'UTF-8')

          def branchName = env.BRANCH_NAME
          def skipCommitValidation = branchName in ['release', 'beta']

          if (!skipCommitValidation) {
            def commitCount = sh(
              returnStdout: true,
              script: 'git rev-list --count origin/beta..HEAD',
              label: 'Count commits between beta and HEAD'
            ).trim()
            if (commitCount != '1') {
              currentBuild.result = 'ABORTED'
              error "❌ Branch must contain exactly 1 commit, found \${commitCount}"
            }
          }

          sh(script: 'pnpm config set registry https://registry.npmmirror.com', label: 'Configure pnpm registry')
          sh(script: 'pnpm install', label: 'Install dependencies')
          sh(script: 'curl https://bun.sh/install | bash', label: 'Install Bun')
          sh(script: 'git log -1 --format=%s | npx commitlint', label: 'Validate commit message')
        }
      }
    }
    stage('Parallel Execution') {
      parallel {
        stage('Build & Deploy') {
          when {
            allOf {
              anyOf {
                branch '${workspace}-*'
                branch 'beta'
                branch 'release'
              }
              not { expression { shouldSkipCI() } }
            }
          }
          steps {
            script {
              // FILL_IN: replace with your build/deploy command
              sh(script: 'FILL_IN_DEPLOY_COMMAND', label: 'Deploy')
            }
          }
        }
        stage('Auto Description') {
          when {
            allOf {
              branch '${workspace}-*'
              expression { params.isAIDescriptionNeeded }
            }
          }
          steps {
            script {
              catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                sh(
                  script: "pnpm describe --workspace ${workspace} --repository ${repoSlug} --branch \${env.BRANCH_NAME} --verbose",
                  label: 'Generate AI PR description'
                )
              }
            }
          }
        }
        stage('Auto Review') {
          when {
            allOf {
              branch '${workspace}-*'
              expression { params.isAIReviewNeeded }
            }
          }
          steps {
            script {
              catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                sh(
                  script: "pnpm review --workspace ${workspace} --repository ${repoSlug} --branch \${env.BRANCH_NAME} --verbose",
                  label: 'AI code review'
                )
              }
            }
          }
        }
      }
    }
  }
}

def shouldSkipCI() {
  def strict = sh(script: "git log -1 --pretty=%B | grep -F -ie '[skip ci strict]' -e '[ci skip strict]'", returnStatus: true, label: 'Check strict skip') == 0
  if (strict) return true
  if (env.BRANCH_NAME == 'release') return false
  return sh(script: "git log -1 --pretty=%B | grep -F -ie '[skip ci]' -e '[ci skip]'", returnStatus: true, label: 'Check skip ci') == 0
}
`;
  }

  /**
   * Create a branch, commit Jenkinsfile, push, and open a PR on Bitbucket.
   * Restores the original branch on success or failure.
   */
  async setupJenkinsCI(
    bitbucketService: AnyBitbucketService,
    workspace: string,
    repoSlug: string,
    mainBranch: string
  ) {
    console.log('\n🔧 Jenkins CI/CD Setup');

    if (!this.options.force) {
      const { setup } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'setup',
          message:
            'Set up Jenkins CI/CD? (creates a PR with a pre-filled Jenkinsfile)',
          default: true,
        },
      ]);
      if (!setup) {
        console.log('   ⏭️  Skipping Jenkins setup');
        return;
      }
    }

    const jenkinsPath = path.join(this.options.cwd, 'Jenkinsfile');
    const branchName = 'setup/jenkins-ci';

    try {
      // Check if Jenkinsfile already exists
      let exists = false;
      try {
        await fs.access(jenkinsPath);
        exists = true;
      } catch {
        /* doesn't exist */
      }

      if (exists && !this.options.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Jenkinsfile already exists. Overwrite?',
            default: false,
          },
        ]);
        if (!overwrite) {
          console.log('   ⏭️  Keeping existing Jenkinsfile');
          return;
        }
      }

      if (this.options.dryRun) {
        console.log(
          `   🔍 DRY RUN: Would create branch ${branchName}, commit Jenkinsfile, open PR → ${mainBranch}`
        );
        console.log('   📝 Placeholders user would need to fill:');
        JENKINS_PLACEHOLDERS.forEach((p) =>
          console.log(`      • ${p.key} — ${p.desc}`)
        );
        return;
      }

      const { execSync } = await import('child_process');

      // Check repo has at least one commit (HEAD must exist)
      try {
        execSync('git rev-parse HEAD', {
          cwd: this.options.cwd,
          stdio: 'pipe',
        });
      } catch {
        console.log(
          '   ⚠️  Repository has no commits yet — cannot create a PR branch.'
        );
        console.log('   💡 Make an initial commit first:');
        console.log('      git commit --allow-empty -m "Initial commit"');
        console.log('      git push -u origin master');
        console.log('   Then re-run: shelly bitbucket');
        return;
      }

      // Save current branch to restore later
      const originalBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.options.cwd,
        stdio: 'pipe',
      })
        .toString()
        .trim();

      try {
        // Fetch remote refs so newly-created branches (beta/release) are visible locally
        try {
          execSync('git fetch origin', {
            cwd: this.options.cwd,
            stdio: 'pipe',
          });
        } catch {
          /* non-fatal */
        }

        // Create branch from mainBranch (force-overwrite if it already exists locally)
        try {
          execSync(`git branch -D ${branchName}`, {
            cwd: this.options.cwd,
            stdio: 'pipe',
          });
        } catch {
          /* branch didn't exist locally */
        }

        // Base the Jenkins branch off beta (preferred) or mainBranch as fallback
        const baseRef = (() => {
          try {
            execSync('git ls-remote --exit-code origin beta', {
              cwd: this.options.cwd,
              stdio: 'pipe',
            });
            return 'origin/beta';
          } catch {
            /* beta doesn't exist yet */
          }
          try {
            execSync(`git ls-remote --exit-code origin ${mainBranch}`, {
              cwd: this.options.cwd,
              stdio: 'pipe',
            });
            return `origin/${mainBranch}`;
          } catch {
            return null;
          }
        })();

        if (baseRef) {
          execSync(`git checkout -b ${branchName} ${baseRef}`, {
            cwd: this.options.cwd,
            stdio: 'pipe',
          });
        } else {
          execSync(`git checkout -b ${branchName}`, {
            cwd: this.options.cwd,
            stdio: 'pipe',
          });
        }

        // Write Jenkinsfile
        const content = this.generateJenkinsfileContent(workspace, repoSlug);
        await fs.writeFile(jenkinsPath, content, 'utf8');

        // Write Bitbucket CI/CD supporting files alongside Jenkinsfile
        const writtenFiles = ['Jenkinsfile'];
        const templatesRoot = new URL('../templates', import.meta.url).pathname;
        const scriptFiles: Array<{ src: string; dest: string; mode?: number }> =
          [
            {
              src: 'scripts/git-hooks/commit-msg.sh.template',
              dest: 'scripts/git-hooks/commit-msg.sh',
              mode: 0o755,
            },
            {
              src: 'scripts/git-hooks/pre-commit.sh.template',
              dest: 'scripts/git-hooks/pre-commit.sh',
              mode: 0o755,
            },
            {
              src: 'scripts/git-hooks/pre-push.sh.template',
              dest: 'scripts/git-hooks/pre-push.sh',
              mode: 0o755,
            },
            {
              src: 'scripts/git-hooks/prepare-commit-msg.sh.template',
              dest: 'scripts/git-hooks/prepare-commit-msg.sh',
              mode: 0o755,
            },
            {
              src: 'scripts/workflow/deploy.ts.template',
              dest: 'scripts/workflow/deploy.ts',
            },
            {
              src: 'commitlint.config.cjs.template',
              dest: 'commitlint.config.cjs',
            },
          ];
        for (const f of scriptFiles) {
          const srcPath = path.join(templatesRoot, f.src);
          const destPath = path.join(this.options.cwd, f.dest);
          try {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            const fileContent = await fs.readFile(srcPath, 'utf8');
            await fs.writeFile(destPath, fileContent, { mode: f.mode });
            writtenFiles.push(f.dest);
          } catch {
            /* template missing — skip */
          }
        }

        // Commit everything
        execSync(`git add ${writtenFiles.map((f) => `"${f}"`).join(' ')}`, {
          cwd: this.options.cwd,
          stdio: 'pipe',
        });
        execSync(
          `git commit -m "chore: add Jenkins CI/CD pipeline setup\n\nGenerated by shelly — fill in FILL_IN_* placeholders before merging"`,
          { cwd: this.options.cwd, stdio: 'pipe' }
        );

        // Push
        console.log(`   📤 Pushing branch ${branchName}...`);
        execSync(`git push origin ${branchName} --force`, {
          cwd: this.options.cwd,
          stdio: 'inherit',
        });

        // Create PR
        console.log('   🔗 Creating pull request...');
        const prDescription = [
          '## Jenkins CI/CD Pipeline Setup',
          '',
          'Auto-generated by [shelly](https://github.com/juspay/shelly) based on the cadence pipeline pattern.',
          '',
          '## Placeholders to fill before merging',
          '',
          '| Placeholder | Description |',
          '|---|---|',
          ...JENKINS_PLACEHOLDERS.map((p) => `| \`${p.key}\` | ${p.desc} |`),
          '',
          '## Branch policy',
          'Pipeline triggers on: `release`, `beta`, and `' +
            workspace +
            '-*` branches.',
        ].join('\n');

        // PR targets beta; if beta doesn't exist on remote yet, fall back to mainBranch
        const prDestBranch = (() => {
          try {
            execSync('git ls-remote --exit-code origin beta', {
              cwd: this.options.cwd,
              stdio: 'pipe',
            });
            return 'beta';
          } catch {
            return mainBranch;
          }
        })();

        const pr = await bitbucketService.createPullRequest(
          workspace,
          repoSlug,
          {
            title: 'chore: add Jenkins CI/CD pipeline setup',
            sourceBranch: branchName,
            destBranch: prDestBranch,
            description: prDescription,
          }
        );

        const prUrl =
          pr.links?.html?.href || pr.links?.self?.[0]?.href || pr.id;
        if ((pr as { existing?: boolean }).existing) {
          console.log(`\n   ℹ️  PR already open: ${prUrl}`);
          console.log(
            '      (Jenkinsfile was updated with --force push; review the existing PR)'
          );
        } else {
          console.log(`\n   ✅ PR created: ${prUrl}`);
        }
        console.log(
          '\n   📝 Fill in these placeholders in Jenkinsfile before merging:'
        );
        JENKINS_PLACEHOLDERS.forEach((p) => {
          console.log(`      • ${p.key}`);
          console.log(`        → ${p.desc}`);
        });
      } finally {
        // Always restore original branch
        try {
          execSync(`git checkout ${originalBranch}`, {
            cwd: this.options.cwd,
            stdio: 'pipe',
          });
        } catch {
          /* ignore restore error */
        }
      }
    } catch (error) {
      console.error('   ❌ Jenkins setup failed:', error.message);
      console.log(
        '   💡 You can create the Jenkinsfile manually — run: shelly organize --ci jenkins'
      );
    }
  }
}
