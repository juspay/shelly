# BitBucket Integration for Shelly

Shelly provides comprehensive BitBucket repository management for Juspay Breeze projects with **automatic MCP (Model Context Protocol) integration** for AI-powered PR automation.

## 🌊 Automatic Breeze Detection

Shelly automatically detects Breeze projects and sets up the complete AI & MCP infrastructure used across all Breeze repositories (Vayu, Nimble, Lighthouse, Atoms).

**Detection triggers:**

- BitBucket git remote with Breeze workspace (BZ, breeze, breeze-payments, etc.)
- Presence of @juspay packages in package.json
- Internal BitBucket server (bitbucket.juspay.net)

## Features

### 🤖 Breeze AI & MCP Integration (Automatic)

- **PR Automation Scripts**: Auto-generates pr-scribe.js and pr-police.js
- **AI-Powered PR Descriptions**: Using @juspay/neurolink + Gemini 2.5 Pro
- **Automated Code Review**: AI-powered security and quality checks
- **Package Installation**: Auto-installs @juspay/neurolink and @nexus2520/bitbucket-mcp-server
- **NPM Scripts**: Adds "describe" and "review" commands to package.json
- **Environment Template**: Creates .env.breeze with credential placeholders

### 🔒 Branch Protection

- Prevent direct pushes to main branch
- Prevent force pushes
- Prevent branch deletion
- Require pull requests for changes

### 👥 Default Reviewers

- Automatically add reviewers to all PRs
- Interactive reviewer setup
- Skip existing reviewers

### ⚙️ Repository Settings

- Enable issues tracker
- Enable wiki
- Configure fork policy (no public forks for internal projects)

### 🚀 Jenkins CI/CD

- Auto-generate Jenkinsfile with smart variable replacement
- Comprehensive pipeline stages (build, test, lint, security scan, deploy)
- Project-specific configuration (detects workspace, repo, package manager)

## Setup

### 1. Create BitBucket App Password

1. Go to: https://bitbucket.org/account/settings/app-passwords/
2. Click "Create app password"
3. Name: `shelly-cli`
4. Permissions Required:
   - **Repository**: Read, Write, Admin
   - **Pull Requests**: Read, Write
5. Copy the generated password

### 2. Configure Environment Variables

Add to your `.bashrc`, `.zshrc`, or shell profile:

```bash
# BitBucket & MCP Credentials
export BITBUCKET_TOKEN="your_bitbucket_personal_access_token"
export BITBUCKET_USERNAME="your.email@juspay.in"
export BITBUCKET_BASE_URL="https://bitbucket.juspay.net"

# Google AI for NeuroLink (required for PR automation)
export GOOGLE_AI_API_KEY="your_google_ai_api_key"

# Optional: Debug mode
export DEBUG="false"
```

**Getting API Keys:**

- **BitBucket Token**: Created in step 1 above
- **Google AI Key**: Get from https://makersuite.google.com/app/apikey

Reload your shell:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### 3. Verify Setup

```bash
# Test authentication
shelly bitbucket setup --dry-run
```

## Usage

### Basic Setup

Setup BitBucket repository with best practices:

```bash
# Auto-detect repository from git remote
shelly bitbucket setup

# Or specify repository
shelly bitbucket setup --repo my-project

# Different workspace
shelly bitbucket setup --workspace other-workspace
```

### Shortcut Command

```bash
# Same as 'shelly bitbucket setup'
shelly bb
```

### Options

```bash
shelly bitbucket setup [options]

Options:
  -f, --force              Skip confirmation prompts
  --dry-run                Show what would be configured without making changes
  -d, --directory <path>   Target directory (defaults to current directory)
  -r, --repo <slug>        Repository slug (auto-detected from git remote)
  -w, --workspace <name>   BitBucket workspace (defaults to "breeze")
```

### Complete Workflow Example

```bash
# 1. Clone Breeze repository
git clone git@bitbucket.juspay.net:BZ/my-new-project.git
cd my-new-project

# 2. Initialize package.json (if needed)
npm init -y

# 3. Run organize - Does EVERYTHING automatically!
shelly organize --ci jenkins --force

# What happens:
# ✅ Detects Breeze project (from git remote)
# ✅ Sets up project structure
# ✅ Generates Jenkinsfile with variables replaced
# ✅ Detects tech stack (TypeScript, React, etc.)
# ✅ Recommends & installs @juspay/neurolink & bitbucket-mcp-server
# ✅ Creates PR automation scripts (pr-scribe.js, pr-police.js)
# ✅ Creates .env.breeze template
# ✅ Adds "describe" and "review" npm scripts

# 4. Fill in credentials
cp .env.breeze .env
# Edit .env with your actual credentials

# 5. Test PR automation (optional)
pnpm run describe <pr-id>  # Generate PR description
pnpm run review <pr-id>    # Review PR

# 6. Commit and push
git add .
git commit -m "feat: initial project setup with Shelly + MCP"
git push origin main
```

### Separate BitBucket Setup (Optional)

If you only want BitBucket configuration without full organize:

```bash
# Configure BitBucket repository only
shelly bitbucket setup

# Or use shortcut
shelly bb
```

## What Gets Configured

### Breeze MCP Infrastructure (Automatic for Breeze projects)

When Shelly detects a Breeze project, it automatically creates:

```
your-breeze-project/
├── scripts/
│   ├── pr-scribe.js          # AI-powered PR description generator
│   └── pr-police.js          # Automated code reviewer
├── .env.breeze               # Credentials template
├── Jenkinsfile               # Jenkins CI pipeline (if --ci jenkins)
└── package.json              # Updated with MCP packages and scripts
```

**Package.json additions:**

```json
{
  "scripts": {
    "describe": "node scripts/pr-scribe.js",
    "review": "node scripts/pr-police.js"
  },
  "dependencies": {
    "@juspay/neurolink": "^8.41.0",
    "@nexus2520/bitbucket-mcp-server": "^0.9.1"
  }
}
```

**Using PR Automation:**

```bash
# Generate AI-powered PR description
pnpm run describe 123  # Where 123 is PR number

# Automated code review
pnpm run review 123
```

**Skip MCP Setup:**

```bash
# If you don't want MCP automation
shelly organize --skip-mcp
```

### Branch Protection Rules

- **Push restriction**: Prevents direct commits to main branch
- **Force push restriction**: Prevents rewriting history
- **Delete restriction**: Prevents branch deletion
- All changes must go through pull requests

### Repository Settings

- **Issues tracker**: Enabled
- **Wiki**: Enabled
- **Fork policy**: No public forks (internal use)

### Default Reviewers

- Prompts for reviewer usernames
- Adds them as default reviewers for all PRs
- Skips already configured reviewers

## Jenkinsfile Generation

Shelly automatically generates a Jenkinsfile when you use `--ci jenkins`:

```bash
shelly organize --ci jenkins
```

### Smart Variable Replacement

Shelly detects and replaces template variables automatically:

**Detected variables:**

```
┌─────────────────┬────────────────────────────────────────┐
│ Variable        │ Value                                  │
├─────────────────┼────────────────────────────────────────┤
│ Project Name    │ vayu                                   │
│ Workspace       │ BZ                                     │
│ Repository      │ vayu                                   │
│ Git URL         │ git@bitbucket.juspay.net:BZ/vayu.git   │
│ S3 Bucket       │ atoms-sdk                              │
└─────────────────┴────────────────────────────────────────┘
```

**Template variables replaced:**

- `{{projectName}}` → Detected from package.json
- `{{workspaceName}}` → Extracted from git remote URL
- `{{repoSlug}}` → Repository name from git remote
- `{{gitUrl}}` → Full git remote URL
- `{{s3Bucket}}` → Project-specific S3 bucket

### Generated Jenkinsfile Features

```groovy
// Comprehensive Jenkins pipeline
pipeline {
    agent any

    stages {
        stage('Build') { ... }
        stage('Test') { ... }
        stage('Lint') { ... }
        stage('Security Scan') { ... }
        stage('Deploy') { ... }
    }
}
```

**Features:**

- ✅ Node.js 20 environment
- ✅ Package manager detection (npm/pnpm/yarn)
- ✅ NPM dependency caching
- ✅ Build, test, and lint stages
- ✅ Security audit with npm audit
- ✅ Code coverage reporting
- ✅ Deployment stage (main branch only)
- ✅ Automated cleanup
- ✅ Notification hooks (Slack ready)

## Comparison: GitHub vs BitBucket

| Feature             | GitHub Command        | BitBucket Command            |
| ------------------- | --------------------- | ---------------------------- |
| Setup               | `shelly github setup` | `shelly bitbucket setup`     |
| Shortcut            | `shelly gh`           | `shelly bb`                  |
| Branch Protection   | Rulesets              | Branch Restrictions          |
| CI/CD               | GitHub Actions        | Jenkinsfile                  |
| Auth Token          | `GITHUB_TOKEN`        | `BITBUCKET_TOKEN`            |
| Auth URL            | `BITBUCKET_BASE_URL`  | Required for internal server |
| Workspace           | Organization/User     | Workspace (e.g., BZ)         |
| **MCP Integration** | **❌ No**             | **✅ Auto (Breeze only)**    |
| PR Automation       | Manual                | ✅ Auto (pr-scribe/police)   |
| AI Review           | Manual                | ✅ Auto via NeuroLink        |
| Tech Detection      | ✅ Yes                | ✅ Yes                       |
| Package Recs        | ✅ Yes                | ✅ Yes (Juspay)              |

## Troubleshooting

### Authentication Errors

```bash
❌ BitBucket credentials required
```

**Solution**: Ensure environment variables are set correctly:

```bash
echo $BITBUCKET_USERNAME        # Should print your email
echo $BITBUCKET_TOKEN           # Should print your token
echo $BITBUCKET_BASE_URL        # Should print https://bitbucket.juspay.net
echo $GOOGLE_AI_API_KEY         # Should print your Google AI key (for MCP)
```

### MCP Setup Issues

```bash
❌ Failed to install @juspay/neurolink
```

**Solution**: Check npm registry access:

```bash
npm config get registry  # Should be https://registry.npmjs.org/
npm ping                 # Test npm connectivity
```

**For Juspay internal packages**, ensure access to internal registry if needed.

### Permission Denied

```bash
❌ Write or admin permissions required
```

**Solution**: You need at least write access to the repository. Contact your BitBucket admin.

### Repository Not Found

```bash
❌ Could not determine BitBucket workspace and repository
```

**Solution**: Make sure you're in a git repository with a BitBucket remote:

```bash
git remote -v  # Should show bitbucket.org URL
```

Or specify the repository explicitly:

```bash
shelly bitbucket setup --repo my-project --workspace breeze
```

### Branch Protection Already Exists

```bash
ℹ️  Some branch restrictions already exist
```

This is normal! Shelly preserves existing restrictions and only adds missing ones.

## Advanced Usage

### Dry Run Mode

Preview what would be configured without making changes:

```bash
shelly bitbucket setup --dry-run
```

### Force Mode

Skip all prompts (useful for automation):

```bash
shelly bitbucket setup --force
```

### Multiple Repositories

Setup multiple repositories in a script:

```bash
#!/bin/bash

repos=("project-a" "project-b" "project-c")

for repo in "${repos[@]}"; do
  cd "/path/to/$repo"
  shelly bitbucket setup --force
done
```

## Integration with Jenkins

### Setting up Jenkins Integration

1. **Install Jenkins Plugins**:
   - NodeJS plugin
   - Pipeline plugin
   - BitBucket plugin

2. **Configure Jenkins**:
   - Add NodeJS installation (Node 20)
   - Configure BitBucket credentials
   - Create pipeline job pointing to your repository

3. **First Build**:
   - Jenkins will automatically detect the Jenkinsfile
   - Pipeline will run based on the configuration

### Customizing Jenkinsfile

The generated Jenkinsfile is a template. Customize it for your needs:

```groovy
// Add environment variables
environment {
    API_URL = 'https://api.example.com'
    DEPLOY_PATH = '/var/www/app'
}

// Add custom stages
stage('Integration Tests') {
    steps {
        sh 'npm run test:integration'
    }
}

// Configure notifications
post {
    success {
        slackSend(color: 'good', message: "Deployed ${env.JOB_NAME}")
    }
}
```

## API Reference

### BitbucketService Methods

```typescript
// Create service instance
const service = new BitbucketService(username, appPassword, workspace);

// Get repository info
const { workspace, repoSlug } = await service.getRepositoryInfo();

// Configure branch protection
await service.configureBranchProtection(workspace, repoSlug, 'main');

// Setup default reviewers
await service.setupDefaultReviewers(workspace, repoSlug, ['user1', 'user2']);

// Update repository settings
await service.updateRepositorySettings(workspace, repoSlug, {
  is_private: true,
  has_issues: true,
});
```

## Next Steps

- [ ] Add support for branch-specific restrictions
- [ ] Auto-detect Jenkins server and configure webhooks
- [ ] Support for BitBucket Pipelines (bitbucket-pipelines.yml)
- [ ] Custom reviewer groups
- [ ] Multi-workspace management
- [ ] GitLab support (Phase 2)

## Support

For internal Juspay support:

- Slack: #shelly-support
- Email: opensource@juspay.in
- GitHub Issues: https://github.com/juspay/Shelly/issues

---

**Built with ❤️ by Juspay for enterprise repository automation**
