import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

/**
 * ESLint flat config.
 * legacy/ 는 예전 프로토타입 보관용이라 검사 대상에서 제외한다.
 */
export default [
  { ignores: ['legacy/**', '.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
