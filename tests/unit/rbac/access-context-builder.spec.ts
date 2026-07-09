import { test } from '@japa/runner'
import { AccessContextBuilder } from '../../../app/modules/rbac/domain/access-context/access-context-builder.js'
import { StubIamAdapter } from '../../stubs/stub-iam-adapter.js'

test.group('AccessContextBuilder / humanos @smoke', () => {
  test('analista-rm-norte tiene capacidades de analista y orgUnit correcto', async ({ assert }) => {
    const claims = await new StubIamAdapter().authenticate('analista-rm-norte')
    const ctx = AccessContextBuilder.fromClaims(claims)

    assert.equal(ctx.subject.kind, 'human')
    assert.equal(ctx.subject.userId, 'stub-user-analista-rm-norte')
    assert.equal(ctx.subject.orgUnit, 'RM-Norte')
    assert.isTrue(ctx.can('prestacion:otorgar'))
    assert.isTrue(ctx.can('prestacion:denegar'))
    assert.isTrue(ctx.can('prestacion:consultar'))
    assert.isFalse(ctx.can('liquidacion:aprobar-cierre'))
    assert.isFalse(ctx.can('auditoria:leer'))
  })

  test('supervisor puede aprobar-cierre pero NO solicitar-cierre', async ({ assert }) => {
    const claims = await new StubIamAdapter().authenticate('supervisor-full')
    const ctx = AccessContextBuilder.fromClaims(claims)

    assert.equal(ctx.subject.kind, 'human')
    assert.isTrue(ctx.can('liquidacion:aprobar-cierre'))
    assert.isTrue(ctx.can('prestacion:consultar'))
    assert.isFalse(ctx.can('liquidacion:solicitar-cierre'))
    assert.isFalse(ctx.can('liquidacion:calcular'))
  })

  test('operador_pagos puede solicitar-cierre pero NO aprobar-cierre', async ({ assert }) => {
    const claims = await new StubIamAdapter().authenticate('operador-pagos')
    const ctx = AccessContextBuilder.fromClaims(claims)

    assert.isTrue(ctx.can('liquidacion:solicitar-cierre'))
    assert.isTrue(ctx.can('liquidacion:calcular'))
    assert.isFalse(ctx.can('liquidacion:aprobar-cierre'))
    assert.isFalse(ctx.can('prestacion:otorgar'))
  })
})

test.group('AccessContextBuilder / agentes @smoke', () => {
  test('job-pdn-pag-001 es AgentSubject con liquidacion:ejecutar-cierre', async ({ assert }) => {
    const claims = await new StubIamAdapter().authenticate('job-pdn-pag-001')
    const ctx = AccessContextBuilder.fromClaims(claims)

    assert.equal(ctx.subject.kind, 'agent')
    assert.isTrue(ctx.can('liquidacion:ejecutar-cierre'))
    assert.isTrue(ctx.can('liquidacion:calcular'))
    assert.isFalse(ctx.can('prestacion:otorgar'))
  })
})

test.group('AccessContextBuilder / externos @smoke', () => {
  test('empleador puede consultar hecho-causal y nada más', async ({ assert }) => {
    const claims = await new StubIamAdapter().authenticate('external-empleador')
    const ctx = AccessContextBuilder.fromClaims(claims)

    assert.equal(ctx.subject.kind, 'external')
    assert.isTrue(ctx.can('hecho-causal:consultar-estado'))
    assert.isFalse(ctx.can('prestacion:otorgar'))
    assert.isFalse(ctx.can('auditoria:leer'))
  })
})

test.group('AccessContextBuilder / deny-by-default', () => {
  test('claims sin grupos ni roles no tiene ninguna capability', ({ assert }) => {
    const ctx = AccessContextBuilder.fromClaims({ oid: 'usuario-sin-rol' })

    assert.equal(ctx.subject.kind, 'human')
    assert.isFalse(ctx.can('prestacion:otorgar'))
    assert.isFalse(ctx.can('auditoria:leer'))
    assert.isFalse(ctx.can('liquidacion:aprobar-cierre'))
  })
})
