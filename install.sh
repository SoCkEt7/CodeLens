#!/bin/bash

# CodeLens - Real-time File Monitoring Tool for Developers
# https://github.com/yourusername/codelens

# ---------------------------------------------------------
# USAGE:
#   ./codelens.sh          - Run in current directory
#   ./codelens.sh install  - Install globally as 'codelens'
#   ./codelens.sh remove   - Remove global installation
# ---------------------------------------------------------

VERSION="1.0.0"

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
    awk '{ 
      size=$2/1024; 
      time=strftime("%H:%M:%S", $1); 
      file=substr($0, index($0,$3));
      if (file ~ /\.js$|\.jsx$|\.ts$|\.tsx$/) { type="React" } 
      else if (file ~ /\.php$/) { type="PHP" } 
      else if (file ~ /\.twig$/) { type="Twig" } 
      else if (file ~ /\.yaml$|\.yml$/) { type="Config" }
      else if (file ~ /\.css$|\.scss$/) { type="Style" }
      else { type="" }
      printf "%-8s  %7.2f KB  %-7s  %s\n", time, size, type, file 
    }' | column -t
}

# Install function
install_codelens() {
  print_banner
  
  echo "Installing CodeLens..."
  
  # Create bin directory if it doesn't exist
  mkdir -p ~/bin
  
  # Copy this script to bin directory
  cp "$0" ~/bin/codelens-script.sh
  chmod +x ~/bin/codelens-script.sh
  
  # Create or update bashrc to add alias
  if grep -q "alias codelens" ~/.bashrc; then
    # Remove existing alias
    sed -i '/alias codelens=/d' ~/.bashrc
  fi
  
  # Add new alias
  echo 'alias codelens="watch --color -n 0.5 ~/bin/codelens-script.sh"' >> ~/.bashrc
  
  # Ensure ~/bin is in PATH
  if ! grep -q "PATH=.*~/bin" ~/.bashrc; then
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
  fi
  
  echo
  echo -e "\033[1;32mInstallation complete!\033[0m"
  echo
  echo "You can now use the 'codelens' command in any directory."
  echo "If the command is not working, try opening a new terminal or run: source ~/.bashrc"
  echo
  echo -e "\033[1;33mUsage:\033[0m"
  echo "  cd /path/to/your/project"
  echo "  codelens"
  echo
  echo "Happy coding!"
  
  # Apply changes to current session
  source ~/.bashrc
}

# Remove function
remove_codelens() {
  print_banner
  
  echo -e "\033[1;31mUninstalling CodeLens...\033[0m"
  
  # Remove the script file
  if [ -f ~/bin/codelens-script.sh ]; then
    rm -f ~/bin/codelens-script.sh
    echo "✓ Removed script file"
  else
    echo "! Script file not found"
  fi
  
  # Remove alias from bashrc
  if grep -q "alias codelens=" ~/.bashrc; then
    sed -i '/alias codelens=/d' ~/.bashrc
    echo "✓ Removed alias from ~/.bashrc"
  else
    echo "! Alias not found in ~/.bashrc"
  fi
  
  echo
  echo -e "\033[1;32mUninstallation complete!\033[0m"
  echo
  echo "CodeLens has been removed from your system."
  echo
  echo "Thank you for trying CodeLens!"
  
  # Apply changes to current session
  source ~/.bashrc
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
  install)
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
    # No args or unknown args - run the monitoring
    if command -v watch >/dev/null 2>&1; then
      watch --color -n 0.5 "\"$0\""
    else
      # Fall back to single run if watch isn't available
      print_banner
      echo "Running one-time file scan (install 'watch' for real-time updates)"
      echo
      monitor_files
    fi
    ;;
esac

# If being sourced during installation, don't run the monitor
if [[ "${BASH_SOURCE[0]}" == "${0}" && "$1" == "" && "$0" != "$HOME/bin/codelens-script.sh" ]]; then
  monitor_files
fi

exit 0
