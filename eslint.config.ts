import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', '.agent/', '.claude/', '.gemini/', '.opencode/', 'scripts/', 'prompts/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain',         pattern: 'src/domain/**' },
        { type: 'application',    pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'ui',             pattern: 'src/ui/**' },
        { type: 'cli',            pattern: 'src/cli/**' },
      ],
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'domain',         allow: ['domain'] },
          { from: 'application',    allow: ['domain', 'application'] },
          { from: 'infrastructure', allow: ['domain', 'application', 'infrastructure'] },
          { from: 'ui',             allow: ['domain', 'application', 'ui'] },
          { from: 'cli',            allow: ['domain', 'application', 'cli'] },
        ],
      }],
    },
  },
)
