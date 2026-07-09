# Pre-Run — Instrucciones para el agente

## Tu objetivo

Ejecutar la etapa **Pre-Run** de la metodología Dual-Axis para este proyecto.

Pre-Run termina cuando tienes: ADR síntesis aceptado, interfaces y stubs de dominio compilando, feature files Gherkin, tests unitarios verdes, test E2E verde, y suite BDD completa verde. Sin haber escrito una línea de código de producción.

## Cómo orientarte

1. Lee `Pre-Run/README.md` — entiende qué construir y por qué
2. Lee `Pre-Run/CHECKLIST.md` — las tareas en orden con comandos de verificación
3. Lee el ADR síntesis en `docs/adr/` — es la única fuente de verdad del dominio
4. Ejecuta cada tarea, verifica con el comando indicado, avanza solo si pasa

## Reglas no negociables

- **Nunca marcar done sin verificar.** Cada tarea tiene un comando de verificación. Ejecútalo antes de continuar.
- **Sin dominio sin ADR aceptado.** El ADR síntesis debe tener `Estado: Aceptada` antes de crear interfaces.
- **TEST_MODE=architecture en todos los tests.** El dominio nunca conecta sistemas externos reales durante Pre-Run.
- **Verifica que el test falla por la razón correcta.** Un error de importación no es un RED válido.

## Stack (AdonisJS 6 + Node v22)

> Si el proyecto usa otro stack, adapta los comandos de esta sección.

| Tecnología | Uso |
|---|---|
| AdonisJS 6 + React + Inertia.js | Framework servidor + frontend |
| Japa | Tests unitarios |
| SQLite in-memory | Base de datos para tests unitarios (sin Docker) |
| Playwright + Chrome | Tests E2E headless |
| Cucumber JS 13 | Tests BDD |
| Testcontainers | Base de datos efímera para integración |
| dependency-cruiser | Fitness functions arquitectónicas |
| tsx | Runtime TypeScript en Node v22 |
| Allure | Reportes agregados |

## Comandos clave

```bash
# Tests unitarios
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts --files "tests/unit/**/*.spec.ts"

# Solo @smoke
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts --files "tests/unit/**/*.spec.ts" --tags "@smoke"

# Typecheck
npx tsc --noEmit

# Fitness functions (AFF)
npx depcruise --config .dependency-cruiser.cjs app/modules

# Watcher TDD (AFF + tests en paralelo)
bash scripts/dev-tdd.sh

# BDD suite completa
node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import 'tests/bdd/support/world.ts' \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature'

# BDD solo @smoke
node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import 'tests/bdd/support/world.ts' \
  --import 'tests/bdd/steps/**/*.ts' \
  --tags '@smoke' \
  'tests/bdd/features/**/*.feature'

# E2E (construye assets primero)
npm run build:frontend && npx playwright test

# Infraestructura Docker
docker compose -f docker-compose.test.yml up -d
```

## Estructura de módulo esperada

```
app/modules/<modulo>/
  domain/
    iam/              ← interfaz de identidad + tipos + error de autenticación
    audit/            ← interfaz de auditoría + tipo de entrada
    access-context/   ← mapa de capacidades (Pre-Run), AccessContextBuilder (TDD)
    authorization/    ← AuthorizationService (TDD)
    registry/         ← AgentRegistry (TDD)

tests/
  stubs/              ← stubs de sistemas externos (deterministas)
  unit/<modulo>/      ← tests unitarios Japa
  bdd/
    features/         ← 1 .feature por área de negocio
    steps/            ← step definitions TypeScript
    support/          ← World de Cucumber, setup de Testcontainers

config/
  ioc.ts              ← inyecta stubs cuando TEST_MODE=architecture
```

## Gotchas del stack (ya resueltos — aplicar directamente)

### 1. tsx vs @poppinss/ts-exec en Node v22
`@poppinss/ts-exec` falla con `ERR_UNKNOWN_FILE_EXTENSION` en Node v22.
**Nunca usar `node ace <cmd>`. Siempre:**
```bash
npx tsx bin/server.ts     # en lugar de: node ace serve
npx tsx bin/test.ts       # en lugar de: node ace test
```

### 2. Vite manifest: build/ vs public/
`vite build` escribe el manifest en `build/public/assets/` pero el servidor de desarrollo
lo busca en `public/assets/`. Solución en `package.json`:
```json
"build:frontend": "vite build && mkdir -p public && cp -r build/public/assets public/",
"test:e2e": "npm run build:frontend && playwright test"
```

### 3. Cucumber: --loader deprecado en Node v20+
`cucumber-js --loader tsx` falla. Usar siempre:
```bash
node --import tsx/esm ./node_modules/.bin/cucumber-js ...
```

### 4. Alias de imports en IoC
El alias `#app/modules/...` no está en `package.json → imports` por defecto.
En `config/ioc.ts` usar rutas relativas:
```typescript
import('../app/modules/<modulo>/domain/iam/iam-adapter.js')   // ✓
import('#app/modules/<modulo>/domain/iam/iam-adapter.js')      // ✗
```

### 5. playwright.config.ts: executablePath
Va en `use.launchOptions`, no en `use` directamente:
```typescript
use: {
  launchOptions: { executablePath: '/usr/bin/google-chrome' }
}
```

### 6. webServer en playwright.config.ts
```typescript
webServer: {
  command: 'npx tsx bin/server.ts',  // NO: 'node ace serve'
  url: 'http://localhost:3333',
  reuseExistingServer: !process.env.CI,
  timeout: 30_000,
}
```

## Checklist de salida de Pre-Run

Antes de declarar Pre-Run completo, verifica:

```bash
# 1. Sin errores de TypeScript
npx tsc --noEmit

# 2. Sin violaciones de arquitectura
npx depcruise --config .dependency-cruiser.cjs app/modules

# 3. Tests unitarios verdes
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts --files "tests/unit/**/*.spec.ts"

# 4. E2E verde
npm run test:e2e

# 5. BDD verde
NODE_ENV=test TEST_MODE=architecture \
  node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import 'tests/bdd/support/world.ts' \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature'
```

Cuando los 5 pasan: Pre-Run completo. La siguiente etapa es **Paralelo TDD**.
