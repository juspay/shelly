/**
 * File Tier Categorization
 * Single source of truth for which tier each file belongs to.
 * Files not listed here default to 'essential'.
 */

import { SetupTier } from '../config/setupTiers.js';

export const FILE_MINIMUM_TIERS: Record<string, SetupTier> = {
  // ── Essential ────────────────────────────────────────────────────────────
  'README.md': 'essential',
  'CONTRIBUTING.md': 'essential',
  'CODE_OF_CONDUCT.md': 'essential',
  LICENSE: 'essential',
  'CHANGELOG.md': 'essential',
  '.gitignore': 'essential',
  '.editorconfig': 'essential',
  '.env.example': 'essential',
  '.prettierrc': 'essential',
  '.eslintrc.js': 'essential',
  'tsconfig.json': 'essential',
  '.github/PULL_REQUEST_TEMPLATE.md': 'essential',
  '.github/ISSUE_TEMPLATE/bug_report.md': 'essential',
  '.github/workflows/ci.yml': 'essential',
  'examples/README.md': 'essential',
  'examples/basic-example.js': 'essential',
  Jenkinsfile: 'essential',
  // Bitbucket / Juspay git hook scripts
  'scripts/git-hooks/pre-commit.sh': 'essential',
  'scripts/git-hooks/commit-msg.sh': 'essential',
  'scripts/git-hooks/prepare-commit-msg.sh': 'essential',

  // ── Standard ─────────────────────────────────────────────────────────────
  'SECURITY.md': 'standard',
  '.env.test': 'standard',
  '.prettierignore': 'standard',
  '.gitattributes': 'standard',
  '.nvmrc': 'standard',
  '.npmrc': 'standard',
  '.markdownlint.json': 'standard',
  'eslint.config.js': 'standard',
  'commitlint.config.js': 'standard',
  'typedoc.json': 'standard',
  '.releaserc.json': 'standard',
  'mkdocs.yml': 'standard',
  'vitest.config.ts': 'standard',
  'tsconfig.cli.json': 'standard',
  'docs/API.md': 'standard',
  'docs/GETTING_STARTED.md': 'standard',

  // GitHub templates — standard
  '.github/ISSUE_TEMPLATE/bug_report.yml': 'standard',
  '.github/ISSUE_TEMPLATE/feature_request.md': 'standard',
  '.github/ISSUE_TEMPLATE/feature_request.yml': 'standard',
  '.github/ISSUE_TEMPLATE/documentation.md': 'standard',
  '.github/ISSUE_TEMPLATE/config.yml': 'standard',
  '.github/CODEOWNERS': 'standard',
  '.github/dependabot.yml': 'standard',
  '.github/mlc_config.json': 'standard',

  // GitHub workflows — standard
  '.github/workflows/release.yml': 'standard',
  '.github/workflows/docs.yml': 'standard',

  // Husky hooks — tier matches corresponding git-hook script
  '.husky/pre-commit': 'essential',
  '.husky/commit-msg': 'essential',
  '.husky/prepare-commit-msg': 'essential',
  '.husky/pre-push': 'standard',
  '.husky/post-commit': 'standard',
  '.husky/README.md': 'standard',
  'scripts/pre-commit.sh': 'standard',
  'scripts/build-validations.cjs': 'standard',
  'scripts/commit-validation.cjs': 'standard',
  'scripts/env-validation.cjs': 'standard',
  'scripts/smart-test.cjs': 'standard',
  'scripts/postinstall.cjs': 'standard',
  'scripts/format-staged.cjs': 'standard',
  'scripts/format-changelog.cjs': 'standard',
  'scripts/semantic-release-format-plugin.cjs': 'standard',

  // Directory templates — standard
  'config/README.md': 'standard',
  'config/default.json': 'standard',
  'tools/README.md': 'standard',
  'tools/automation/README.md': 'standard',
  'tools/testing/README.md': 'standard',
  'tools/development/README.md': 'standard',
  'tools/content/README.md': 'standard',
  'todos/ROADMAP.md': 'standard',
  'tests/setup.ts': 'standard',
  'src/commands/command.example.ts': 'standard',
  'src/services/service.example.ts': 'standard',
  'src/providers/provider.example.ts': 'standard',
  'scripts/git-hooks/pre-push.sh': 'standard',
  'scripts/git-hooks/post-commit.sh': 'standard',
  'DEVELOPMENT.md': 'standard',

  // ── Complete ──────────────────────────────────────────────────────────────
  'CLAUDE.md': 'complete',
  '.clinerules': 'complete',
  '.gitleaksrc.json': 'complete',
  '.gitleaksignore': 'complete',
  '.mcp-servers.example.json': 'complete',
  '.mcp-servers.json': 'complete',

  // GitHub advanced — complete
  '.github/workflows/copilot-review.yml': 'complete',
  '.github/workflows/dependency-review.yml': 'complete',
  '.github/workflows/single-commit-enforcement.yml': 'complete',
  '.github/workflows/update-major-tag.yml': 'complete',
  '.github/workflows/docs-deploy.yml': 'complete',
  '.github/workflows/docs-pr-validation.yml': 'complete',
  '.github/BRANCH_PROTECTION_CONFIG.md': 'complete',
  '.github/SINGLE_COMMIT_POLICY.md': 'complete',
  '.github/copilot-review.json': 'complete',
  '.github/settings.yml': 'complete',

  // Scripts — complete
  'scripts/security-check.cjs': 'complete',
  'scripts/organize-project.cjs': 'complete',
  'scripts/mcp-test.cjs': 'complete',
  'scripts/quality-metrics.cjs': 'complete',

  // Changeset — complete
  '.changeset/README.md': 'complete',
  '.changeset/config.json': 'complete',

  // AI workflows — complete
  '.ai/workflows/README.md': 'complete',
  '.ai/workflows/code-review.json': 'complete',
  '.ai/workflows/content-creation.json': 'complete',
  '.ai/workflows/data-analysis.json': 'complete',
  '.ai/workflows/documentation.json': 'complete',

  'Agents.md': 'complete',

  // Claude commands — complete
  '.claude/commands/commit.md': 'complete',
  '.claude/commands/refactor-code.md': 'complete',
  '.claude/commands/ultra-think.md': 'complete',
  '.claude/commands/update-docs.md': 'complete',
  '.claude/commands/create-architecture-documentation.md': 'complete',
  '.claude/settings.local.json': 'complete',
};

export function getFileMinimumTier(filename: string): SetupTier {
  return FILE_MINIMUM_TIERS[filename] || 'essential';
}

export function shouldIncludeFileByTier(
  filename: string,
  currentTier: SetupTier
): boolean {
  const minTier = getFileMinimumTier(filename);
  const tierLevels: Record<SetupTier, number> = {
    essential: 1,
    standard: 2,
    complete: 3,
  };
  return tierLevels[currentTier] >= tierLevels[minTier];
}
