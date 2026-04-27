# Jenkinsfile Template - Breeze Standard

This Jenkinsfile template is based on **production-tested Breeze workflows** and includes enterprise-grade features used across Juspay projects.

## 🎯 Template Features

### ✅ Core Features (Ready to Use)

1. **Vayu Agent** - Runs on Juspay's dedicated Jenkins nodes
2. **PNPM Package Manager** - With npm mirror registry for faster installs
3. **Single Commit Enforcement** - Blocks PRs with multiple commits
4. **Skip CI Tags** - Support for `[skip ci]` and `[ci skip]`
5. **Auto-Deployment Tags** - `[auto-deployment]` triggers beta deploy
6. **AI Automation** - Parallel AI description and code review stages
7. **Time Tracking** - Detailed timing metrics for each operation
8. **Multi-Environment** - Beta and Release deployment stages
9. **Commit Message Validation** - Using commitlint
10. **Docker Build Detection** - Auto-builds when Dockerfile changes
11. **Playwright Testing** - With artifact archiving
12. **Jira Integration** - Deployment notifications
13. **Smart Cleanup** - Automatic workspace cleanup

### 🎨 Template Variables

Replace these placeholders when generating:

| Variable          | Description         | Example                                  |
| ----------------- | ------------------- | ---------------------------------------- |
| `{{projectName}}` | Project/repo name   | `nimble`, `payment-sdk`                  |
| `{{workspace}}`   | BitBucket workspace | `BZ` (Breeze)                            |
| `{{repoName}}`    | Repository slug     | `nimble`, `checkout`                     |
| `{{gitUrl}}`      | Git repository URL  | `bitbucket.juspay.net/scm/bz/nimble.git` |
| `{{s3Bucket}}`    | AWS S3 bucket       | `atoms-sdk`                              |

## 📋 Pipeline Stages

### 1. **Checkout** ✅

- Detects `[skip ci]` tags
- Detects `[auto-deployment]` tags
- Tracks checkout time

### 2. **Build & Test App** 🏗️

**Triggers on:** Feature branches (`BZ-*`, `feature/BZ-*`, etc.)

**Steps:**

- Compare with beta branch
- Enforce single commit policy (critical!)
- Install dependencies with PNPM
- Run lint
- Run type checking
- Build project
- Run Playwright tests
- Validate commit message format
- Build Docker image (if Dockerfile changed)

**Time Tracking:** Each step is timed individually

### 3. **AI Automation** 🤖

**Triggers on:** All branches except beta/release

**Parallel Stages:**

- **Auto Description** - AI-enhanced PR descriptions
- **Auto Review** - AI-powered code review

**Commands Used:**

```bash
pnpm describe --workspace BZ --repository nimble --branch ${BRANCH_NAME}
pnpm review --workspace BZ --repository nimble --branch ${BRANCH_NAME}
```

### 4. **Deploy to Beta** 🚀

**Triggers on:**

- `beta` branch
- Any branch with `[auto-deployment]` tag

**Features:**

- Beta environment setup
- Time tracking
- Jira deployment notification

### 5. **Deploy to Release** 🎯

**Triggers on:** `release` branch

**Features:**

- Production environment setup
- Time tracking
- Jira deployment notification

## 🔧 Customization Guide

### Step 1: Update Project Variables

Replace template variables in the generated Jenkinsfile:

```groovy
environment {
  PROJECT_NAME = "your-project-name"
  GIT_URL = "bitbucket.juspay.net/scm/bz/your-project.git"
  WORKSPACE_NAME = "BZ"  // or your workspace code
  S3_BUCKET = "your-s3-bucket"
}
```

### Step 2: Configure Environment Setup

Add your environment setup script in the "Setup environment" section:

```groovy
startTime = System.currentTimeMillis()
echo "⚙️ Setting up environment for beta..."

// Add your setup logic here
sh "node scripts/setup-env.js beta"
// OR
sh """
  echo 'REACT_APP_ENV=beta' > .env
  echo 'API_URL=https://api.beta.example.com' >> .env
"""

endTime = System.currentTimeMillis()
timeData.add(["Setup environment", (endTime - startTime) / 1000])
```

### Step 3: Add Deployment Logic

In the beta/release deployment stages, add your actual deployment:

```groovy
stage('Deploy to Beta') {
  steps {
    script {
      // Example: Upload to S3
      sh """
        aws s3 sync build/ s3://${S3_BUCKET}/${PROJECT_NAME}/ \
          --delete \
          --cache-control 'public, max-age=31536000'
      """

      // Example: Invalidate CloudFront
      sh """
        aws cloudfront create-invalidation \
          --distribution-id ${CF_DISTRIBUTION_ID} \
          --paths '/*'
      """

      // Example: Deploy to Kubernetes
      sh """
        kubectl set image deployment/${PROJECT_NAME} \
          ${PROJECT_NAME}=${PROJECT_NAME}:${GIT_COMMIT} \
          -n beta
      """
    }
  }
}
```

### Step 4: Configure Notifications

Add Slack/email notifications in the `post` section:

```groovy
post {
  success {
    echo "✅ Pipeline completed successfully!"
    slackSend(
      color: 'good',
      message: """
        ✅ Build SUCCESS
        Project: ${PROJECT_NAME}
        Branch: ${env.BRANCH_NAME}
        Build: ${env.BUILD_NUMBER}
        URL: ${env.BUILD_URL}
      """,
      channel: '#breeze-ci'
    )
  }

  failure {
    echo "❌ Pipeline failed!"
    slackSend(
      color: 'danger',
      message: """
        ❌ Build FAILED
        Project: ${PROJECT_NAME}
        Branch: ${env.BRANCH_NAME}
        Build: ${env.BUILD_NUMBER}
        URL: ${env.BUILD_URL}
        Failed Stage: ${env.FAILED_STAGE}
      """,
      channel: '#breeze-ci'
    )
  }
}
```

## 🎓 Best Practices

### 1. Single Commit Policy

The pipeline **enforces single commits** on feature branches:

```groovy
if (env.TOTALCOMMITS != "1") {
  currentBuild.result = 'ABORTED'
  error '❌ Aborting: Branch contains multiple commits!'
}
```

**How to squash commits:**

```bash
# Interactive rebase from beta
git rebase -i beta

# Or squash all commits into one
git reset --soft beta
git commit -m "BZ-1234: feat: your feature description"
git push --force
```

### 2. Commit Message Format

Uses commitlint to enforce conventional commits:

```
BZ-1234: (feat): Add user authentication

- Implemented JWT-based authentication
- Added login/logout endpoints
- Updated user model with auth fields
```

**Format:** `TICKET: (type): Short description`

**Types:** feat, fix, docs, style, refactor, test, chore

### 3. Skip CI When Needed

Add tags to commit message to skip pipeline:

```bash
git commit -m "BZ-1234: docs: update README [skip ci]"
```

Tags: `[skip ci]`, `[ci skip]`

### 4. Auto-Deployment from Feature Branch

Test deployment without merging to beta:

```bash
git commit -m "BZ-1234: feat: new feature [auto-deployment]"
```

The pipeline will:

1. Run all tests
2. Deploy to beta environment
3. Notify team

### 5. Using AI Automation

The AI stages run automatically on feature branches:

- **Auto Description**: Enhances PR descriptions using AI
- **Auto Review**: Provides AI code review feedback

**Disable for specific build:**

- Uncheck "Enable AI Review" parameter before building
- Or set to `false` in pipeline parameters

## 🚀 Jenkins Setup

### Required Plugins

- Pipeline plugin
- BitBucket plugin
- NodeJS plugin
- Jira plugin

### Required Credentials

Configure these in Jenkins Credentials Manager:

| Credential ID                          | Type              | Description           |
| -------------------------------------- | ----------------- | --------------------- |
| `INFRA_SWITCH_SECRET`                  | Secret text       | Infrastructure switch |
| `c3e1fb65-7cf9-4fbd-9a30-93201908e0a2` | Username/Password | Jira credentials      |
| `d491690d-46d9-4ecb-8b6f-fa6781afd9d9` | Username/Password | BitBucket credentials |
| `titan-hosted-bitbucket`               | Username/Password | Titan bot BitBucket   |
| `titan-bitbucket-bearer-token`         | Secret text       | Titan bearer token    |
| `GEMINI_API_KEY`                       | Secret text       | Google AI API key     |
| `VERTEX_COUNT`                         | Secret file       | Vertex AI credentials |
| `breeze-uat-secrets`                   | Secret file       | GCP Beta credentials  |
| `super-checkout-prod-sa`               | Secret file       | GCP Prod credentials  |

### Node.js Configuration

1. Go to Jenkins → Manage Jenkins → Global Tool Configuration
2. Add NodeJS installation named "Node 20"
3. Set version to 20.x

### Agent Labels

Ensure your Jenkins nodes have the `vayu` label configured.

## 📊 Time Tracking

The pipeline tracks time for each operation:

```
📊 Time Data Summary:
┌─────────────────────────────┬─────────────────┐
│ Task                        │ Time (seconds)  │
├─────────────────────────────┼─────────────────┤
│ Checkout beta               │            2.1  │
│ Checkout branch             │            1.8  │
│ Count commits               │            0.3  │
│ Install dependencies        │           45.2  │
│ Run lint                    │            8.7  │
│ Run type check              │            5.4  │
│ Setup environment           │            1.2  │
│ Build                       │           32.6  │
│ Install Playwright browsers │           12.3  │
│ Run tests                   │           28.9  │
│ Validate commit message     │            0.5  │
└─────────────────────────────┴─────────────────┘
```

Use this data to:

- Identify slow stages
- Optimize build times
- Track performance over time

## 🐛 Troubleshooting

### Build Fails: "Multiple commits detected"

**Solution:** Squash commits into a single commit

```bash
git rebase -i beta
# Mark all commits except first as 'squash'
git push --force
```

### Build Fails: "Commit message format invalid"

**Solution:** Use conventional commit format

```bash
git commit --amend -m "BZ-1234: feat: proper description"
git push --force
```

### AI Stages Fail

**Solution:** These stages are marked as UNSTABLE on failure, won't fail build

Check logs for:

- API key configuration
- Network connectivity
- Vertex AI permissions

### Playwright Tests Fail

**Solution:**

- Check test-results artifacts
- Review Playwright logs
- Ensure browsers are installed

```groovy
sh "pnpm exec playwright install --with-deps"
```

### Docker Build Fails

**Solution:**

- Check Dockerfile syntax
- Verify Docker daemon is running
- Check Jenkins Docker permissions

## 📚 Related Documentation

- [BitBucket Integration](./BITBUCKET_INTEGRATION.md)
- [Getting Started](./GETTING_STARTED.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## 🎯 Quick Start Checklist

When using this template for a new project:

- [ ] Replace all `{{variables}}` with actual values
- [ ] Configure Jenkins credentials
- [ ] Set up Node.js in Jenkins
- [ ] Add environment setup scripts
- [ ] Configure S3/GCS deployment
- [ ] Add Slack notification webhook
- [ ] Test with a feature branch
- [ ] Verify AI stages work
- [ ] Test beta deployment
- [ ] Document project-specific changes

---

**Generated by Shelly** - Juspay Repository Automation
**Based on:** Production Breeze/Nimble pipeline
**Version:** 1.0.0
