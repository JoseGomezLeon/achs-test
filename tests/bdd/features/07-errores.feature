# ADR-011 §3.5 — Contratos de error estables
# Tres códigos de error con HTTP semántico fijo (no cambian entre versiones)
# unauthenticated → 401; access_denied → 403; relation_violation → 403

Feature: Contratos de error del motor RBAC
  Como consumidor de la API RBAC
  Quiero que los errores tengan códigos estables y HTTP semántico fijo
  Para que los clientes puedan manejarlos sin inspeccionar mensajes libres

  Background:
    Given el sistema opera en modo TEST_MODE=architecture

  # ── unauthenticated (401) ───────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Token inválido produce código unauthenticated con HTTP 401
    Given un token "unknown"
    When el sistema autentica el token
    Then el resultado es un error con código "unauthenticated"
    And el código HTTP asociado es 401

  @rbac
  Scenario: Token expirado produce código unauthenticated con HTTP 401
    Given un token con campo exp en el pasado
    When el sistema autentica el token
    Then el resultado es un error con código "unauthenticated"
    And el código HTTP asociado es 401

  # ── access_denied (403) ─────────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Capacidad no otorgada produce código access_denied con HTTP 403
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el resultado es un error con código "access_denied"
    And el código HTTP asociado es 403

  @rbac
  Scenario: access_denied no revela si la capacidad existe
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "liquidacion:ejecutar-cierre"
    Then el resultado es un error con código "access_denied"
    And el mensaje de error no contiene detalles de la capacidad interna

  # ── relation_violation (403) ────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Acceso a recurso fuera de orgUnit produce relation_violation con HTTP 403
    Given un sujeto autenticado con token "analista-rm-norte"
    And existe el caso "caso-rm-sur" con orgUnit "RM-Sur"
    When intenta ejecutar "prestacion:otorgar" sobre el caso "caso-rm-sur"
    Then el resultado es un error con código "relation_violation"
    And el código HTTP asociado es 403

  @rbac
  Scenario: relation_violation sólo aplica cuando la capacidad base está concedida
    Given un sujeto autenticado con token "analista-rm-norte"
    And existe el caso "caso-rm-sur" con orgUnit "RM-Sur"
    When intenta ejecutar "auditoria:leer" sobre el caso "caso-rm-sur"
    Then el resultado es un error con código "access_denied"
    And el código HTTP asociado es 403

  # ── Auditoría de errores ────────────────────────────────────────────────────

  @rbac
  Scenario: Todo error de acceso queda registrado en auditoría
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el resultado es un error con código "access_denied"
    And queda registro de auditoría con outcome "denied"
    And el registro incluye el campo "denialReason"

  @rbac
  Scenario: Error de autenticación no genera entrada de auditoría de capacidad
    Given un token "unknown"
    When el sistema autentica el token
    Then el resultado es un error con código "unauthenticated"
    And no se genera registro de auditoría de capacidad
