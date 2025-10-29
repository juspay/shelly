import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';

interface GitRemoteConfig {
  [remoteName: string]: {
    url?: string;
    fetch?: string;
  };
}

interface GitConfig {
  remote: GitRemoteConfig;
  [section: string]: any;
}

export class GitHubService {
  octokit: Octokit;

  constructor(token: string) {
    if (!token) {
      throw new Error(
        'GitHub token is required. Please set GITHUB_TOKEN environment variable.'
      );
    }

    this.octokit = new Octokit({
      auth: token,
    });
  }

  /**
   * Get repository information from current directory
   */
  async getRepositoryInfo(cwd = process.cwd()) {
    try {
      const gitConfig = await this.parseGitConfig(cwd);
      const { owner, repo } = this.parseRemoteUrl(
        gitConfig.remote?.origin?.url
      );

      if (!owner || !repo) {
        throw new Error(
          'Could not determine repository owner and name from git remote'
        );
      }

      return { owner, repo };
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
            currentRemote = sectionContent.slice(8, -1); // Extract "origin" from 'remote "origin"'
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
    } catch (error) {
      throw new Error('Not a git repository or unable to read git config');
    }
  }

  /**
   * Parse GitHub remote URL to extract owner and repo
   */
  parseRemoteUrl(url) {
    if (!url) {
      throw new Error('No remote URL found');
    }

    // Handle HTTPS URLs: https://github.com/owner/repo.git
    const httpsMatch = url.match(
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    // Handle SSH URLs: git@github.com:owner/repo.git
    const sshMatch = url.match(
      /git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    throw new Error(`Unsupported remote URL format: ${url}`);
  }

  /**
   * Update repository settings for pull requests
   */
  async updateRepositorySettings(owner, repo, settings) {
    try {
      const response = await this.octokit.repos.update({
        owner,
        repo,
        ...settings,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update repository settings: ${error.message}`);
    }
  }

  /**
   * Create branch protection ruleset
   */
  async createBranchProtectionRuleset(owner, repo, defaultBranch) {
    try {
      const rulesetData = {
        name: `${defaultBranch}-protection`,
        target: 'branch' as const,
        enforcement: 'active' as const,
        conditions: {
          ref_name: {
            include: [`refs/heads/${defaultBranch}`],
            exclude: [],
          },
        },
        rules: [
          {
            type: 'deletion' as const,
          },
          {
            type: 'required_linear_history' as const,
          },
          {
            type: 'pull_request' as const,
            parameters: {
              required_approving_review_count: 1,
              dismiss_stale_reviews_on_push: false,
              require_code_owner_review: false,
              require_last_push_approval: false,
              required_review_thread_resolution: false,
            },
          },
          {
            type: 'non_fast_forward' as const,
          },
        ],
      };

      // Attempt to add GitHub Copilot code review rule (will be ignored if not available)
      try {
        (rulesetData.rules as any).push({
          type: 'copilot_code_review' as const,
        });
        console.log(
          'ℹ️  GitHub Copilot code review rule added (will be active if Copilot is available)'
        );
      } catch (error) {
        console.log('ℹ️  GitHub Copilot code review rule could not be added');
      }

      const response = await this.octokit.repos.createRepoRuleset({
        owner,
        repo,
        ...rulesetData,
      });

      return response.data;
    } catch (error) {
      if (error.status === 422 && error.message.includes('already exists')) {
        throw new Error(
          `Branch protection ruleset "${defaultBranch}-protection" already exists`
        );
      }
      throw new Error(
        `Failed to create branch protection ruleset: ${error.message}`
      );
    }
  }

  /**
   * Get repository default branch
   */
  async getDefaultBranch(owner, repo) {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });

      return response.data.default_branch;
    } catch (error) {
      throw new Error(`Failed to get repository information: ${error.message}`);
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
    } catch (error) {
      return {
        exists: false,
        isPublic: false,
        name: null,
        content: null,
      };
    }
  }

  /**
   * Guide user through NPM token setup
   */
  async setupNpmTokenGuidance(owner, repo) {
    console.log('\n📦 NPM Token Setup Required');
    console.log('=====================================');
    console.log('');
    console.log(
      'To enable automated NPM publishing via GitHub Actions, you need to:'
    );
    console.log('');
    console.log('1. 🔑 Create an NPM Access Token:');
    console.log('   • Go to: https://www.npmjs.com/settings/tokens');
    console.log('   • Click "Generate New Token" → "Automation"');
    console.log('   • Copy the generated token');
    console.log('');
    console.log('2. 🔐 Add the token to GitHub Secrets:');
    console.log(
      `   • Go to: https://github.com/${owner}/${repo}/settings/secrets/actions`
    );
    console.log('   • Click "New repository secret"');
    console.log('   • Name: NPM_TOKEN');
    console.log('   • Value: [paste your NPM token here]');
    console.log('');
    console.log('3. ✅ Verify Setup:');
    console.log(
      '   • The secret should appear in your repository secrets list'
    );
    console.log(
      '   • GitHub Actions workflows can now publish to NPM automatically'
    );
    console.log('');

    return {
      secretName: 'NPM_TOKEN',
      setupUrl: `https://github.com/${owner}/${repo}/settings/secrets/actions`,
      npmTokenUrl: 'https://www.npmjs.com/settings/tokens',
    };
  }

  /**
   * Setup GitHub Pages
   */
  async setupGitHubPages(owner, repo, defaultBranch, cwd = process.cwd()) {
    try {
      // Always create docs folder structure for the user
      const docsPath = path.join(cwd, 'docs');
      const hasDocsFolder = await this.checkPath(docsPath);

      if (!hasDocsFolder) {
        console.log('📁 Creating docs folder structure for GitHub Pages...');
        await fs.mkdir(docsPath, { recursive: true });

        // Create basic README.md for docs
        const docsReadme = `# ${repo} Documentation

Welcome to ${repo}! This documentation is ready to be published via GitHub Pages.

## 📖 Getting Started

Add your documentation files here:
- \`index.html\` - Main landing page
- \`README.md\` - This file (displayed if no index.html)
- Additional markdown or HTML files

## 🚀 Publishing

When ready to publish:
1. Commit and push this docs folder
2. Your site will be live at: https://${owner}.github.io/${repo}

## ✏️  Editing

You can write documentation in:
- **Markdown** (.md files) - GitHub will automatically convert to HTML
- **HTML** (.html files) - For custom styling and layout
`;

        await fs.writeFile(
          path.join(docsPath, 'README.md'),
          docsReadme,
          'utf8'
        );
        console.log('   ✅ Created docs/README.md');
      }

      // Configure GitHub Pages settings
      try {
        const pagesResponse = await this.octokit.repos.createPagesSite({
          owner,
          repo,
          source: {
            branch: defaultBranch,
            path: '/docs',
          },
        });

        console.log(
          `✅ GitHub Pages configured: ${defaultBranch} branch /docs folder`
        );
        console.log(
          `📋 Settings ready - site will be at: https://${owner}.github.io/${repo}`
        );
        console.log('📝 Commit the docs/ folder when ready to publish');

        return pagesResponse.data;
      } catch (error) {
        if (error.status === 409) {
          try {
            await this.octokit.repos.updateInformationAboutPagesSite({
              owner,
              repo,
              source: {
                branch: defaultBranch,
                path: '/docs',
              },
            });
            console.log(
              `✅ GitHub Pages settings updated: ${defaultBranch} branch /docs folder`
            );
          } catch (updateError) {
            console.log('✅ GitHub Pages already configured');
          }
          console.log(
            `📋 Ready to publish at: https://${owner}.github.io/${repo}`
          );
          console.log('📝 Commit the docs/ folder when ready to go live');
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.log('ℹ️  Could not configure GitHub Pages automatically');
      console.log(
        `💡 Manual setup: Go to https://github.com/${owner}/${repo}/settings/pages`
      );
      console.log(
        `   Set Source: Deploy from branch → ${defaultBranch} → /docs`
      );

      // Still create the docs folder even if API fails
      try {
        const docsPath = path.join(cwd, 'docs');
        await fs.mkdir(docsPath, { recursive: true });
        await fs.writeFile(
          path.join(docsPath, 'README.md'),
          `# ${repo} Documentation\n\nReady for GitHub Pages.`,
          'utf8'
        );
        console.log('📁 Created docs folder structure');
      } catch (fsError) {}

      return null;
    }
  }

  /**
   * Check if a path exists
   */
  async checkPath(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate GitHub token and get user information
   */
  async validateToken() {
    try {
      const response = await this.octokit.users.getAuthenticated();
      return {
        valid: true,
        user: response.data.login,
        scopes: response.headers['x-oauth-scopes']?.split(', ') || [],
      };
    } catch (error) {
      throw new Error(`Invalid GitHub token: ${error.message}`);
    }
  }

  /**
   * Check repository permissions
   */
  async checkRepositoryPermissions(owner, repo) {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });

      const permissions = response.data.permissions || {
        admin: false,
        push: false,
        pull: false,
      };

      return {
        admin: permissions.admin || false,
        push: permissions.push || false,
        pull: permissions.pull || false,
      };
    } catch (error) {
      throw new Error(
        `Failed to check repository permissions: ${error.message}`
      );
    }
  }

  /**
   * Configure GitHub Actions workflow approval settings
   */
  async configureActionsWorkflowApproval(owner, repo) {
    try {
      // Set default workflow permissions (this part can be automated)
      const response =
        await this.octokit.actions.setGithubActionsDefaultWorkflowPermissionsRepository(
          {
            owner,
            repo,
            default_workflow_permissions: 'read',
            can_approve_pull_request_reviews: false,
          }
        );

      console.log('✅ GitHub Actions default workflow permissions configured');

      // Fork PR workflows setting cannot be automated via API - must be done manually
      console.log(
        '\n📝 MANUAL STEP REQUIRED - GitHub Actions Fork PR Workflows:'
      );
      console.log(
        `   1. Go to: https://github.com/${owner}/${repo}/settings/actions`
      );
      console.log(
        '   2. Scroll to "Fork pull request workflows from outside collaborators"'
      );
      console.log(
        '   3. Select: "Require approval for first-time contributors who are new to GitHub"'
      );
      console.log(
        '      (This provides balanced security for new GitHub users while allowing experienced contributors)'
      );
      console.log('   4. Click "Save"');
      console.log('   ⚠️  This setting cannot be automated via GitHub API');

      return response.data;
    } catch (error) {
      // Provide manual instructions if API call fails
      console.log(
        'ℹ️  Could not configure Actions workflow permissions automatically'
      );
      console.log('\n📝 MANUAL SETUP REQUIRED:');
      console.log(
        `   1. Go to: https://github.com/${owner}/${repo}/settings/actions`
      );
      console.log(
        '   2. Under "Workflow permissions", select "Read repository contents and packages permissions"'
      );
      console.log(
        '   3. Under "Fork pull request workflows", select "Require approval for first-time contributors who are new to GitHub"'
      );
      console.log(
        '      (This provides balanced security for new GitHub users while allowing experienced contributors)'
      );
      console.log('   4. Click "Save"');
      return null;
    }
  }
}
