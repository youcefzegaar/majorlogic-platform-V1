const fs = require('fs');
const path = 'c:\\Users\\SAN\\majorlogic-platform-v1\\apps\\api\\src\\server.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/, \{ preHandler: \[fastify\.authenticateAdmin\] \}/g, '');

fs.writeFileSync(path, content);
console.log('API server.js fixed');
