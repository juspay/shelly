# Shelly Quick Start Guide

Welcome to Shelly! This guide will get you up and running with AI-powered command analysis in just a few minutes.

## 1. Installation

Install Shelly globally using npm:

```bash
npm install -g shelly
```

## 2. Configure Shell Integration

Shelly needs to integrate with your shell to access command history. The setup varies by shell type:

### For Bash Users

**One-time setup:**

```bash
echo 'eval "$(shelly --alias)"' >> ~/.bashrc
source ~/.bashrc
```

### For Zsh Users

**One-time setup:**

```bash
echo 'eval "$(shelly --alias)"' >> ~/.zshrc
source ~/.zshrc
```

### For Fish Users

**One-time setup:**

```bash
echo 'shelly --alias | source' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
```

### For Other Shells

For advanced shell configurations or troubleshooting, see the [Complete Setup Guide](SETUP.md).

## 3. Set Up Google AI API Key (Free Option)

Shelly uses Google's AI services for analysis. Instead of using the paid Google Cloud Vertex AI service, you can use the free Google AI API.

### Get Your Free API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Set the Environment Variable

Add the following line to your shell's configuration file (`~/.bashrc`, `~/.zshrc`, etc.), replacing `YOUR_API_KEY_HERE` with the API key you copied:

```bash
export GOOGLE_AI_API_KEY="YOUR_API_KEY_HERE"
```

After adding this line, **restart your terminal** or source the configuration file for the changes to take effect:

```bash
# For Zsh
source ~/.zshrc

# For Bash
source ~/.bashrc
```

## 4. Usage

You're all set! After a command fails, simply run:

```bash
shelly
```

Shelly will analyze the error and provide you with suggestions.

## Troubleshooting

### Common Issues

**"Could not retrieve the last command from history"**

- Make sure you've properly set up the shell alias as described in step 2
- Ensure your shell supports the `fc` command (most modern shells do)

**"Could not analyze the error with Neurolink"**

- Verify that your Google AI API key is properly configured
- Check that the `GOOGLE_AI_API_KEY` environment variable is set correctly
- Ensure you have an active internet connection for API calls

**"shelly cannot analyze itself"**

- This is expected behavior. Run another command first, then use `shelly` to analyze it

### Testing Your Setup

To test if everything is working correctly:

1. Run a command that will fail (e.g., `nonexistentcommand`)
2. Run `shelly`
3. You should see an analysis from Neurolink

## Additional Notes

- The tool maintains a command history for better analysis context
- It can analyze both failed commands (exit code ≠ 0) and successful commands
- For "command not found" errors, it will suggest similar available commands from your system
