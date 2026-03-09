import fs from 'fs/promises';
import path from 'path';

export type Platform = 'github' | 'bitbucket';

export interface PlatformInfo {
  platform: Platform;
  owner: string;
  repo: string;
  remoteUrl: string;
}

export class PlatformDetector {
  /**
   * Detect platform from git remote URL with optional override
   */
  static async detect(
    cwd: string,
    platformOverride?: string
  ): Promise<PlatformInfo> {
    const remoteUrl = await PlatformDetector.getRemoteUrl(cwd);

    if (!remoteUrl) {
      throw new Error(
        'Could not detect git remote. Make sure you have a git remote named "origin".'
      );
    }

    const info = PlatformDetector.parseRemoteUrl(remoteUrl);

    if (platformOverride) {
      if (platformOverride !== 'github' && platformOverride !== 'bitbucket') {
        throw new Error(
          `Unsupported platform: ${platformOverride}. Supported: github, bitbucket`
        );
      }
      info.platform = platformOverride as Platform;
    }

    return info;
  }

  /**
   * Parse a remote URL to extract platform, owner, and repo
   */
  static parseRemoteUrl(url: string): PlatformInfo {
    // GitHub HTTPS: https://github.com/owner/repo.git
    // GitHub HTTPS with creds: https://user:token@github.com/owner/repo.git
    const githubHttpsMatch = url.match(
      /https:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (githubHttpsMatch) {
      return {
        platform: 'github',
        owner: githubHttpsMatch[1],
        repo: githubHttpsMatch[2],
        remoteUrl: url,
      };
    }

    // GitHub SSH: git@github.com:owner/repo.git
    const githubSshMatch = url.match(
      /git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (githubSshMatch) {
      return {
        platform: 'github',
        owner: githubSshMatch[1],
        repo: githubSshMatch[2],
        remoteUrl: url,
      };
    }

    // Bitbucket HTTPS: https://bitbucket.org/workspace/repo.git
    // Bitbucket HTTPS with creds: https://user@bitbucket.org/workspace/repo.git
    const bitbucketHttpsMatch = url.match(
      /https:\/\/(?:[^@]+@)?bitbucket\.org\/([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (bitbucketHttpsMatch) {
      return {
        platform: 'bitbucket',
        owner: bitbucketHttpsMatch[1],
        repo: bitbucketHttpsMatch[2],
        remoteUrl: url,
      };
    }

    // Bitbucket SSH: git@bitbucket.org:workspace/repo.git
    const bitbucketSshMatch = url.match(
      /git@bitbucket\.org:([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (bitbucketSshMatch) {
      return {
        platform: 'bitbucket',
        owner: bitbucketSshMatch[1],
        repo: bitbucketSshMatch[2],
        remoteUrl: url,
      };
    }

    throw new Error(
      `Unsupported remote URL format: ${url}\nSupported hosts: github.com, bitbucket.org`
    );
  }

  /**
   * Extract remote origin URL from .git/config
   */
  private static async getRemoteUrl(cwd: string): Promise<string | null> {
    try {
      const gitConfigPath = path.join(cwd, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf8');

      const urlMatch = gitConfig.match(
        /\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/
      );
      if (!urlMatch) return null;

      return urlMatch[1].trim();
    } catch {
      return null;
    }
  }
}
