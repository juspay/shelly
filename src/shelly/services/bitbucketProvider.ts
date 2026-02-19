import { BitbucketService } from './bitbucketService.js';
import type { PlatformProvider } from './platformProvider.js';

export class BitbucketProvider implements PlatformProvider {
  private service: BitbucketService;

  constructor(token: string, username?: string) {
    this.service = new BitbucketService(token, username);
  }

  async validateAuth(): Promise<{ valid: boolean; user: string }> {
    return this.service.validateAuth();
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    return this.service.getDefaultBranch(owner, repo);
  }

  async checkRepositoryPermissions(
    owner: string,
    repo: string
  ): Promise<{ admin: boolean; push: boolean; pull: boolean }> {
    return this.service.checkRepositoryPermissions(owner, repo);
  }

  async configureRepositorySettings(
    owner: string,
    repo: string,
    settings: Record<string, unknown>
  ): Promise<void> {
    await this.service.updateRepositorySettings(owner, repo, settings);
  }

  async createBranchProtection(
    owner: string,
    repo: string,
    branch: string
  ): Promise<void> {
    // Create multiple branch restrictions for Bitbucket
    const restrictions = [
      {
        kind: 'require_approvals_to_merge',
        pattern: branch,
        value: 1,
      },
      {
        kind: 'require_passing_builds_to_merge',
        pattern: branch,
        value: 1,
      },
      {
        kind: 'push',
        pattern: branch,
      },
    ];

    for (const restriction of restrictions) {
      try {
        await this.service.createBranchRestriction(owner, repo, restriction);
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes('already exists') || msg.includes('409')) {
          continue;
        }
        throw error;
      }
    }
  }

  getCiConfigPath(): string {
    return 'bitbucket-pipelines.yml';
  }

  async setupNpmTokenGuidance(owner: string, repo: string): Promise<void> {
    await this.service.setupNpmTokenGuidance(owner, repo);
  }

  getPlatformName(): string {
    return 'Bitbucket';
  }

  getRepoUrl(owner: string, repo: string): string {
    return `https://bitbucket.org/${owner}/${repo}`;
  }

  getSettingsUrl(owner: string, repo: string): string {
    return `https://bitbucket.org/${owner}/${repo}/admin`;
  }

  getSecretsUrl(owner: string, repo: string): string {
    return `https://bitbucket.org/${owner}/${repo}/admin/pipelines/repository-variables`;
  }
}
