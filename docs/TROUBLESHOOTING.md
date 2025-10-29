# Troubleshooting Guide

This guide helps you resolve common issues when installing and using Shelly.

## Table of Contents

- [Installation Issues](#installation-issues)
  - [node-pty Build Failures](#node-pty-build-failures)
  - [Module Not Found Errors](#module-not-found-errors)
- [Runtime Issues](#runtime-issues)
- [Platform-Specific Issues](#platform-specific-issues)

---

## Installation Issues

### node-pty Build Failures

The `node-pty` module is a native dependency that requires compilation for your system. Common errors include:

#### Error: Cannot find module '../build/Release/pty.node'

**Symptoms:**

```
Error: Cannot find module '../build/Debug/pty.node'
Error: Cannot find module '../build/Release/pty.node'
```

or

```
Error: dlopen(...pty.node, 0x0001): tried: '...pty.node'
(mach-o file, but is an incompatible architecture (have 'x86_64', need 'arm64e' or 'arm64'))
```

**Root Causes:**

1. pnpm blocked build scripts during installation
2. Python 3.12+ removed `distutils` module needed by node-gyp
3. Native module wasn't compiled for your system architecture

**Solution:**

##### Step 1: Install Python setuptools

For Python 3.12 and later, install setuptools to provide the distutils module:

```bash
python3 -m pip install setuptools
```

##### Step 2: Enable pnpm build scripts

Create or update `.npmrc` in your project root:

```bash
echo "enable-pre-post-scripts=true" > .npmrc
```

##### Step 3: Clean and reinstall

```bash
# Remove existing installations
rm -rf node_modules pnpm-lock.yaml

# Clear pnpm cache
pnpm store prune

# Reinstall with build scripts enabled
pnpm install
```

##### Step 4: Verify the build

Check that the native module was compiled correctly:

```bash
# For pnpm
file node_modules/.pnpm/node-pty@*/node_modules/node-pty/build/Release/pty.node

# For npm
file node_modules/node-pty/build/Release/pty.node
```

You should see output like:

- macOS ARM64: `Mach-O 64-bit bundle arm64`
- macOS x86_64: `Mach-O 64-bit bundle x86_64`
- Linux: `ELF 64-bit LSB shared object`

##### Step 5: Test Shelly

```bash
shelly --version
```

If this returns the version number, the issue is resolved!

#### Alternative: Manual rebuild

If the above steps don't work, manually rebuild node-pty:

**For pnpm:**

```bash
cd node_modules/.pnpm/node-pty@*/node_modules/node-pty
npm run install
```

**For npm:**

```bash
cd node_modules/node-pty
npm run install
```

#### Prerequisites Check

Before installing Shelly, ensure you have:

**macOS:**

```bash
# Xcode Command Line Tools
xcode-select --install

# Python (should be 3.8+)
python3 --version

# Python setuptools (for Python 3.12+)
python3 -m pip install setuptools

# Node.js (18.0.0 or higher)
node --version

# Build tools
which make gcc g++
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install -y make python3 python3-pip build-essential

# Python setuptools
python3 -m pip install setuptools
```

**Linux (RedHat/CentOS/Fedora):**

```bash
sudo yum install -y make python3 python3-pip gcc gcc-c++

# Python setuptools
python3 -m pip install setuptools
```

---

### Module Not Found Errors

#### Error: Cannot find module '@juspay/shelly'

**Symptom:**

```
Error: Cannot find module '@juspay/shelly'
```

**Solution:**

1. **Global installation:** Ensure Shelly is installed globally:

   ```bash
   npm install -g @juspay/shelly
   # or
   pnpm add -g @juspay/shelly
   ```

2. **Check installation:**

   ```bash
   npm list -g @juspay/shelly
   # or
   pnpm list -g @juspay/shelly
   ```

3. **Verify PATH:** Ensure npm/pnpm global bin is in your PATH:

   ```bash
   # Check npm global bin location
   npm bin -g

   # Check pnpm global bin location
   pnpm bin -g

   # Add to PATH in ~/.bashrc or ~/.zshrc
   export PATH="$(npm bin -g):$PATH"
   # or
   export PATH="$(pnpm bin -g):$PATH"
   ```

---

## Runtime Issues

### AI Integration Errors

#### Error: No AI provider configured

**Solution:**

1. Create a `.env` file in your project or home directory:

   ```bash
   cp .env.example .env
   ```

2. Add your API key:

   ```bash
   # For Google AI (free tier)
   GOOGLE_AI_API_KEY=your_api_key_here

   # For Google Vertex AI (enterprise)
   GOOGLE_VERTEX_PROJECT=your_project_id

   # For Neurolink
   NEUROLINK_API_KEY=your_neurolink_key
   ```

3. Get API keys:
   - **Google AI Studio:** https://makersuite.google.com/app/apikey
   - **Neurolink:** Contact Juspay support

### Shell Integration Not Working

**Symptom:**
The `shelly` command doesn't trigger after failed commands.

**Solution:**

1. Set up the shell alias:

   ```bash
   shelly --alias
   ```

2. Reload your shell configuration:

   ```bash
   # For bash
   source ~/.bashrc

   # For zsh
   source ~/.zshrc

   # For fish
   source ~/.config/fish/config.fish
   ```

3. Verify the alias is set:
   ```bash
   alias | grep shelly
   ```

---

## Platform-Specific Issues

### macOS

#### Error: gyp: No Xcode or CLT version detected

**Solution:**

```bash
# Install Xcode Command Line Tools
sudo xcode-select --install

# If already installed, reset the path
sudo xcode-select --reset
```

#### Error: Architecture mismatch (x86_64 vs arm64)

This happens when:

1. Switching between Rosetta and native modes
2. Using the wrong Node.js architecture
3. **Having multiple Node.js installations** (e.g., NVM + Homebrew)

**Symptoms:**

```
Error: dlopen(...pty.node, 0x0001): tried: '...pty.node'
(mach-o file, but is an incompatible architecture (have 'arm64', need 'x86_64'))
```

or vice versa.

**Diagnosis:**

```bash
# Check your Mac's architecture
arch

# Check which Node is being used
which -a node

# Check Node architecture
node -p process.arch
file $(which node)

# Check all Node installations
file /usr/local/bin/node 2>/dev/null
file ~/.nvm/versions/node/*/bin/node 2>/dev/null
```

**Solution 1: Use consistent Node.js**

If you have multiple Node installations, ensure your shell uses the same one consistently:

```bash
# Prefer NVM Node (ARM64 native on M1/M2 Macs)
export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH"

# OR prefer Homebrew Node (might be x86_64 on M1/M2)
export PATH="/usr/local/bin:$PATH"

# Clean and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Solution 2: Rebuild for the correct architecture**

If your shell function uses a specific Node version, rebuild node-pty for that version:

```bash
# Find which Node your shelly alias/function uses
type shelly

# Rebuild with the specific Node version
cd node_modules/.pnpm/node-pty@*/node_modules/node-pty
PATH="/usr/local/bin:$PATH" npm run install  # For x86_64 Node
# OR
PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH" npm run install  # For ARM64 Node

# Verify the build
cd /path/to/shelly-V2
file node_modules/.pnpm/node-pty@*/node_modules/node-pty/build/Release/pty.node
```

**Solution 3: Reinstall for your preferred architecture**

```bash
# For ARM64 Macs using NVM (recommended)
nvm install 20 --latest-npm
nvm use 20

# Clean and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Linux

#### Error: Python.h: No such file or directory

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get install python3-dev

# RedHat/CentOS/Fedora
sudo yum install python3-devel
```

#### Error: make: command not found

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# RedHat/CentOS/Fedora
sudo yum groupinstall "Development Tools"
```

---

## Getting Help

If you're still experiencing issues:

1. **Check existing issues:** https://github.com/juspay/shelly/issues
2. **Enable debug mode:**
   ```bash
   SHELLY_DEBUG=true shelly
   ```
3. **Create a new issue:** Include:
   - Operating system and version
   - Node.js version (`node --version`)
   - Python version (`python3 --version`)
   - Package manager (npm/pnpm/yarn) and version
   - Full error message
   - Output of `shelly --version`

4. **Community support:**
   - GitHub Discussions: https://github.com/juspay/shelly/discussions
   - Report bugs: Use `/reportbug` command in Shelly

---

## Quick Diagnostics

Run these commands to gather system information for troubleshooting:

```bash
# System info
echo "OS: $(uname -s) $(uname -r)"
echo "Arch: $(arch)"

# Tool versions
echo "Node: $(node --version)"
echo "Python: $(python3 --version)"
echo "npm: $(npm --version)"
echo "pnpm: $(pnpm --version 2>/dev/null || echo 'not installed')"

# Build tools
echo "make: $(make --version 2>/dev/null | head -n1 || echo 'not installed')"
echo "gcc: $(gcc --version 2>/dev/null | head -n1 || echo 'not installed')"

# Shelly status
echo "Shelly: $(shelly --version 2>/dev/null || echo 'not installed')"

# Check for node-pty
ls -la node_modules/.pnpm/node-pty@*/node_modules/node-pty/build/Release/pty.node 2>/dev/null || \
ls -la node_modules/node-pty/build/Release/pty.node 2>/dev/null || \
echo "node-pty not built"
```

Copy this output when reporting issues!
