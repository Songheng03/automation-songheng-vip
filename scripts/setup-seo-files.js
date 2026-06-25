#!/usr/bin/env node
// IndexNow key verification — ensure key file is accessible
const F=require('fs'),P=require('path');
const CT='/root/automaton/content';
const KEY='61cd3a4a32564707b40b3a86c671cb14';

// Write key file (IndexNow requires the key in the file name)
F.writeFileSync(P.join(CT,KEY+'.txt'),KEY);
console.log('✅ IndexNow key file written:', KEY+'.txt');

// Also write robots.txt if not exists
const robots = `User-agent: *
Allow: /
Sitemap: https://automation.songheng.vip/sitemap.xml
`;
F.writeFileSync(P.join(CT,'robots.txt'),robots);
console.log('✅ robots.txt written');
