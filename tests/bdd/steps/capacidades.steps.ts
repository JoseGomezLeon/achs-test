import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { RbacWorld } from '../support/world.js'

Given('un sujeto autenticado con token {string}', async function (this: RbacWorld, token: string) {
  await this.authenticate(token)
  assert.ok(this.subject !== null, `token "${token}" no produjo un sujeto válido`)
})

Given('un sujeto con CapabilitySet vacío', function (this: RbacWorld) {
  this.setSubjectEmpty()
})

When('intenta ejecutar la capacidad {string}', function (this: RbacWorld, capability: string) {
  this.checkCapability(capability)
})

Then('el acceso es concedido', function (this: RbacWorld) {
  assert.equal(
    this.lastAccessResult,
    'granted',
    `se esperaba acceso concedido, código de denegación: ${this.lastDenialCode}`
  )
})

Then('el acceso es denegado con código {string}', function (this: RbacWorld, code: string) {
  assert.equal(this.lastAccessResult, 'denied', 'se esperaba acceso denegado')
  assert.equal(this.lastDenialCode, code, `código de denegación incorrecto`)
})

Then('el resultado de acceso es {string}', function (this: RbacWorld, resultado: string) {
  const expected = resultado === 'concedido' ? 'granted' : 'denied'
  assert.equal(this.lastAccessResult, expected)
})

Then('no hay capacidad heredada del sistema', function (this: RbacWorld) {
  // deny-by-default: no hay herencia implícita, el resultado ya debe ser 'denied'
  assert.equal(this.lastAccessResult, 'denied')
})
