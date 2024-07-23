import fs from 'fs';

import handleUsmap from '../handle-usmap';

const [fileName, name] = process.argv.slice(2);

if (!fileName || !name) {
  throw new Error('usage: node src/scripts/manual.ts <fileName> <name>');
}

const mappingResponse = fs.readFileSync(fileName);

handleUsmap(mappingResponse, name);
