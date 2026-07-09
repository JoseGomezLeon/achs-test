import { Given } from '@cucumber/cucumber'
import type { RbacWorld } from '../support/world.js'

Given('el sistema opera en modo TEST_MODE=architecture', function (this: RbacWorld) {
  // El World ya usa StubIamAdapter y StubAuditWriter por defecto — no-op
})
