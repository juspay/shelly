# Branch Protection Configuration

> Guidelines for setting up branch protection rules for @juspay/shelly

## Overview

This document outlines the recommended branch protection settings for the Shelly repository to ensure code quality, security, and reliable releases for our AI-powered development assistant platform.

## Main/Master Branch Protection

### Required Settings

#### Require a pull request before merging

- ✅ **Require approvals**: 2 approving reviews (for critical changes to core features)
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require review from code owners** (see CODEOWNERS for feature-specific teams)
- ✅ **Restrict pushes that create files larger than 100MB**

#### Require status checks to pass before merging

- ✅ **Require branches to be up to date before merging**
- ✅ **Status checks that are required**:

  **Core Quality Checks:**
  - `Shelly CI/CD Pipeline / Code Quality & Linting (Node.js 18.x)`
  - `Shelly CI/CD Pipeline / Code Quality & Linting (Node.js 20.x)`

  **Functional Testing:**
  - `Shelly CI/CD Pipeline / Functional Testing (ubuntu-latest, 18.x, bash)`
  - `Shelly CI/CD Pipeline / Functional Testing (ubuntu-latest, 20.x, bash)`
  - `Shelly CI/CD Pipeline / Functional Testing (macos-latest, 18.x, bash)`
  - `Shelly CI/CD Pipeline / Functional Testing (macos-latest, 20.x, bash)`
  - `Shelly CI/CD Pipeline / Functional Testing (macos-latest, 20.x, zsh)`

  **Platform & Security:**
  - `Shelly CI/CD Pipeline / Cross-Platform Compatibility (ubuntu-latest, 18.x)`
  - `Shelly CI/CD Pipeline / Cross-Platform Compatibility (ubuntu-latest, 20.x)`
  - `Shelly CI/CD Pipeline / Cross-Platform Compatibility (macos-latest, 18.x)`
  - `Shelly CI/CD Pipeline / Cross-Platform Compatibility (macos-latest, 20.x)`
  - `Shelly CI/CD Pipeline / Security Audit`

  **Documentation:**
  - `Shelly CI/CD Pipeline / Documentation Validation`
  - `Shelly Documentation Pipeline / Documentation Validation`
  - `Shelly Documentation Pipeline / Test Documentation Examples`

  **Dependencies:**
  - `Dependency Review / dependency-review`

#### Require conversation resolution before merging

- ✅ **Require conversation resolution before merging**

#### Require signed commits

- ✅ **Require signed commits** (recommended for security)

#### Require linear history

- ✅ **Require linear history** (maintains clean git history)

#### Require deployments to succeed before merging

- ✅ **Required deployment environments before merge**:
  - `github-pages` (for documentation deployment)

### Additional Rules

#### Restrict pushes that create files

- ✅ **Block pushes that contain secrets**
- ✅ **Block pushes that contain files larger than 100MB**

#### Lock branch

- ❌ **Lock branch** (only enable for maintenance mode)

#### Do not allow bypassing the above settings

- ✅ **Include administrators**
- ✅ **Restrict pushes that create files**

## Development Branch Protection

For development branches (`develop`, `staging`):

### Required Settings

- ✅ **Require approvals**: 1 approving review
- ✅ **Require status checks to pass**
- ✅ **Require branches to be up to date**
- ❌ **Require signed commits** (optional)
- ❌ **Require linear history** (optional)

## Feature Branch Protection

For feature branches (`feature/*`, `fix/*`):

### Recommended Settings

- ✅ **Require status checks to pass**
- ❌ **Require approvals** (optional for feature branches)
- ❌ **Require signed commits** (optional)

## Implementation

### Via GitHub UI

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Set branch name pattern (e.g., `main`, `master`)
4. Configure protection settings as outlined above
5. Save the rule

### Via GitHub CLI

```bash
# Enable branch protection for main branch
gh api repos/juspay-maintainers/shelly/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["CI / test","CI / lint","CI / build"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null
```

### Via Terraform

```hcl
resource "github_branch_protection" "main" {
  repository_id = "shelly"
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = [
      "CI / test",
      "CI / lint",
      "CI / build"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 2
    dismiss_stale_reviews          = true
    require_code_owner_reviews     = true
  }

  enforce_admins = true
}
```

## Monitoring

### Regular Reviews

- **Monthly**: Review branch protection settings
- **Quarterly**: Audit bypass attempts and failures
- **After incidents**: Review and update rules if needed

### Metrics to Track

- Number of protection rule violations
- Average time to merge PRs
- Code review coverage
- Failed status checks

## Troubleshooting

### Common Issues

**Status checks not appearing**

- Ensure CI workflows are properly configured
- Check that status check names match exactly

**Unable to merge despite approvals**

- Verify all required status checks are passing
- Check if branch is up to date with base branch

**Administrators cannot bypass**

- This is by design when "Include administrators" is enabled
- Temporarily disable protection to make emergency changes

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Best Practices for Branch Protection](https://github.blog/2016-09-26-securing-your-repositories/)
