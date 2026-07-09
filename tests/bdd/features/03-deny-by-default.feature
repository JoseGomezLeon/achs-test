# ADR-011 §3.1 — Deny-by-default
# Regla: CapabilitySet vacío → ninguna acción permitida.
# No hay capacidades heredadas ni implícitas.

Feature: Deny-by-default
  Como motor de autorización RBAC
  Quiero que la ausencia de una capacidad sea siempre una denegación
  Para que ningún sujeto tenga acceso por omisión o herencia implícita

  Background:
    Given el sistema opera en modo TEST_MODE=architecture

  @smoke @rbac
  Scenario: Sujeto sin capacidades no puede ejecutar ninguna acción
    Given un sujeto con CapabilitySet vacío
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es denegado con código "access_denied"

  @smoke @rbac
  Scenario: Capacidad no asignada al rol es denegada aunque el rol exista
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es denegado con código "access_denied"
    And no hay capacidad heredada del sistema

  @rbac
  Scenario Outline: Deny-by-default cubre todas las capacidades para sujeto vacío
    Given un sujeto con CapabilitySet vacío
    When intenta ejecutar la capacidad "<capacidad>"
    Then el acceso es denegado con código "access_denied"

    Examples:
      | capacidad                      |
      | prestacion:otorgar             |
      | prestacion:denegar             |
      | prestacion:consultar           |
      | liquidacion:solicitar-cierre   |
      | liquidacion:aprobar-cierre     |
      | liquidacion:calcular           |
      | liquidacion:ejecutar-cierre    |
      | liquidacion:consultar          |
      | auditoria:leer                 |
      | rbac:administrar               |
      | hecho-causal:consultar-estado  |

  @rbac
  Scenario: liquidacion:ejecutar-cierre es denegada para cualquier humano
    Given un sujeto autenticado con token "admin-gobernanza"
    When intenta ejecutar la capacidad "liquidacion:ejecutar-cierre"
    Then el acceso es denegado con código "access_denied"
