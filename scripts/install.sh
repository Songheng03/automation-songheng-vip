#!/usr/bin/env bash
# automaton-cli — One-command installer for my-automaton AI services
# Run: curl -sSL https://automation.songheng.vip/install.sh | bash
# Or: npm install -g automaton-cli

set -e

VERSION="1.0.0"
API_BASE="${API_BASE:-https://automation.songheng.vip}"

echo "⚡ Installing my-automaton CLI v${VERSION}..."
echo ""

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux) BINARY="automaton-linux" ;;
  Darwin) BINARY="automaton-macos" ;;
  *) echo "❌ Unsupported OS: $OS"; exit 1 ;;
esac

# Check for Node.js as fallback
if command -v node &>/dev/null; then
  INSTALL_DIR="$HOME/.automaton-cli"
  mkdir -p "$INSTALL_DIR"
  
  # Write the CLI as a Node.js script
  cat > "$INSTALL_DIR/automaton" << 'NODESCRIPT'
#!/usr/bin/env node
const API = process.env.API_BASE || 'https://automation.songheng.vip';
const args = process.argv.slice(2);
const cmd = args[0] || 'help';

const HELP = `
my-automaton CLI — AI Code Review, Security & Text Analysis

Usage:
  automaton analyze <text>         Analyze text (sentiment, entities)
  automaton summarize <text>       Summarize text
  automaton review <code>          Review code for bugs/issues
  automaton security <code>        Scan for vulnerabilities
  automaton explain <code>         Explain code in plain language
  automaton refactor <code>        Get refactoring suggestions
  automaton health                 Check API health
  automaton help                   Show this help

Options:
  --api-key <key>                  Premium API key (for unlimited use)
  --json                           Output as JSON
  --file <path>                    Read input from file

Examples:
  automaton analyze "Your text here"
  automaton review --file app.js
  automaton health
`;

async function callAPI(endpoint, input) {
  const url = `${API}/api/free/${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input })
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error(`❌ Error: ${data.error || resp.status}`);
    console.log('💡 Get unlimited access: ' + API + '/upgrade');
    process.exit(1);
  }
  return data;
}

async function main() {
  if (cmd === 'help' || cmd === '--help') {
    console.log(HELP);
    return;
  }

  if (cmd === 'health') {
    const resp = await fetch(`${API}/health`);
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const endpoint = cmd;
  let input = args.slice(1).join(' ');

  // Check for --file flag
  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0 && args[fileIdx + 1]) {
    const fs = await import('fs');
    input = fs.readFileSync(args[fileIdx + 1], 'utf8');
  }

  if (!input) {
    // Read from stdin
    input = await new Promise(resolve => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data.trim()));
    });
  }

  if (!input) {
    console.error(`❌ Usage: automaton ${endpoint} <text>`);
    console.log(HELP);
    process.exit(1);
  }

  const validEndpoints = ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor'];
  if (!validEndpoints.includes(endpoint)) {
    console.error(`❌ Unknown command: ${endpoint}`);
    console.log(HELP);
    process.exit(1);
  }

  const result = await callAPI(endpoint, input);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
NODESCRIPT

  chmod +x "$INSTALL_DIR/automaton"
  
  # Add to PATH if not already
  if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    SHELL_CONFIG=""
    case "$SHELL" in
      */zsh) SHELL_CONFIG="$HOME/.zshrc" ;;
      */bash) SHELL_CONFIG="$HOME/.bashrc" ;;
    esac
    if [ -n "$SHELL_CONFIG" ]; then
      echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$SHELL_CONFIG"
      echo "✅ Added $INSTALL_DIR to PATH in $SHELL_CONFIG"
    else
      echo "ℹ️  Add to PATH: export PATH=\"\$PATH:$INSTALL_DIR\""
    fi
  fi
  
  echo "✅ Installed to $INSTALL_DIR/automaton"
  echo "   Run: automaton help"
  echo ""
  echo "🔑 Free tier: 3 requests/day per service."
  echo "💎 Upgrade: ${API_BASE}/upgrade"
else
  echo "❌ Node.js is required. Install it from https://nodejs.org"
  exit 1
fi
