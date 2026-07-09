# Manual Técnico — Circuito CI/CD con Metodología Dual-Axis

> **Propósito**: reproducir el circuito completo en cualquier máquina, sin contexto previo.
> Los nombres entre `<angulares>` son placeholders — reemplázalos por los valores reales de tu proyecto.
> La fuente de verdad es GitHub Actions. Azure DevOps se indica como alternativa en cada fase CI/CD.

---

## Índice

1. [Prerequisitos del sistema](#1-prerequisitos-del-sistema)
2. [Repositorio y conexión remota](#2-repositorio-y-conexión-remota)
3. [Inicialización del framework](#3-inicialización-del-framework)
4. [Stack de testing](#4-stack-de-testing)
5. [Pre-Run — Documentación y contratos](#5-pre-run--documentación-y-contratos)
6. [Infraestructura de tests](#6-infraestructura-de-tests)
7. [Ciclo TDD — I1 a I6 + Allure](#7-ciclo-tdd--i1-a-i6)
8. [Pipeline CI — Nivel 1](#8-pipeline-ci--nivel-1)  ← pendiente
9. [Pipeline CI — Nivel 2](#9-pipeline-ci--nivel-2)  ← pendiente
10. [Deploy — Staging → Producción](#10-deploy--staging--producción)  ← pendiente
11. [Regresión Total](#11-regresión-total)  ← pendiente

---

## 1. Prerequisitos del sistema

### 1.1 Node.js 22+

```bash
node -v          # debe ser v22.x o superior
npm -v
```

Si no está instalado:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.2 Docker Engine

```bash
docker ps        # debe responder sin error
```

Requerido por Testcontainers (base de datos efímera en tests de integración).

### 1.3 Git

```bash
git --version
git config user.name "<Tu Nombre>"
git config user.email "<tu@email.com>"
```

### 1.4 Google Chrome (para E2E con Playwright)

```bash
google-chrome --version   # /usr/bin/google-chrome
```

Si no está instalado (Ubuntu — usar apt, NO snap):
```bash
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable
```

### 1.5 Java (para Allure)

```bash
java -version    # requerido por allure-commandline
```

```bash
sudo apt-get install -y openjdk-21-jre-headless
```

### 1.6 k6

```bash
k6 version
```

```bash
sudo snap install k6
```

> **Nota**: en redes corporativas, `apt` puede fallar al verificar la clave GPG de k6. `snap` no tiene ese problema.

### 1.7 GitHub CLI

```bash
gh --version
```

```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
sudo apt update && sudo apt install gh -y
```

Autenticación (usar `--web` para evitar el menú interactivo de flechas):
```bash
gh auth login --web
```

> **Alternativa Azure DevOps**: instalar `az` CLI y la extensión devops:
> ```bash
> curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
> az extension add --name azure-devops
> az login
> az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>
> ```

---

## 2. Repositorio y conexión remota

> **Regla crítica**: crear el repositorio remoto ANTES de iniciar el ciclo TDD. Sin remote no hay `gh pr create` ni pipeline CI.

### 2.1 Inicializar el repositorio local

```bash
mkdir ~/<project-name> && cd ~/<project-name>
git init
git checkout -b main
```

### 2.2 Crear el repositorio remoto y conectarlo

**GitHub:**
```bash
gh repo create <project-name> --private --source=. --remote=origin
```

Si el repositorio ya existe en GitHub:
```bash
git remote add origin https://github.com/<org>/<repo>.git
git fetch origin
```

> **Alternativa Azure DevOps:**
> ```bash
> az repos create --name <project-name>
> git remote add origin https://<org>@dev.azure.com/<org>/<project>/_git/<project-name>
> ```

### 2.3 Primer push de main

```bash
git add .
git commit -m "chore: init proyecto"
git push -u origin main
```

> **Nota**: si el repo remoto ya tiene contenido y los historiales son distintos, usa la rama de trabajo directamente y crea la PR con `--allow-unrelated-histories` en el merge local (ver sección 7.6).

---

## 3. Inicialización del framework

> Ejemplo con AdonisJS 6 + React + Inertia.js. Adaptar al framework del proyecto.

### 3.1 Inicializar en directorio temporal (obligatorio si el directorio ya existe)

```bash
cd /tmp && npm init adonisjs@latest <project-name>
# Seleccionar: React app (using Inertia)
# El wizard genera APP_KEY aunque el último paso muestre exit code 1 — es normal
```

### 3.2 Copiar al directorio del proyecto

```bash
rsync -a --exclude=node_modules --exclude=.git --exclude=README.md \
  /tmp/<project-name>/ ~/<project-name>/
cd ~/<project-name> && npm install
```

### 3.3 Corregir compatibilidad con Node v22

AdonisJS usa `@poppinss/ts-exec` que falla en Node v22. Usar `tsx` en su lugar:

```bash
# En package.json, cambiar todos los scripts que dicen "node ace" por "npx tsx ace"
# Verificar:
npx tsx ace --help
```

### 3.4 Crear rama de feature

```bash
git checkout -b feature/<feature-name>
```

---

## 4. Stack de testing

### 4.1 Dependencias npm

```bash
npm install -D \
  @japa/file-system \
  @types/better-sqlite3 \
  @playwright/test \
  allure-playwright \
  @cucumber/cucumber \
  @pact-foundation/pact \
  toxiproxy-node-client \
  dependency-cruiser \
  tsx
```

### 4.2 Allure (global)

```bash
npm install -g allure-commandline
allure --version   # requiere Java instalado
```

### 4.3 Playwright apuntando a Chrome del sistema

En `playwright.config.ts`:
```typescript
use: {
  executablePath: '/usr/bin/google-chrome',
}
```

Verificar:
```bash
npx playwright test --list
```

---

## 5. Pre-Run — Documentación y contratos

Antes de escribir código de producción, estos artefactos deben existir y estar aprobados:

| Artefacto | Responsable | Ubicación |
|-----------|-------------|-----------|
| ADR del módulo (estado: Aceptado) | Arquitecto | `docs/adr/ADR-XXX-<module>.md` |
| Golden Dataset (casos canónicos) | Analista/QA | `docs/golden/` |
| Interfaces de sistemas externos | Dev | `app/modules/<module>/domain/` |
| Stubs de sistemas externos | Dev | `tests/stubs/` |
| Archivos `.feature` (Gherkin) | Analista/PO | `tests/bdd/features/` |

> **Regla**: los `.feature` los escribe el Analista/PO, no el desarrollador. Son el contrato de comportamiento.

---

## 6. Infraestructura de tests

### 6.1 Variables de entorno para tests

Crear `tests/bootstrap.ts` y `.env.test`:
```bash
# .env.test
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
TEST_MODE=architecture       # activa stubs en el IoC en lugar de clientes reales
PACT_BROKER_URL=http://localhost:9292
TOXIPROXY_URL=http://localhost:8474
```

### 6.2 IoC condicional

En `config/ioc.ts`, registrar stubs cuando `TEST_MODE=architecture` y clientes reales en producción. Los tests nunca tocan sistemas externos en la suite unit.

### 6.3 Docker Compose para infraestructura de tests

```bash
# docker-compose.test.yml incluye: Pact Broker, Toxiproxy, Postgres efímero
docker compose -f docker-compose.test.yml up -d
```

### 6.4 AFF — Fitness Functions de Arquitectura

```bash
# Crear .dependency-cruiser.cjs con las reglas del módulo
npx depcruise --config .dependency-cruiser.cjs app/modules
# Debe retornar: "no dependency violations found"
```

### 6.5 Watcher TDD local

```bash
# Arrancar en terminal separada ANTES de escribir código
bash scripts/dev-tdd.sh
```

El script corre:
- Baseline (estado verde antes de tocar nada)
- AFF watcher (detecta violaciones de arquitectura al guardar)
- Japa watcher (re-ejecuta suite unit al guardar)

> **Nota crítica — watcher**: `UNIT_FILES` debe recomputarse en cada iteración del loop, no una sola vez al arrancar. De lo contrario, los nuevos archivos `.spec.ts` no se detectan y nunca ves tests en rojo.
>
> **Nota crítica — rojo visible**: crear el archivo de implementación vacío ANTES que el spec. Si el spec importa un módulo que no existe, `ERR_MODULE_NOT_FOUND` mata el proceso silenciosamente sin mostrar `✘`.

---

## 7. Ciclo TDD — I1 a I6

Por cada historia o escenario del sprint, ejecutar este ciclo completo.

### 7.1 I1 — RED: escribir el test que falla

```bash
# 1. Crear el archivo de implementación VACÍO primero
touch app/modules/<module>/domain/<component>/<component>.ts

# 2. Crear el spec
touch tests/unit/<module>/<component>.spec.ts
# Escribir el test → el watcher lo detecta → muestra ✘
```

Verificar el watcher: el test debe fallar por assertion, no por `ERR_MODULE_NOT_FOUND`.

### 7.2 I2 — AFF Check

```bash
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts \
  --files "tests/unit/<module>/<component>.spec.ts"
# Debe mostrar ✘ (fallo esperado)

npx depcruise --config .dependency-cruiser.cjs app/modules
# Debe mostrar 0 violaciones antes de seguir
```

### 7.3 I3 — GREEN: implementación mínima

Escribir el código mínimo para pasar el test. El watcher muestra `✘ → ✔`.

```bash
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts \
  --files "$(find tests/unit -name '*.spec.ts' | tr '\n' ',' | sed 's/,$//')"
# Todos los tests deben pasar: Tests X passed
```

### 7.4 I4 — Refactor + BDD

```bash
# Refactorizar con AFF watcher activo
# Luego correr los .feature del sprint:
node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import tests/bdd/support/world.ts \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature' \
  --format summary
# Debe mostrar: N scenarios (N passed)
```

### 7.5 I5 — Pre-commit Gate

Crear `.git/hooks/pre-commit` (ejecutable) con los checks:
1. Gitleaks (si está instalado) — detecta secrets
2. dep-cruiser AFF — 0 violaciones
3. Suite unit completa — todos en verde

```bash
chmod +x .git/hooks/pre-commit
git add <archivos-del-sprint>
git commit -m "feat(<module>): <descripción>"
# El hook corre automáticamente. NUNCA usar --no-verify.
```

### 7.6 I6 — PR

**Caso normal** (el repo local tiene el mismo historial que el remoto):
```bash
git push -u origin feature/<feature-name>
gh pr create --title "feat(<module>): <descripción>" --base main
```

**Caso: historias no relacionadas** (repo local creado con `git init` independiente del remoto):
```bash
# Crear rama basada en main del remoto
git fetch origin
git checkout -b feature/<feature-name>-pr origin/main

# Fusionar nuestro trabajo (--allow-unrelated-histories resuelve el conflicto de raíces)
git merge feature/<feature-name> --allow-unrelated-histories \
  -m "feat(<module>): <descripción>"

# Resolver conflictos tomando nuestra versión:
git checkout --theirs <archivo-en-conflicto>
git add <archivo-en-conflicto>
git commit -m "feat(<module>): <descripción>"

git push -u origin feature/<feature-name>-pr
gh pr create --title "feat(<module>): <descripción>" --base main
```

> **Alternativa Azure DevOps** para crear la PR:
> ```bash
> az repos pr create \
>   --repository <repo-name> \
>   --source-branch feature/<feature-name>-pr \
>   --target-branch main \
>   --title "feat(<module>): <descripción>" \
>   --description "$(cat pr-body.md)"
> ```

### 7.7 Allure — Reporte Agregado (BDD + E2E)

Prerequisitos: `allure-cucumberjs` instalado, `allure-playwright` instalado, `allure-commandline` instalado globalmente, Java 11+ disponible.

#### Paso 1 — Configurar formatter en `cucumber.js`

```javascript
// cucumber.js
export default {
  default: {
    format: ['progress-bar', 'allure-cucumberjs/reporter'],
    // ...otros campos
  }
}
```

#### Paso 2 — Limpiar archivo bloqueante (problema conocido)

```bash
# Si existe un archivo vacío llamado "allure-results" (sin extensión):
rm -f allure-results
```

#### Paso 3 — Correr BDD y capturar resultados

```bash
node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import tests/bdd/support/world.ts \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature' \
  --format allure-cucumberjs/reporter
# NO agregar --format summary al mismo tiempo — el proceso termina antes de que los writes asíncronos completen.
# Resultado esperado: allure-results/ con N -result.json + containers + attachments
```

#### Paso 4 — Correr E2E (Extremo a extremo) Playwright

```bash
npx playwright test
# allure-playwright escribe resultados en allure-results/ automáticamente
```

#### Paso 5 — Generar y abrir reporte unificado

```bash
allure generate allure-results --clean -o allure-report
allure open allure-report
# Abre servidor local en http://localhost:<PORT>/
```

> **Alternativa Azure DevOps:** En el pipeline YAML, agregar un paso con la tarea `PublishTestResults` usando el formato Allure, o usar la extensión `Allure Azure DevOps` del marketplace para publicar el reporte como artefacto de la pipeline.

---

## 8. Pipeline CI — Nivel 1

> Estado: **pendiente** — se documenta cuando se implemente.

Trigger: PR hacia `main`.
Duración estimada: ~10 minutos.

Pasos:
1. lint + typecheck
2. Unit tests @smoke (SQLite in-memory, sin Docker)
3. AFF (dep-cruiser)
4. SonarCloud Quality Gate (cobertura ≥ 80%)

---

## 9. Pipeline CI — Nivel 2

> Estado: **pendiente** — se documenta cuando se implemente.

Trigger: release o schedule nightly.
Duración estimada: ~40 minutos.

Pasos:
1. BDD completo contra Postgres (Testcontainers)
2. Pact contract tests
3. k6 performance smoke
4. Docker image build + healthcheck
5. Tag SemVer

---

## 10. Deploy — Staging → Producción

> Estado: **pendiente** — se documenta cuando se implemente.

---

## 11. Regresión Total

> Estado: **pendiente** — se documenta cuando se implemente.

---

## Apéndice — Problemas conocidos y soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| `node ace` falla con `Unknown file extension .ts` | `@poppinss/ts-exec` incompatible con Node v22 | Usar `npx tsx ace` en todos los scripts |
| Watcher no muestra tests en rojo | `UNIT_FILES` se calcula una sola vez al arrancar | Recomputar `UNIT_FILES` en cada iteración del loop |
| `ERR_MODULE_NOT_FOUND` mata Japa sin mostrar `✘` | El spec importa un módulo que no existe aún | Crear el archivo de implementación vacío ANTES que el spec |
| `chokidar-cli` segfault inmediato | Incompatibilidad con la versión de Node/libc | Reemplazar con loop `while true; do sleep 2; done` |
| `depcruise --watch` desconocido | dep-cruiser v18 no soporta `--watch` | Reemplazar con loop de polling usando `find ... -newer /tmp/.tdd-marker` |
| `gh pr create` falla con "no history in common" | Repo local creado con `git init` independiente del remoto | Crear rama desde `origin/main` y fusionar con `--allow-unrelated-histories` |
| `gh auth login` interactivo no funciona en terminal no-TTY | El menú de flechas requiere TTY | Usar `gh auth login --web` en terminal del sistema |
| Vite dep-scan errors inundan la salida del watcher | Vite escanea dependencias al arrancar | Redirigir stderr: `2>/dev/null` en el comando del watcher |
| `k6` falla al instalar via `apt` | `gpg --keyserver` bloqueado en redes corporativas | Usar `sudo snap install k6` |
| `allure-cucumberjs` no genera archivos en `allure-results/` | Existe un archivo (no directorio) llamado `allure-results` que bloquea el `mkdirSync` | `rm allure-results` antes de correr cucumber |
| `allure-cucumberjs` genera 0 archivos aunque el run fue exitoso | Se usó `--format summary` junto con `--format allure-cucumberjs/reporter` — el proceso termina antes que los writes asíncronos | Nunca combinar `--format summary` con `allure-cucumberjs/reporter` en el mismo comando |
