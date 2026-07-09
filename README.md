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
