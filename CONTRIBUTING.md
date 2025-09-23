# Contributing to Shelly

Thank you for your interest in contributing to Shelly ! We welcome contributions from the community and are pleased to have you help make this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Issue Guidelines](#issue-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/juspay/shelly
   cd shelly
   ```

   Note: The `git clone` command will create a folder named `shelly` by default. If you want a different folder name, you can specify it:

   ```bash
   git clone https://github.com/juspay/shelly my-shelly-project
   cd my-shelly-project
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Test the CLI locally:**
   ```bash
   npm start
   ```

## Making Changes

1. **Create a new branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   npm test
   npm start # Test the CLI manually
   ```

## Submitting a Pull Request

1. **Push your changes:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request:**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with details about your changes

3. **PR Requirements:**
   - Include a clear description of the changes
   - Reference any related issues
   - Ensure all tests pass
   - Follow the commit message guidelines

## Issue Guidelines

When creating an issue, please:

- Use a clear and descriptive title
- Provide detailed steps to reproduce (for bugs)
- Include your environment details (OS, Node.js version, etc.)
- Add relevant labels
- Search existing issues to avoid duplicates

### Bug Reports

Include:

- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots or error messages (if applicable)

### Feature Requests

Include:

- Clear description of the feature
- Use case or problem it solves
- Proposed solution (if you have one)
- Alternative solutions considered

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic release management. Please format your commit messages as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools (dependency updates, CI/CD configs, build scripts, etc.)

### Examples

```
feat: add support for zsh history analysis
fix: resolve issue with command parsing in Windows
docs: update installation instructions
chore: update dependencies to latest versions
chore: configure GitHub Actions for automated testing
```

## Development Guidelines

### Code Style

- Use ESLint configuration provided in the project
- Follow existing naming conventions
- Write clear, self-documenting code
- Add comments for complex logic

### Testing

- Write tests for new features
- Ensure existing tests continue to pass
- Test manual CLI functionality before submitting

### Documentation

- Update README.md if you change functionality
- Add JSDoc comments for new functions
- Update CLI help text if you add new commands

## Release Process

This project uses semantic-release for automated releases. When your PR is merged to the main branch:

1. Semantic-release analyzes commit messages
2. Determines the next version number
3. Generates release notes
4. Publishes to npm
5. Creates a GitHub release

## Getting Help

If you need help or have questions:

- Create a new issue with the "question" label
- Reach out to the maintainers

## Recognition

Contributors will be recognized in the project's README and release notes. Thank you for helping make Shelly better!
