import fs from 'fs';
import path from 'path';

export function generatePipelinesYaml(cwd: string): string {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return generateDefaultPipeline();

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const pm = detectPackageManager(cwd);
  const scripts = detectScripts(pkg);

  const defaultStep = buildDefaultStep(pm, scripts);
  const prSteps = buildPrParallelSteps(pm, scripts);
  const branchSteps = buildBranchSteps(pm, scripts);
  const tagSteps = buildTagSteps(pm, scripts, pkg.private === true);
  const definitions = pm.type === 'pnpm' ? buildPnpmDefinitions() : '';

  return `image: node:20

pipelines:
  default:
${defaultStep}

  pull-requests:
    '**':
${prSteps}

  branches:
${branchSteps}

  tags:
${tagSteps}
${definitions}`;
}

interface PackageManager {
  type: 'npm' | 'yarn' | 'pnpm';
  install: string;
  run: string;
  test: string;
  cache: string;
  audit: string;
}

interface Scripts {
  lint: boolean;
  test: boolean;
  build: boolean;
  typecheck: boolean;
  typecheckCmd: string;
}

function detectPackageManager(cwd: string): PackageManager {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return {
      type: 'pnpm', install: 'pnpm install --frozen-lockfile',
      run: 'pnpm', test: 'pnpm test', cache: 'pnpm',
      audit: 'pnpm audit --audit-level=high',
    };
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return {
      type: 'yarn', install: 'yarn install --frozen-lockfile',
      run: 'yarn', test: 'yarn test', cache: 'yarn',
      audit: 'yarn audit --level high',
    };
  }
  return {
    type: 'npm', install: 'npm ci',
    run: 'npm run', test: 'npm test', cache: 'node',
    audit: 'npm audit --audit-level=high',
  };
}

function detectScripts(pkg: Record<string, unknown>): Scripts {
  const s = (pkg.scripts || {}) as Record<string, string>;
  return {
    lint: !!s.lint,
    test: !!s.test && !s.test.includes('no test specified'),
    build: !!s.build,
    typecheck: !!s.typecheck || !!s['type-check'],
    typecheckCmd: s.typecheck ? 'npm run typecheck' : 'npm run type-check',
  };
}

function buildDefaultStep(pm: PackageManager, s: Scripts): string {
  const lines = [`            - ${pm.install}`];
  if (s.lint) lines.push(`            - ${pm.run} lint`);
  if (s.typecheck) lines.push(`            - ${s.typecheckCmd}`);
  if (s.build) lines.push(`            - ${pm.run} build`);
  if (s.test) lines.push(`            - ${pm.test}`);

  return `    - step:
        name: Install & Validate
        caches:
          - ${pm.cache}
        script:
${lines.join('\n')}`;
}

function buildPrParallelSteps(pm: PackageManager, s: Scripts): string {
  const steps: string[] = [];

  if (s.lint) steps.push(prStep('Lint', pm, `${pm.run} lint`));
  if (s.typecheck) steps.push(prStep('Type Check', pm, s.typecheckCmd));
  if (s.test) steps.push(prStep('Test', pm, pm.test));
  if (s.build) steps.push(prStep('Build', pm, `${pm.run} build`, ['dist/**']));
  steps.push(prStep('Security Audit', pm, `${pm.audit} || true`));

  return `      - parallel:
${steps.join('\n')}`;
}

function prStep(name: string, pm: PackageManager, cmd: string, artifacts?: string[]): string {
  let step = `          - step:
              name: ${name}
              caches:
                - ${pm.cache}
              script:
                - ${pm.install}
                - ${cmd}`;
  if (artifacts) {
    step += `\n              artifacts:\n${artifacts.map(a => `                - ${a}`).join('\n')}`;
  }
  return step;
}

function buildBranchSteps(pm: PackageManager, s: Scripts): string {
  const mainScript = [pm.install];
  if (s.build) mainScript.push(`${pm.run} build`);
  if (s.test) mainScript.push(pm.test);

  return `    main:
      - step:
          name: Build & Verify
          caches:
            - ${pm.cache}
          script:
${mainScript.map(c => `            - ${c}`).join('\n')}
          artifacts:
            - dist/**
      - step:
          name: Deploy
          deployment: production
          trigger: manual
          script:
            - echo "Add your deployment commands here"

    develop:
      - step:
          name: Build & Test
          caches:
            - ${pm.cache}
          script:
${mainScript.map(c => `            - ${c}`).join('\n')}
      - step:
          name: Deploy to Staging
          deployment: staging
          trigger: manual
          script:
            - echo "Add your staging deployment commands here"`;
}

function buildTagSteps(pm: PackageManager, s: Scripts, isPrivate: boolean): string {
  if (!isPrivate) {
    const script = [pm.install];
    if (s.build) script.push(`${pm.run} build`);
    script.push('echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc');
    script.push('npm publish --access public');

    return `    'v*':
      - step:
          name: Publish to NPM
          caches:
            - ${pm.cache}
          script:
${script.map(c => `            - ${c}`).join('\n')}`;
  }

  const script = [pm.install];
  if (s.build) script.push(`${pm.run} build`);
  if (s.test) script.push(pm.test);
  script.push('echo "Release $(git describe --tags) built successfully"');

  return `    'v*':
      - step:
          name: Build Release
          caches:
            - ${pm.cache}
          script:
${script.map(c => `            - ${c}`).join('\n')}
          artifacts:
            - dist/**`;
}

function buildPnpmDefinitions(): string {
  return `
definitions:
  caches:
    pnpm: $HOME/.local/share/pnpm/store
`;
}

function generateDefaultPipeline(): string {
  return `image: atlassian/default-image:4

pipelines:
  default:
    - step:
        name: Build & Test
        script:
          - echo "Add your build and test commands here"

  pull-requests:
    '**':
      - step:
          name: PR Validation
          script:
            - echo "Add your PR validation commands here"

  branches:
    main:
      - step:
          name: Build
          script:
            - echo "Add your production build commands here"
      - step:
          name: Deploy
          deployment: production
          trigger: manual
          script:
            - echo "Add your deployment commands here"

  tags:
    'v*':
      - step:
          name: Release
          script:
            - echo "Build release $(git describe --tags)"
`;
}
