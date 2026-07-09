# PEC RBAC Pilot

Repositorio de trabajo para construir un piloto limpio de RBAC en PEC, partiendo desde cero y con trazabilidad completa del proceso.

## Contexto

- Ruta del repo: `/home/jagomezl/pec-rbac-pilot`
- Rama activa: `feature/rbac-pilot`
- Objetivo: construir el piloto RBAC con documentación viva, bitacora operativa y pasos reproducibles.

## Estado actual

- Repo limpio creado.
- Estructura base creada.
- Bitacora viva creada en HTML y respaldo en Markdown.
- ADR-010 movido al repo.
- ADR-001 de piloto existe como borrador.
- Google Chrome estable instalado en Ubuntu por `apt`.
- Rama `feature/rbac-pilot` creada.

## Documentacion viva

- Bitacora HTML: [docs/piloto-rbac-log.html](/home/jagomezl/pec-rbac-pilot/docs/piloto-rbac-log.html)
- Bitacora MD: [docs/piloto-rbac-log.md](/home/jagomezl/pec-rbac-pilot/docs/piloto-rbac-log.md)
- ADR base: [docs/adr/ADR-010-monolito-modular-adonis-inertia.md](/home/jagomezl/pec-rbac-pilot/docs/adr/ADR-010-monolito-modular-adonis-inertia.md)
- ADR piloto: [docs/adr/ADR-001-rbac-piloto.md](/home/jagomezl/pec-rbac-pilot/docs/adr/ADR-001-rbac-piloto.md)
- Contrato de trabajo: [docs/rbac-pilot-contract.md](/home/jagomezl/pec-rbac-pilot/docs/rbac-pilot-contract.md)

## Estructura base

- `src/domain/rbac/`
- `src/application/rbac/`
- `src/infrastructure/rbac/`
- `tests/unit/rbac/`
- `tests/integration/rbac/`
- `tests/contract/rbac/`
- `tests/e2e/rbac/`
- `tests/performance/rbac/`
- `tests/property/rbac/`

## Reglas

- El flujo parte desde cero, con instalacion limpia.
- No existen etapas previas visibles como seguimiento o arranque limpio.
- La bitacora arranca en `Ambiente y Prerequisitos`.
- No implementar reglas de negocio ni tests de dominio sin ADR funcional aprobado.
- La bitacora viva es la fuente principal; el Markdown es respaldo.
- Todo lo nuevo debe quedar documentado antes o junto con la implementacion.

## Pendientes inmediatos

- Validar `Ambiente y Prerequisitos`.
- Ajustar Playwright para usar `google-chrome` local.
- Leer el ADR y extraer decisiones, invariantes, restricciones y escenarios negativos.
- Construir la primera matriz de pruebas.
- Empezar implementacion real del modulo RBAC.
