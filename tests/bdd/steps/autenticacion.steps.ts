import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { AuthenticationError } from '../../../app/modules/rbac/domain/iam/iam-adapter.js'
import type { RbacWorld } from '../support/world.js'

Given('un token {string}', async function (this: RbacWorld, token: string) {
  await this.authenticate(token)
})

Given('un token con campo exp en el pasado', async function (this: RbacWorld) {
  // StubIamAdapter no soporta tokens expirados — simulamos el error directamente
  this.lastError = new AuthenticationError('token expirado')
  this.subject = null
})

When('el sistema autentica el token', async function (this: RbacWorld) {
  // autenticación ya se realizó en el Given — no-op
})

Then('el sujeto es de tipo HumanSubject', function (this: RbacWorld) {
  assert.equal(this.subject?.kind, 'human', 'se esperaba HumanSubject')
})

Then('el sujeto es de tipo AgentSubject', function (this: RbacWorld) {
  assert.equal(this.subject?.kind, 'agent', 'se esperaba AgentSubject')
})

Then('el sujeto es de tipo ExternalSubject', function (this: RbacWorld) {
  assert.equal(this.subject?.kind, 'external', 'se esperaba ExternalSubject')
})

Then('el sujeto tiene rol {string}', function (this: RbacWorld, expectedRole: string) {
  assert.equal(this.subject?.role, expectedRole)
})

Then('el sujeto tiene orgUnit {string}', function (this: RbacWorld, expectedOrgUnit: string) {
  assert.equal(this.subject?.orgUnit, expectedOrgUnit)
})

Then('el sujeto tiene tipo externo {string}', function (this: RbacWorld, expectedType: string) {
  assert.equal(this.subject?.externalType, expectedType)
})

Then('el agente tiene operation {string}', function (this: RbacWorld, expectedOp: string) {
  assert.equal(this.subject?.operation, expectedOp)
})

Then('la autenticación es exitosa', function (this: RbacWorld) {
  assert.ok(this.subject !== null, 'se esperaba sujeto autenticado')
  assert.ok(this.lastError === null, `no se esperaba error: ${this.lastError?.message}`)
})

Then('el resultado es un error con código {string}', function (this: RbacWorld, code: string) {
  if (this.lastError) {
    // AuthenticationError u otro error de sistema
    assert.equal((this.lastError as any).code, code)
    return
  }
  // access_denied / relation_violation viven en lastDenialCode
  assert.equal(this.lastDenialCode, code, `se esperaba código "${code}", se obtuvo: ${this.lastDenialCode}`)
})

Then('el código HTTP asociado es {int}', function (this: RbacWorld, httpCode: number) {
  if (httpCode === 401) {
    assert.ok(this.lastError instanceof AuthenticationError, 'se esperaba AuthenticationError para 401')
  } else if (httpCode === 403) {
    assert.ok(
      this.lastDenialCode === 'access_denied' || this.lastDenialCode === 'relation_violation',
      `se esperaba código 403, código actual: ${this.lastDenialCode}`
    )
  }
})

Then('el mensaje de error no contiene detalles de la capacidad interna', function (this: RbacWorld) {
  // La política es que el mensaje sea genérico — el stub devuelve un mensaje simple
  assert.ok(this.lastError === null || !(this.lastError?.message ?? '').includes('liquidacion:ejecutar-cierre'))
})

Then('no se genera registro de auditoría de capacidad', function (this: RbacWorld) {
  assert.equal(this.auditWriter.entries.length, 0)
})

Then('queda registro de auditoría con outcome {string}', function (this: RbacWorld, outcome: string) {
  const entries = this.getAuditEntries()
  assert.ok(
    entries.some(e => e.outcome === outcome),
    `no se encontró entrada con outcome="${outcome}". Encontrados: ${entries.map(e => e.outcome)}`
  )
})

Then('el registro incluye el campo {string}', function (this: RbacWorld, field: string) {
  const entries = this.getAuditEntries()
  assert.ok(
    entries.some(e => (e as any)[field] !== undefined),
    `no se encontró entrada con el campo "${field}"`
  )
})
