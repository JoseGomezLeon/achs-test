/**
 * Reglas AFF (Architectural Fitness Functions) del módulo RBAC.
 * Basadas en ADR-011 sección 4 — se ejecutan en:
 *   - scripts/dev-tdd.sh  (watcher local, ciclo TDD I2)
 *   - Pipeline CI Nivel 1 (paso lint, p7t7)
 *   - Hook pre-commit Husky (p7t9)
 *
 * Severidad: 'error' bloquea el watcher y el commit. 'warn' registra pero no bloquea.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── Reglas globales ────────────────────────────────────────────────────────

    {
      name: 'no-circular-rbac',
      severity: 'error',
      comment: 'Sin dependencias circulares dentro del módulo RBAC',
      from: { path: '^app/modules/rbac' },
      to: { circular: true },
    },

    {
      name: 'no-stubs-in-production',
      severity: 'error',
      comment: 'app/ nunca importa stubs de tests — solo el IoC puede hacerlo',
      from: { path: '^app/' },
      to: { path: '^tests/stubs' },
    },

    // ── domain/iam ─────────────────────────────────────────────────────────────
    // Puede importar: openid-client, tipos locales
    // No puede: @adonisjs, lucid, otros módulos de dominio

    {
      name: 'iam-no-framework',
      severity: 'error',
      comment: 'domain/iam es puro TS — sin AdonisJS ni Lucid (ADR-011 §4.1)',
      from: { path: '^app/modules/rbac/domain/iam' },
      to: { path: '^@adonisjs|^@vinejs|^@lucid|lucid-orm' },
    },
    {
      name: 'iam-no-domain-peers',
      severity: 'error',
      comment: 'domain/iam no importa otros submódulos de dominio RBAC (ADR-011 §4.1)',
      from: { path: '^app/modules/rbac/domain/iam' },
      to: {
        path: '^app/modules/rbac/domain/(access-context|authorization|audit|registry)',
      },
    },

    // ── domain/access-context ──────────────────────────────────────────────────
    // Puede importar: domain/iam, domain/registry
    // No puede: @adonisjs, lucid, HTTP, domain/authorization, domain/audit

    {
      name: 'access-context-no-framework',
      severity: 'error',
      comment: 'domain/access-context no conoce AdonisJS ni Lucid (ADR-011 §4.1)',
      from: { path: '^app/modules/rbac/domain/access-context' },
      to: { path: '^@adonisjs|^@vinejs|^@lucid|lucid-orm' },
    },
    {
      name: 'access-context-no-authorization',
      severity: 'error',
      comment: 'AccessContextBuilder no depende de AuthorizationService (ADR-011 §4.1)',
      from: { path: '^app/modules/rbac/domain/access-context' },
      to: { path: '^app/modules/rbac/domain/(authorization|audit)' },
    },

    // ── domain/authorization ───────────────────────────────────────────────────
    // Puede importar: access-context (para leer el contexto)
    // No puede: domain/iam (no conoce JWT), @adonisjs, lucid

    {
      name: 'authorization-no-iam',
      severity: 'error',
      comment: 'AuthorizationService no conoce JWT ni IamAdapter (ADR-011 §4.1)',
      from: { path: '^app/modules/rbac/domain/authorization' },
      to: { path: '^app/modules/rbac/domain/iam' },
    },
    {
      name: 'authorization-no-framework',
      severity: 'error',
      comment: 'domain/authorization es dominio puro — sin AdonisJS ni Lucid',
      from: { path: '^app/modules/rbac/domain/authorization' },
      to: { path: '^@adonisjs|^@vinejs|^@lucid|lucid-orm' },
    },

    // ── domain/audit ───────────────────────────────────────────────────────────
    // Puede importar: lucid (insert-only), tipos de audit-entry
    // No puede: domain/iam, domain/access-context

    {
      name: 'audit-no-iam-or-access-context',
      severity: 'error',
      comment: 'AppAuditWriter no conoce IAM ni AccessContext (ADR-011 §4.1)',
      from: { path: '^app/modules/rbac/domain/audit' },
      to: {
        path: '^app/modules/rbac/domain/(iam|access-context|authorization)',
      },
    },

    // ── domain/registry ────────────────────────────────────────────────────────
    // Solo configuración estática — sin frameworks ni otros módulos de dominio

    {
      name: 'registry-no-framework',
      severity: 'error',
      comment: 'AgentRegistry es configuración pura — sin AdonisJS ni Lucid',
      from: { path: '^app/modules/rbac/domain/registry' },
      to: { path: '^@adonisjs|^@vinejs|^@lucid|lucid-orm' },
    },

    // ── app/middleware ─────────────────────────────────────────────────────────
    // Puede importar: domain/iam, domain/access-context, AdonisJS HTTP
    // No puede: use-cases de negocio, domain/registry directamente

    {
      name: 'middleware-no-business-logic',
      severity: 'warn',
      comment: 'Los middlewares construyen AccessContext — no ejecutan lógica de negocio',
      from: { path: '^app/modules/rbac/app/middleware' },
      to: { path: '^app/modules/rbac/domain/(authorization|audit|registry)' },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
}
