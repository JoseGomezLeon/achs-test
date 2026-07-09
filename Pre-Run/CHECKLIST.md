# Pre-Run — Checklist de tareas

Ejecutar en orden. Verificar cada tarea antes de avanzar a la siguiente.

**Convención de placeholders:**

- `<MODULO>` → nombre del módulo (ej: pagos, usuarios, notificaciones)
- `<INTERFAZ>` → nombre de la interfaz principal del sistema externo
- `<STUB>` → nombre del stub correspondiente
- `<ROL>` → nombre de un rol de negocio
- `<CAPACIDAD>` → una capacidad en formato `recurso:accion`

---

## FASE pdoc — Documentación y contratos

### pdoct1 — ADR síntesis de negocio

**Qué hace:** consolida en un único documento todo lo que el dominio necesita saber antes de codear.

**Acción:**

1. Lee todos los ADRs existentes del proyecto en `docs/adr/`
2. Completa o adapta `Pre-Run/dominio/ADR-SINTESIS-TEMPLATE.md` con los datos del módulo
3. Guárdalo en `docs/adr/` con el nombre que corresponda al proyecto
4. Cambia el estado a `Aceptada`

**El ADR debe contener como mínimo:**

- Qué sistemas externos consume el módulo (máx. 3)
- Qué roles de negocio existen y qué puede hacer cada uno (tabla de capacidades)
- Qué reglas de negocio son críticas (deny-by-default, flujos especiales)
- Qué límites de arquitectura debe respetar el código (qué puede importar qué)

**Verificación:**

```
Abrir el ADR y confirmar: Estado: Aceptada
```

---

### pdoct2 — Golden Dataset

**Qué hace:** define los casos canónicos de prueba que no cambian entre sprints.

**Acción:** crear `docs/golden/GoldenDataSet.md` con al menos 5 casos por categoría:

- A — Acceso válido (sujeto con capacidad ejerciéndola correctamente)
- B — Autorización (combinaciones de rol y capacidad)
- C — Denegación esperada (capacidad no asignada al rol)
- D — Errores (token inválido, recurso fuera de scope)
- E — Runtime (flujos especiales, doble firma, agentes)

**Verificación:**

```
El archivo existe y tiene al menos 20 casos en 5 categorías
```

---

### pdoct3 — Interfaces, tipos y stubs

**Qué hace:** crea los contratos TypeScript del dominio y sus dobles de prueba.

**Archivos a crear (adaptar rutas al proyecto):**

```
app/modules/<MODULO>/domain/iam/
  token-claims.ts           ← tipo TokenClaims (campos del token de identidad)
  iam-adapter.ts            ← interface <INTERFAZ> + clase <ErrorAutenticacion>

app/modules/<MODULO>/domain/audit/
  audit-entry.ts            ← tipo AuditEntry (campos del registro de auditoría)
  app-audit-writer.ts       ← interface <InterfazAudit>

app/modules/<MODULO>/domain/access-context/
  capability-map.ts         ← humanCapabilityMap + externalCapabilityMap como const

config/ioc.ts               ← buildBindings(): inyecta stubs si TEST_MODE=architecture
tests/stubs/<STUB>.ts       ← stub del sistema de identidad (tokens deterministas del ADR §1.3)
tests/stubs/<STUB>audit.ts  ← stub del sistema de auditoría (array en memoria)
```

**Reglas para el IoC (`config/ioc.ts`):**

```typescript
// Usar rutas relativas, NO alias como #app/modules/...
export async function buildBindings() {
  if (process.env.TEST_MODE === 'architecture') {
    const [{ <Stub> }] = await Promise.all([import('../tests/stubs/<stub>.js')])
    return { adapter: new <Stub>() }
  }
  throw new Error('Implementación real pendiente')
}
```

**Verificación:**

```bash
npx tsc --noEmit
# Los archivos nuevos deben compilar sin errores
```

---

### pdoct4 — Feature files Gherkin

**Qué hace:** traduce las reglas del ADR a especificaciones ejecutables.

**Crear en `tests/bdd/features/`:**

```
01-autenticacion.feature        ← tokens válidos/inválidos, tipos de sujeto
02-capacidades-por-rol.feature  ← matriz completa (Scenario Outline por rol y capacidad)
03-deny-by-default.feature      ← CapabilitySet vacío, capacidades no asignadas
04-flujo-critico.feature        ← el flujo de negocio más importante del ADR
05-relacion-contexto.feature    ← acceso por scope/orgUnit (si aplica en el ADR)
06-acceso-externo.feature       ← sujetos externos (si el ADR los define)
07-errores.feature              ← contratos de error: códigos y HTTP status
```

**Reglas de tagging:**

- `@smoke` en 4–6 escenarios críticos de cada feature (los que no pueden fallar nunca)
- `@<modulo>` en todos los escenarios (ej: `@pagos`, `@auth`, `@notificaciones`)

**Estructura mínima de cada escenario:**

```gherkin
@smoke @<modulo>
Scenario: [descripción en lenguaje de negocio]
  Given [estado inicial]
  When [acción del sujeto]
  Then [resultado esperado]
```

**Verificación:**

```bash
# Sintaxis Gherkin válida (debe parsear sin error)
node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --dry-run \
  'tests/bdd/features/**/*.feature'
```

---

## FASE p2 — Infraestructura de tests

### p2t1 — Bootstrap del test runner

**Verificación:**

```bash
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts
# Output: suite vacía sin errores de importación
```

---

### p2t2 — .env.test

**Contenido mínimo obligatorio:**

```env
TZ=UTC
NODE_ENV=test
TEST_MODE=architecture
LOG_LEVEL=error
SESSION_DRIVER=memory
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

**Agregar también** las URLs de servicios externos que el módulo usará en integración:

```env
# ajustar URLs según docker-compose.test.yml
PACT_BROKER_URL=http://localhost:9292
TOXIPROXY_URL=http://localhost:8474
```

**Verificación:**

```bash
grep TEST_MODE .env.test
# Output: TEST_MODE=architecture
```

---

### p2t3 — Suites en el runner de tests

**Acción:** registrar suites de tests adicionales en el archivo de configuración del runner:

- `unit` — timeout 2s, directorio `tests/unit/`
- `integration` — timeout 60s, directorio `tests/integration/`
- `compliance` — timeout 30s, directorio `tests/contract/`

**Verificación:** el runner arranca y reconoce las suites sin error

---

### p2t4 — config/ioc.ts

Ver pdoct3. Verificar que `TEST_MODE=architecture` inyecta stubs y `production` lanza error descriptivo.

**Verificación:**

```bash
TEST_MODE=architecture node --import tsx/esm -e \
  "import('./config/ioc.js').then(m => m.buildBindings()).then(b => console.log(Object.keys(b)))"
# Output: lista de bindings sin error
```

---

### p2t5 — docker-compose.test.yml

**Servicios mínimos:**

```yaml
services:
  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports: ['9292:9292']

  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:latest
    ports: ['8474:8474']

  postgres:
    image: postgres:16-alpine
    ports: ['5433:5432']
    environment:
      POSTGRES_DB: <nombre_db_test>
      POSTGRES_USER: <usuario>
      POSTGRES_PASSWORD: <password>
```

**Verificación:**

```bash
docker compose -f docker-compose.test.yml config
# Sin errores de sintaxis YAML
```

---

### p2t6 — tests/chaos/toxiproxy.config.json

**Estructura mínima:**

```json
{
  "proxies": [
    {
      "name": "<sistema-externo>",
      "listen": "0.0.0.0:<puerto>",
      "upstream": "<host-real>:<puerto-real>",
      "enabled": true
    }
  ],
  "scenarios": {
    "<nombre-escenario>": {
      "proxy": "<sistema-externo>",
      "toxic": "timeout",
      "attributes": { "timeout": 3000 }
    }
  }
}
```

**Verificación:**

```bash
python3 -m json.tool tests/chaos/toxiproxy.config.json > /dev/null && echo "JSON válido"
```

---

### p2t7 — scripts/dev-tdd.sh

**Contenido:**

```bash
#!/usr/bin/env bash
set -e
export NODE_ENV=test
export TEST_MODE=architecture

cleanup() { kill "$AFF_PID" "$TEST_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

npx depcruise --watch app/modules &
AFF_PID=$!

npx tsx bin/test.ts --watch tests/unit/ &
TEST_PID=$!

wait
```

**Verificación:**

```bash
chmod +x scripts/dev-tdd.sh
bash scripts/dev-tdd.sh &
sleep 3 && kill %1
# Arranca sin error
```

---

### p2t8 — Primer test unitario

**Qué hace:** verifica la matriz de capacidades del ADR sin código de producción.

**Crear `tests/unit/<MODULO>/capability-map.spec.ts`** que verifique:

- Cada `<ROL>` tiene exactamente las `<CAPACIDAD>`es definidas en el ADR §2.2
- Roles que NO deben tener ciertas capacidades (casos de denegación)
- Un `CapabilitySet` vacío no tiene ninguna capacidad
- La capacidad exclusiva de agentes no está en ningún rol humano

**Tags:** `@smoke` en los casos críticos, `@<modulo>` en todos.

**Verificación:**

```bash
NODE_ENV=test TEST_MODE=architecture \
  npx tsx bin/test.ts --files "tests/unit/**/*.spec.ts"
# Output: todos passed, 0 failed
```

---

### p2t9 — Typecheck

**Verificación:**

```bash
npx tsc --noEmit
# Solo errores pre-existentes del scaffold son aceptables
# Los archivos nuevos deben compilar sin errores
```

---

### p2t10 — .dependency-cruiser.cjs

**Reglas mínimas a codificar (derivadas del ADR §4):**

```javascript
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: { path: '^app/modules/<MODULO>/domain' },
      to: { circular: true },
    },
    {
      name: 'no-stubs-en-produccion',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: '^tests/stubs/' },
    },
    // Agregar reglas de dirección de imports del ADR §4
    // { name: 'iam-no-framework', from: { path: 'domain/iam' },
    //   to: { path: '@framework' }, severity: 'error' }
  ],
}
```

**Verificación:**

```bash
npx depcruise --config .dependency-cruiser.cjs app/modules
# Output: "0 dependency violations found"
```

---

## FASE p3 — Playwright E2E

### p3t1 — playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['html'], ['allure-playwright']],
  use: {
    baseURL: 'http://localhost:<PUERTO>',
    trace: 'on-first-retry',
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
  },
  webServer: {
    command: 'npx tsx bin/server.ts', // gotcha: NO usar 'node ace serve'
    url: 'http://localhost:<PUERTO>',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

**Verificación:** `npx tsc --noEmit` sin errores en `playwright.config.ts`

---

### p3t2 — Scripts en package.json

```json
"build:frontend": "vite build && mkdir -p public && cp -r build/public/assets public/",
"test:e2e": "npm run build:frontend && playwright test",
"test:bdd": "node --import tsx/esm ./node_modules/.bin/cucumber-js --import 'tests/bdd/support/world.ts' --import 'tests/bdd/steps/**/*.ts' 'tests/bdd/features/**/*.feature'",
"test:bdd:smoke": "node --import tsx/esm ./node_modules/.bin/cucumber-js --import 'tests/bdd/support/world.ts' --import 'tests/bdd/steps/**/*.ts' --tags '@smoke' 'tests/bdd/features/**/*.feature'"
```

---

### p3t3 — Primer test E2E

**Crear `tests/e2e/<MODULO>/smoke.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test'

test('la aplicación carga sin error de servidor', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBeLessThan(500)
})

test('la página principal renderiza un elemento visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
})
```

---

### p3t4 — E2E verde

**Verificación:**

```bash
npm run test:e2e
# Output: "X passed" sin fallos
```

---

### p3t5 — Reporte HTML generado

**Verificación:**

```bash
ls playwright-report/index.html
# El archivo debe existir
```

---

## FASE p4 — Cucumber BDD

### p4t1 — Estructura de directorios

```bash
mkdir -p tests/bdd/features tests/bdd/steps tests/bdd/support
```

---

### p4t2 — Instalar Testcontainers

```bash
npm install --save-dev testcontainers
```

**Crear `tests/bdd/support/testcontainers.ts`:**

```typescript
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from 'testcontainers'

let instance: StartedPostgreSqlContainer | null = null

export async function startPostgres() {
  if (instance) return instance
  instance = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('<db>')
    .withUsername('<user>')
    .withPassword('<pass>')
    .start()
  return instance
}

export async function stopPostgres() {
  if (instance) {
    await instance.stop()
    instance = null
  }
}

export const getConnectionString = () => {
  if (!instance) throw new Error('Postgres no iniciado')
  return instance.getConnectionUri()
}
```

---

### p4t3 — World de Cucumber

**Crear `tests/bdd/support/world.ts`** que extienda `World` de `@cucumber/cucumber`.

El World debe proveer:

- Instancias de los stubs (`<Stub>Iam`, `<Stub>Audit`)
- `authenticate(token)` → clasifica el sujeto según los claims del ADR §1
- `checkCapability(capacidad)` → verifica en el mapa del ADR §2, guarda resultado
- `checkCapabilityForResource(capacidad, recurso)` → verifica capacidad + scope de relación
- `lastAccessResult`: `'granted' | 'denied' | null`
- `lastDenialCode`: `string | null`
- `lastError`: error de autenticación si aplica
- Estado para flujos de múltiples actores (del ADR §3.2)

**Clasificación de sujetos** (derivada del ADR §1):

```
claims indica tipo externo → ExternalSubject → caps del externalCapabilityMap
claims tiene grupos de identidad → HumanSubject → derivar rol → caps del humanCapabilityMap
else → AgentSubject → caps directamente desde claims.roles
```

**Verificación:** `npx tsc --noEmit` sin errores en `world.ts`

---

### p4t4 — Step definitions

**Crear en `tests/bdd/steps/`:**

| Archivo                  | Steps que contiene                                                        |
| ------------------------ | ------------------------------------------------------------------------- |
| `common.steps.ts`        | Background, configuración de entorno                                      |
| `autenticacion.steps.ts` | Autenticar token, verificar tipo de sujeto, verificar errores             |
| `capacidades.steps.ts`   | Given sujeto autenticado, When ejecuta capacidad, Then concedido/denegado |
| `flujo.steps.ts`         | Steps para el flujo crítico del ADR §3.2 (si aplica)                      |
| `contexto.steps.ts`      | Steps para relación de sujeto con recursos (si aplica)                    |

**Verificación:** `npx tsc --noEmit` sin errores en los step files

---

### p4t5 — BDD suite verde

**Verificación:**

```bash
NODE_ENV=test TEST_MODE=architecture \
  node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import 'tests/bdd/support/world.ts' \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature'

# Output esperado:
# N scenarios (N passed)
# M steps (M passed)
# Sin "undefined", "pending" ni "failed"
```

---

## Checklist final

```
[ ] docs/adr/ADR-*.md              Estado: Aceptada
[ ] domain/iam/*.ts                interface + error de autenticación
[ ] domain/audit/*.ts              interface + tipo de entrada
[ ] domain/access-context/*.ts     mapa de capacidades
[ ] config/ioc.ts                  inyecta stubs en TEST_MODE=architecture
[ ] tests/stubs/*.ts               2 stubs deterministas
[ ] tests/bdd/features/*.feature   7 archivos con @smoke y @<modulo>
[ ] .dependency-cruiser.cjs        0 violaciones AFF
[ ] .env.test                      TEST_MODE=architecture
[ ] docker-compose.test.yml
[ ] scripts/dev-tdd.sh
[ ] playwright.config.ts           webServer: npx tsx bin/server.ts
[ ] tests/e2e/*/smoke.spec.ts      verde
[ ] tests/unit/*/capability-map.spec.ts  todos passed
[ ] tests/bdd/support/world.ts
[ ] tests/bdd/steps/*.ts           5 archivos
[ ] npm run test:bdd               N scenarios, M steps — 0 failed
[ ] npm run test:e2e               0 failed
[ ] npx tsc --noEmit               0 errores en archivos nuevos
[ ] npx depcruise ...              0 violations
```
