import { test } from '@japa/runner'
import {
  humanCapabilityMap,
  externalCapabilityMap,
} from '../../../app/modules/rbac/domain/access-context/capability-map.js'

test.group('humanCapabilityMap', () => {
  test('analista puede otorgar, denegar y consultar prestaciones')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isTrue(humanCapabilityMap.analista.has('prestacion:otorgar'))
      assert.isTrue(humanCapabilityMap.analista.has('prestacion:denegar'))
      assert.isTrue(humanCapabilityMap.analista.has('prestacion:consultar'))
    })

  test('analista NO puede aprobar cierre')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isFalse(humanCapabilityMap.analista.has('liquidacion:aprobar-cierre'))
    })

  test('supervisor puede aprobar cierre y consultar liquidaciones')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isTrue(humanCapabilityMap.supervisor.has('liquidacion:aprobar-cierre'))
      assert.isTrue(humanCapabilityMap.supervisor.has('liquidacion:consultar'))
    })

  test('supervisor NO puede calcular liquidacion directamente')
    .tags(['@rbac'])
    .run(({ assert }) => {
      assert.isFalse(humanCapabilityMap.supervisor.has('liquidacion:calcular'))
    })

  test('supervisor NO puede solicitar cierre (esa es labor del operador)')
    .tags(['@rbac'])
    .run(({ assert }) => {
      assert.isFalse(humanCapabilityMap.supervisor.has('liquidacion:solicitar-cierre'))
    })

  test('operador_pagos puede solicitar cierre y calcular liquidaciones')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isTrue(humanCapabilityMap.operador_pagos.has('liquidacion:solicitar-cierre'))
      assert.isTrue(humanCapabilityMap.operador_pagos.has('liquidacion:calcular'))
    })

  test('operador_pagos NO puede aprobar cierre (evita auto-aprobación)')
    .tags(['@rbac'])
    .run(({ assert }) => {
      assert.isFalse(humanCapabilityMap.operador_pagos.has('liquidacion:aprobar-cierre'))
    })

  test('operador_pagos NO puede otorgar prestaciones')
    .tags(['@rbac'])
    .run(({ assert }) => {
      assert.isFalse(humanCapabilityMap.operador_pagos.has('prestacion:otorgar'))
    })

  test('auditor solo tiene auditoria:leer')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isTrue(humanCapabilityMap.auditor.has('auditoria:leer'))
      assert.isFalse(humanCapabilityMap.auditor.has('prestacion:otorgar'))
      assert.isFalse(humanCapabilityMap.auditor.has('liquidacion:calcular'))
      assert.isFalse(humanCapabilityMap.auditor.has('liquidacion:aprobar-cierre'))
    })

  test('admin_gobernanza tiene capacidades de todos los roles criticos')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isTrue(humanCapabilityMap.admin_gobernanza.has('auditoria:leer'))
      assert.isTrue(humanCapabilityMap.admin_gobernanza.has('liquidacion:aprobar-cierre'))
      assert.isTrue(humanCapabilityMap.admin_gobernanza.has('liquidacion:solicitar-cierre'))
      assert.isTrue(humanCapabilityMap.admin_gobernanza.has('prestacion:otorgar'))
      assert.isTrue(humanCapabilityMap.admin_gobernanza.has('rbac:administrar'))
    })
})

test.group('externalCapabilityMap', () => {
  test('empleador puede consultar estado de hecho causal')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      assert.isTrue(externalCapabilityMap.empleador.has('hecho-causal:consultar-estado'))
    })

  test('empleador NO puede otorgar prestaciones')
    .tags(['@rbac'])
    .run(({ assert }) => {
      assert.isFalse(externalCapabilityMap.empleador.has('prestacion:otorgar'))
    })
})

test.group('deny-by-default', () => {
  test('CapabilitySet vacio no tiene ninguna capability')
    .tags(['@smoke', '@rbac'])
    .run(({ assert }) => {
      const empty = new Set<string>()
      assert.isFalse(empty.has('prestacion:otorgar'))
      assert.isFalse(empty.has('auditoria:leer'))
      assert.equal(empty.size, 0)
    })
})
