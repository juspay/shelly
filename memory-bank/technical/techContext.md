# Technical Context: Shelly - AI-Powered Development Assistant

## **Technology Stack**

### **Core Technologies**
*   **Programming Language**: JavaScript (ES2020+) with JSDoc for type safety
*   **Runtime Environment**: Node.js 18+ with npm package management
*   **CLI Framework**: Commander.js for professional command-line interfaces
*   **AI Integration**: Google AI Studio, Vertex AI, and Neurolink platform
*   **Shell Integration**: Native support for bash, zsh, tcsh with fallback mechanisms

### **Key Dependencies**

#### **Production Dependencies**
*   **`commander`**: CLI framework for argument parsing and command structure
*   **`inquirer`**: Interactive command-line user interfaces and prompts
*   **`chalk`**: Terminal styling and colored output for enhanced user experience
*   **`fs-extra`**: Enhanced file system operations with promise support
*   **`path`**: Node.js path utilities for cross-platform file handling

#### **AI and Content Generation**
*   **Google AI SDK**: Integration with Google AI Studio and Vertex AI services
*   **Neurolink Platform**: Advanced AI content generation and project analysis
*   **Template Engine**: Custom template system for project scaffolding

#### **Development Dependencies**
*   **`eslint`**: Code linting and style enforcement
*   **`prettier`**: Code formatting and style consistency
*   **`husky`**: Git hooks for automated quality checks
*   **`lint-staged`**: Run linters on staged files
*   **`semantic-release`**: Automated version management and release

## **Architecture Overview**

### **Dual CLI System**
Shelly implements a sophisticated dual CLI architecture:

1. **Primary CLI (`src/main.js`)**: Error analysis engine with shell integration
2. **Secondary CLI (`src/shelly/cli.js`)**: Repository organization and Memory Bank management

### **Service-Oriented Design**
```javascript
// Core service pattern
const serviceFactory = {
  analysisService: () => require('./src/services/analysisService.js'),
  historyService: () => require('./src/services/historyService.js'),
  memoryBankService: () => require('./src/shelly/services/memoryBankService.js'),
  aiContentGenerator: () => require('./src/shelly/utils/aiContentGenerator.js')
};
```

## **Development Environment Setup**

### **Prerequisites**
*   **Node.js**: Version 18.0.0 or higher
*   **npm**: Version 8.0.0 or higher (comes with Node.js)
*   **Git**: For version control and contribution workflow
*   **Supported OS**: macOS or Linux (primary development platforms)

### **Local Development Setup**

#### **1. Repository Setup**
```bash
# Clone the repository (replace with your fork if contributing)
git clone https://github.com/juspay/shelly.git
cd shelly

# Install dependencies
npm install

# Verify installation
node src/main.js --version
node src/shelly/cli.js --help
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
# Development build
npm run dev

# Production build (if applicable)
npm run build

# Package verification
npm pack --dry-run
```

### **Release Automation**
*   **Semantic Release**: Automated versioning based on conventional commits
*   **GitHub Actions**: CI/CD pipeline with comprehensive testing
*   **npm Publishing**: Automatic package publication to npm registry
*   **Documentation Updates**: Automated README and changelog generation

## **Code Quality Standards**

### **Linting Configuration**
```javascript
// .eslintrc.js - Key rules
module.exports = {
  env: { node: true, es2020: true },
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'off',        // CLI tools need console output
    'no-process-exit': 'off',   // CLI tools need process control
    'prefer-const': 'error',    // Enforce immutability
    'no-var': 'error'          // Modern JavaScript practices
  }
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

### **JSDoc Type Safety**
```javascript
/**
 * Analyze command error with AI assistance
 * @param {string} errorOutput - The error message from failed command
 * @param {string[]} commandHistory - Previous commands for context
 * @param {number} exitCode - Command exit code
 * @returns {Promise<Object>} Analysis results with suggestions
 */
async function analyzeError(errorOutput, commandHistory, exitCode) {
  // Implementation
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
```javascript
// Shell identification strategy
const detectShell = () => {
  const shell = process.env.SHELL || '';
  const parentProcess = getParentProcess();
  
  if (shell.includes('zsh') || parentProcess.includes('zsh')) return 'zsh';
  if (shell.includes('bash') || parentProcess.includes('bash')) return 'bash';
  if (shell.includes('tcsh') || shell.includes('csh')) return 'tcsh';
  
  return 'unknown';
};
```

### **History Access Patterns**
*   **Bash/Zsh**: Use `fc -ln -1` command for real-time history access
*   **Tcsh/Csh**: Use `history 2` command with output parsing
*   **Fallback**: Direct file system access to shell history files

## **AI Integration Architecture**

### **Provider Abstraction**
```javascript
// AI service factory pattern
class AIServiceFactory {
  static create(provider = 'auto') {
    switch (provider) {
      case 'google-ai': return new GoogleAIService();
      case 'vertex-ai': return new VertexAIService();
      case 'neurolink': return new NeurolinkService();
      default: return this.detectBestProvider();
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
```javascript
// Robust file operations with error handling
const safeFileOperation = async (operation, filePath, content) => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await operation(filePath, content);
    console.log(`✅ ${operation.name}: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed ${operation.name}: ${filePath}`, error.message);
    throw error;
  }
};
```

### **Cross-Platform Compatibility**
*   **Path Handling**: Use `path.posix` and `path.win32` appropriately
*   **Line Endings**: Normalize line endings based on platform
*   **File Permissions**: Handle Unix permissions while maintaining Windows compatibility

## **Performance Optimization**

### **Caching Strategy**
*   **AI Response Caching**: Cache AI-generated content for repeated operations
*   **Template Caching**: In-memory template storage for faster access
*   **Command History Caching**: Local cache for shell history parsing results

### **Async Operations**
```javascript
// Parallel processing for file operations
const parallelFileOperations = async (operations) => {
  const results = await Promise.allSettled(operations);
  return results.map((result, index) => ({
    operation: operations[index],
    success: result.status === 'fulfilled',
    result: result.value || result.reason
  }));
};
```

## **Error Handling and Debugging**

### **Structured Error Management**
```javascript
// Custom error classes for different failure modes
class ShellyError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ShellyError';
    this.code = code;
    this.details = details;
  }
}

class AIServiceError extends ShellyError {
  constructor(message, provider, details) {
    super(message, 'AI_SERVICE_ERROR', { provider, ...details });
  }
}
```

### **Debug Mode**
```bash
# Enable comprehensive debug logging
SHELLY_DEBUG=true node src/main.js
SHELLY_DEBUG=true node src/shelly/cli.js organize

# Debug specific components
DEBUG=shelly:analysis node src/main.js
DEBUG=shelly:memory node src/shelly/cli.js memory init
```

## **Security Considerations**

### **Input Validation**
*   **Command Sanitization**: Prevent shell injection in command analysis
*   **Path Validation**: Ensure file operations stay within project boundaries
*   **Environment Variable Handling**: Secure management of API credentials

### **AI Service Security**
*   **API Key Protection**: Environment variable storage, never in code
*   **Rate Limiting**: Respect AI service usage limits and quotas
*   **Content Filtering**: Validate AI-generated content before file writes

## **Deployment and Distribution**

### **Package Management**
```json
// package.json - Key configuration
{
  "name": "@juspay/shelly",
  "bin": {
    "shelly": "./src/main.js"
  },
  "files": [
    "src/",
    "docs/",
    "memory-bank/",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
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
3. **Development**: Local testing with `node src/main.js`
4. **Quality Checks**: Automated linting, formatting, and testing
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
shelly organize --dry-run          # Repository organization
shelly memory status               # Memory Bank system
SHELLY_DEBUG=true shelly           # Debug mode verification
```

### **Maintenance Tasks**
*   **Dependency Updates**: Regular security and feature updates
*   **AI Model Updates**: Adapt to new AI service capabilities
*   **Shell Compatibility**: Test with new shell versions
*   **Documentation Sync**: Keep all documentation current with code

This comprehensive technical context provides the foundation for understanding Shelly's architecture, development practices, and operational considerations for both contributors and maintainers.
