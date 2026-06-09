import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/playwright-tests/**', 'node_modules/**'],
  },
});
