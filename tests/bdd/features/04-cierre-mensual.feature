# ADR-011 §3.2 — Cierre mensual con doble firma (ADR-007)
# Flujo canónico: solicitar → aprobar → ejecutar
# Regla crítica: ninguna persona puede ejecutar las tres acciones sola

Feature: Cierre mensual con doble firma
  Como sistema de control de liquidaciones
  Quiero que el cierre mensual requiera dos actores distintos más un job autorizado
  Para que ninguna persona pueda cerrar el período sin supervisión

  Background:
    Given el sistema opera en modo TEST_MODE=architecture
    And existe el período de cierre "2026-06"

  # ── Flujo completo ──────────────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Flujo completo de cierre mensual con doble firma
    Given el operador de pagos ha solicitado el cierre del período "2026-06"
    And el supervisor ha aprobado la solicitud de cierre
    When el job "job-pdn-pag-001" intenta ejecutar el cierre del período "2026-06"
    Then el cierre es ejecutado exitosamente
    And queda registro de auditoría con actorKind "agent"

  # ── Separación de funciones ─────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Operador no puede aprobar su propia solicitud de cierre
    Given el operador de pagos ha solicitado el cierre del período "2026-06"
    When el mismo operador de pagos intenta aprobar la solicitud
    Then el acceso es denegado con código "access_denied"

  @smoke @rbac
  Scenario: Supervisor no puede ejecutar el cierre final
    Given el operador de pagos ha solicitado el cierre del período "2026-06"
    And el supervisor ha aprobado la solicitud de cierre
    When el supervisor intenta ejecutar el cierre directamente
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Analista no puede solicitar cierre mensual
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "liquidacion:solicitar-cierre"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Auditor no puede solicitar ni aprobar cierre
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "liquidacion:solicitar-cierre"
    Then el acceso es denegado con código "access_denied"

  # ── Precondiciones del job ──────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Job no puede ejecutar cierre sin aprobación vigente
    Given no existe aprobación vigente para el período "2026-06"
    When el job "job-pdn-pag-001" intenta ejecutar el cierre del período "2026-06"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Job no puede ejecutar cierre si sólo existe solicitud sin aprobar
    Given el operador de pagos ha solicitado el cierre del período "2026-06"
    But la solicitud no ha sido aprobada por un supervisor
    When el job "job-pdn-pag-001" intenta ejecutar el cierre del período "2026-06"
    Then el acceso es denegado con código "access_denied"

  # ── Capacidades individuales ────────────────────────────────────────────────

  @rbac
  Scenario: Operador tiene la capacidad de solicitar cierre
    Given un sujeto autenticado con token "operador-pagos"
    When intenta ejecutar la capacidad "liquidacion:solicitar-cierre"
    Then el acceso es concedido

  @rbac
  Scenario: Supervisor tiene la capacidad de aprobar cierre
    Given un sujeto autenticado con token "supervisor-full"
    When intenta ejecutar la capacidad "liquidacion:aprobar-cierre"
    Then el acceso es concedido

  @rbac
  Scenario: Job PDN-PAG-001 tiene la capacidad de ejecutar cierre
    Given un sujeto autenticado con token "job-pdn-pag-001"
    When intenta ejecutar la capacidad "liquidacion:ejecutar-cierre"
    Then el acceso es concedido
