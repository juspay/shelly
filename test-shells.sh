#!/bin/bash

# Log Helper Shell Testing Script
# This script helps test log-helper functionality across different shells

echo "=== Log Helper Multi-Shell Testing ==="
echo

# Function to test log-helper in a specific shell
test_shell() {
    local shell_name=$1
    local shell_path=$2
    local config_file=$3
    
    echo "🧪 Testing $shell_name..."
    echo "Shell path: $shell_path"
    echo "Config file: $config_file"
    echo

    if command -v "$shell_path" >/dev/null 2>&1; then
        echo "✅ $shell_name is available"
        
        # Test alias generation
        echo "📝 Testing alias generation for $shell_name:"
        ./src/main.js --alias
        echo
        
        # Test setup instructions
        echo "📋 Setup instructions for $shell_name:"
        echo "Add this line to $config_file:"
        echo 'eval "$(log-helper --alias)"'
        echo
        
        # Interactive test
        echo "🔧 Manual test steps for $shell_name:"
        echo "1. Run: $shell_path"
        echo "2. Run: eval \"\$(./src/main.js --alias)\""
        echo "3. Run: echo \"testing $shell_name\""
        echo "4. Run: log-helper"
        echo "5. Verify it analyzes the echo command"
        echo
        
    else
        echo "❌ $shell_name is not installed"
        echo "Install with: brew install $shell_name (macOS) or apt-get install $shell_name (Ubuntu)"
        echo
    fi
    
    echo "----------------------------------------"
    echo
}

# Test each shell
echo "🚀 Starting comprehensive shell testing..."
echo

test_shell "Bash" "bash" "~/.bashrc"
test_shell "Zsh" "zsh" "~/.zshrc" 
test_shell "Fish" "fish" "~/.config/fish/config.fish"
test_shell "Tcsh" "tcsh" "~/.tcshrc"
test_shell "Dash" "dash" "~/.dashrc"

echo "🔍 Additional Environment Tests:"
echo

echo "📱 Terminal Applications to Test:"
echo "- iTerm2 (macOS)"
echo "- Terminal.app (macOS)" 
echo "- Hyper"
echo "- Alacritty"
echo "- GNOME Terminal (Linux)"
echo "- Konsole (Linux)"
echo "- Windows Terminal (Windows)"
echo "- WSL (Windows Subsystem for Linux)"
echo

echo "☁️ Remote Environments to Test:"
echo "- SSH sessions"
echo "- Docker containers" 
echo "- Tmux sessions"
echo "- Screen sessions"
echo "- VS Code integrated terminal"
echo

echo "🖥️ Operating Systems to Test:"
echo "- macOS (Ventura, Monterey, Big Sur)"
echo "- Ubuntu (20.04, 22.04)"
echo "- CentOS/RHEL"
echo "- Windows with WSL"
echo "- Alpine Linux (Docker)"
echo

echo "📋 Test Scenarios for Each Environment:"
echo
echo "1. Basic functionality:"
echo "   - Run a failing command"
echo "   - Run log-helper"
echo "   - Verify correct command retrieval"
echo
echo "2. Edge cases:"
echo "   - Commands with quotes"
echo "   - Commands with special characters"
echo "   - Multi-line commands"
echo "   - Commands with pipes/redirects"
echo
echo "3. Integration:"
echo "   - Works after shell restart"
echo "   - Works in new terminal tabs"
echo "   - Works in tmux/screen"
echo

echo "🧪 Quick Docker Test Commands:"
echo
echo "# Test in Ubuntu container"
echo "docker run -it ubuntu bash"
echo "# Inside container:"
echo "apt update && apt install -y nodejs npm curl"
echo "curl -L https://github.com/your-repo/log-helper/archive/main.tar.gz | tar xz"
echo "cd log-helper-main"
echo "npm install"
echo "eval \"\$(./src/main.js --alias)\""
echo "invalidcommand"
echo "log-helper"
echo

echo "# Test in Alpine container"  
echo "docker run -it alpine sh"
echo "# Inside container:"
echo "apk add nodejs npm"
echo "# ... rest of setup"
echo

echo "✨ Testing Complete!"
echo "📝 Document results for each environment in a compatibility matrix"
