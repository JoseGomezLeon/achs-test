import { Given, When } from '@cucumber/cucumber'
import type { RbacWorld } from '../support/world.js'

Given('existe el caso {string} con orgUnit {string}', function (this: RbacWorld, resourceId: string, orgUnit: string) {
  this.registerResource(resourceId, orgUnit)
})

When('intenta ejecutar {string} sobre el caso {string}', function (this: RbacWorld, capability: string, resourceId: string) {
  this.checkCapabilityForResource(capability, resourceId)
})
