// lint-staged config — runs ESLint only on files being committed
// Using function format so we can cd into the right subdirectory
// and strip the absolute path prefix before passing to ESLint.

const path = require('path');
const ROOT = __dirname;

module.exports = {
  'server/**/*.js': (files) => {
    const rel = files
      .map(f => JSON.stringify(path.relative(path.join(ROOT, 'server'), f)))
      .join(' ');
    return `sh -c 'cd ${ROOT}/server && npx eslint --max-warnings 0 ${rel}'`;
  },

  'client/src/**/*.{js,jsx}': (files) => {
    const rel = files
      .map(f => JSON.stringify(path.relative(path.join(ROOT, 'client'), f)))
      .join(' ');
    return `sh -c 'cd ${ROOT}/client && npx eslint --max-warnings 0 ${rel}'`;
  },
};
