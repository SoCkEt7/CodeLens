#!/bin/bash

# CodeLens - Real-time File Monitoring Tool for Developers
# https://github.com/SoCkEt7/CodeLens

# ---------------------------------------------------------
# USAGE:
#   ./install.sh          - Install CodeLens globally (using Cargo)
#   ./install.sh remove   - Remove global installation
# ---------------------------------------------------------

VERSION="0.1.0"

# Print banner
print_banner() {
  echo -e "\033[1;36m"
  echo "   ______          __    __                 "
  echo "  / ____/___  ____/ /___/ /__  ____  _____ "
  echo " / /   / __ \/ __  / __  / _ \/ __ \/ ___/ "
  echo "/ /___/ /_/ / /_/ / /_/ /  __/ / / (__  )  "
  echo "\____/\____/\__,_/\__,_/\___/_/ /_/____/   "
  echo -e "\033[0m"
  echo -e "\033[1;32mReal-time file monitoring for developers (v$VERSION) [Rust Edition]\033[0m"
  echo
}

# Cleanup function (removes old Node.js versions if they exist)
cleanup_previous() {
  echo "Cleaning up previous CodeLens installations..."

  # Check for pnpm global bin directory
  if command -v pnpm >/dev/null 2>&1; then
    PNPM_BIN=$(pnpm root -g 2>/dev/null)/../../bin
    if [ -L "$PNPM_BIN/codelens" ]; then
      echo "  Removing previous pnpm link..."
      rm -f "$PNPM_BIN/codelens"
    fi
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
  for BIN_DIR in /usr/local/bin ~/.local/bin ~/.local/share/pnpm; do
    if [ -L "$BIN_DIR/codelens" ] || [ -f "$BIN_DIR/codelens" ]; then
      echo "  Removing legacy binary at $BIN_DIR/codelens..."
      rm -f "$BIN_DIR/codelens"
    fi
  done

  # Add or update shell aliases
  for RC_FILE in ~/.bashrc ~/.zshrc ~/.profile; do
    if [ -f "$RC_FILE" ]; then
      # Clean up old codelens alias (pointing to index.js)
      if grep -q "alias codelens=" "$RC_FILE" 2>/dev/null; then
        echo "  Removing old codelens alias from $RC_FILE..."
        sed -i.bak '/alias codelens=/d' "$RC_FILE"
      fi
      
      # Add new 'cl' alias for convenience
      if ! grep -q "alias cl='codelens'" "$RC_FILE" 2>/dev/null; then
        echo "  Adding 'cl' alias to $RC_FILE..."
        echo "alias cl='codelens'" >> "$RC_FILE"
      fi
    fi
  done

  echo "  Cleanup and alias update complete!"
  echo
}

# Install function
install_codelens() {
  print_banner

  echo "Installing CodeLens v$VERSION..."
  echo

  # Check for Cargo
  if ! command -v cargo >/dev/null 2>&1; then
    echo -e "\033[1;31mError: Cargo is not installed!\033[0m"
    echo "Please install Rust from https://rustup.rs/"
    exit 1
  fi

  # Get script directory
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  cd "$SCRIPT_DIR"

  # Cleanup previous Node.js installations
  cleanup_previous

  # Install using Cargo
  echo "Building and installing with Cargo..."
  cargo install --path .

  if [ $? -ne 0 ]; then
    echo -e "\033[1;31mError: Failed to install CodeLens via Cargo\033[0m"
    exit 1
  fi

  echo
  echo -e "\033[1;32m✓ Installation complete!\033[0m"
  echo
  echo -e "\033[1;36mCodeLens v$VERSION is now installed globally via Cargo\033[0m"
  echo

  # Test installation
  echo "Testing installation..."
  if command -v codelens >/dev/null 2>&1; then
    echo -e "\033[1;32m✓ codelens command is available\033[0m"
    CODELENS_PATH=$(which codelens)
    echo "  Installed at: $CODELENS_PATH"
  else
    echo -e "\033[1;33m⚠ Warning: codelens command not found in PATH\033[0m"
    echo "  Ensure ~/.cargo/bin is in your PATH."
  fi

  echo
  echo -e "\033[1;33mUsage:\033[0m"
  echo "  cd /path/to/your/project"
  echo "  codelens"
  echo
  echo "Happy coding!"
}

# Remove function
remove_codelens() {
  print_banner

  echo -e "\033[1;31mUninstalling CodeLens...\033[0m"
  echo

  if ! command -v cargo >/dev/null 2>&1; then
    echo "Cargo not found. Checking binary directly..."
  else
    cargo uninstall codelens
  fi

  echo
  echo -e "\033[1;32mUninstallation complete!\033[0m"
  echo
}

# Version function
show_version() {
  echo "CodeLens v$VERSION (Rust)"
  echo "https://github.com/SoCkEt7/CodeLens"
}

# Help function
show_help() {
  print_banner
  echo "CodeLens - A lightweight file monitoring tool for developers"
  echo
  echo "USAGE:"
  echo "  ./install.sh              Install globally as 'codelens'"
  echo "  ./install.sh remove       Remove global installation"
  echo "  ./install.sh --help       Show this help message"
  echo "  ./install.sh --version    Show version information"
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
