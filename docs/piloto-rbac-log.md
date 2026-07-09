# Bitacora Viva Piloto RBAC

Repositorio: `pec-rbac-pilot`

Objetivo: dejar trazabilidad completa del piloto RBAC para que cualquier lectura muestre de inmediato la etapa actual, el siguiente paso y los bloqueos.

Version viva interactiva:

- [piloto-rbac-log.html](/home/jagomezl/pec-rbac-pilot/docs/piloto-rbac-log.html)

## Resumen Ejecutivo

- Estado actual: instalacion base y ambiente aun por validar.
- Etapa activa: `Ambiente y Prerequisitos`.
- Bloqueo principal: ADR funcional de RBAC todavia pendiente de definicion de negocio.
- Regla de trabajo: no implementar ni automatizar tests de dominio sin ADR aprobado.

## Leyenda

- `Hecho`: tarea completada y documentada.
- `En curso`: tarea abierta, con trabajo activo o parcialmente resuelto.
- `Pendiente`: tarea no iniciada.
- `Bloqueado`: no puede avanzar por falta de definicion o dependencia externa.
- `No aplica aun`: existe en el proceso, pero todavia no corresponde ejecutarla.

## Mapa del Proceso

| # | Etapa | Estado | Lectura rapida |
|---|---|---|---|
| 1 | Ambiente y Prerequisitos | Pendiente | Falta validar runtime, Docker y herramientas base. |
| 2 | Instalacion del Stack | Pendiente | Falta instalar/confirmar el stack de pruebas completo. |
| 3 | Japa + SQLite - Nivel 1 | No aplica aun | Requiere base tecnica lista y decision de ADR. |
| 4 | Playwright - E2E Inertia.js | En curso | Chrome estable ya quedo instalado; falta conectar Playwright al binario local. |
| 5 | Cucumber + Testcontainers - Nivel 2 BDD | No aplica aun | Requiere ADR y definicion funcional. |
| 6 | k6 - Performance | No aplica aun | Depende de endpoints y escenarios medibles. |
| 7 | Allure - Reporting Agregado | Pendiente | Se activa cuando existan ejecuciones reales. |
| 8 | Pipeline CI - Nivel 1 | Pendiente | Se arma cuando haya base tecnica estable. |
| 9 | Pipeline CI - Nivel 2 | Pendiente | Queda para el circuito completo del piloto. |
| 10 | Observabilidad en Vivo | Pendiente | Se activa cuando haya jobs y ejecuciones reales. |

## Etapas y Tareas

### 1. Ambiente y Prerequisitos

| Estado | Tarea | Nota |
|---|---|---|
| Hecho | Node.js 20+ instalado | Verificado: v22.22.1 |
| Hecho | Docker Engine corriendo | Verificado: docker ps responde sin error. |
| Hecho | Git configurado en el proyecto | Verificado: rama feature/rbac-pilot activa. |
| Pendiente | Inicializar AdonisJS 6 en pec-rbac-pilot | Eliminar src/ (placeholder vacío) y ejecutar `npm init adonisjs@latest .` |
| Pendiente | `gh` CLI instalado | No instalado aún. Útil para observar pipelines desde terminal. |

### 2. Instalacion del Stack

| Estado | Tarea | Nota |
|---|---|---|
| Pendiente | Ejecutar script de instalacion desde la raiz del proyecto | `bash install-test-stack.sh`. |
| Pendiente | `@japa/file-system` instalado | Parte del stack base de tests. |
| Pendiente | `@types/better-sqlite3` instalado | Para pruebas con SQLite in-memory. |
| Hecho | Google Chrome estable instalado en Ubuntu para pruebas E2E | La ruta que funciono fue por `apt`, no por `snap`. |
| Hecho | Verificar que el navegador responde | `google-chrome --version`. |
| Pendiente | `@playwright/test` disponible en el repo | Falta validar con `npm install` en el proyecto del piloto. |
| Pendiente | `@cucumber/cucumber` instalado | Requerido para BDD. |
| Pendiente | `@pact-foundation/pact` instalado | Requerido para contratos. |
| Pendiente | `allure-commandline` instalado globalmente | Para reporte agregado. |
| Pendiente | `k6` instalado | Para performance. |
| Pendiente | `toxiproxy-node-client` instalado | Para fallas de red simuladas. |
| Pendiente | `dependency-cruiser` instalado | Para boundaries y dependencias. |

### 3. Japa + SQLite - Nivel 1

| Estado | Tarea | Nota |
|---|---|---|
| No aplica aun | Crear `tests/bootstrap.ts` con configuracion base de Japa | Se activa cuando la base tecnica del piloto quede cerrada. |
| No aplica aun | Configurar `.env.test` apuntando a SQLite in-memory | `DB_CONNECTION=sqlite` y `DB_DATABASE=:memory:`. |
| No aplica aun | Definir suites en `bin/test.ts` | Principal, async y compliance. |
| No aplica aun | Escribir primer test unitario en `tests/unit/ind.spec.ts` | Primer caso del dominio RBAC. |
| No aplica aun | Agregar tag `@smoke` al primer test | Para ejecucion rapida. |
| No aplica aun | Suite principal corre verde | Depende de implementacion real. |
| No aplica aun | Smoke-only corre verde en menos de 30 segundos | Depende de alcance minimo cerrado. |

### 4. Playwright - E2E Inertia.js

| Estado | Tarea | Nota |
|---|---|---|
| Pendiente | Crear `playwright.config.ts` con `baseURL` del servidor AdonisJS | Playwright usa navegacion server-side con Inertia.js. |
| Pendiente | Agregar script `test:e2e` en `package.json` | `"test:e2e": "playwright test"`. |
| No aplica aun | Escribir primer test E2E: carga de pagina y verificacion de componente React | Requiere UI funcional. |
| En curso | Test E2E corriendo contra Chrome estable local | Ya se instalo `google-chrome`; falta ajustar config para usarlo explicitamente. |
| No aplica aun | Reporte HTML generado y visible | Se activa cuando haya ejecuciones reales. |

### 5. Cucumber + Testcontainers - Nivel 2 BDD

| Estado | Tarea | Nota |
|---|---|---|
| No aplica aun | Crear estructura `tests/bdd/features/` y `tests/bdd/steps/` | Requiere casos de negocio definidos. |
| No aplica aun | Configurar `cucumber.js` | World, formatter y paths. |
| No aplica aun | Configurar Testcontainers con `postgres:16-alpine` | Contenedor efímero por ejecucion. |
| No aplica aun | Escribir primer `.feature` con escenario IND basico | Given/When/Then. |
| No aplica aun | Step definitions conectadas al dominio sin HTTP directo | IoC y servicios de aplicacion. |
| No aplica aun | BDD corre verde con Postgres efimero | Bloqueado por definicion funcional. |

### 6. k6 - Performance

| Estado | Tarea | Nota |
|---|---|---|
| No aplica aun | Crear `tests/performance/k6-load.js` | Smoke de 1 VU y 30 segundos. |
| No aplica aun | Servidor AdonisJS levantado en modo test | Necesario para medir. |
| No aplica aun | Ejecutar con dashboard web activado | `K6_WEB_DASHBOARD=true k6 run ...`. |
| No aplica aun | Dashboard visible en `http://localhost:5665` | RPS, latencia p95, VUs. |

### 7. Allure - Reporting Agregado

| Estado | Tarea | Nota |
|---|---|---|
| Pendiente | Configurar `allure-cucumberjs` formatter en `cucumber.js` | Unificacion de resultados. |
| Pendiente | Configurar `allure-playwright` reporter en `playwright.config.ts` | Reporte comun. |
| Pendiente | Ejecutar ambas suites para poblar `allure-results/` | Requiere ejecuciones reales. |
| Pendiente | Generar y abrir reporte unificado | `allure generate ... && allure open`. |

### 8. Pipeline CI - Nivel 1

| Estado | Tarea | Nota |
|---|---|---|
| Pendiente | Crear `.github/workflows/nivel1-pr.yml` | Pipeline de PR. |
| Pendiente | Paso lint + typecheck configurado | `npm run lint && npm run typecheck`. |
| Pendiente | Paso unit SQLite + `@smoke` configurado | Sin Docker. |
| Pendiente | SonarCloud configurado en el workflow | Calidad y cobertura. |
| Pendiente | `SONAR_TOKEN` agregado en GitHub Secrets | Y `sonar-project.properties` en la raiz. |
| Pendiente | Push de prueba y pipeline Nivel 1 verde | Se observa con `gh run watch`. |

### 9. Pipeline CI - Nivel 2

| Estado | Tarea | Nota |
|---|---|---|
| Pendiente | Crear `.github/workflows/nivel2-release.yml` | Trigger release o nightly. |
| Pendiente | Verificar que `ubuntu-latest` tiene Docker | Para Testcontainers. |
| Pendiente | Paso Postgres full + BDD configurado | Cobertura funcional amplia. |
| Pendiente | Paso k6 performance configurado | Rendimiento. |
| Pendiente | Paso Pact contract testing configurado | Contratos entre modulos/consumidores. |
| Pendiente | Pipeline Nivel 2 completa verde | Objetivo de release/nightly. |

### 10. Observabilidad en Vivo

| Estado | Tarea | Nota |
|---|---|---|
| Pendiente | `gh run watch` sigue el pipeline desde terminal | Monitoreo en vivo. |
| Pendiente | Dashboard k6 activo durante performance | Observabilidad de carga. |
| Pendiente | Playwright Trace Viewer disponible para fallos E2E | `npx playwright show-trace trace.zip`. |
| Pendiente | Allure acumula historico de ejecuciones | Tendencias visibles. |

## Registro de decisiones

| Fecha | Decision | Motivo | Impacto |
|---|---|---|---|
| 2026-07-08 | Crear un repo nuevo y limpio para el piloto | Evitar arrastrar tests y supuestos previos | Base reproducible para automatizacion futura |
| 2026-07-08 | Documentar el proceso en checklist y bitacora | Dejar trazabilidad paso a paso | Facilita convertir el flujo en manual y luego en script |
| 2026-07-08 | Instalar Google Chrome estable por `apt` | Evitar el bloqueo de `snap` en esta red | Playwright puede apuntar a un browser local |

## Ultima Actualizacion

- Fecha: 2026-07-08
- Fase mas reciente con avance real: instalacion de Chrome estable y verificacion del navegador
- Fase siguiente a ejecutar: `Ambiente y Prerequisitos`
