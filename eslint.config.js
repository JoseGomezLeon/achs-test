import { configApp } from '@adonisjs/eslint-config'
import { react } from '@adonisjs/eslint-config/react'

export default [
  { ignores: ['public/**', 'build/**', 'allure-report/**', 'business/**', 'data/**', 'apiMock.mjs', 'tests/beneficiosTest.spec.ts'] },
  ...configApp(...react),
  {
    rules: {
      // AdonisJS usa kebab-case por convención — sobrescribe la regla snakeCase del preset
      // El scaffold de AdonisJS genera snake_case; nuestros módulos usan kebab-case — se permiten ambos
      '@unicorn/filename-case': ['error', { cases: { kebabCase: true, snakeCase: true } }],
    },
  },
]
