import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface BreezeProjectInfo {
  isBreezeProject: boolean;
  workspace?: string;
  repoSlug?: string;
  remoteUrl?: string;
  hasNeurolink?: boolean;
  hasMCPServer?: boolean;
}

export class BreezeDetector {
  /**
   * Detect if the current project is a Breeze project
   */
  static async detectBreezeProject(cwd: string): Promise<BreezeProjectInfo> {
    const info: BreezeProjectInfo = {
      isBreezeProject: false,
    };

    try {
      // Step 1: Check git remote for Bitbucket URL
      const gitInfo = await this.detectGitRemote(cwd);
      if (gitInfo) {
        info.workspace = gitInfo.workspace;
        info.repoSlug = gitInfo.repoSlug;
        info.remoteUrl = gitInfo.remoteUrl;

        // Check if workspace is 'breeze' or 'BZ' (Breeze workspaces)
        if (this.isBreezeWorkspace(gitInfo.workspace)) {
          info.isBreezeProject = true;
        }
      }

      // Step 2: Check package.json for @juspay packages
      const packageInfo = await this.checkPackageJson(cwd);
      if (packageInfo.hasJuspayPackages) {
        info.isBreezeProject = true;
        info.hasNeurolink = packageInfo.hasNeurolink;
        info.hasMCPServer = packageInfo.hasMCPServer;
      }

      return info;
    } catch (_error) {
      // If detection fails, assume not a Breeze project
      return info;
    }
  }

  /**
   * Extract workspace and repo slug from git remote
   */
  static async detectGitRemote(cwd: string): Promise<{
    workspace: string;
    repoSlug: string;
    remoteUrl: string;
  } | null> {
    try {
      const remoteUrl = execSync('git remote get-url origin', {
        cwd,
        encoding: 'utf8',
      }).trim();

      // Parse Bitbucket URL patterns:
      // SSH: git@bitbucket.org:workspace/repo.git
      // SSH (Juspay): git@bitbucket.juspay.net:workspace/repo.git
      // HTTPS: https://bitbucket.org/workspace/repo.git
      const sshMatch = remoteUrl.match(/git@[^:]+:([^/]+)\/([^/.]+)/);
      const httpsMatch = remoteUrl.match(/https?:\/\/[^/]+\/([^/]+)\/([^/.]+)/);

      const match = sshMatch || httpsMatch;
      if (match) {
        return {
          workspace: match[1],
          repoSlug: match[2],
          remoteUrl,
        };
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Check if workspace name indicates a Breeze project
   */
  static isBreezeWorkspace(workspace: string): boolean {
    const breezeWorkspaces = [
      'breeze',
      'bz',
      'breeze-payments',
      'breeze-cod',
      'breeze-it',
    ];

    return breezeWorkspaces.some((bw) =>
      workspace.toLowerCase().includes(bw.toLowerCase())
    );
  }

  /**
   * Check package.json for Juspay/Breeze indicators
   */
  static async checkPackageJson(cwd: string): Promise<{
    hasJuspayPackages: boolean;
    hasNeurolink: boolean;
    hasMCPServer: boolean;
  }> {
    try {
      const packagePath = path.join(cwd, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const pkg = JSON.parse(content);

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      const hasNeurolink = !!allDeps['@juspay/neurolink'];
      const hasMCPServer = !!allDeps['@nexus2520/bitbucket-mcp-server'];

      // Check for any @juspay scoped packages
      const hasJuspayPackages = Object.keys(allDeps).some((dep) =>
        dep.startsWith('@juspay/')
      );

      return {
        hasJuspayPackages: hasJuspayPackages || hasNeurolink || hasMCPServer,
        hasNeurolink,
        hasMCPServer,
      };
    } catch (_error) {
      return {
        hasJuspayPackages: false,
        hasNeurolink: false,
        hasMCPServer: false,
      };
    }
  }

  /**
   * Format Breeze project info for display
   */
  static formatProjectInfo(info: BreezeProjectInfo): string[] {
    const lines: string[] = [];

    if (info.isBreezeProject) {
      lines.push('🌊 Breeze Project Detected');

      if (info.workspace) {
        lines.push(`   Workspace: ${info.workspace}`);
      }

      if (info.repoSlug) {
        lines.push(`   Repository: ${info.repoSlug}`);
      }

      if (info.hasNeurolink) {
        lines.push('   ✅ NeuroLink installed');
      } else {
        lines.push('   ⚠️  NeuroLink not installed');
      }

      if (info.hasMCPServer) {
        lines.push('   ✅ Bitbucket MCP Server installed');
      } else {
        lines.push('   ⚠️  Bitbucket MCP Server not installed');
      }
    }

    return lines;
  }

  /**
   * Get Bitbucket base URL based on workspace
   */
  static getBitbucketBaseUrl(workspace: string): string {
    // Juspay internal Bitbucket
    if (this.isBreezeWorkspace(workspace)) {
      return 'https://bitbucket.juspay.net';
    }

    // Default to public Bitbucket
    return 'https://bitbucket.org';
  }
}
