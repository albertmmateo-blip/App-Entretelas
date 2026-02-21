module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb',
    'airbnb/hooks',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/require-default-props': [
      'error',
      {
        functions: 'defaultArguments',
      },
    ],
    'react/jsx-filename-extension': [1, { extensions: ['.jsx', '.js'] }],
    'react/no-unknown-property': [
      'error',
      {
        ignore: ['partition', 'allowpopups', 'disablewebsecurity', 'nodeintegration'],
      },
    ],
    'import/prefer-default-export': 'off',
    'no-console': 'off',
    'react/prop-types': 'off',
    'import/no-unresolved': ['error', { ignore: ['\\?url$', '\\?worker$', '\\?raw$'] }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
