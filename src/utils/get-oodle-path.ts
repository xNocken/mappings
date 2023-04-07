// paths are relative to the compiled js file (/dist/src/utils/get-oodle-path.js)
export default () => {
  switch (process.platform) {
    case 'win32':
      return `${__dirname}/../../../oo2core_8_win64.dll`;

    case 'linux':
      return `${__dirname}/../../../liblinoodle.so`;

    default:
      throw new Error('Your platform is not supported');
  }
};
