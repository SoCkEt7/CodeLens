#!/bin/bash

# CodeLens - Real-time File Monitoring Tool for Developers
# https://github.com/yourusername/codelens

# ---------------------------------------------------------
# USAGE:
#   ./install.sh          - Install CodeLens globally
#   ./install.sh remove   - Remove global installation
# ---------------------------------------------------------

VERSION="2.0.0"

# Print banner
print_banner() {
  echo -e "\033[1;36m"
  echo "   ______          __    __                 "
  echo "  / ____/___  ____/ /___/ /__  ____  _____ "
  echo " / /   / __ \/ __  / __  / _ \/ __ \/ ___/ "
  echo "/ /___/ /_/ / /_/ / /_/ /  __/ / / (__  )  "
  echo "\____/\____/\__,_/\__,_/\___/_/ /_/____/   "
  echo -e "\033[0m"
  echo -e "\033[1;32mReal-time file monitoring for developers (v$VERSION)\033[0m"
  echo
}

# Main monitoring function
monitor_files() {
  find . -type f \
    -not -path "*/\.*" \
    -not -path "*/vendor/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/var/cache/*" \
    -not -path "*/var/log/*" \
    -not -path "*/public/build/*" \
    -not -path "*/dist/*" \
    -not -name "*.min.js" \
    -not -name "*.map" \
    -not -name "*.lock" \
    -mmin -60 \
    -exec stat --format="%Y %s %n" {} \; 2>/dev/null | \
    sort -nr | head -15 | \
    awk 'BEGIN {
      # ANSI Color Codes
      C_RESET = "\033[0m";
      C_TIME = "\033[0;90m";
      C_SIZE = "\033[0;33m";
      C_REACT = "\033[1;36m";
      C_PHP = "\033[1;35m";
      C_TWIG = "\033[1;32m";
      C_CONFIG = "\033[1;31m";
      C_STYLE = "\033[1;34m";
      C_OTHER = "\033[0;37m";
      C_FILE = "\033[0m";
    }
    { 
      size=$2/1024; 
      time=strftime("%H:%M:%S", $1); 
      file=substr($0, index($0,$3));
      color=C_OTHER;
      type="Other";
      if (file ~ /\.js$|\.jsx$|\.ts$|\.tsx$/) { type="React"; color=C_REACT; } 
      else if (file ~ /\.php$/) { type="PHP"; color=C_PHP; } 
      else if (file ~ /\.twig$/) { type="Twig"; color=C_TWIG; } 
      else if (file ~ /\.yaml$|\.yml$/) { type="Config"; color=C_CONFIG; }
      else if (file ~ /\.css$|\.scss$/) { type="Style"; color=C_STYLE; }
      
      # Print formatted and colored output
      printf C_TIME "%-8s  " C_SIZE "%7.2f KB  " color "%-7s  " C_FILE "%s" C_RESET "\n", time, size, type, file;
    }' | column -t
}

# Cleanup function
cleanup_previous() {
  echo "Cleaning up previous CodeLens installations..."

  # Get pnpm global bin directory
  if command -v pnpm >/dev/null 2>&1; then
    PNPM_BIN=$(pnpm root -g 2>/dev/null)/../../bin

    # Remove previous global link
    if [ -L "$PNPM_BIN/codelens" ]; then
      echo "  Removing previous pnpm link..."
      rm -f "$PNPM_BIN/codelens"
    fi

    # Try to unlink if package exists
    pnpm unlink --global codelens 2>/dev/null || true
  fi

  # Check for npm global installations
  if command -v npm >/dev/null 2>&1; then
    NPM_BIN=$(npm bin -g 2>/dev/null)
    if [ -f "$NPM_BIN/codelens" ] || [ -L "$NPM_BIN/codelens" ]; then
      echo "  Removing previous npm installation..."
      npm uninstall -g codelens 2>/dev/null || true
    fi
  fi

  # Remove from common bin locations
  for BIN_DIR in /usr/local/bin ~/.local/bin; do
    if [ -L "$BIN_DIR/codelens" ] || [ -f "$BIN_DIR/codelens" ]; then
      echo "  Removing $BIN_DIR/codelens..."
      rm -f "$BIN_DIR/codelens"
    fi
  done

  # Clean up any shell aliases in common rc files
  for RC_FILE in ~/.bashrc ~/.zshrc ~/.profile; do
    if [ -f "$RC_FILE" ]; then
      if grep -q "alias codelens=" "$RC_FILE" 2>/dev/null; then
        echo "  Removing codelens alias from $RC_FILE..."
        sed -i.bak '/alias codelens=/d' "$RC_FILE"
      fi
    fi
  done

  echo "  Cleanup complete!"
  echo
}

# Install function
install_codelens() {
  print_banner

  echo "Installing CodeLens v$VERSION..."
  echo

  # Check for Node.js
  if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;31mError: Node.js is not installed!\033[0m"
    echo "Please install Node.js (v14+) from https://nodejs.org/"
    exit 1
  fi

  # Check for pnpm
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm not found. Installing pnpm..."
    npm install -g pnpm
  fi

  # Get script directory
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

  # Cleanup previous installations
  cleanup_previous

  # Install dependencies
  echo "Installing dependencies with pnpm..."
  cd "$SCRIPT_DIR"
  pnpm install

  if [ $? -ne 0 ]; then
    echo -e "\033[1;31mError: Failed to install dependencies\033[0m"
    exit 1
  fi

  # Make executable
  chmod +x "$SCRIPT_DIR/index.js"

  # Create global link
  echo
  echo "Creating global link..."
  pnpm link --global

  if [ $? -ne 0 ]; then
    echo -e "\033[1;31mError: Failed to create global link\033[0m"
    exit 1
  fi

  echo
  echo -e "\033[1;32m✓ Installation complete!\033[0m"
  echo
  echo -e "\033[1;36mCodeLens v$VERSION is now installed globally\033[0m"
  echo

  # Test installation
  echo "Testing installation..."
  if command -v codelens >/dev/null 2>&1; then
    echo -e "\033[1;32m✓ codelens command is available\033[0m"
    CODELENS_PATH=$(which codelens)
    echo "  Installed at: $CODELENS_PATH"
  else
    echo -e "\033[1;33m⚠ Warning: codelens command not found in PATH\033[0m"
    echo "  You may need to restart your shell or add pnpm bin to PATH"
    if command -v pnpm >/dev/null 2>&1; then
      PNPM_BIN=$(pnpm root -g 2>/dev/null)/../../bin
      echo "  Try adding to your shell rc file:"
      echo "    export PATH=\"$PNPM_BIN:\$PATH\""
    fi
  fi

  echo
  echo -e "\033[1;33mUsage:\033[0m"
  echo "  cd /path/to/your/project"
  echo "  codelens"
  echo
  echo -e "\033[1;33mKeyboard Shortcuts:\033[0m"
  echo "  ↑↓       - Navigate files"
  echo "  Enter    - View diff"
  echo "  i        - Ignore file"
  echo "  a        - Accept file"
  echo "  ?        - Help menu"
  echo "  q        - Quit"
  echo
  echo "Happy coding!"
}

# Remove function
remove_codelens() {
  print_banner

  echo -e "\033[1;31mUninstalling CodeLens...\033[0m"
  echo

  # Get script directory
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

  # Unlink global package
  cd "$SCRIPT_DIR"
  pnpm unlink --global

  echo "✓ Removed global link"
  echo
  echo -e "\033[1;32mUninstallation complete!\033[0m"
  echo
  echo "CodeLens has been removed from your system."
  echo "You can still run it locally with: node index.js"
  echo
  echo "Thank you for trying CodeLens!"
}

# Version function
show_version() {
  echo "CodeLens v$VERSION"
  echo "https://github.com/yourusername/codelens"
}

# Help function
show_help() {
  print_banner
  echo "CodeLens - A lightweight file monitoring tool for developers"
  echo
  echo "USAGE:"
  echo "  ./codelens.sh              Run in current directory"
  echo "  ./codelens.sh install      Install globally as 'codelens'"
  echo "  ./codelens.sh remove       Remove global installation"
  echo "  ./codelens.sh --help       Show this help message"
  echo "  ./codelens.sh --version    Show version information"
  echo
  echo "FEATURES:"
  echo "  - Real-time monitoring of file modifications"
  echo "  - Automatic categorization by file type"
  echo "  - Smart filtering of vendor/node_modules directories"
  echo "  - Optimized for React and Symfony projects"
  echo
}

# Main
case "$1" in
  install|"")
    install_codelens
    ;;
  remove)
    remove_codelens
    ;;
  --help|-h)
    show_help
    ;;
  --version|-v)
    show_version
    ;;
  *)
    echo "Unknown command: $1"
    echo "Use --help for usage information"
    exit 1
    ;;
esac

exit 0
