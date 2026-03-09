// packageDetector: Auto-detects and injects Juspay standard dependencies
import fs from 'fs/promises';

export interface PackageDetectionResult {
  dependencies: string[];
  devDependencies: string[];
  inlineConfigs: Record<string, any>;
}

export class PackageDetector {
  static juspayDeps = [
    '@juspay/svelte-ui-components',
    'superposition-provider',
    'typesafe-api-call',
    'type-decoder',
  ];
  static juspayDevDeps = [
    '@juspay/yama',
    '@digitalroute/cz-conventional-changelog-for-jira',
    '@nexus2520/bitbucket-mcp-server',
    '@nexus2520/jira-mcp-server',
    'commitlint-config-jira',
    'commitlint-plugin-jira-rules',
    '@commitlint/cli',
    '@commitlint/config-conventional',
    'husky',
    'type-crafter',
    'stylelint',
    'stylelint-config-html',
    'stylelint-config-standard-scss',
    'prettier-plugin-sh',
    'prettier-plugin-svelte',
    'eslint-plugin-unused-imports',
  ];

  static inlineConfigs = {
    commitizen: {
      /* ...template config... */
    },
    standardVersion: {
      /* ...template config... */
    },
    commitlint: {
      /* ...template config... */
    },
    autoChangelog: {
      /* ...template config... */
    },
    msw: {
      /* ...template config... */
    },
    engines: { npm: 'please.use.pnpm', node: '>=20.12.0' },
  };

  // Detect missing Juspay dependencies in package.json
  static async detectAndInject(
    packageJsonPath: string
  ): Promise<PackageDetectionResult> {
    const pkgRaw = await fs.readFile(packageJsonPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const missingDeps = this.juspayDeps.filter(
      (dep) => !(pkg.dependencies && pkg.dependencies[dep])
    );
    const missingDevDeps = this.juspayDevDeps.filter(
      (dep) => !(pkg.devDependencies && pkg.devDependencies[dep])
    );
    // Inline configs can be merged as needed
    return {
      dependencies: missingDeps,
      devDependencies: missingDevDeps,
      inlineConfigs: this.inlineConfigs,
    };
  }
}
