import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { RbacWorld } from '../support/world.js'

Given('existe el período de cierre {string}', function (this: RbacWorld, _period: string) {
  // registra existencia del período — no requiere DB en modo stub
})

Given('el operador de pagos ha solicitado el cierre del período {string}', async function (this: RbacWorld, period: string) {
  await this.authenticate('operador-pagos')
  this.requestClose(period, 'operador-pagos')
})

Given('el supervisor ha aprobado la solicitud de cierre', async function (this: RbacWorld) {
  const period = this.currentPeriod
  assert.ok(period, 'no hay período activo en el World')
  await this.authenticate('supervisor-full')
  this.approveClose(period, 'supervisor-full')
})

Given('no existe aprobación vigente para el período {string}', function (this: RbacWorld, _period: string) {
  // estado vacío por defecto — no-op
})

Given('la solicitud no ha sido aprobada por un supervisor', function (this: RbacWorld) {
  // no-op: requestClose sin approveClose deja estado sin approvedBy
})

When('el job {string} intenta ejecutar el cierre del período {string}', async function (this: RbacWorld, jobToken: string, period: string) {
  await this.authenticate(jobToken)
  this.checkExecuteClose(period)
})

When('el mismo operador de pagos intenta aprobar la solicitud', async function (this: RbacWorld) {
  await this.authenticate('operador-pagos')
  this.checkCapability('liquidacion:aprobar-cierre')
})

When('el supervisor intenta ejecutar el cierre directamente', async function (this: RbacWorld) {
  await this.authenticate('supervisor-full')
  this.checkCapability('liquidacion:ejecutar-cierre')
})

Then('el cierre es ejecutado exitosamente', function (this: RbacWorld) {
  assert.equal(this.lastAccessResult, 'granted', `se esperaba cierre exitoso, código: ${this.lastDenialCode}`)
})

Then('queda registro de auditoría con actorKind {string}', function (this: RbacWorld, actorKind: string) {
  const entries = this.getAuditEntries()
  const found = entries.some(e => e.actorKind === actorKind)
  assert.ok(found, `no se encontró entrada con actorKind="${actorKind}". Encontrados: ${[...new Set(entries.map(e => e.actorKind))]}`)
})
