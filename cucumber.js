/** @type {import('@cucumber/cucumber').IConfiguration} */
export default {
  default: {
    import: [
      'tests/bdd/support/world.ts',
      'tests/bdd/steps/**/*.ts',
    ],
    paths: ['tests/bdd/features/**/*.feature'],
    loader: ['tsx'],
    format: ['progress-bar', 'html:allure-results/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
  smoke: {
    import: [
      'tests/bdd/support/world.ts',
      'tests/bdd/steps/**/*.ts',
    ],
    paths: ['tests/bdd/features/**/*.feature'],
    loader: ['tsx'],
    tags: '@smoke',
    format: ['progress-bar'],
    publishQuiet: true,
  },
}
