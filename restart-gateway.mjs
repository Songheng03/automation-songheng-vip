import { execSync } from 'child_process';
import fs from 'fs';

let gw = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

if (!gw.includes('handleLoremIpsum')) {
  gw = gw.replace(/^const PORT/m, 'import { handleLoremIpsum } from "/root/services/lorem-ipsum.js";\nconst PORT');
}

const routeLine = `  if (pathname === '/tools/lorem-ipsum') { handleLoremIpsum(req, res); return; }\n`;
gw = gw.replace(/if \(pathname === '\/tools\/base64'\)/g, routeLine + '  if (pathname === \'/tools/base64\')');

fs.writeFileSync('/root/automaton/gateway.js', gw);
try { execSync('node -c /root/automaton/gateway.js', { stdio: 'pipe' }); console.log('OK'); } catch(e) { console.log('FAIL:', e.stderr.toString()); process.exit(1); }
try { execSync('kill $(fuser 8080/tcp 2>/dev/null) 2>/dev/null'); } catch {}
try { execSync('cd /root/automaton && nohup node gateway.js > /tmp/gateway.log 2>&1 &', { stdio: 'pipe' }); } catch {}
console.log('Gateway restarted with lorem-ipsum tool');
