# ADR-006 — Runtime de Agentes y Workers

**Estado:** Aceptada

## Contexto

El modelo RBAC define sujetos (`HumanSubject`, `AgentSubject`, `ExternalSubject`), capacidades y relaciones. Sin embargo, RBAC no debe ejecutar tareas de negocio. Su responsabilidad es autorizar o denegar acciones que otro proceso intenta ejecutar.

El proyecto necesita decidir donde viven los agentes batch y workers que ejecutan procesos como `PDN-PAG-001`, `PDN-MON-005/006`, publicacion de outbox y reporterias.

## Decision

Los agentes y workers viven **fuera del RBAC**. RBAC solo valida permisos sobre requests o ejecuciones ya iniciadas.

Para el MVP, todos los workers viven en el mismo backend/monorepo que el engine, pero corren como **procesos separados** del servidor HTTP.

```text
mismo repo / mismo deploy artifact
  ├─ HTTP server          # AdonisJS API/UI
  ├─ worker-pagos         # PDN-PAG-001/008/009/010
  ├─ worker-monitoreo     # PDN-MON-005/006
  ├─ worker-outbox        # publica eventos pendientes
  └─ worker-reportes      # SUSESO/GRIS/SAP/PREVIRED
```

Todos importan el mismo `engine` y el mismo `rbac`, pero cada proceso arranca con una identidad tecnica distinta.

```text
worker-pagos
  CLIENT_ID=pec2-job-pdn-pag-001

worker-monitoreo
  CLIENT_ID=pec2-job-pdn-mon-005

worker-outbox
  CLIENT_ID=pec2-worker-outbox
```

La identidad tecnica no se interpreta directamente como permisos. Cada `CLIENT_ID` debe existir en el `AgentRegistry` local. Esa registry fija:

- agente logico (`pec2-job-pdn-pag-001`)
- App Registration esperada (`entraClientId`)
- Service Principal esperado cuando aplique (`entraObjectId`)
- operacion declarada (`PDN-PAG-001`)
- ambiente permitido (`dev`, `staging`, `prod`)
- capacidades maximas del proceso

## Flujo

```text
Scheduler / Worker / Agent Runtime
  -> obtiene token tecnico
  -> invoca API o use-case del engine
  -> IamAdapter valida identidad
  -> AccessContextBuilder consulta AgentRegistry y construye AgentSubject
  -> AuthorizationService valida capacidades y relaciones
  -> dominio ejecuta o deniega
```

## Regla de diseno

Un solo motor de dominio, muchos procesos agentes/workers con identidades y permisos distintos.

No se crea un motor por agente. Cada worker llama al mismo engine:

```text
PDN-PAG-001 worker
  -> identity: pec2-job-pdn-pag-001
  -> calls LiquidacionUseCase
  -> RBAC checks liquidacion:calcular

PDN-MON-005 worker
  -> identity: pec2-job-pdn-mon-005
  -> calls MantencionUseCase
  -> RBAC checks prestacion:cesar
```

## Identificacion y auditoria

Cada ejecucion debe dejar trazabilidad con:

```text
actorKind + actorId + entraClientId + operation + capability + resource + correlationId
```

Ejemplo:

```typescript
{
  actorKind: "agent",
  actorId: "pec2-job-pdn-pag-001",
  entraClientId: "1111-2222-3333",
  entraObjectId: "aaaa-bbbb-cccc",
  agentType: "BatchJob",
  operation: "PDN-PAG-001",
  environment: "prod",
  capability: "liquidacion:calcular",
  resourceType: "LiquidacionDePago",
  resourceId: "liq_123",
  requestId: "corr_456",
  tokenJti: "jwt-id-si-viene",
  happenedAt: "2026-07-02T00:00:00.000Z"
}
```

## Alternativas consideradas

| Alternativa                     | Descartada porque                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Un microservicio por worker     | Agrega despliegue, observabilidad y contratos de red antes de validar el dominio                |
| Un motor por agente             | Duplica reglas de negocio y hace mas dificil reproducir calculos                                |
| Workers dentro del proceso HTTP | Mezcla ciclos de vida distintos; un job pesado puede afectar latencia de usuarios               |
| MCP como fuente de permisos     | MCP puede servir a herramientas de desarrollo, pero no debe ser la autoridad productiva de RBAC |

## Consecuencias

- **Positivas:** el dominio se mantiene unico y reutilizable.
- **Positivas:** cada worker puede escalarse, detenerse o auditarse por separado.
- **Positivas:** RBAC queda como autorizador transversal, no como orquestador.
- **Negativas:** el despliegue debe administrar varios procesos del mismo artefacto.
- **Negativas:** se requiere disciplina de observabilidad por `correlationId` entre worker, engine, outbox y auditoria.

## Referencias

- ADR-001: IAM Entra ID como Identity Provider
- ADR-002: Estrategia de mock para desarrollo y tests
- ADR-005: Mapeo de claims a AccessContext
- `rbac_humano_agente.md`
