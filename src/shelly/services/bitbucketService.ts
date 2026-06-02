// @ts-ignore - bitbucket package uses CommonJS, handle import manually
import BitbucketLib from 'bitbucket';
import fs from 'fs/promises';
import path from 'path';

// Handle CommonJS module in ESM context
// @ts-ignore
const Bitbucket = BitbucketLib.Bitbucket || BitbucketLib;

interface GitRemoteConfig {
  [remoteName: string]: {
    url?: string;
    fetch?: string;
  };
}

interface GitConfig {
  remote: GitRemoteConfig;
  [section: string]: GitRemoteConfig | Record<string, string>;
}

interface BranchRestriction {
  kind: string;
  pattern: string;
  users?: Array<{ uuid: string }>;
  groups?: Array<{ slug: string }>;
  value?: number;
}

export class BitbucketService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any; // Using any due to bitbucket package type limitations
  workspace: string;

  constructor(
    username?: string,
    appPassword?: string,
    workspace?: string,
    token?: string
  ) {
    const bbToken =
      token ||
      process.env.BITBUCKET_TOKEN ||
      process.env.BITBUCKET_ACCESS_TOKEN;
    const bbUsername = username || process.env.BITBUCKET_USERNAME;
    const bbAppPassword = appPassword || process.env.BITBUCKET_APP_PASSWORD;
    const bbWorkspace = workspace || process.env.BITBUCKET_WORKSPACE;

    if (!bbToken && (!bbUsername || !bbAppPassword)) {
      throw new Error(
        'BitBucket credentials required.\n\n' +
          'Option 1 — Bearer Token (recommended):\n' +
          '  export BITBUCKET_TOKEN=<your-bearer-token>\n\n' +
          'Option 2 — App Password:\n' +
          '  export BITBUCKET_USERNAME=<your-email@juspay.in>\n' +
          '  export BITBUCKET_APP_PASSWORD=<your-app-password>\n\n' +
          'To create a Bearer token: bitbucket.org → Settings → Personal access tokens\n' +
          'To create an App Password: bitbucket.org → Settings → App passwords'
      );
    }

    if (!bbWorkspace) {
      throw new Error(
        'BitBucket workspace required. Either:\n' +
          '  1. Set BITBUCKET_WORKSPACE environment variable, or\n' +
          '  2. Pass workspace explicitly, or\n' +
          '  3. Run from a directory with a BitBucket git remote (will auto-detect)'
      );
    }

    this.workspace = bbWorkspace;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client = new (Bitbucket as any)({
      auth: bbToken
        ? { token: bbToken }
        : { username: bbUsername, password: bbAppPassword },
    });
  }

  static fromToken(token: string, workspace: string): BitbucketService {
    return new BitbucketService(undefined, undefined, workspace, token);
  }

  static fromAppPassword(
    username: string,
    appPassword: string,
    workspace: string
  ): BitbucketService {
    return new BitbucketService(username, appPassword, workspace);
  }

  static isDataCenterHost(host: string): boolean {
    return host !== 'bitbucket.org';
  }

  /**
   * Static method to detect repository info from git config without creating service
   */
  static async detectRepositoryFromGit(cwd = process.cwd()) {
    try {
      const gitConfig = await BitbucketService.parseGitConfigStatic(cwd);
      const { host, workspace, repoSlug } =
        BitbucketService.parseRemoteUrlStatic(gitConfig.remote?.origin?.url);

      if (!workspace || !repoSlug) {
        throw new Error(
          'Could not determine BitBucket workspace and repository from git remote'
        );
      }

      return { host, workspace, repoSlug };
    } catch (error) {
      throw new Error(`Failed to detect repository from git: ${error.message}`);
    }
  }

  /**
   * Static version of parseGitConfig for use without instance
   */
  static async parseGitConfigStatic(cwd: string): Promise<GitConfig> {
    try {
      const gitConfigPath = path.join(cwd, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf8');

      const config = { remote: {} };
      let currentSection = null;
      let currentRemote = null;

      for (const line of gitConfig.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const sectionContent = trimmed.slice(1, -1);

          if (
            sectionContent.startsWith('remote "') &&
            sectionContent.endsWith('"')
          ) {
            currentRemote = sectionContent.slice(8, -1);
            currentSection = 'remote';
            if (!config.remote[currentRemote]) {
              config.remote[currentRemote] = {};
            }
          } else {
            currentSection = sectionContent;
            currentRemote = null;
            if (!config[currentSection]) {
              config[currentSection] = {};
            }
          }
        } else if (trimmed.includes('=') && currentSection) {
          const [key, value] = trimmed.split('=', 2);
          const cleanKey = key.trim();
          const cleanValue = value.trim();

          if (currentSection === 'remote' && currentRemote) {
            config.remote[currentRemote][cleanKey] = cleanValue;
          } else {
            config[currentSection][cleanKey] = cleanValue;
          }
        }
      }

      return config;
    } catch (_error) {
      throw new Error('Not a git repository or unable to read git config');
    }
  }

  /**
   * Static version of parseRemoteUrl for use without instance
   */
  static parseRemoteUrlStatic(url: string): {
    host: string;
    workspace: string;
    repoSlug: string;
  } {
    if (!url) {
      throw new Error('No remote URL found');
    }

    // Handle ssh:// URLs: ssh://git@ssh.bitbucket.juspay.net/workspace/repo.git
    // Strip leading "ssh." from hostname — that prefix is SSH-only, the API lives on the bare host
    const sshProtoMatch = url.match(
      /ssh:\/\/git@([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (sshProtoMatch) {
      const host = sshProtoMatch[1].replace(/^ssh\./, '');
      return { host, workspace: sshProtoMatch[2], repoSlug: sshProtoMatch[3] };
    }

    // Handle HTTPS URLs: https://bitbucket.org/workspace/repo.git or https://host/workspace/repo.git
    const httpsMatch = url.match(
      /https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (httpsMatch) {
      return {
        host: httpsMatch[1],
        workspace: httpsMatch[2],
        repoSlug: httpsMatch[3],
      };
    }

    // Handle SCP-style SSH URLs: git@bitbucket.org:workspace/repo.git or git@host:workspace/repo.git
    const sshMatch = url.match(/git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshMatch) {
      return {
        host: sshMatch[1],
        workspace: sshMatch[2],
        repoSlug: sshMatch[3],
      };
    }

    throw new Error(`Unsupported BitBucket remote URL format: ${url}`);
  }

  /**
   * Get repository information from current directory
   */
  async getRepositoryInfo(cwd = process.cwd()) {
    try {
      const gitConfig = await this.parseGitConfig(cwd);
      const { workspace, repoSlug } = this.parseRemoteUrl(
        gitConfig.remote?.origin?.url
      );

      if (!workspace || !repoSlug) {
        throw new Error(
          'Could not determine BitBucket workspace and repository from git remote'
        );
      }

      return { workspace, repoSlug };
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }

  /**
   * Parse git config to get remote URL
   */
  async parseGitConfig(cwd: string): Promise<GitConfig> {
    try {
      const gitConfigPath = path.join(cwd, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf8');

      const config = { remote: {} };
      let currentSection = null;
      let currentRemote = null;

      for (const line of gitConfig.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const sectionContent = trimmed.slice(1, -1);

          // Handle [remote "origin"] format
          if (
            sectionContent.startsWith('remote "') &&
            sectionContent.endsWith('"')
          ) {
            currentRemote = sectionContent.slice(8, -1);
            currentSection = 'remote';
            if (!config.remote[currentRemote]) {
              config.remote[currentRemote] = {};
            }
          } else {
            currentSection = sectionContent;
            currentRemote = null;
            if (!config[currentSection]) {
              config[currentSection] = {};
            }
          }
        } else if (trimmed.includes('=') && currentSection) {
          const [key, value] = trimmed.split('=', 2);
          const cleanKey = key.trim();
          const cleanValue = value.trim();

          if (currentSection === 'remote' && currentRemote) {
            config.remote[currentRemote][cleanKey] = cleanValue;
          } else {
            config[currentSection][cleanKey] = cleanValue;
          }
        }
      }

      return config;
    } catch (_error) {
      throw new Error('Not a git repository or unable to read git config');
    }
  }

  /**
   * Parse BitBucket remote URL to extract workspace and repository slug
   */
  parseRemoteUrl(url: string) {
    return BitbucketService.parseRemoteUrlStatic(url);
  }

  /**
   * Get repository details
   */
  async getRepository(workspace: string, repoSlug: string) {
    try {
      const response = await this.client.repositories.get({
        workspace,
        repo_slug: repoSlug,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get repository information: ${error.message}`);
    }
  }

  /**
   * Get main branch name for repository
   */
  async getMainBranch(workspace: string, repoSlug: string) {
    try {
      const repo = await this.getRepository(workspace, repoSlug);
      return repo.mainbranch?.name || 'main';
    } catch (error) {
      throw new Error(`Failed to get main branch: ${error.message}`);
    }
  }

  /**
   * Create branch restriction (protection)
   */
  async createBranchRestriction(
    workspace: string,
    repoSlug: string,
    restriction: BranchRestriction
  ) {
    try {
      const response = await this.client.repositories.createBranchRestriction({
        workspace,
        repo_slug: repoSlug,
        _body: restriction,
      });

      return response.data;
    } catch (error) {
      if (error.status === 409) {
        throw new Error(
          `Branch restriction already exists for pattern: ${restriction.pattern}`
        );
      }
      throw new Error(`Failed to create branch restriction: ${error.message}`);
    }
  }

  /**
   * List existing branch restrictions
   */
  async listBranchRestrictions(workspace: string, repoSlug: string) {
    try {
      const response = await this.client.repositories.listBranchRestrictions({
        workspace,
        repo_slug: repoSlug,
      });

      return response.data.values || [];
    } catch (error) {
      throw new Error(`Failed to list branch restrictions: ${error.message}`);
    }
  }

  /**
   * Configure comprehensive branch protection for main branch
   */
  async configureBranchProtection(
    workspace: string,
    repoSlug: string,
    branchName: string
  ) {
    try {
      console.log(`🔒 Configuring branch protection for ${branchName}...`);

      // Check existing restrictions
      const existing = await this.listBranchRestrictions(workspace, repoSlug);
      const branchPattern = `${branchName}`;

      // Filter out existing restrictions for this branch
      const existingForBranch = existing.filter(
        (r) => r.pattern === branchPattern
      );

      if (existingForBranch.length > 0) {
        console.log(
          `ℹ️  Some branch restrictions already exist for ${branchName}`
        );
      }

      // Restriction types to apply
      const restrictions = [
        {
          kind: 'push',
          pattern: branchPattern,
          description: 'Prevent direct pushes to main branch',
        },
        {
          kind: 'force',
          pattern: branchPattern,
          description: 'Prevent force pushes',
        },
        {
          kind: 'delete',
          pattern: branchPattern,
          description: 'Prevent branch deletion',
        },
      ];

      const results = [];
      for (const restriction of restrictions) {
        try {
          // Check if this specific restriction type already exists
          const alreadyExists = existingForBranch.some(
            (r) => r.kind === restriction.kind
          );

          if (alreadyExists) {
            console.log(
              `   ⏭️  ${restriction.kind} restriction already exists`
            );
            results.push({ kind: restriction.kind, status: 'exists' });
          } else {
            await this.createBranchRestriction(
              workspace,
              repoSlug,
              restriction
            );
            console.log(`   ✅ Created ${restriction.kind} restriction`);
            results.push({ kind: restriction.kind, status: 'created' });
          }
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(
              `   ⏭️  ${restriction.kind} restriction already exists`
            );
            results.push({ kind: restriction.kind, status: 'exists' });
          } else {
            console.warn(
              `   ⚠️  Failed to create ${restriction.kind} restriction: ${error.message}`
            );
            results.push({ kind: restriction.kind, status: 'failed' });
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(
        `Failed to configure branch protection: ${error.message}`
      );
    }
  }

  /**
   * Get default reviewers for repository
   */
  async getDefaultReviewers(workspace: string, repoSlug: string) {
    try {
      const response = await this.client.repositories.listDefaultReviewers({
        workspace,
        repo_slug: repoSlug,
      });

      return response.data.values || [];
    } catch (error) {
      throw new Error(`Failed to get default reviewers: ${error.message}`);
    }
  }

  /**
   * Add default reviewer
   */
  async addDefaultReviewer(
    workspace: string,
    repoSlug: string,
    userUuid: string
  ) {
    try {
      const response = await this.client.repositories.createDefaultReviewer({
        workspace,
        repo_slug: repoSlug,
        target_username: userUuid,
      });

      return response.data;
    } catch (error) {
      if (error.status === 409) {
        throw new Error(`User ${userUuid} is already a default reviewer`);
      }
      throw new Error(`Failed to add default reviewer: ${error.message}`);
    }
  }

  /**
   * Setup default reviewers from list of usernames
   */
  async setupDefaultReviewers(
    workspace: string,
    repoSlug: string,
    usernames: string[]
  ) {
    try {
      console.log('👥 Setting up default reviewers...');

      const existing = await this.getDefaultReviewers(workspace, repoSlug);
      const existingUsernames = existing.map((r) => r.username || r.uuid);

      const results = [];
      for (const username of usernames) {
        try {
          if (existingUsernames.includes(username)) {
            console.log(`   ⏭️  ${username} is already a default reviewer`);
            results.push({ username, status: 'exists' });
          } else {
            await this.addDefaultReviewer(workspace, repoSlug, username);
            console.log(`   ✅ Added ${username} as default reviewer`);
            results.push({ username, status: 'added' });
          }
        } catch (error) {
          if (error.message.includes('already a default reviewer')) {
            console.log(`   ⏭️  ${username} is already a default reviewer`);
            results.push({ username, status: 'exists' });
          } else {
            console.warn(`   ⚠️  Failed to add ${username}: ${error.message}`);
            results.push({ username, status: 'failed' });
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to setup default reviewers: ${error.message}`);
    }
  }

  /**
   * Update repository settings (description, private/public, etc.)
   */
  async updateRepositorySettings(
    workspace: string,
    repoSlug: string,
    settings: {
      description?: string;
      is_private?: boolean;
      has_issues?: boolean;
      has_wiki?: boolean;
      fork_policy?: 'allow_forks' | 'no_public_forks' | 'no_forks';
    }
  ) {
    try {
      const response = await this.client.repositories.update({
        workspace,
        repo_slug: repoSlug,
        _body: settings,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update repository settings: ${error.message}`);
    }
  }

  /**
   * Check if package.json exists and get its content
   */
  async checkPackageJson(cwd = process.cwd()) {
    try {
      const packagePath = path.join(cwd, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      return {
        exists: true,
        isPublic: !packageJson.private,
        name: packageJson.name,
        content: packageJson,
      };
    } catch (_error) {
      return {
        exists: false,
        isPublic: false,
        name: null,
        content: null,
      };
    }
  }

  /**
   * Validate BitBucket credentials and get user information
   */
  async validateCredentials() {
    try {
      const response = await this.client.user.get({});
      return {
        valid: true,
        username: response.data.username,
        displayName: response.data.display_name,
        uuid: response.data.uuid,
      };
    } catch (error) {
      throw new Error(`Invalid BitBucket credentials: ${error.message}`);
    }
  }

  /**
   * Check repository permissions for current user
   */
  async checkRepositoryPermissions(workspace: string, repoSlug: string) {
    try {
      const repo = await this.getRepository(workspace, repoSlug);

      // BitBucket doesn't return explicit permission levels like GitHub
      // We infer from repository data
      const isOwner =
        repo.owner?.username === (await this.validateCredentials()).username;

      return {
        admin: isOwner || repo.owner?.type === 'workspace',
        write: true, // If we can get the repo, we likely have write access
        read: true,
      };
    } catch (error) {
      throw new Error(
        `Failed to check repository permissions: ${error.message}`
      );
    }
  }

  /**
   * Check if a path exists
   */
  async checkPath(filePath: string) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check whether a branch exists in the repository
   */
  async branchExists(
    workspace: string,
    repoSlug: string,
    branchName: string
  ): Promise<boolean> {
    try {
      await this.client.repositories.getBranch({
        workspace,
        repo_slug: repoSlug,
        name: branchName,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new branch from a start-point branch or commit
   */
  async createBranch(
    workspace: string,
    repoSlug: string,
    branchName: string,
    startPoint: string
  ): Promise<void> {
    // Get the commit hash of the start point
    const refResp = await this.client.repositories.getBranch({
      workspace,
      repo_slug: repoSlug,
      name: startPoint,
    });
    const hash: string = refResp.data?.target?.hash;
    if (!hash)
      throw new Error(
        `Could not resolve commit hash for branch: ${startPoint}`
      );

    await this.client.repositories.createBranch({
      workspace,
      repo_slug: repoSlug,
      _body: { name: branchName, target: { hash } },
    });
  }

  /**
   * Set the default (main) branch of the repository
   */
  async setDefaultBranch(
    workspace: string,
    repoSlug: string,
    branchName: string
  ): Promise<void> {
    await this.client.repositories.update({
      workspace,
      repo_slug: repoSlug,
      _body: { mainbranch: { name: branchName } },
    });
  }

  /**
   * Create a pull request. On 409 (duplicate), returns the existing PR marked with existing: true.
   * If the existing PR targets a different destination branch it is declined and a new one is opened.
   */
  async createPullRequest(
    workspace: string,
    repoSlug: string,
    options: {
      title: string;
      sourceBranch: string;
      destBranch: string;
      description?: string;
    }
  ) {
    const body = {
      title: options.title,
      description: options.description || '',
      source: { branch: { name: options.sourceBranch } },
      destination: { branch: { name: options.destBranch } },
    };

    try {
      const resp = await this.client.pullrequests.create({
        workspace,
        repo_slug: repoSlug,
        _body: body,
      });
      return resp.data;
    } catch (error) {
      const msg: string = error?.message || '';
      const status: number = error?.status ?? 0;

      if (status !== 409 && !msg.includes('409')) {
        throw error;
      }

      // 409 — a PR from this source branch already exists.
      // Find it and check its destination branch.
      try {
        const listResp = await this.client.pullrequests.list({
          workspace,
          repo_slug: repoSlug,
          q: `source.branch.name="${options.sourceBranch}" AND state="OPEN"`,
        });
        const existing = listResp.data?.values?.[0];

        if (!existing) {
          // Can't find it — surface original error
          throw error;
        }

        const existingDest: string = existing.destination?.branch?.name ?? '';

        if (existingDest !== options.destBranch) {
          // Wrong destination — decline and recreate
          await this.client.pullrequests.decline({
            workspace,
            repo_slug: repoSlug,
            pull_request_id: existing.id,
          });

          const newResp = await this.client.pullrequests.create({
            workspace,
            repo_slug: repoSlug,
            _body: body,
          });
          return newResp.data;
        }

        // Same destination — return existing PR with marker
        return { ...existing, existing: true };
      } catch (innerError) {
        if (innerError === error) throw error;
        throw innerError;
      }
    }
  }
}
