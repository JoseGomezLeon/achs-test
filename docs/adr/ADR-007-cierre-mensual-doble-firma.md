# ADR-007 — Cierre Mensual con Doble Firma

**Estado:** Aceptada

## Contexto

El RBAC inicial tenia una capacidad unica `liquidacion:cerrar-ciclo`, concedida tanto a Supervisor como a Operador de Pagos. Eso dejaba ambiguo si el cierre mensual podia realizarlo una sola persona o si requeria control de doble firma.

El cierre mensual materializa liquidaciones, archivos de pago y evidencia regulatoria. Es una accion critica: debe quedar separada entre preparacion operativa, aprobacion humana y ejecucion tecnica auditable.

## Decision

Se elimina el uso de `liquidacion:cerrar-ciclo` como capacidad ejecutable.

El cierre mensual se modela con tres capacidades:

```text
liquidacion:solicitar-cierre   -> Operador Pagos
liquidacion:aprobar-cierre     -> Supervisor
liquidacion:ejecutar-cierre    -> BatchJob PDN-PAG-001, solo si existe aprobacion vigente
```

El humano no ejecuta el cierre final directamente. El flujo canonico es:

```text
Operador de Pagos
  -> solicita cierre del periodo

Supervisor
  -> revisa evidencia/preliquidacion
  -> aprueba cierre

Job PDN-PAG-001
  -> valida aprobacion vigente
  -> ejecuta cierre
  -> genera auditoria y eventos
```

## Reglas

- Un Operador no puede aprobar su propia solicitud.
- Un Supervisor no puede ejecutar el cierre final; solo aprobarlo.
- `PDN-PAG-001` no puede ejecutar cierre si no existe aprobacion vigente para el periodo.
- La aprobacion debe registrar `approvedBy`, `approvedAt`, `periodo`, `requestId` y hash/resumen de la preliquidacion aprobada.
- La ejecucion del job debe ser idempotente por `periodo` y `idempotencyKey`.
- Toda denegacion debe fallar con `AccessDeniedError` o `RelationViolationError` tipado.

## Alternativas consideradas

| Alternativa                                                    | Descartada porque                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Mantener `liquidacion:cerrar-ciclo` para Supervisor y Operador | Permite cierre unilateral y debilita auditoria                          |
| Permitir que Supervisor ejecute el cierre completo             | Mezcla aprobacion humana con ejecucion tecnica y dificulta idempotencia |
| Dejar la doble firma para una fase futura sin modelarla        | La capacidad quedaria mal definida desde TS07                           |

## Consecuencias

- **Positivas:** separacion clara de funciones entre Operador, Supervisor y BatchJob.
- **Positivas:** auditoria puede demostrar quien solicito, quien aprobo y que proceso ejecuto.
- **Positivas:** el cierre final queda automatizado e idempotente.
- **Negativas:** requiere persistir una entidad/registro de solicitud-aprobacion antes de ejecutar el cierre.

## Referencias

- `rbac_humano_agente.md` matriz de capacidades
- `discovery_calculo_pec.md` Fase 2 y Fase 3
- ADR-006: Runtime de Agentes y Workers
