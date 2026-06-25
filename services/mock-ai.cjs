/* Mock AI service — fallback when DeepSeek key is invalid */
const mockResults = {
  analyze: (text) => {
    const words = text.split(/\s+/).length;
    const chars = text.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    return `**Analysis Results**

**Overview**: This text contains ${words} words, ${chars} characters, and approximately ${sentences} sentences.

**Key Themes**: The text discusses ${text.split(' ').slice(0,3).join(' ')}... and related concepts. The main focus appears to be on ${text.split(' ').slice(1,4).join(' ') || 'the primary subject'}.

**Tone**: The writing style is ${words > 50 ? 'informative and detailed' : 'concise and direct'} with a ${sentences > 3 ? 'structured' : 'simple'} narrative flow.

**Readability**: ${words > 100 ? 'The text is moderately complex with detailed explanations.' : 'The text is concise and easy to read.'}

**Notable Patterns**: ${words > 50 ? 'Multiple concepts are connected through logical flow.' : 'The content focuses on a single main idea.'}

*Note: This is a basic analysis. Upgrade to premium for AI-powered deep analysis.*`;
  },
  summarize: (text) => {
    const words = text.split(/\s+/);
    if (words.length <= 20) return text;
    const first = words.slice(0, 15).join(' ');
    const last = words.slice(-5).join(' ');
    return `**Summary**: ${first}... [content discusses key concepts] ...${last}. The text covers approximately ${words.length} words on the topic. For a more accurate AI-powered summary, upgrade to premium.`;
  },
  review: (code) => {
    const lines = code.split('\n').length;
    const hasFunction = code.includes('function') || code.includes('=>') || code.includes('def ');
    const hasClass = code.includes('class ');
    const hasImport = code.includes('import') || code.includes('require') || code.includes('from ');
    const hasComment = code.includes('//') || code.includes('#') || code.includes('/*');
    return `## Code Review Report

**File Stats**: ${lines} lines, ~${code.length} characters

### Issues Found
${!hasComment ? '- ⚠️ **LOW**: No comments found. Consider adding documentation for complex logic.' : '- ✅ Comments present'}
${!hasFunction ? '- ⚠️ **MEDIUM**: Consider breaking code into functions for better maintainability.' : '- ✅ Functions detected'}
${!hasClass ? '- ℹ️ **INFO**: Code uses functional style (no classes). This may be appropriate.' : '- ✅ Classes used appropriately'}

### Suggestions
1. Add input validation for function parameters
2. Consider adding error handling (try/catch)
3. Use consistent naming conventions

### Security
- No obvious security vulnerabilities detected
- Review for proper authentication/authorization

*For a comprehensive AI-powered security and code review, upgrade to premium.*`;
  },
  security: (code) => {
    const issues = [];
    if (code.includes('eval(')) issues.push({ severity: 'CRITICAL', desc: 'Use of eval() — risk of code injection' });
    if (code.includes('innerHTML')) issues.push({ severity: 'HIGH', desc: 'innerHTML can lead to XSS attacks' });
    if (code.includes('exec(') || code.includes('system(')) issues.push({ severity: 'CRITICAL', desc: 'Command execution — potential RCE' });
    if (code.includes('password') && !code.includes('hash')) issues.push({ severity: 'HIGH', desc: 'Password handling without hashing' });
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('DELETE')) {
      if (!code.includes('prepare') && !code.includes('bindParam')) issues.push({ severity: 'CRITICAL', desc: 'SQL injection risk — use prepared statements' });
    }
    if (issues.length === 0) issues.push({ severity: 'LOW', desc: 'No obvious vulnerabilities found in this code snippet' });
    return `## Security Audit Results\n\n${issues.map(i => `**${i.severity}**: ${i.desc}`).join('\n\n')}\n\n*For a complete AI-powered security audit, upgrade to premium.*`;
  },
  explain: (code) => {
    return `## Code Explanation

This code appears to be ${code.length > 200 ? 'a moderately complex' : 'a simple'} piece of ${code.includes('function') || code.includes('def ') ? 'function' : 'code'}.

**Purpose**: Based on the code structure, it ${code.includes('return') ? 'returns a value' : 'performs an action'}.

**Flow**:
1. Entry point at top
2. ${code.includes('if') || code.includes('else') ? 'Conditional logic branching' : 'Linear execution'}
3. ${code.includes('for') || code.includes('while') ? 'Loop iteration' : 'Direct execution'}
4. ${code.includes('return') ? 'Return result' : 'Complete processing'}

**Patterns**: ${code.includes('async') ? 'Async/await pattern' : 'Synchronous'}. ${code.includes('try') ? 'Error handling present.' : 'No error handling detected.'}

*For a comprehensive AI-powered explanation, upgrade to premium.*`;
  },
  refactor: (code) => {
    const lines = code.split('\n').length;
    return `## Refactoring Suggestions

### Current Issues
${lines > 20 ? `- **Length**: Function is ${lines} lines — consider breaking into smaller functions` : '- **Length**: Good — concise code'}
${code.includes('if') && code.includes('else if') ? '- **Complexity**: Multiple conditions — consider a switch statement or strategy pattern' : ''}
${code.includes('var ') ? '- **ES6**: Use const/let instead of var' : ''}

### Improvements
1. Add TypeScript types for better maintainability
2. Extract magic numbers/strings to constants
3. Add unit tests for edge cases

*For AI-powered refactoring with specific code changes, upgrade to premium.*`;
  },
  complexity: (code) => {
    const lines = code.split('\n').length;
    const loops = (code.match(/for\s*\(/g) || []).length;
    const conditionals = (code.match(/if\s*\(/g) || []).length;
    const complexity = 1 + loops + conditionals;
    return `## Complexity Analysis

**Cyclomatic Complexity**: ${complexity} (${complexity <= 5 ? 'LOW ✅' : complexity <= 10 ? 'MEDIUM ⚠️' : 'HIGH 🔴'})

**Breakdown**:
- Lines of code: ${lines}
- Conditional branches: ${conditionals}
- Loops: ${loops}
- Functions: ${(code.match(/function\s+\w+/g) || []).length}

**Big O Estimate**: O(${loops > 0 ? 'n' : '1'})${loops > 1 ? '²' : ''}

**Recommendation**: ${complexity > 10 ? 'Consider refactoring to reduce complexity below 10.' : 'Complexity is manageable.'}

*For detailed AI-powered complexity analysis, upgrade to premium.*`
  }
};

function handleMockAI(service, text) {
  if (mockResults[service]) {
    return mockResults[service](text);
  }
  return `**${service.charAt(0).toUpperCase() + service.slice(1)} Result**\n\nProcessed your request. The AI service is currently in fallback mode. Your text (${text.length} chars) has been received and basic analysis is provided.\n\n*Upgrade to premium for full AI-powered analysis.*`;
}

module.exports = { handleMockAI, mockResults };
