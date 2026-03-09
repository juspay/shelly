import fs from 'fs/promises';
import path from 'path';

const API_BASE = 'https://api.bitbucket.org/2.0';

export class BitbucketService {
  private authHeader: string;

  constructor(token: string, username?: string) {
    if (username) {
      // App password: Basic auth
      const encoded = Buffer.from(`${username}:${token}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      // Workspace/repository access token: Bearer auth
      this.authHeader = `Bearer ${token}`;
    }
  }

  private async request(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const url = `${API_BASE}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `Bitbucket API error: ${response.status} ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      } catch {
        // Use default message
      }
      throw new Error(message);
    }

    if (response.status === 204) return null;

    return response.json();
  }

  /**
   * Validate token and get authenticated user
   */
  async validateAuth(): Promise<{ valid: boolean; user: string }> {
    const data = (await this.request('GET', '/user')) as {
      display_name: string;
      username: string;
    };
    return {
      valid: true,
      user: data.display_name || data.username,
    };
  }

  /**
   * Get repository default branch
   */
  async getDefaultBranch(workspace: string, repoSlug: string): Promise<string> {
    const data = (await this.request(
      'GET',
      `/repositories/${workspace}/${repoSlug}`
    )) as { mainbranch?: { name: string } };
    return data.mainbranch?.name || 'main';
  }

  /**
   * Check user permissions on repository
   */
  async checkRepositoryPermissions(
    workspace: string,
    repoSlug: string
  ): Promise<{ admin: boolean; push: boolean; pull: boolean }> {
    try {
      const data = (await this.request(
        'GET',
        `/user/permissions/repositories?q=repository.full_name="${workspace}/${repoSlug}"`
      )) as { values: Array<{ permission: string }> };

      if (data.values && data.values.length > 0) {
        const permission = data.values[0].permission;
        return {
          admin: permission === 'admin',
          push: permission === 'admin' || permission === 'write',
          pull: true,
        };
      }

      return { admin: false, push: false, pull: true };
    } catch {
      return { admin: false, push: false, pull: true };
    }
  }

  /**
   * Update repository settings
   */
  async updateRepositorySettings(
    workspace: string,
    repoSlug: string,
    settings: Record<string, unknown>
  ): Promise<void> {
    await this.request(
      'PUT',
      `/repositories/${workspace}/${repoSlug}`,
      settings
    );
  }

  /**
   * Create a branch restriction
   */
  async createBranchRestriction(
    workspace: string,
    repoSlug: string,
    restriction: {
      kind: string;
      pattern: string;
      value?: number;
    }
  ): Promise<void> {
    await this.request(
      'POST',
      `/repositories/${workspace}/${repoSlug}/branch-restrictions`,
      restriction
    );
  }

  /**
   * Enable Bitbucket Pipelines for the repository
   */
  async enablePipelines(
    workspace: string,
    repoSlug: string
  ): Promise<void> {
    await this.request(
      'PUT',
      `/repositories/${workspace}/${repoSlug}/pipelines_config`,
      { enabled: true }
    );
  }

  /**
   * Display NPM token setup guidance for Bitbucket Pipelines
   */
  async setupNpmTokenGuidance(
    workspace: string,
    repoSlug: string
  ): Promise<void> {
    console.log('\n📦 NPM Token Setup Required');
    console.log('=====================================');
    console.log('');
    console.log(
      'To enable automated NPM publishing via Bitbucket Pipelines, you need to:'
    );
    console.log('');
    console.log('1. 🔑 Create an NPM Access Token:');
    console.log('   • Go to: https://www.npmjs.com/settings/tokens');
    console.log('   • Click "Generate New Token" → "Automation"');
    console.log('   • Copy the generated token');
    console.log('');
    console.log('2. 🔐 Add the token to Bitbucket Repository Variables:');
    console.log(
      `   • Go to: https://bitbucket.org/${workspace}/${repoSlug}/admin/pipelines/repository-variables`
    );
    console.log('   • Click "Add"');
    console.log('   • Name: NPM_TOKEN');
    console.log('   • Value: [paste your NPM token here]');
    console.log('   • Check "Secured" checkbox');
    console.log('');
    console.log('3. ✅ Verify Setup:');
    console.log(
      '   • The variable should appear in your repository variables list'
    );
    console.log(
      '   • Bitbucket Pipelines can now publish to NPM automatically'
    );
    console.log('');
  }

  /**
   * Check if a path exists
   */
  async checkPath(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository info from git config
   */
  async getRepositoryInfo(cwd = process.cwd()) {
    try {
      const gitConfigPath = path.join(cwd, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf8');

      const urlMatch = gitConfig.match(
        /\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/
      );
      if (!urlMatch) {
        throw new Error('No remote URL found');
      }

      const url = urlMatch[1].trim();

      // Bitbucket HTTPS
      const httpsMatch = url.match(
        /https:\/\/(?:[^@]+@)?bitbucket\.org\/([^/]+)\/([^/]+?)(?:\.git)?$/
      );
      if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
      }

      // Bitbucket SSH
      const sshMatch = url.match(
        /git@bitbucket\.org:([^/]+)\/([^/]+?)(?:\.git)?$/
      );
      if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
      }

      throw new Error(`Not a Bitbucket remote URL: ${url}`);
    } catch (error) {
      throw new Error(`Failed to get repository info: ${(error as Error).message}`);
    }
  }
}
