# PEC RBAC Pilot

Repositorio piloto para validar la metodología Dual-Axis CI/CD con el módulo RBAC (Control de Acceso Basado en Roles) como caso de prueba.

## Documentación viva

| Artefacto                                              | Propósito                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| [docs/piloto-rbac-log.html](docs/piloto-rbac-log.html) | Bitácora de seguimiento — estado de cada tarea, progreso, notas             |
| [docs/MANUAL-CICD.md](docs/MANUAL-CICD.md)             | Manual técnico reproducible — camino feliz genérico para cualquier proyecto |
| [docs/adr/](docs/adr/)                                 | ADRs (Architecture Decision Records) del módulo                             |
| [docs/golden/](docs/golden/)                           | Golden Dataset — casos canónicos de prueba                                  |

## Comandos frecuentes

```bash
# Visor TDD local (arrancar antes de escribir código)
bash scripts/dev-tdd.sh

# Tests unitarios
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts \
  --files "$(find tests/unit -name '*.spec.ts' | tr '\n' ',' | sed 's/,$//')"

# BDD (Desarrollo Guiado por Comportamiento)
node --import tsx/esm ./node_modules/.bin/cucumber-js \
  --import tests/bdd/support/world.ts \
  --import 'tests/bdd/steps/**/*.ts' \
  'tests/bdd/features/**/*.feature' --format summary

# AFF (Fitness Functions de Arquitectura)
npx depcruise --config .dependency-cruiser.cjs app/modules

# Performance k6
K6_WEB_DASHBOARD=true k6 run tests/performance/k6-load.js

# E2E (Extremo a extremo) Playwright
npx playwright test
```

---

## Estándares de trabajo — reglas aplicadas en este proyecto

### Comportamiento del agente

- Respuestas cortas. No ejecutar acciones hasta que el usuario lo indique.
- Antes de iniciar una fase nueva, listar las tareas y esperar confirmación.
- No marcar tareas como done sin haber validado el resultado real.

### Acrónimos

Siempre escribir el significado entre paréntesis, sin excepciones:

| Acrónimo | Significado                          |
| -------- | ------------------------------------ |
| IAM      | Gestión de Identidad y Acceso        |
| RBAC     | Control de Acceso Basado en Roles    |
| AFF      | Fitness Functions de Arquitectura    |
| BDD      | Desarrollo Guiado por Comportamiento |
| TDD      | Desarrollo Guiado por Tests          |
| E2E      | Pruebas de extremo a extremo         |
| NFR      | Requerimientos No Funcionales        |
| CI       | Integración Continua                 |
| CD       | Entrega Continua                     |
| ADR      | Architecture Decision Record         |

### Descripción de tests

Los enunciados de tests deben estar en lenguaje de negocio, no técnico:

❌ `no-circular-rbac`
✅ `Ningún módulo RBAC (Control de Acceso Basado en Roles) tiene dependencias circulares entre sí`

❌ `analista-rm-norte tiene capacidades de analista y orgUnit correcto`
✅ `El analista de RM-Norte obtiene los permisos de su rol (otorgar, denegar y consultar prestaciones) y su unidad organizacional queda registrada como "RM-Norte"`

Cuando un test se repite N veces con el mismo escenario:

- Decir explícitamente cuántas veces se repitió
- Exponer la variabilidad observada (mín, promedio, mediana, máx, p90, p95)
- Si no hay variabilidad, decirlo: "sin variabilidad — todas respondieron igual"

❌ `GET / responde con código 200 en todas las iteraciones (30/30)`
✅ `El servidor respondió HTTP 200 en las 30 repeticiones — sin variabilidad: ninguna falló ni retornó código distinto`

### Documentación dual

Después de cada fase, actualizar ambos artefactos:

- **HTML** → seguimiento del proyecto específico, nombres reales, notas del proceso real
- **MANUAL-CICD.md** → camino feliz genérico con `<placeholders>`, reproducible en cualquier máquina, incluye alternativa Azure DevOps en cada paso CI/CD

### Visores y observabilidad

Antes de iniciar cada fase, levantar el visor correspondiente como paso `t0`:

| Fase           | Visor                                                  |
| -------------- | ------------------------------------------------------ |
| Ciclo TDD      | `bash scripts/dev-tdd.sh`                              |
| k6 Performance | Servidor corriendo + dashboard `http://localhost:5665` |
| CI             | `gh run watch`                                         |
| Allure         | `allure open`                                          |

### Alternativa Azure DevOps

En toda fase CI/CD documentar siempre el equivalente en Azure DevOps (pipelines, PR, deploy) como bloque alternativo después del procedimiento GitHub. El piloto usa GitHub Actions; el deploy real será en Azure DevOps.

### Workflows del scaffold — eliminar antes de crear el pipeline CI

Los frameworks como AdonisJS generan workflows de CI automáticamente (ej: `playwright.yml`). Estos workflows:
- No tienen variables de entorno configuradas para CI
- Fallan en el primer push y envían notificaciones de error al correo
- Contaminan el PR con checks fallidos que no se pueden sobreescribir

**Regla:** al iniciar p7, lo primero es **eliminar todos los workflows del scaffold** del directorio `.github/workflows/`. Recrear solo los que corresponden al pipeline diseñado para el proyecto.

❌ Deshabilitar con `workflow_dispatch` — el PR sigue mostrando el último run fallido
✅ Eliminar el archivo — el check desaparece del PR en el siguiente push

### AdonisJS + Inertia — ruta `/health` obligatoria en CI (Integración Continua)

La ruta raíz `GET /` usa Inertia, que requiere el manifiesto de Vite (frontend compilado). En CI sin build de frontend, el servidor arranca pero responde 500 en todas las peticiones. `wait-on` y k6 fallan en silencio.

**Regla:** todo proyecto AdonisJS + Inertia debe tener una ruta `/health` que devuelva JSON puro desde el primer día.

```ts
// start/routes.ts
router.get('/health', ({ response }) => response.json({ status: 'ok' }))
```

En los workflows de CI, apuntar `wait-on` y los smoke tests de k6 a `/health`, nunca a `/`.

### Servidores en background en CI — usar `nohup`

En GitHub Actions (Acciones de GitHub), cada bloque `run:` corre en un shell separado. Los procesos lanzados con `&` reciben SIGHUP (señal de cierre de terminal) cuando ese shell termina. El proceso muere silenciosamente: el paso siguiente encuentra el puerto vacío.

**Regla:** todo servidor que deba sobrevivir entre pasos de CI debe arrancarse con `nohup`:

```bash
nohup npx tsx bin/server.ts > /tmp/server.log 2>&1 &
echo $! > /tmp/server.pid
npx wait-on http://localhost:3333/health --timeout 60000
```

Imprimir `/tmp/server.log` en el paso de cleanup para facilitar debugging:
```bash
kill $(cat /tmp/server.pid) 2>/dev/null || true
cat /tmp/server.log | tail -20 || true
```

### AdonisJS + Inertia — `tsconfig.json` raíz debe usar `react-jsx`

El scaffold de AdonisJS + Inertia genera páginas React con el nuevo transform (React 17+) que NO requieren `import React from 'react'` en cada archivo. Si el `tsconfig.json` raíz tiene `"jsx": "react"` (transform antiguo), `tsx ace build` falla durante el Docker build.

**Regla:** usar `"jsx": "react-jsx"` en el `tsconfig.json` raíz desde el inicio. El backend no tiene archivos `.tsx`, así que el cambio no tiene costo.

```json
// tsconfig.json
"compilerOptions": {
  "jsx": "react-jsx"
}
```

### AdonisJS + Inertia — anotar `errors` en el scaffold de autenticación

El scaffold genera páginas `login.tsx` y `signup.tsx` donde el render prop de `Form` desestructura `errors` sin tipo explícito. Con `strict: true` o `noImplicitAny`, TypeScript lanza TS7031 durante el Docker build.

**Regla:** al recibir el scaffold, anotar inmediatamente los archivos `inertia/pages/auth/login.tsx` y `inertia/pages/auth/signup.tsx`:

```tsx
{({ errors }: { errors: Record<string, string> }) => (
  // ...
)}
```

`Record<string, string>` es el tipo estándar de errores de validación en AdonisJS/Inertia.

### GHCR (GitHub Container Registry) — nombres de imagen deben ser lowercase

`${{ github.repository_owner }}` retorna el nombre del usuario/org con la capitalización original (ej: `JoseGomezLeon`). Docker requiere que todos los componentes del nombre de imagen sean minúsculas. El push falla con `invalid reference format: repository name must be lowercase`.

**Regla:** siempre convertir el owner a minúsculas antes de usarlo en una URL de imagen Docker:

```bash
OWNER=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
IMAGE="ghcr.io/${OWNER}/mi-imagen:tag"
```

Aplica a cualquier acción de push a GHCR, ECR, o cualquier registry que exponga el nombre del repo en la URL.

---

### AdonisJS + Inertia — Dockerfile: `public/` no existe en clone limpio

`tsx ace build` coloca los assets del frontend (JS, CSS compilados por Vite) en `build/public/`, no en `public/`. La carpeta `public/` raíz solo existe para archivos estáticos manuales (favicon, etc.). En un clone limpio sin esos archivos, el directorio no existe y el Docker build multi-stage falla al intentar copiarlo.

**Regla:** añadir `&& mkdir -p public` al step de build en el Dockerfile:

```dockerfile
RUN npm run build && mkdir -p public
```
