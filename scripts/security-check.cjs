#!/usr/bin/env node

/**
 * Security Check Script
 * Comprehensive security validation for the project
 *
 * Usage: node scripts/security-check.cjs
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for professional output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// Critical security rules for detection
const CRITICAL_SECURITY_RULES = [
  {
    id: 'aws-access-token',
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    description: 'AWS Access Key ID detected',
  },
  {
    id: 'openai-api-key',
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}/g,
    severity: 'critical',
    description: 'OpenAI API key detected',
  },
  {
    id: 'github-token',
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: 'critical',
    description: 'GitHub personal access token detected',
  },
  {
    id: 'private-key',
    name: 'Private Key',
    pattern:
      /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----/g,
    severity: 'critical',
    description: 'Private key detected',
  },
];

// Additional patterns for basic secret detection
const SECRET_PATTERNS = [
  {
    id: 'openai-key-simple',
    name: 'OpenAI API Key (Simple)',
    pattern: /sk-[a-zA-Z0-9]{32,}/g,
    severity: 'high',
    description: 'Potential OpenAI API key detected',
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    // Require AWS context - look for secret key near aws/AWS keywords or in assignment
    pattern:
      /(?:aws|AWS|secret|SECRET|access|ACCESS)[_\-]?(?:secret|SECRET|access|ACCESS|key|KEY)?[_\-]?(?:key|KEY|id|ID)?[\s]*[=:]["']?([A-Za-z0-9/+=]{40})["']?/g,
    severity: 'high',
    description: 'AWS Secret Access Key detected',
  },
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'critical',
    description: 'Google API key detected',
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
    severity: 'critical',
    description: 'Slack token detected',
  },
  {
    id: 'stripe-key',
    name: 'Stripe API Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'critical',
    description: 'Stripe live API key detected',
  },
  {
    id: 'jwt-token',
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    severity: 'medium',
    description: 'JWT token detected (may be test data)',
  },
  {
    id: 'generic-api-key',
    name: 'Generic API Key',
    pattern: /[aA][pP][iI][-_]?[kK][eE][yY]\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/g,
    severity: 'medium',
    description: 'Generic API key assignment detected',
  },
  {
    id: 'password-assignment',
    name: 'Password Assignment',
    pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['"][^'"]{8,}['"]/g,
    severity: 'high',
    description: 'Hardcoded password detected',
  },
];

// Files and directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '*.min.js',
  '*.bundle.js',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  '.env.development',
  '.env.production',
  '.env.test',
];

// Required patterns in .gitignore for security
const REQUIRED_GITIGNORE_PATTERNS = [
  '.env',
  '.env.local',
  '.env*.local',
  '*.pem',
  '*.key',
  '.secrets',
  'credentials.json',
];

class SecurityValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.startTime = Date.now();
    this.results = {
      vulnerabilities: null,
      secrets: [],
      licenses: null,
      bestPractices: [],
    };
    this.projectRoot = process.cwd();
  }

  /**
   * Log a message with optional color
   */
  log(message, color = 'reset') {
    const colorCode = COLORS[color] || COLORS.reset;
    console.log(`${colorCode}${message}${COLORS.reset}`);
  }

  /**
   * Add an issue to the appropriate list
   */
  addIssue(level, category, message, details = null) {
    const issue = {
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    switch (level) {
      case 'error':
      case 'critical':
        this.errors.push(issue);
        break;
      case 'warning':
        this.warnings.push(issue);
        break;
      case 'info':
      default:
        this.info.push(issue);
        break;
    }
  }

  /**
   * Check for dependency vulnerabilities using pnpm or npm audit
   */
  checkDependencyVulnerabilities() {
    this.log('\n[1/6] Checking dependency vulnerabilities...', 'cyan');

    // Detect package manager
    const hasPnpmLock = fs.existsSync(
      path.join(this.projectRoot, 'pnpm-lock.yaml')
    );
    const hasYarnLock = fs.existsSync(path.join(this.projectRoot, 'yarn.lock'));
    const hasNpmLock = fs.existsSync(
      path.join(this.projectRoot, 'package-lock.json')
    );

    let auditCommand;
    let auditArgs;

    if (hasPnpmLock) {
      auditCommand = 'pnpm';
      auditArgs = ['audit', '--json'];
    } else if (hasYarnLock) {
      auditCommand = 'yarn';
      auditArgs = ['audit', '--json'];
    } else if (hasNpmLock) {
      auditCommand = 'npm';
      auditArgs = ['audit', '--json'];
    } else {
      auditCommand = 'npm';
      auditArgs = ['audit', '--json'];
    }

    try {
      const result = spawnSync(auditCommand, auditArgs, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 60000,
      });

      if (result.error) {
        this.addIssue(
          'warning',
          'dependencies',
          `Could not run ${auditCommand} audit: ${result.error.message}`
        );
        this.log(
          `  ${COLORS.yellow}! Could not run audit command${COLORS.reset}`
        );
        return;
      }

      // Parse audit results
      try {
        const auditData = JSON.parse(result.stdout || '{}');
        this.results.vulnerabilities = auditData;

        // Extract vulnerability counts based on package manager
        let critical = 0;
        let high = 0;
        let moderate = 0;
        let low = 0;

        if (auditCommand === 'npm') {
          const metadata = auditData.metadata || {};
          const vulnerabilities = metadata.vulnerabilities || {};
          critical = vulnerabilities.critical || 0;
          high = vulnerabilities.high || 0;
          moderate = vulnerabilities.moderate || 0;
          low = vulnerabilities.low || 0;
        } else if (auditCommand === 'pnpm') {
          // pnpm audit format
          const advisories = auditData.advisories || {};
          Object.values(advisories).forEach((advisory) => {
            switch (advisory.severity) {
              case 'critical':
                critical++;
                break;
              case 'high':
                high++;
                break;
              case 'moderate':
                moderate++;
                break;
              case 'low':
                low++;
                break;
            }
          });
        }

        // Dependency vulnerabilities are reported as warnings since they're often
        // in transitive deps that can't be directly fixed - use pnpm audit fix
        if (critical > 0) {
          this.addIssue(
            'warning',
            'dependencies',
            `${critical} critical vulnerabilities found - run pnpm audit fix`,
            auditData
          );
          this.log(
            `  ${COLORS.red}✗ ${critical} critical vulnerabilities${COLORS.reset}`
          );
        }
        if (high > 0) {
          this.addIssue(
            'warning',
            'dependencies',
            `${high} high severity vulnerabilities found`
          );
          this.log(
            `  ${COLORS.red}✗ ${high} high severity vulnerabilities${COLORS.reset}`
          );
        }
        if (moderate > 0) {
          this.addIssue(
            'warning',
            'dependencies',
            `${moderate} moderate vulnerabilities found`
          );
          this.log(
            `  ${COLORS.yellow}! ${moderate} moderate vulnerabilities${COLORS.reset}`
          );
        }
        if (low > 0) {
          this.addIssue(
            'info',
            'dependencies',
            `${low} low severity vulnerabilities found`
          );
          this.log(
            `  ${COLORS.dim}  ${low} low severity vulnerabilities${COLORS.reset}`
          );
        }

        if (critical === 0 && high === 0 && moderate === 0 && low === 0) {
          this.log(
            `  ${COLORS.green}✓ No vulnerabilities found${COLORS.reset}`
          );
        }
      } catch (parseError) {
        // Audit command might have non-JSON output on error
        if (result.status !== 0) {
          this.addIssue(
            'warning',
            'dependencies',
            'Audit found issues (could not parse details)'
          );
          this.log(`  ${COLORS.yellow}! Audit reported issues${COLORS.reset}`);
        } else {
          this.log(
            `  ${COLORS.green}✓ No vulnerabilities found${COLORS.reset}`
          );
        }
      }
    } catch (error) {
      this.addIssue(
        'warning',
        'dependencies',
        `Audit check failed: ${error.message}`
      );
      this.log(`  ${COLORS.yellow}! Audit check failed${COLORS.reset}`);
    }
  }

  /**
   * Check for secrets using gitleaks if available
   */
  checkSecretsWithGitleaks() {
    this.log('\n[2/6] Checking for secrets with gitleaks...', 'cyan');

    // Check if gitleaks is installed
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const whichResult = spawnSync(whichCmd, ['gitleaks'], {
      encoding: 'utf-8',
    });

    if (whichResult.status !== 0) {
      this.log(
        `  ${COLORS.yellow}! gitleaks not installed, using basic detection${COLORS.reset}`
      );
      return this.basicSecretDetection();
    }

    try {
      const result = spawnSync(
        'gitleaks',
        [
          'detect',
          '--source',
          this.projectRoot,
          '--no-git',
          '--report-format',
          'json',
        ],
        {
          encoding: 'utf-8',
          timeout: 120000,
        }
      );

      if (result.stdout) {
        try {
          const findings = JSON.parse(result.stdout);
          if (Array.isArray(findings) && findings.length > 0) {
            findings.forEach((finding) => {
              this.results.secrets.push(finding);
              this.addIssue(
                'critical',
                'secrets',
                `Secret detected: ${finding.Description || finding.RuleID}`,
                {
                  file: finding.File,
                  line: finding.StartLine,
                  rule: finding.RuleID,
                }
              );
              this.log(
                `  ${COLORS.red}✗ ${finding.Description || finding.RuleID} in ${finding.File}:${finding.StartLine}${COLORS.reset}`
              );
            });
          } else {
            this.log(
              `  ${COLORS.green}✓ No secrets detected by gitleaks${COLORS.reset}`
            );
          }
        } catch (parseError) {
          // No findings or empty output
          this.log(
            `  ${COLORS.green}✓ No secrets detected by gitleaks${COLORS.reset}`
          );
        }
      } else if (result.status === 0) {
        this.log(
          `  ${COLORS.green}✓ No secrets detected by gitleaks${COLORS.reset}`
        );
      } else {
        this.log(
          `  ${COLORS.yellow}! gitleaks scan completed with warnings${COLORS.reset}`
        );
      }
    } catch (error) {
      this.addIssue(
        'warning',
        'secrets',
        `gitleaks check failed: ${error.message}`
      );
      this.log(
        `  ${COLORS.yellow}! gitleaks check failed, falling back to basic detection${COLORS.reset}`
      );
      return this.basicSecretDetection();
    }
  }

  /**
   * Basic pattern-based secret detection (fallback)
   */
  basicSecretDetection() {
    this.log('\n  Running basic secret detection...', 'dim');

    const allPatterns = [...CRITICAL_SECURITY_RULES, ...SECRET_PATTERNS];
    const filesToScan = this.getFilesToScan();
    let secretsFound = 0;

    filesToScan.forEach((filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(this.projectRoot, filePath);

        allPatterns.forEach((rule) => {
          const matches = content.match(rule.pattern);
          if (matches) {
            matches.forEach((match) => {
              // Find line number
              const lines = content.split('\n');
              let lineNumber = 0;
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(match)) {
                  lineNumber = i + 1;
                  break;
                }
              }

              secretsFound++;
              this.results.secrets.push({
                rule: rule.id,
                file: relativePath,
                line: lineNumber,
                severity: rule.severity,
              });

              const level =
                rule.severity === 'critical'
                  ? 'critical'
                  : rule.severity === 'high'
                    ? 'error'
                    : 'warning';
              this.addIssue(
                level,
                'secrets',
                `${rule.name}: ${rule.description}`,
                {
                  file: relativePath,
                  line: lineNumber,
                  match: match.substring(0, 20) + '...',
                }
              );

              const colorCode =
                rule.severity === 'critical'
                  ? 'red'
                  : rule.severity === 'high'
                    ? 'red'
                    : 'yellow';
              this.log(
                `  ${COLORS[colorCode]}✗ ${rule.name} in ${relativePath}:${lineNumber}${COLORS.reset}`
              );
            });
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    });

    if (secretsFound === 0) {
      this.log(
        `  ${COLORS.green}✓ No secrets detected in basic scan${COLORS.reset}`
      );
    }
  }

  /**
   * Get list of files to scan, excluding certain patterns
   */
  getFilesToScan(dir = this.projectRoot, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectRoot, fullPath);

      // Check exclusions
      const shouldExclude = EXCLUDE_PATTERNS.some((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(entry.name);
        }
        return entry.name === pattern || relativePath.includes(pattern);
      });

      if (shouldExclude) continue;

      if (entry.isDirectory()) {
        this.getFilesToScan(fullPath, files);
      } else if (entry.isFile()) {
        // Only scan text files
        const ext = path.extname(entry.name).toLowerCase();
        const textExtensions = [
          '.js',
          '.ts',
          '.jsx',
          '.tsx',
          '.json',
          '.yml',
          '.yaml',
          '.env',
          '.sh',
          '.bash',
          '.zsh',
          '.py',
          '.rb',
          '.go',
          '.java',
          '.md',
          '.txt',
          '.cfg',
          '.conf',
          '.ini',
          '.xml',
          '.html',
          '.css',
          '.scss',
          '.less',
        ];
        if (textExtensions.includes(ext) || !ext) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Check license compliance
   */
  checkLicenseCompliance() {
    this.log('\n[3/6] Checking license compliance...', 'cyan');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      this.addIssue('warning', 'license', 'No package.json found');
      this.log(`  ${COLORS.yellow}! No package.json found${COLORS.reset}`);
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const license = packageJson.license;

      if (!license) {
        this.addIssue(
          'warning',
          'license',
          'No license specified in package.json'
        );
        this.log(
          `  ${COLORS.yellow}! No license specified in package.json${COLORS.reset}`
        );
      } else {
        this.results.licenses = license;
        this.log(`  ${COLORS.green}✓ License: ${license}${COLORS.reset}`);
      }

      // Check for LICENSE file
      const licenseFiles = [
        'LICENSE',
        'LICENSE.md',
        'LICENSE.txt',
        'LICENCE',
        'LICENCE.md',
      ];
      const hasLicenseFile = licenseFiles.some((file) =>
        fs.existsSync(path.join(this.projectRoot, file))
      );

      if (!hasLicenseFile) {
        this.addIssue(
          'info',
          'license',
          'No LICENSE file found in project root'
        );
        this.log(`  ${COLORS.dim}  No LICENSE file found${COLORS.reset}`);
      } else {
        this.log(`  ${COLORS.green}✓ LICENSE file present${COLORS.reset}`);
      }
    } catch (error) {
      this.addIssue(
        'warning',
        'license',
        `Could not parse package.json: ${error.message}`
      );
      this.log(
        `  ${COLORS.yellow}! Could not parse package.json${COLORS.reset}`
      );
    }
  }

  /**
   * Check security best practices
   */
  checkSecurityBestPractices() {
    this.log('\n[4/6] Checking security best practices...', 'cyan');

    this.checkGitIgnore();
    this.checkEnvExample();
    this.checkSecurityDependencies();
    this.checkPackageScripts();
  }

  /**
   * Ensure security-sensitive patterns are in .gitignore
   */
  checkGitIgnore() {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      this.addIssue('error', 'best-practices', 'No .gitignore file found');
      this.log(`  ${COLORS.red}✗ No .gitignore file found${COLORS.reset}`);
      return;
    }

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const missingPatterns = [];

    REQUIRED_GITIGNORE_PATTERNS.forEach((pattern) => {
      // Check if pattern or a more general version is present
      const patternEscaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(patternEscaped.replace(/\\\*/g, '.*'), 'm');

      if (
        !regex.test(gitignoreContent) &&
        !gitignoreContent.includes(pattern)
      ) {
        missingPatterns.push(pattern);
      }
    });

    if (missingPatterns.length > 0) {
      this.addIssue(
        'warning',
        'best-practices',
        `Missing patterns in .gitignore: ${missingPatterns.join(', ')}`
      );
      this.log(
        `  ${COLORS.yellow}! Missing .gitignore patterns: ${missingPatterns.join(', ')}${COLORS.reset}`
      );
    } else {
      this.log(
        `  ${COLORS.green}✓ .gitignore has security patterns${COLORS.reset}`
      );
    }

    this.results.bestPractices.push({
      check: 'gitignore',
      status: missingPatterns.length === 0 ? 'pass' : 'warning',
      missingPatterns,
    });
  }

  /**
   * Check for .env.example file
   */
  checkEnvExample() {
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    const envPath = path.join(this.projectRoot, '.env');

    if (fs.existsSync(envPath) && !fs.existsSync(envExamplePath)) {
      this.addIssue(
        'warning',
        'best-practices',
        '.env file exists but no .env.example template provided'
      );
      this.log(
        `  ${COLORS.yellow}! .env exists but no .env.example template${COLORS.reset}`
      );
      this.results.bestPractices.push({
        check: 'env-example',
        status: 'warning',
      });
    } else if (fs.existsSync(envExamplePath)) {
      this.log(
        `  ${COLORS.green}✓ .env.example template exists${COLORS.reset}`
      );
      this.results.bestPractices.push({
        check: 'env-example',
        status: 'pass',
      });
    } else {
      this.results.bestPractices.push({
        check: 'env-example',
        status: 'not-applicable',
      });
    }
  }

  /**
   * Check for security-related dependencies
   */
  checkSecurityDependencies() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const securityPackages = [
        'helmet',
        'express-rate-limit',
        'cors',
        'csurf',
        'express-validator',
        'joi',
        'zod',
        'sanitize-html',
        'xss',
        'bcrypt',
        'argon2',
      ];

      const foundPackages = securityPackages.filter((pkg) => allDeps[pkg]);

      if (foundPackages.length > 0) {
        this.log(
          `  ${COLORS.green}✓ Security packages found: ${foundPackages.join(', ')}${COLORS.reset}`
        );
      }

      this.results.bestPractices.push({
        check: 'security-dependencies',
        status: 'info',
        found: foundPackages,
      });
    } catch (error) {
      // Skip if package.json can't be parsed
    }
  }

  /**
   * Check for security-related npm scripts
   */
  checkPackageScripts() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      const securityScripts = [
        'audit',
        'security',
        'security-check',
        'audit:fix',
      ];
      const foundScripts = securityScripts.filter((script) => scripts[script]);

      if (foundScripts.length === 0) {
        this.addIssue(
          'info',
          'best-practices',
          'Consider adding security audit scripts to package.json'
        );
        this.log(
          `  ${COLORS.dim}  Consider adding audit scripts to package.json${COLORS.reset}`
        );
      } else {
        this.log(
          `  ${COLORS.green}✓ Security scripts found: ${foundScripts.join(', ')}${COLORS.reset}`
        );
      }

      this.results.bestPractices.push({
        check: 'package-scripts',
        status: foundScripts.length > 0 ? 'pass' : 'info',
        found: foundScripts,
      });
    } catch (error) {
      // Skip if package.json can't be parsed
    }
  }

  /**
   * Generate comprehensive security report
   */
  generateReport() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('                    SECURITY REPORT', 'bold');
    this.log('='.repeat(60), 'cyan');

    // Summary
    this.log('\n📊 Summary:', 'bold');
    this.log(`   Duration: ${elapsed}s`);
    this.log(
      `   ${COLORS.red}Critical/Errors: ${this.errors.length}${COLORS.reset}`
    );
    this.log(
      `   ${COLORS.yellow}Warnings: ${this.warnings.length}${COLORS.reset}`
    );
    this.log(`   ${COLORS.dim}Info: ${this.info.length}${COLORS.reset}`);

    // Critical Issues
    if (this.errors.length > 0) {
      this.log('\n🚨 Critical Issues:', 'red');
      this.errors.forEach((issue, index) => {
        this.log(
          `   ${index + 1}. [${issue.category}] ${issue.message}`,
          'red'
        );
        if (issue.details && issue.details.file) {
          this.log(
            `      File: ${issue.details.file}:${issue.details.line || '?'}`,
            'dim'
          );
        }
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'yellow');
      this.warnings.forEach((issue, index) => {
        this.log(
          `   ${index + 1}. [${issue.category}] ${issue.message}`,
          'yellow'
        );
      });
    }

    // Recommendations
    this.log('\n📋 Recommendations:', 'cyan');
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('   ✓ No critical security issues found!', 'green');
    } else {
      if (this.errors.some((e) => e.category === 'secrets')) {
        this.log(
          '   • Remove detected secrets and rotate compromised credentials',
          'white'
        );
        this.log(
          '   • Use environment variables for sensitive configuration',
          'white'
        );
      }
      if (this.errors.some((e) => e.category === 'dependencies')) {
        this.log(
          '   • Run npm/pnpm audit fix to resolve vulnerabilities',
          'white'
        );
        this.log('   • Review and update outdated dependencies', 'white');
      }
      if (this.warnings.some((w) => w.category === 'best-practices')) {
        this.log('   • Review and implement security best practices', 'white');
        this.log('   • Consider adding security-focused dependencies', 'white');
      }
    }

    this.log('\n' + '='.repeat(60), 'cyan');

    // Final status
    if (this.errors.length > 0) {
      this.log(
        `\n${COLORS.bgRed}${COLORS.white} SECURITY CHECK FAILED ${COLORS.reset}`,
        'bold'
      );
      return false;
    } else if (this.warnings.length > 0) {
      this.log(
        `\n${COLORS.bgYellow}${COLORS.white} SECURITY CHECK PASSED WITH WARNINGS ${COLORS.reset}`,
        'bold'
      );
      return true;
    } else {
      this.log(
        `\n${COLORS.bgGreen}${COLORS.white} SECURITY CHECK PASSED ${COLORS.reset}`,
        'bold'
      );
      return true;
    }
  }

  /**
   * Main execution method
   */
  async run() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('           🔒 SECURITY VALIDATION CHECK 🔒', 'bold');
    this.log('='.repeat(60), 'cyan');
    this.log(`\nProject: ${this.projectRoot}`);
    this.log(`Started: ${new Date().toISOString()}`);

    // Run all security checks
    this.checkDependencyVulnerabilities();
    this.checkSecretsWithGitleaks();
    this.checkLicenseCompliance();
    this.checkSecurityBestPractices();

    this.log('\n[5/6] Analyzing results...', 'cyan');
    this.log('\n[6/6] Generating report...', 'cyan');

    // Generate and display report
    const passed = this.generateReport();

    // Exit with appropriate code
    process.exit(passed && this.errors.length === 0 ? 0 : 1);
  }
}

// Main execution
const validator = new SecurityValidator();
validator.run().catch((error) => {
  console.error(
    `${COLORS.red}Security check failed with error: ${error.message}${COLORS.reset}`
  );
  process.exit(1);
});
