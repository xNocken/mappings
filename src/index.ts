import { existsSync, writeFileSync } from 'fs';

import needle from 'needle';

import handleUsmap from './handle-usmap';

import type { CompressionMethod, Mappings } from './types/api';

const mappingsUrl = process.argv[2] || 'https://fortnitecentral.genxgames.gg/api/v1/mappings';

const supportedCompressionMethods: CompressionMethod[] = ['None', 'Oodle'];
const supportedPlatforms: string[] = ['Android'];

const main = async () => {
  console.log('Fetching mappings...');

  const response = await needle('get', mappingsUrl);

  if (response.statusCode !== 200) {
    throw new Error('Failed to fetch mappings');
  }

  const mappings: Mappings[] = <Mappings[]>response.body;

  console.log('Found', mappings.length, 'mappings');

  const filteredMappings = mappings.filter((mapping) => {
    if (!supportedCompressionMethods.includes(mapping.meta.compressionMethod)) {
      return false;
    }

    if (!supportedPlatforms.includes(mapping.meta.platform)) {
      return false;
    }

    return true;
  });

  console.log('Found', filteredMappings.length, 'supported mappings');

  const theMapping = filteredMappings[0];

  if (!theMapping) {
    console.log('No supported mappings found');

    return;
  }

  console.log('Using mapping:', theMapping.fileName, theMapping.hash);

  const matched = theMapping.fileName.match(/\+\+Fortnite\+Release-(?<version>\d+\.\d+)-CL-(?<build>\d+)(-\w+)?_\w+\.usmap/);

  let name = theMapping.fileName;

  if (matched && matched.groups) {
    const { version, build } = matched.groups;

    name = `${version}-${build}`;
  } else {
    throw new Error('Failed to parse version name');
  }

  writeFileSync('versionname', name);

  if (existsSync(`./output/${name}`)) {
    console.log('Already have this version, skipping');

    return;
  }

  const mappingResponse = await needle('get', theMapping.url);

  if (mappingResponse.statusCode !== 200) {
    throw new Error('Failed to fetch mapping');
  }

  handleUsmap(<Buffer>mappingResponse.body, name);

  console.log('Done');
};

main().then(() => {
}).catch((error) => {
  throw error;
});
