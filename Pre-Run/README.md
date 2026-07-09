# Pre-Run — Metodología Dual-Axis

## Qué es este paquete

Un kit de arranque para ejecutar la etapa **Pre-Run** de la metodología **Dual-Axis** en cualquier proyecto de software, con cualquier agente IA.

No contiene código del proyecto. Contiene el proceso, las reglas, y los patrones que el agente necesita para construir la infraestructura de testing y los contratos de dominio antes de escribir una línea de código de producción.

---

## Contenido

```
Pre-Run/
├── README.md                   ← este documento
├── AGENT-PROMPT.md             ← prompt listo para pegar al agente IA
├── CHECKLIST.md                ← tareas en orden con comandos de verificación
├── CLAUDE.md                   ← receta del agente (copiar a raíz del proyecto)
└── dominio/
    └── ADR-SINTESIS-TEMPLATE.md ← plantilla del ADR de dominio (rellenar antes de ejecutar)
```

---

## Cómo usar este paquete en un proyecto nuevo

### Paso 1 — Rellenar la plantilla de dominio

Antes de darle nada al agente, completa `dominio/ADR-SINTESIS-TEMPLATE.md` con la información de tu módulo:
- Qué sistemas externos consume
- Qué roles de negocio existen
- Qué puede hacer cada rol (capacidades)
- Qué reglas de negocio son críticas
- Qué límites arquitectónicos debe respetar el código

Este documento es la única entrada de dominio que el agente necesita. Todo lo que construya Pre-Run deriva de él.

### Paso 2 — Copiar los archivos al proyecto

```
CLAUDE.md           → raíz del proyecto nuevo
dominio/ADR-*.md    → docs/adr/ del proyecto nuevo
```

`CLAUDE.md` en la raíz del proyecto hace que Claude Code lo cargue automáticamente en cada sesión. Si usas otro agente, pégalo como contexto inicial.

### Paso 3 — Dar el prompt al agente

Abre el proyecto con tu agente IA y pega el contenido de `AGENT-PROMPT.md`.

---

## La metodología Dual-Axis

```
PRE-RUN  →  PARALELO (TDD)  →  PIPELINE CI/CD  →  REGRESIÓN TOTAL
```

Cada etapa tiene una sola condición de salida. Pre-Run termina cuando todos los tests pasan en verde sin haber escrito una línea de código de producción.

---

## Qué construye Pre-Run

### Fase pdoc — Contratos de dominio

| Tarea | Entregable |
|---|---|
| pdoct1 | ADR síntesis: sistemas externos, roles, capacidades, reglas de negocio, límites de arquitectura |
| pdoct2 | Golden Dataset: casos canónicos de prueba por categoría |
| pdoct3 | Interfaces TypeScript de sistemas externos + stubs deterministas + tipos de dominio + IoC |
| pdoct4 | Feature files Gherkin: 1 por área de negocio, tags `@smoke` y `@<modulo>` |

### Fase p2 — Infraestructura de tests

| Entregable | Para qué sirve |
|---|---|
| `.env.test` | Variables de entorno para tests, incluyendo `TEST_MODE=architecture` |
| `config/ioc.ts` | Inyección de dependencias: stubs en test, implementación real en producción |
| `docker-compose.test.yml` | Servicios para integración: Pact Broker, Toxiproxy, base de datos |
| `.dependency-cruiser.cjs` | Reglas AFF: impide que el código viole los límites de arquitectura |
| `scripts/dev-tdd.sh` | Watcher dual: AFF + tests unitarios en paralelo durante el ciclo TDD |
| Primer test unitario | Verifica la matriz de capacidades del dominio, verde sin código de producción |

### Fase p3 — Test E2E

| Entregable | Para qué sirve |
|---|---|
| `playwright.config.ts` | Configura Playwright con arranque automático del servidor |
| Primer test E2E | Verifica que el servidor levanta y sirve contenido (smoke) |
| Reporte HTML | Evidencia de que el test pasó |

### Fase p4 — Suite BDD

| Entregable | Para qué sirve |
|---|---|
| `tests/bdd/support/world.ts` | World de Cucumber: stubs, clasificación de sujetos, verificación de capacidades |
| `tests/bdd/steps/*.ts` | Step definitions conectadas al dominio vía IoC, sin HTTP |
| Testcontainers configurado | Base de datos efímera lista para suites de integración futuras |
| Suite BDD verde | Todos los escenarios del dominio pasan con stubs |

### Estado al terminar Pre-Run

```
✓ ADR síntesis aceptado
✓ Interfaces y stubs de dominio
✓ Matriz de capacidades verificada con tests unitarios
✓ 0 violaciones de arquitectura (AFF)
✓ Feature files Gherkin por área de negocio
✓ Test E2E verde
✓ Suite BDD completa verde
✗ Código de producción: ninguno todavía
```

---

## Qué NO hace Pre-Run

Pre-Run NO implementa la lógica real del dominio. Lo que sigue es el ciclo **Paralelo TDD**:

- El primer test RED (invoca un servicio que no existe)
- La implementación mínima para que el test pase (GREEN)
- El refactor con AFF watcher activo
- El escenario BDD del sprint corriendo verde
- El pre-commit gate (AFF + tests + Gitleaks)
- La PR con evidencia

Ese ciclo repite por cada historia del sprint, con la red de seguridad que Pre-Run dejó lista.

---

## Prerrequisitos en el PC destino

El agente no instala el entorno base. Antes de ejecutar Pre-Run, el PC debe tener:

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| Node.js | v20+ (recomendado v22) | Runtime principal |
| Docker | cualquiera reciente | Testcontainers, docker-compose |
| npm | viene con Node | Gestión de dependencias |
| Chrome / Chromium | cualquiera | Tests E2E headless |
| Git | cualquiera | Control de versiones |

El proyecto debe estar scaffoldeado con las dependencias base instaladas antes de iniciar Pre-Run.
