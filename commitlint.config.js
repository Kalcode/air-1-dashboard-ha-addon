export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 100],
    'scope-enum': [2, 'always', ['dashboard', 'server', 'scripts', 'deps', 'release', 'config', 'docker', 'workspace']],
  },
};
