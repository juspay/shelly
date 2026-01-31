# Technical Context: Shelly - AI-Powered Development Assistant

## **Technology Stack**

### **Core Technologies**

- **Programming Language**: TypeScript (ES2022+) with full type safety
- **Runtime Environment**: Node.js 18+ with npm package management
- **Build System**: TypeScript compiler with automated template copying
- **CLI Framework**: Commander.js for professional command-line interfaces
- **AI Integration**: Google AI Studio, Vertex AI, and Neurolink platform
- **Shell Integration**: Native support for bash, zsh, tcsh with fallback mechanisms

### **Key Dependencies**

#### **Production Dependencies**

- **`commander`**: CLI framework for argument parsing and command structure
- **`inquirer`**: Interactive command-line user interfaces and prompts
- **`chalk`**: Terminal styling and colored output for enhanced user experience
- **`fs-extra`**: Enhanced file system operations with promise support
- **`path`**: Node.js path utilities for cross-platform file handling

#### **AI and Content Generation**

- **Google AI SDK**: Integration with Google AI Studio and Vertex AI services
- **Neurolink Platform**: Advanced AI content generation and project analysis
- **Template Engine**: Custom template system for project scaffolding

#### **GitHub Integration**

- **`@octokit/rest`**: GitHub API client for repository management and automation
- **GitHub Actions**: Workflow permissions and approval settings configuration
- **Repository Configuration**: Pull request settings, branch protection, and security policies

#### **Development Dependencies**

- **`typescript`**: TypeScript compiler for type-safe development
- **`@types/node`**: Type definitions for Node.js APIs
- **`@typescript-eslint`**: ESLint integration for TypeScript
- **`eslint`**: Code linting and style enforcement
- **`prettier`**: Code formatting and style consistency
- **`husky`**: Git hooks for automated quality checks
- **`lint-staged`**: Run linters on staged files
- **`semantic-release`**: Automated version management and release

## **Architecture Overview**

### **Dual CLI System**

Shelly implements a sophisticated dual CLI architecture:

1. **Primary CLI (`src/main.ts`)**: Error analysis engine with shell integration
2. **Secondary CLI (`src/shelly/cli.ts`)**: Repository organization and Memory Bank management

### **Service-Oriented Design**

```typescript
// Core service pattern with TypeScript
export const serviceFactory = {
  analysisService: () => import('./src/services/analysisService.js'),
  historyService: () => import('./src/services/historyService.js'),
  memoryBankService: () => import('./src/shelly/services/memoryBankService.js'),
  aiContentGenerator: () => import('./src/shelly/utils/aiContentGenerator.js'),
};
```

## **Development Environment Setup**

### **Prerequisites**

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For version control and contribution workflow
- **Supported OS**: macOS or Linux (primary development platforms)

### **Local Development Setup**

#### **1. Repository Setup**

```bash
# Clone the repository (replace with your fork if contributing)
git clone https://github.com/juspay/shelly.git
cd shelly

# Install dependencies
npm install

# Build the project
npm run build

# Verify installation
node dist/main.js --version
node dist/shelly/cli.js --help
```

#### **2. Environment Configuration**

```bash
# Copy environment template
cp .env.example .env

# Configure AI integration (choose one)
export GOOGLE_AI_API_KEY="your-api-key"                    # Free tier
export GOOGLE_CLOUD_PROJECT="your-project-id"              # Enterprise
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/creds.json" # Service account
```

#### **3. Development Tools Setup**

```bash
# Enable Git hooks
npm run prepare

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm test
```

## **Build and Release Process**

### **Build Pipeline**

```bash
# TypeScript compilation + template copying
npm run build

# Watch mode for development
npm run build:watch  # (if configured)

# Verify build output
ls -la dist/

# Package verification
npm pack --dry-run
```

### **Build Process**

The build process consists of two steps:

1. **TypeScript Compilation**: `tsc` compiles all `.ts` files from `src/` to `dist/`
2. **Template Copying**: `scripts/copy-templates.js` copies all template files to `dist/shelly/templates/`

```bash
# Build script configuration
"build": "tsc && npm run copy-templates"
"copy-templates": "node scripts/copy-templates.js"
```

### **Release Automation**

- **Semantic Release**: Automated versioning based on conventional commits
- **GitHub Actions**: CI/CD pipeline with comprehensive testing
- **npm Publishing**: Automatic package publication to npm registry
- **Documentation Updates**: Automated README and changelog generation

## **Code Quality Standards**

### **Linting Configuration**

```javascript
// .eslintrc.js - Key rules
module.exports = {
  env: { node: true, es2020: true },
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'off', // CLI tools need console output
    'no-process-exit': 'off', // CLI tools need process control
    'prefer-const': 'error', // Enforce immutability
    'no-var': 'error', // Modern JavaScript practices
  },
};
```

### **Code Formatting**

```json
// .prettierrc - Formatting standards
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### **TypeScript Type Safety**

```typescript
/**
 * Analyze command error with AI assistance
 */
async function analyzeError(
  errorOutput: string,
  commandHistory: string[],
  exitCode: number
): Promise<AnalysisResult> {
  // Implementation with full type checking
}

interface AnalysisResult {
  suggestions: string[];
  confidence: number;
  errorType: string;
}
```

## **Testing Strategy**

### **Test Architecture**

```bash
test/
├── unit/              # Unit tests for individual functions
├── integration/       # Integration tests for service interactions
├── e2e/              # End-to-end workflow testing
└── fixtures/         # Test data and mock files
```

### **Testing Commands**

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
```

## **Shell Integration Technical Details**

### **Shell Detection Mechanism**

```typescript
// Shell identification strategy with type safety
type ShellType = 'zsh' | 'bash' | 'tcsh' | 'unknown';

const detectShell = (): ShellType => {
  const shell = process.env.SHELL || '';
  const parentProcess = getParentProcess();

  if (shell.includes('zsh') || parentProcess.includes('zsh')) return 'zsh';
  if (shell.includes('bash') || parentProcess.includes('bash')) return 'bash';
  if (shell.includes('tcsh') || shell.includes('csh')) return 'tcsh';

  return 'unknown';
};
```

### **History Access Patterns**

- **Bash/Zsh**: Use `fc -ln -1` command for real-time history access
- **Tcsh/Csh**: Use `history 2` command with output parsing
- **Fallback**: Direct file system access to shell history files

## **AI Integration Architecture**

### **Multi-Provider Configuration Service**

Shelly now supports multiple AI providers with automatic detection and fallback:

```typescript
// AI Configuration Service (src/services/aiConfigService.ts)
export type AIProvider =
  | 'google'
  | 'ollama'
  | 'openrouter'
  | 'openai'
  | 'mistral';
export type AITier = 'free' | 'paid';

// Provider priority for auto-detection (free tier first)
const FREE_TIER_PRIORITY: AIProvider[] = [
  'ollama',
  'openrouter',
  'google',
  'mistral',
  'openai',
];

// Provider configurations
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  google: {
    model: 'gemini-2.0-flash',
    apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
  },
  ollama: { model: 'llama3.2', baseUrl: 'http://localhost:11434' },
  openrouter: {
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
  },
  mistral: { model: 'mistral-small-latest', apiKeyEnvVar: 'MISTRAL_API_KEY' },
  openai: { model: 'gpt-4o-mini', apiKeyEnvVar: 'OPENAI_API_KEY' },
};
```

### **Environment Variables**

```bash
# AI Provider Selection
SHELLY_AI_PROVIDER=google|ollama|openrouter|mistral|openai
SHELLY_AI_MODEL=<custom-model-name>
SHELLY_AI_TIER=free|paid
SHELLY_AI_DISABLED=true  # Disable AI completely

# API Keys (provider-specific)
GOOGLE_GENERATIVE_AI_API_KEY  # Google Gemini
OPENROUTER_API_KEY            # OpenRouter (has free models)
MISTRAL_API_KEY               # Mistral AI
OPENAI_API_KEY                # OpenAI
OLLAMA_HOST                   # Custom Ollama host (default: localhost:11434)
```

### **Fallback Mode**

When AI is unavailable, Shelly uses template-based generation:

```typescript
// Fallback analysis without AI
function getBasicErrorAnalysis(output: string, exitCode: number): string {
  const cleanOutput = stripAnsi(output); // Strip terminal colors
  // Pattern matching for common errors: npm, git, permission, etc.
}
```

### **Provider Abstraction (Legacy)**

```typescript
// AI service factory pattern with TypeScript
type AIProvider = 'google-ai' | 'vertex-ai' | 'neurolink' | 'auto';

class AIServiceFactory {
  static create(provider: AIProvider = 'auto'): AIService {
    switch (provider) {
      case 'google-ai':
        return new GoogleAIService();
      case 'vertex-ai':
        return new VertexAIService();
      case 'neurolink':
        return new NeurolinkService();
      default:
        return this.detectBestProvider();
    }
  }
}
```

### **Content Generation Pipeline**

1. **Project Analysis**: Scan repository structure and dependencies
2. **Context Gathering**: Collect package.json, README, and code patterns
3. **AI Processing**: Generate content using selected AI provider
4. **Template Merging**: Combine AI content with static templates
5. **Output Generation**: Create structured documentation files

## **File System Operations**

### **Safe File Handling**

```typescript
// Robust file operations with error handling and type safety
const safeFileOperation = async (
  operation: (path: string, content: string) => Promise<void>,
  filePath: string,
  content: string
): Promise<void> => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await operation(filePath, content);
    console.log(`✅ ${operation.name}: ${filePath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed ${operation.name}: ${filePath}`, errorMessage);
    throw error;
  }
};
```

### **Cross-Platform Compatibility**

- **Path Handling**: Use `path.posix` and `path.win32` appropriately
- **Line Endings**: Normalize line endings based on platform
- **File Permissions**: Handle Unix permissions while maintaining Windows compatibility

## **Performance Optimization**

### **Caching Strategy**

- **AI Response Caching**: Cache AI-generated content for repeated operations
- **Template Caching**: In-memory template storage for faster access
- **Command History Caching**: Local cache for shell history parsing results

### **Async Operations**

```typescript
// Parallel processing for file operations with proper typing
interface OperationResult<T> {
  operation: Promise<T>;
  success: boolean;
  result: T | Error;
}

const parallelFileOperations = async <T>(
  operations: Promise<T>[]
): Promise<OperationResult<T>[]> => {
  const results = await Promise.allSettled(operations);
  return results.map((result, index) => ({
    operation: operations[index],
    success: result.status === 'fulfilled',
    result: result.status === 'fulfilled' ? result.value : result.reason,
  }));
};
```

## **Error Handling and Debugging**

### **Structured Error Management**

```typescript
// Custom error classes with TypeScript type safety
interface ErrorDetails {
  [key: string]: any;
}

class ShellyError extends Error {
  public readonly code: string;
  public readonly details: ErrorDetails;

  constructor(message: string, code: string, details: ErrorDetails = {}) {
    super(message);
    this.name = 'ShellyError';
    this.code = code;
    this.details = details;
  }
}

class AIServiceError extends ShellyError {
  constructor(message: string, provider: string, details: ErrorDetails = {}) {
    super(message, 'AI_SERVICE_ERROR', { provider, ...details });
  }
}
```

### **Debug Mode**

```bash
# Enable comprehensive debug logging (use dist/ after build)
SHELLY_DEBUG=true node dist/main.js
SHELLY_DEBUG=true node dist/shelly/cli.js organize

# Debug specific components
DEBUG=shelly:analysis node dist/main.js
DEBUG=shelly:memory node dist/shelly/cli.js memory init
```

## **Security Considerations**

### **Input Validation**

- **Command Sanitization**: Prevent shell injection in command analysis
- **Path Validation**: Ensure file operations stay within project boundaries
- **Environment Variable Handling**: Secure management of API credentials

### **AI Service Security**

- **API Key Protection**: Environment variable storage, never in code
- **Rate Limiting**: Respect AI service usage limits and quotas
- **Content Filtering**: Validate AI-generated content before file writes

## **Deployment and Distribution**

### **Package Management**

```json
// package.json - Key configuration
{
  "name": "@juspay/shelly",
  "bin": {
    "shelly": "./dist/main.js"
  },
  "files": [
    "dist/",
    "src/shelly/templates/",
    "docs/",
    "memory-bank/",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsc && npm run copy-templates",
    "copy-templates": "node scripts/copy-templates.js"
  }
}
```

### **Global Installation**

```bash
# Install globally for end users
npm install -g @juspay/shelly

# Verify installation
which shelly
shelly --version
```

## **Development Workflow**

### **Contribution Process**

1. **Fork and Clone**: Standard GitHub workflow
2. **Branch Strategy**: Feature branches from main
3. **Development**:
   - Edit TypeScript files in `src/`
   - Build with `npm run build`
   - Test with `node dist/main.js`
4. **Quality Checks**: Automated linting, formatting, type checking, and testing
5. **Pull Request**: Comprehensive review process

### **Release Workflow**

1. **Development**: Feature implementation and testing
2. **Integration**: Merge to main branch
3. **CI/CD**: Automated testing and validation
4. **Release**: Semantic versioning and npm publication
5. **Documentation**: Automated updates to Memory Bank and docs

## **Monitoring and Maintenance**

### **Health Checks**

```bash
# Verify all systems operational
shelly --version                    # Basic functionality
shelly config                       # AI configuration status
shelly config providers             # Available AI providers
shelly organize --dry-run          # Repository organization
shelly memory status               # Memory Bank system
SHELLY_DEBUG=true shelly           # Debug mode verification

# Test fallback mode (no AI)
SHELLY_AI_DISABLED=true shelly "npm run nonexistent"

# Test with specific provider
SHELLY_AI_PROVIDER=ollama shelly "failing-command"
```

### **Maintenance Tasks**

- **Dependency Updates**: Regular security and feature updates
- **AI Model Updates**: Adapt to new AI service capabilities
- **Shell Compatibility**: Test with new shell versions
- **Documentation Sync**: Keep all documentation current with code

This comprehensive technical context provides the foundation for understanding Shelly's architecture, development practices, and operational considerations for both contributors and maintainers.
