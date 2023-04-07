import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const versions = [
  '23.20',
  '23.30',
  '23.40',
  '23.50',
  '24.00',
  '24.01',
  '24.10',
];

versions.forEach((version) => {
  execSync(`node dist/src/index.js https://fortnitecentral.genxgames.gg/api/v1/mappings?version=${version}`);

  execSync('git add output');
  execSync(`git commit -m "Add ${readFileSync('versionname', 'utf-8')}"`);
});
