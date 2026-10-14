/** Writes docs/capability-inventory.md from the registry. Usage: npm run docs:inventory */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { render } = require('./capabilityInventory');

fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'docs', 'capability-inventory.md'), render());
console.log('docs/capability-inventory.md written');
process.exit(0);
