# PEC RBAC Pilot — Instrucciones para el agente

## Qué es este proyecto

Piloto aislado para validar la metodología Dual-Axis de PEC con el módulo RBAC como caso de prueba.
**No es productivo** — es el banco de pruebas del proceso de trabajo.

## Cómo orientarte al inicio de cada sesión

1. Lee `docs/piloto-rbac-log.html` — es la fuente de verdad del estado de cada tarea (`status:'done'`/`'todo'`).
2. Los ADRs aprobados están en `docs/adr/`. El ADR-011 es la puerta de entrada al dominio.
3. La primera tarea `todo` en orden de fases es lo que sigue.

## Reglas de trabajo (no negociables)

- **Nunca marcar done sin validar.** Cada tarea tiene un comando de verificación. Si no hay comando, el criterio es "ejecuté X y el output fue Y".
- **Sin dominio sin ADR Aceptado.** ADR-011 está Aceptado — el circuito está desbloqueado.
- **pdoct4 es gate humano.** Los `.feature` files los escribe el Analista/PO, no el agente.
- **TEST_MODE=architecture en tests unitarios.** Nunca conectar a sistemas externos en la suite `unit`.
- **tsx en lugar de node ace.** `@poppinss/ts-exec` es incompatible con Node v22. Usar `npx tsx`.

## Stack

- AdonisJS 6 + React + Inertia.js
- Japa (unit), Playwright (`/usr/bin/google-chrome`), Cucumber + Testcontainers (BDD), Pact (contratos), Toxiproxy (caos), k6 (carga), Allure (reportes), dependency-cruiser (AFF)

## Comandos frecuentes

```bash
# Tests unitarios
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts --files "tests/unit/rbac/**/*.spec.ts"

# Solo @smoke
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts --files "tests/unit/rbac/**/*.spec.ts" --tags "@smoke"

# Typecheck
npx tsc --noEmit --strict

# Ciclo TDD local (AFF + Japa watch)
bash scripts/dev-tdd.sh

# Levantar infraestructura de integración
docker compose -f docker-compose.test.yml up -d
```

## Estructura del módulo RBAC

```
app/modules/rbac/
  domain/
    iam/          ← IamAdapter, TokenClaims, AuthenticationError
    audit/        ← AppAuditWriter, AuditEntry
    access-context/ ← capability-map (IMPLEMENTADO), AccessContextBuilder (TODO)
    authorization/  ← AuthorizationService (TODO)
    registry/       ← AgentRegistry (TODO)
tests/
  stubs/          ← StubIamAdapter (9 fixtures), StubAuditWriter (IMPLEMENTADOS)
  unit/rbac/      ← capability-map.spec.ts (13 tests VERDE)
```

## Cómo retomar el circuito completo desde el principio

Si en algún momento se quiere resetear y hacer el proceso completo de nuevo:
1. Leer este CLAUDE.md
2. Leer `docs/piloto-rbac-log.html` completo
3. Leer `docs/adr/ADR-011-rbac-dominio-negocio.md` (entry point del dominio)
4. Empezar por la fase `pdoc` (Pre-Run Docs) si todo está `todo`, o por la primera tarea pendiente
