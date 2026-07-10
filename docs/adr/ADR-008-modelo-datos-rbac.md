# ADR-008 — Modelo de Datos RBAC

**Estado:** Aceptada

## Contexto

El `skeleton-rbac` autentica sujetos, construye `AccessContext` y autoriza capacidades y relaciones para el motor PEC2. Las decisiones previas ya fijan que:

- Humanos se autentican con Entra ID y sus grupos se mapean a `BusinessRole`.
- Las capacidades humanas se obtienen desde matrices versionadas en código.
- Agentes se autentican con identidad técnica y sus capacidades efectivas son `token.roles ∩ AgentRegistry.allowedCapabilities`.
- Externos reciben capacidades mínimas por tipo de sujeto.
- El cierre mensual requiere doble firma antes de que el job `PDN-PAG-001` ejecute.
- Toda denegación y toda acción protegida exitosa deben quedar auditadas.

Faltaba decidir qué parte de este modelo vive en base de datos y qué parte permanece como configuración/código versionado.

## Decisión

El modelo persistente de RBAC para F0-F1 es deliberadamente pequeño:

1. `app_audit`: bitácora insert-only de acciones protegidas concedidas o denegadas.
2. `monthly_close_approvals`: registro transaccional de solicitud, aprobación y ejecución del cierre mensual.

No se crean tablas `users`, `roles`, `permissions`, `user_roles` ni `role_permissions` en F0-F1. La asignación de usuarios a grupos pertenece a Entra ID, y la matriz `BusinessRole -> CapabilitySet` queda versionada en código.

El `AgentRegistry` también queda en código/config versionado para F0-F1. Puede migrarse a BD en una decisión futura si se requiere administración dinámica sin deploy.

## Reconciliación con el anteproyecto

El anteproyecto contiene documentos de datos y auditoría previos a este skeleton. Este ADR los aterriza para RBAC:

| Fuente                                                                                                                                                  | Decisión para `skeleton-rbac`                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `../3_especificacion_tecnica/eventos-auditoria/02_app_audit_cdc.md` propone `app_audit_log` genérico                                                    | Se adopta `app_audit` como nombre canónico del skeleton, con columnas explícitas de autorización (`capability`, `resource_type`, `resource_id`, `outcome`, `denial_reason`, `request_id`). |
| `../3_especificacion_tecnica/datos/01_soft_deletes.md` clasifica entidades por soft delete, vigencia o inmutabilidad                                    | `app_audit` cae en la categoría inmutable/append-only: no soft delete, no update, no delete.                                                                                               |
| `../1_dominio/04_Modelo_de_Entidades.md` define entidades de dominio como `Persona`, `PrestacionEconomica`, `LiquidacionDePago` y `ExpedienteDeTramite` | RBAC no duplica esas tablas. `app_audit.resource_type/resource_id` referencia esos agregados por ID interno cuando corresponda.                                                            |
| `../pec_mvp/database/migrations/*create_users_table.ts` contiene una tabla `users` de scaffold Adonis                                                   | No es fuente de roles ni permisos para RBAC. Puede sobrevivir como tabla de sesión/app local si el frontend lo requiere, pero la identidad y roles productivos vienen de Entra ID.         |

## Esquema

### `app_audit`

Tabla insert-only para auditoría de seguridad y compliance. No contiene PII directa; referencia recursos por `resource_type` y `resource_id`.

```sql
create table app_audit (
  id uuid primary key default gen_random_uuid(),

  actor_kind text not null check (actor_kind in ('human', 'agent', 'external')),
  actor_id text not null,

  entra_client_id text,
  entra_object_id text,
  agent_type text,
  operation text,
  environment text check (environment in ('dev', 'staging', 'prod')),

  capability text not null,
  resource_type text not null,
  resource_id text not null,

  outcome text not null check (outcome in ('granted', 'denied')),
  denial_reason text,

  request_id text not null,
  token_jti text,
  justification text,

  happened_at timestamptz not null default now(),

  constraint app_audit_denial_reason_required
    check (
      (outcome = 'denied' and denial_reason is not null)
      or (outcome = 'granted')
    )
);

create index app_audit_happened_at_idx
  on app_audit (happened_at);

create index app_audit_request_id_idx
  on app_audit (request_id);

create index app_audit_actor_idx
  on app_audit (actor_kind, actor_id, happened_at desc);

create index app_audit_resource_idx
  on app_audit (resource_type, resource_id, happened_at desc);

create index app_audit_capability_idx
  on app_audit (capability, happened_at desc);
```

En PostgreSQL, la tabla se protege contra `UPDATE` y `DELETE` con trigger:

```sql
create or replace function prevent_app_audit_mutation()
returns trigger as $$
begin
  raise exception 'app_audit is insert-only';
end;
$$ language plpgsql;

create trigger app_audit_no_update
before update on app_audit
for each row execute function prevent_app_audit_mutation();

create trigger app_audit_no_delete
before delete on app_audit
for each row execute function prevent_app_audit_mutation();
```

### `monthly_close_approvals`

Tabla que materializa el control de doble firma para cierre mensual. Registra quién solicitó, quién aprobó y qué agente ejecutó.

```sql
create table monthly_close_approvals (
  id uuid primary key default gen_random_uuid(),

  periodo text not null,
  status text not null check (
    status in ('requested', 'approved', 'executed', 'rejected', 'cancelled', 'expired')
  ),

  requested_by text not null,
  requested_at timestamptz not null default now(),

  approved_by text,
  approved_at timestamptz,

  executed_by_agent_id text,
  executed_at timestamptz,

  preliquidacion_hash text not null,
  request_id text not null,
  idempotency_key text,

  rejection_reason text,
  cancelled_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint monthly_close_no_self_approval
    check (approved_by is null or approved_by <> requested_by),

  constraint monthly_close_approval_fields
    check (
      status <> 'approved'
      or (approved_by is not null and approved_at is not null)
    ),

  constraint monthly_close_execution_fields
    check (
      status <> 'executed'
      or (
        approved_by is not null
        and approved_at is not null
        and executed_by_agent_id is not null
        and executed_at is not null
        and idempotency_key is not null
      )
    )
);

create unique index monthly_close_one_active_period_idx
  on monthly_close_approvals (periodo)
  where status in ('requested', 'approved', 'executed');

create unique index monthly_close_idempotency_idx
  on monthly_close_approvals (periodo, idempotency_key)
  where idempotency_key is not null;

create index monthly_close_status_idx
  on monthly_close_approvals (status, periodo);

create index monthly_close_request_id_idx
  on monthly_close_approvals (request_id);
```

## Reglas

- `app_audit` no se actualiza ni elimina. Cualquier corrección se registra como nueva evidencia, no como mutación de evidencia anterior.
- `app_audit` registra denegaciones con `outcome = 'denied'` y `denial_reason` obligatorio.
- `app_audit` registra acciones exitosas con `outcome = 'granted'`.
- `app_audit` no almacena RUT, nombres, correos de terceros ni montos. Solo IDs internos y metadata de autorización.
- `monthly_close_approvals.approved_by` debe ser distinto de `requested_by`.
- El cierre ejecutado requiere solicitud, aprobación y ejecución por agente técnico.
- La ejecución del cierre es idempotente por `periodo` + `idempotency_key`.
- Un período solo puede tener un flujo activo de cierre.
- Las capacidades se validan en `AuthorizationService`; las constraints de BD no reemplazan las reglas de autorización.

## Tablas excluidas del modelo F0-F1

| Tabla              | Motivo de exclusión                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `users`            | La identidad humana pertenece a Entra ID. RBAC consume claims normalizados, no administra usuarios.   |
| `roles`            | Los roles de negocio son tipos/matriz versionados; no son registros administrables en F0-F1.          |
| `permissions`      | Las capacidades son literales de dominio versionados en `@achs/pec-contracts/auth`.                   |
| `user_roles`       | La asignación humana se hace en grupos de Entra ID.                                                   |
| `role_permissions` | La matriz `BusinessRole -> CapabilitySet` vive en código para mantener review y trazabilidad por git. |
| `agent_registry`   | Diferido. Para F0-F1 vive en código/config versionado por ADR-005 y ADR-006.                          |

## Alternativas consideradas

| Alternativa                                           | Descartada porque                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RBAC completo en BD (`users`, `roles`, `permissions`) | Duplica Entra ID, agrega administración local de permisos y contradice ADR-005.                                         |
| Guardar `AgentRegistry` en BD desde el inicio         | Permite cambios dinámicos, pero agrega UI/proceso de gobierno que no existe en F0-F1.                                   |
| Usar solo logs estructurados para auditoría           | Los logs no son el system-of-record y no cumplen el requisito de evidencia transaccional insert-only.                   |
| Guardar auditoría en `outbox_events`                  | Mezcla integración de eventos de dominio con auditoría de seguridad; además las denegaciones no son eventos de dominio. |

## Consecuencias

- **Positivas:** el modelo persistente es pequeño, auditable y consistente con Entra ID como fuente de identidad.
- **Positivas:** los cambios de capacidades pasan por código, tests y revisión.
- **Positivas:** la doble firma del cierre mensual queda persistida y verificable.
- **Negativas:** cambiar matrices de capacidades requiere deploy.
- **Negativas:** administrar agentes técnicos sin deploy queda diferido.
- **Negativas:** los reportes de auditoría deben resolver detalles del recurso desde las tablas de dominio, no desde `app_audit`.

## Referencias

- ADR-005: Mapeo de claims de Entra ID a `AccessContext`
- ADR-006: Runtime de Agentes y Workers
- ADR-007: Cierre Mensual con Doble Firma
- `skeleton-rbac/doc/design-handoff.md`
- `skeleton-pec/doc/adr/ADR-012-auditoria-appaudit.md`
- `skeleton-pec/doc/adr/ADR-013-proteccion-datos.md`
- `../1_dominio/04_Modelo_de_Entidades.md`
- `../3_especificacion_tecnica/datos/01_soft_deletes.md`
- `../3_especificacion_tecnica/eventos-auditoria/02_app_audit_cdc.md`
