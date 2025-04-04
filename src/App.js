import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState('~');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [user, setUser] = useState('user');
  const [hostname, setHostname] = useState('archlinux');
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  // File system structure
  const fileSystem = {
    '~': {
      type: 'directory',
      content: {

        'testDir': { type: 'directory', content: {
          'project1': { type: 'directory', content: {} },
          'project2': { type: 'directory', content: {} },
          'project3': { type: 'directory', content: {} },
          
        }},
        'test.md': { type: 'file', content: 'Tohle je test file asjdg audgawdjv kahd vjw ' },
        
      }
    }
  };

  // Custom command handlers
  const getFileExtensionClass = (filename) => {
    const ext = filename.split('.').pop();
    switch(ext) {
      case 'md':
      case 'markdown':
        return 'file-md';
      case 'js':
      case 'jsx':
      case 'json':
        return 'file-js';
      case 'py':
        return 'file-py';
      case 'jpg':
      case 'png':
      case 'svg':
        return 'file-img';
      case 'txt':
      default:
        return 'file-txt';
    }
  };

  // Helper to find a path in the file system
  const findPath = (path) => {
    if (path === '~' || path === '/') return fileSystem['~'];
    
    let currentNode = fileSystem['~'];
    const parts = path.replace('~/', '').split('/').filter(Boolean);
    
    for (const part of parts) {
      if (part === '..') {
        // Handle parent directory
        continue;
      }
      
      if (!currentNode.content || !currentNode.content[part]) {
        return null;
      }
      
      currentNode = currentNode.content[part];
    }
    
    return currentNode;
  };

  // Convert relative path to absolute
  const getAbsolutePath = (path) => {
    if (path.startsWith('~') || path.startsWith('/')) {
      return path.startsWith('~') ? path : path.replace('/', '~');
    }
    
    if (path === '.') return currentDirectory;
    
    if (path === '..') {
      const parts = currentDirectory.split('/');
      parts.pop();
      return parts.join('/') || '~';
    }
    
    return `${currentDirectory}/${path}`.replace(/\/\//g, '/');
  };

  // Available commands
  const commands = {
    help: () => {
      return `<span class="output">Available commands:
  <span class="file-md">ls</span> - List directory contents
  <span class="file-js">cd</span> [directory] - Change directory
  <span class="file-py">cat</span> [file] - Display file contents
  <span class="file-txt">pwd</span> - Print working directory
  <span class="file-img">clear</span> - Clear the terminal
  <span class="file-js">echo</span> [text] - Display text
  <span class="file-md">neofetch</span> - Display system information
  <span class="file-py">help</span> - Show this help message</span>`;
    },
    
    ls: (args) => {
      const flags = args.filter(arg => arg.startsWith('-'));
      const showAll = flags.some(flag => flag.includes('a'));
      const showLong = flags.some(flag => flag.includes('l'));
      
      const path = args.filter(arg => !arg.startsWith('-'))[0] || currentDirectory;
      const absPath = getAbsolutePath(path);
      const dir = findPath(absPath);
      
      if (!dir || dir.type !== 'directory') {
        return `ls: cannot access '${path}': No such directory`;
      }
      
      const items = Object.keys(dir.content)
        .filter(name => showAll || !name.startsWith('.'))
        .sort((a, b) => {
          // Directories first, then files
          const aIsDir = dir.content[a].type === 'directory';
          const bIsDir = dir.content[b].type === 'directory';
          if (aIsDir && !bIsDir) return -1;
          if (!aIsDir && bIsDir) return 1;
          return a.localeCompare(b);
        });
      
      if (showLong) {
        const now = new Date();
        const date = `${now.toLocaleString('default', { month: 'short' })} ${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        return items.map(name => {
          const item = dir.content[name];
          const isDir = item.type === 'directory';
          const permissions = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = isDir ? 4096 : (item.content.length || 0);
          
          const fileClass = isDir ? 'directory' : getFileExtensionClass(name);
          return `${permissions} ${user} ${user} ${size.toString().padStart(5, ' ')} ${date} <span class="${fileClass}">${name}${isDir ? '/' : ''}</span>`;
        }).join('\n');
      } else {
        return items.map(name => {
          const item = dir.content[name];
          const isDir = item.type === 'directory';
          const fileClass = isDir ? 'directory' : getFileExtensionClass(name);
          return `<span class="${fileClass}">${name}${isDir ? '/' : ''}</span>`;
        }).join('  ');
      }
    },
    
    cd: (args) => {
      if (args.length === 0) {
        setCurrentDirectory('~');
        return '';
      }
      
      const path = getAbsolutePath(args[0]);
      const dir = findPath(path);
      
      if (!dir) {
        return `cd: no such directory: ${args[0]}`;
      }
      
      if (dir.type !== 'directory') {
        return `cd: not a directory: ${args[0]}`;
      }
      
      setCurrentDirectory(path);
      return '';
    },
    
    cat: (args) => {
      if (args.length === 0) {
        return 'cat: missing file operand';
      }
      
      const path = getAbsolutePath(args[0]);
      const file = findPath(path);
      
      if (!file) {
        return `cat: ${args[0]}: No such file or directory`;
      }
      
      if (file.type === 'directory') {
        return `cat: ${args[0]}: Is a directory`;
      }
      
      // Handle markdown files with some basic formatting
      if (args[0].endsWith('.md') || args[0].endsWith('.markdown')) {
        let content = file.content;
        // Basic markdown formatting
        content = content.replace(/^# (.*)/gm, '<span style="color: #f38ba8; font-weight: bold; font-size: 1.2em;">$1</span>');
        content = content.replace(/^## (.*)/gm, '<span style="color: #fab387; font-weight: bold; font-size: 1.1em;">$1</span>');
        content = content.replace(/\*\*(.*?)\*\*/g, '<span style="color: #89b4fa; font-weight: bold;">$1</span>');
        content = content.replace(/\*(.*?)\*/g, '<span style="color: #a6e3a1; font-style: italic;">$1</span>');
        content = content.replace(/- (.*)/gm, '• <span style="color: #cdd6f4;">$1</span>');
        return content;
      }
      
      return file.content;
    },
    
    pwd: () => {
      return currentDirectory;
    },
    
    clear: () => {
      setHistory([]);
      return '';
    },
    
    echo: (args) => {
      return args.join(' ');
    },
    
    neofetch: () => {
      const asciiArt = `
                   -\`
                  .o+\`
                 \`ooo/
                \`+oooo:
               \`+oooooo:
               -+oooooo+:
             \`/:-:++oooo+:
            \`/++++/+++++++:
           \`/++++++++++++++:
          \`/+++ooooooooooooo/\`
         ./ooosssso++osssssso+\`
        .oossssso-\`\`\`\`/ossssss+\`
       -osssssso.      :ssssssso.
      :osssssss/        osssso+++.
     /ossssssss/        +ssssooo/-
   \`/ossssso+/:-        -:/+osssso+-
  \`+sso+:-\`                 \`.-/+oso:
 \`++:.                           \`-/+/
 .\`                                 \``;

      const info = `<span style="color: #f5c2e7;">${user}@${hostname}</span>
<span style="color: #f38ba8;">-----------------</span>
<span style="color: #f5c2e7;">OS:</span> <span style="color: #cdd6f4;">Arch Linux x86_64</span>
<span style="color: #f5c2e7;">Host:</span> <span style="color: #cdd6f4;">ThinkPad X1 Carbon</span>
<span style="color: #f5c2e7;">Kernel:</span> <span style="color: #cdd6f4;">6.7.2-arch1-1</span>
<span style="color: #f5c2e7;">Uptime:</span> <span style="color: #cdd6f4;">3 hours, 24 mins</span>
<span style="color: #f5c2e7;">Packages:</span> <span style="color: #cdd6f4;">873 (pacman)</span>
<span style="color: #f5c2e7;">Shell:</span> <span style="color: #cdd6f4;">zsh 5.9</span>
<span style="color: #f5c2e7;">WM:</span> <span style="color: #cdd6f4;">Hyprland</span>
<span style="color: #f5c2e7;">Terminal:</span> <span style="color: #cdd6f4;">alacritty</span>
<span style="color: #f5c2e7;">CPU:</span> <span style="color: #cdd6f4;">AMD Ryzen 7 7600H (8) @ 4.700GHz</span>
<span style="color: #f5c2e7;">GPU:</span> <span style="color: #cdd6f4;">AMD Integrated Graphics (idk the name)</span>
<span style="color: #f5c2e7;">Memory:</span> <span style="color: #cdd6f4;">3442MiB / 16384MiB</span>

<span style="color: #f38ba8;">████</span><span style="color: #fab387;">████</span><span style="color: #f9e2af;">████</span><span style="color: #a6e3a1;">████</span><span style="color: #89dceb;">████</span><span style="color: #89b4fa;">████</span><span style="color: #cba6f7;">████</span><span style="color: #f38ba8;">████</span>`;

      return `<div style="display: flex; align-items: flex-start; gap: 20px;">
    <pre style="color: #89b4fa; margin: 0;">${asciiArt}</pre>
    <div>${info}</div>
  </div>`;
    }
  };

  const executeCommand = (fullCommand) => {
    const parts = fullCommand.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    if (command === '') {
      return '';
    }
    
    if (commands[command]) {
      return commands[command](args);
    }
    
    return `Command not found: ${command}. Type 'help' to see available commands.`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    const output = executeCommand(trimmedInput);
    
    setHistory([...history, { 
      type: 'command', 
      content: `<span style="color: #89b4fa;">${user}@${hostname}</span> <span style="color: #f38ba8;">${currentDirectory}</span> <span style="color: #a6e3a1;">$</span> ${trimmedInput}` 
    }]);
    
    if (output !== '') {
      setHistory(prev => [...prev, { type: 'output', content: output }]);
    }
    
    // Update command history
    if (trimmedInput !== '') {
      setCommandHistory(prev => [trimmedInput, ...prev]);
    }
    
    setInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      if (newIndex >= 0 && commandHistory[newIndex]) {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? commandHistory[newIndex] : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion could be implemented here
    }
  };

  useEffect(() => {
    // Focus the input when component mounts or after clearing
    inputRef.current.focus();
    
    // Add initial welcome message
    if (history.length === 0) {
      setHistory([
        { type: 'output', content: `<span style="color: #89b4fa;">Welcome to Arch Linux with Hyprland!</span>` },
        { type: 'output', content: `<span style="color: #cdd6f4;">Type <span style="color: #f38ba8;">help</span> to see available commands or <span style="color: #f38ba8;">neofetch</span> to see system info.</span>` }
      ]);
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when history changes
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const focusInput = () => {
    inputRef.current.focus();
  };

  return (
    <div className="terminal-container" onClick={focusInput}>
      <div className="terminal-header">
        <div className="terminal-title">{user}@{hostname}: {currentDirectory}</div>
      </div>
      
      <div className="terminal-body" ref={terminalRef}>
        {history.map((item, index) => (
          <div 
            key={index} 
            className={`terminal-line ${item.type}`}
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        ))}
        
        <form onSubmit={handleSubmit} className="terminal-input-line">
          <span className="prompt">{user}@{hostname}:{currentDirectory} $</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            className="terminal-input"
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </form>
      </div>
    </div>
  );
};

export default App;