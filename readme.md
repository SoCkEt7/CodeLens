# CodeLens

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**CodeLens** is a powerful real-time file monitoring utility for developers, providing immediate visibility into file changes within your project. Specially optimized for React and Symfony projects, it helps you track modifications as they happen.

![CodeLens Preview](https://via.placeholder.com/800x400?text=CodeLens+Preview)

## 🔍 Features

- **Real-time monitoring** of file modifications with size changes
- **Smart filtering** that ignores common directories (vendor, node_modules, cache, etc.)
- **Automatic categorization** of files by type (React, PHP, Twig, Config, Style)
- **Color-coded output** for better readability
- **Lightweight** with minimal resource usage
- **React and Symfony optimized** with specific directory configurations

## 📋 Requirements

- Bash shell environment
- Core Unix utilities: find, stat, awk, watch, column
- Git (for installation)

## 🚀 Installation

### Quick Install

```bash
# Clone this repository
git clone https://github.com/yourusername/codelens.git

# Navigate to the CodeLens directory
cd codelens

# Run the installation script
./install.sh
```

### Manual Installation

If you prefer to install manually:

1. Create the script file in your bin directory:

```bash
mkdir -p ~/bin

cat > ~/bin/codelens-script.sh << 'EOF'
#!/bin/bash
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
EOF

chmod +x ~/bin/codelens-script.sh
```

2. Add the alias to your shell configuration file:

```bash
echo 'alias codelens="watch --color -n 0.5 ~/bin/codelens-script.sh"' >> ~/.bashrc
```

3. Apply changes:

```bash
source ~/.bashrc
```

## 🛠️ Usage

After installation, simply run:

```bash
codelens
```

This will display the 15 most recently modified files in your current directory, updating every 0.5 seconds.

### Output Example

```
TIME      SIZE KB   TYPE     PATH
14:15:27  8.02 KB   React    ./src/components/App.jsx
14:14:02  3.80 KB   PHP      ./backend/index.php
14:13:37  20.74 KB  Twig     ./backend/templates/dashboard.twig
14:12:28  3.60 KB   Style    ./src/styles/main.css
14:11:50  2.28 KB   Config   ./config/routes.yaml
```

## ⚙️ Customization

You can customize CodeLens by editing the script at `~/bin/codelens-script.sh`:

- Change the refresh rate: Modify `-n 0.5` in your alias to a different interval
- Adjust the number of files shown: Change `head -15` to show more or fewer files
- Add additional file types: Extend the awk conditional statement with new patterns

## 🧩 Integration

### Symfony Integration

CodeLens includes a Symfony command for integration with your Symfony applications:

```php
// src/Command/CodeLensCommand.php
<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:codelens',
    description: 'List recently modified files',
)]
class CodeLensCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        
        $io->title('Recently Modified Files');
        
        // Execute the CodeLens script
        $result = shell_exec('~/bin/codelens-script.sh');
        
        $io->text($result);
        
        return Command::SUCCESS;
    }
}
```

### React Integration

The frontend demo includes a React component for displaying file changes:

```jsx
// See /frontend/src/components/CodeLens.jsx for full implementation
import React, { useState, useEffect } from 'react';

const CodeLens = () => {
  const [files, setFiles] = useState([]);
  
  // Component implementation...
  
  return (
    <div className="codelens">
      <h2>Recent File Changes</h2>
      <table>
        {/* Table structure */}
      </table>
    </div>
  );
};

export default CodeLens;
```

## 🗑️ Uninstallation

To remove CodeLens from your system:

```bash
# Using the uninstall script
./uninstall.sh

# Or manually
rm -f ~/bin/codelens-script.sh
sed -i '/alias codelens=/d' ~/.bashrc
source ~/.bashrc
```

## 🤝 Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Inspired by the need for better real-time file tracking in development workflows
- Thanks to all contributors and the open source community

---

Made with ❤️ for developers. Happy coding!
