# ADR-001: Piloto RBAC para PEC

Estado: Aceptada (condición satisfecha por ADR-011)

## Contexto

Se requiere una prueba de extremo a extremo del proceso de implementacion de PEC con un modulo pequeno y acotado. El objetivo del piloto es validar la forma de trabajar, no el alcance funcional final.

## Problema

Todavia no existe un ADR de negocio para RBAC. Sin esa definicion no corresponde construir reglas, casos ni automatizacion de dominio.

**Resolución (2026-07-08):** ADR-011-rbac-dominio-negocio.md constituye ese ADR formal. Satisface las tres condiciones: define sistemas externos y stubs, matriz de capacidades y reglas de negocio, y reglas AFF. El circuito de implementación puede avanzar.

## Decision provisional

1. Crear un repositorio limpio para el piloto.
2. Mantener separado el ambiente de trabajo de cualquier repo que ya tenga tests o logica previa.
3. No iniciar implementacion funcional ni generacion de tests de negocio hasta contar con el ADR formal.

## Consecuencias

- Se evita arrastrar supuestos del sistema anterior.
- El piloto arranca con una base controlada y auditable.
- La siguiente etapa depende de la aprobacion del ADR.
