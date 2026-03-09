import { GitHubService } from './githubService.js';
import type { PlatformProvider } from './platformProvider.js';

export class GitHubProvider implements PlatformProvider {
  private service: GitHubService;

  constructor(token: string) {
    this.service = new GitHubService(token);
  }

  async validateAuth(): Promise<{ valid: boolean; user: string }> {
    const result = await this.service.validateToken();
    return { valid: result.valid, user: result.user };
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
    await this.service.createBranchProtectionRuleset(owner, repo, branch);
  }

  getCiConfigPath(): string {
    return '.github/workflows';
  }

  async setupNpmTokenGuidance(owner: string, repo: string): Promise<void> {
    await this.service.setupNpmTokenGuidance(owner, repo);
  }

  getPlatformName(): string {
    return 'GitHub';
  }

  getRepoUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}`;
  }

  getSettingsUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}/settings`;
  }

  getSecretsUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}/settings/secrets/actions`;
  }
}
