const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const bootstrapPath = path.resolve(process.cwd(), 'src/orchestration/worker-bootstrap.ts');
console.log('Bootstrap path:', bootstrapPath);
console.log('Exists:', fs.existsSync(bootstrapPath));

const child = fork(bootstrapPath, [], {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  execArgv: [],
  env: { ...process.env },
});

let output = '';
child.stdout.on('data', d => { output += d.toString(); });
child.stderr.on('data', d => { output += 'STDERR: ' + d.toString(); });
child.on('message', m => { output += 'IPC: ' + JSON.stringify(m) + '\n'; });
child.on('exit', code => {
  output += 'EXIT: ' + code + '\n';
  console.log(output);
  process.exit();
});

setTimeout(() => {
  child.send({
    type: 'run_task',
    task: {
      id: 'test-001',
      goalId: 'goal-test',
      title: 'Test Task',
      description: 'Just a test',
      agentRole: null,
      maxTurns: 5,
      allowedEditRoot: '/root/automaton',
    },
    inference: {
      apiKey: process.env.DEEPSEEK_API_KEY || 'test',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      maxTokens: 100,
    },
  });
}, 1000);

setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
