import type { Platform } from './platformDetector.js';

export interface PlatformProvider {
  /** Validate authentication and return user info */
  validateAuth(): Promise<{ valid: boolean; user: string }>;

  /** Get the repository's default branch */
  getDefaultBranch(owner: string, repo: string): Promise<string>;

  /** Check user permissions on the repository */
  checkRepositoryPermissions(
    owner: string,
    repo: string
  ): Promise<{ admin: boolean; push: boolean; pull: boolean }>;

  /** Configure repository settings (merge strategy, etc.) */
  configureRepositorySettings(
    owner: string,
    repo: string,
    settings: Record<string, unknown>
  ): Promise<void>;

  /** Create branch protection rules */
  createBranchProtection(
    owner: string,
    repo: string,
    branch: string
  ): Promise<void>;

  /** Get the CI/CD config directory or file path */
  getCiConfigPath(): string;

  /** Display NPM token setup guidance for this platform */
  setupNpmTokenGuidance(owner: string, repo: string): Promise<void>;

  /** Get the platform display name */
  getPlatformName(): string;

  /** Get the repository URL */
  getRepoUrl(owner: string, repo: string): string;

  /** Get the repository settings URL */
  getSettingsUrl(owner: string, repo: string): string;

  /** Get the secrets/variables settings URL */
  getSecretsUrl(owner: string, repo: string): string;
}

export function createPlatformProvider(platform: Platform): PlatformProvider {
  switch (platform) {
    case 'github': {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error(
          'GITHUB_TOKEN environment variable is required.\n' +
            'Get your token from: https://github.com/settings/tokens\n' +
            'Required scopes: repo, admin:repo_hook, write:packages'
        );
      }
      // Lazy import to avoid loading Octokit when not needed
      const { GitHubProvider } = require('./githubProvider.js');
      return new GitHubProvider(token);
    }
    case 'bitbucket': {
      const token =
        process.env.BITBUCKET_ACCESS_TOKEN || process.env.BITBUCKET_TOKEN;
      const username = process.env.BITBUCKET_USERNAME;
      if (!token) {
        throw new Error(
          'BITBUCKET_ACCESS_TOKEN or BITBUCKET_TOKEN environment variable is required.\n' +
            'Options:\n' +
            '  - BITBUCKET_ACCESS_TOKEN: Workspace or repository access token (Bearer auth)\n' +
            '  - BITBUCKET_TOKEN + BITBUCKET_USERNAME: App password (Basic auth)\n' +
            'Create at: https://bitbucket.org/account/settings/app-passwords/'
        );
      }
      const { BitbucketProvider } = require('./bitbucketProvider.js');
      return new BitbucketProvider(token, username);
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
