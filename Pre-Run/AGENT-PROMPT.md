# Prompt para el agente IA

Copia y pega esto al agente al inicio de la sesión en el proyecto nuevo.
No modifiques el contenido — el agente lo interpreta tal como está.

---

## INICIO DEL PROMPT

Vas a ejecutar la etapa **Pre-Run** de la metodología Dual-Axis para este proyecto.

**Qué es Pre-Run:** la etapa que precede a toda implementación. Construyes la infraestructura de testing y los contratos de dominio antes de escribir una línea de código de producción. Cuando termines, todos los tests pasarán en verde sin que exista todavía ninguna lógica real del dominio.

### Tu primer paso

Lee estos archivos en este orden antes de hacer nada:

1. `Pre-Run/README.md` — entiende el objetivo y la metodología
2. `Pre-Run/CHECKLIST.md` — las tareas en orden con comandos de verificación
3. `docs/adr/` — el ADR síntesis del módulo (la fuente de verdad del dominio)

### Reglas de trabajo

- **Nunca avances sin verificar.** Cada tarea en el checklist tiene un comando de verificación. Ejecútalo y confirma el output esperado antes de continuar.
- **El ADR manda.** Todo lo que construyas debe derivarse del ADR síntesis. Si el ADR no lo define, no lo implementes.
- **TEST_MODE=architecture siempre.** Los tests de dominio nunca conectan sistemas externos reales. Solo stubs.
- **Verifica el tipo de fallo.** Un test que falla con "módulo no encontrado" no es un RED válido. El módulo debe existir y el assertion de negocio debe fallar.

### Qué construirás

En este orden:

**Wave 1 — sin dependencias entre sí (crear en paralelo):**

- ADR síntesis (si no está listo, completar la plantilla en `Pre-Run/dominio/`)
- `.env.test` con `TEST_MODE=architecture` y `DB_CONNECTION=sqlite`
- `docker-compose.test.yml` con Pact Broker, Toxiproxy y base de datos
- `tests/chaos/toxiproxy.config.json`

**Wave 2 — depende del ADR:**

- Interfaces TypeScript de sistemas externos (`domain/iam/`, `domain/audit/`)
- Tipos de dominio (`TokenClaims`, `AuditEntry`)
- Mapa de capacidades (`domain/access-context/capability-map.ts`)
- Stubs deterministas (`tests/stubs/`)
- `config/ioc.ts` que inyecta stubs cuando `TEST_MODE=architecture`
- `.dependency-cruiser.cjs` con las reglas AFF del ADR §4
- `scripts/dev-tdd.sh` (watcher AFF + tests en paralelo)

**Wave 3 — depende de interfaces y stubs:**

- 7 feature files Gherkin (1 por área de negocio del ADR)
- Primer test unitario que verifica el mapa de capacidades
- `playwright.config.ts` con `webServer` apuntando al servidor
- Primer test E2E (smoke: servidor levanta y responde)
- `tests/bdd/support/world.ts` (World de Cucumber con stubs)
- 5 archivos de step definitions en `tests/bdd/steps/`

**Wave 4 — verificación:**

- `npx tsc --noEmit` → 0 errores en archivos nuevos
- `npx depcruise --config .dependency-cruiser.cjs app/modules` → 0 violaciones
- Tests unitarios → todos passed
- `npm run test:e2e` → todos passed
- Suite BDD completa → todos passed (0 undefined, 0 pending, 0 failed)

### Criterio de éxito

Pre-Run está completo cuando estos cinco comandos pasan en verde:

```bash
npx tsc --noEmit

npx depcruise --config .dependency-cruiser.cjs app/modules

NODE_ENV=test TEST_MODE=architecture \
  npx tsx bin/test.ts --files "tests/unit/**/*.spec.ts"

npm run test:e2e

NODE_ENV=test TEST_MODE=architecture \
  node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import 'tests/bdd/support/world.ts' \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature'
```

Cuando los cinco pasen, reporta: número de tests unitarios, número de scenarios BDD, número de steps, tiempos de ejecución. Pre-Run está listo.

### Si encuentras un problema

Antes de intentar una solución, lee `Pre-Run/CLAUDE.md` — contiene los gotchas ya resueltos del stack. No redescubras lo que ya está documentado.

## FIN DEL PROMPT
