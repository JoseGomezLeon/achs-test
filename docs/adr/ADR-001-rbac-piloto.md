# ADR-001: Piloto RBAC para PEC

Estado: borrador

## Contexto

Se requiere una prueba de extremo a extremo del proceso de implementacion de PEC con un modulo pequeno y acotado. El objetivo del piloto es validar la forma de trabajar, no el alcance funcional final.

## Problema

Todavia no existe un ADR de negocio para RBAC. Sin esa definicion no corresponde construir reglas, casos ni automatizacion de dominio.

## Decision provisional

1. Crear un repositorio limpio para el piloto.
2. Mantener separado el ambiente de trabajo de cualquier repo que ya tenga tests o logica previa.
3. No iniciar implementacion funcional ni generacion de tests de negocio hasta contar con el ADR formal.

## Consecuencias

- Se evita arrastrar supuestos del sistema anterior.
- El piloto arranca con una base controlada y auditable.
- La siguiente etapa depende de la aprobacion del ADR.
