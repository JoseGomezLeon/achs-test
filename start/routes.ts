/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import { AccessContextBuilder } from '../app/modules/rbac/domain/access-context/access-context-builder.js'

router.on('/').renderInertia('home', {}).as('home')

router.get('/health', ({ response }) => response.json({ status: 'ok' }))

router.get('/rbac-demo', ({ response }) => {
  const sujetos = [
    {
      nombre: 'María López — Analista RM-Norte',
      claims: { oid: 'u-001', extension_orgUnit: 'RM-Norte', groups: ['achs-analistas'] },
    },
    {
      nombre: 'Carlos Ruiz — Supervisor',
      claims: { oid: 'u-002', extension_orgUnit: 'RM-Sur', groups: ['achs-supervisores'] },
    },
    {
      nombre: 'Pedro Soto — Operador de Pagos',
      claims: { oid: 'u-003', extension_orgUnit: 'Central', groups: ['achs-operadores-pago'] },
    },
    {
      nombre: 'Ana Torres — Admin Gobernanza',
      claims: { oid: 'u-004', extension_orgUnit: 'Central', groups: ['achs-admin-gobernanza'] },
    },
    {
      nombre: 'job-pdn-pag-001 — Agente automatizado',
      claims: { appId: 'job-pdn-pag-001', roles: ['liquidacion:ejecutar-cierre'] },
    },
    {
      nombre: 'Empresa Constructora SpA — Empleador externo',
      claims: {
        sub: 'rut-76543210',
        achs_subject_kind: 'external' as const,
        achs_external_type: 'empleador',
      },
    },
  ]

  const resultado = sujetos.map(({ nombre, claims }) => {
    const ctx = AccessContextBuilder.fromClaims(claims)
    return {
      sujeto: nombre,
      tipo: ctx.subject.kind,
      capacidades: [...ctx.capabilities].sort(),
    }
  })

  return response.json({ modulo: 'RBAC', sujetos: resultado })
})

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])

    router.get('/mi-acceso', async ({ auth, response }) => {
      if (!(await auth.check())) {
        return response.redirect('/login')
      }
      const user = auth.user!
      const email = user.email.toLowerCase()

      const emailRoleMap: Record<string, string> = {
        analista: 'achs-analistas',
        supervisor: 'achs-supervisores',
        operador: 'achs-operadores-pago',
        admin: 'achs-admin-gobernanza',
        auditor: 'achs-auditores',
      }

      let claims: Parameters<typeof AccessContextBuilder.fromClaims>[0]

      if (email.includes('empleador')) {
        claims = { sub: email, achs_subject_kind: 'external', achs_external_type: 'empleador' }
      } else {
        const matchedGroup = Object.entries(emailRoleMap).find(([key]) => email.includes(key))?.[1]
        claims = {
          oid: String(user.id),
          email: user.email,
          extension_orgUnit: 'Demo',
          groups: matchedGroup ? [matchedGroup] : [],
        }
      }

      const ctx = AccessContextBuilder.fromClaims(claims)
      const caps = [...ctx.capabilities].sort()
      const nombre = user.fullName ?? user.email
      const rolesDetectados = 'groups' in claims ? (claims.groups ?? []) : ['externo']

      const capRows = caps.length
        ? caps.map((c) => `<li class="cap">${c}</li>`).join('')
        : `<li class="cap none">Sin capacidades — rol no reconocido</li>`

      const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Mi Acceso RBAC</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f1f5f9;min-height:100vh}
    header{background:#0f172a;color:#fff;padding:18px 28px;display:flex;align-items:center;justify-content:space-between}
    header h1{font-size:17px;font-weight:700}
    header a{color:#94a3b8;font-size:13px;text-decoration:none}
    header a:hover{color:#fff}
    main{max-width:700px;margin:40px auto;padding:0 16px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:28px;margin-bottom:24px}
    h2{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px}
    .muted{font-size:13px;color:#64748b;margin-bottom:20px}
    .badge{display:inline-block;background:#0f172a;color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;margin-right:6px;margin-bottom:6px}
    .badge.external{background:#0369a1}
    ul.caps{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    li.cap{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;font-size:13px;font-family:monospace;color:#1e293b}
    li.cap.none{grid-column:1/-1;color:#ef4444;background:#fef2f2;border-color:#fecaca}
    form{margin-top:0}
    button{background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:13px;cursor:pointer}
    button:hover{background:#b91c1c}
  </style>
</head>
<body>
  <header>
    <h1>RBAC — Control de Acceso Basado en Roles</h1>
    <form method="POST" action="/logout">
      <input type="hidden" name="_method" value="POST"/>
      <button type="submit">Cerrar sesión</button>
    </form>
  </header>
  <main>
    <div class="card">
      <h2>${nombre}</h2>
      <p class="muted">${user.email}</p>
      <div>
        ${rolesDetectados.map((g: string) => `<span class="badge ${ctx.subject.kind === 'external' ? 'external' : ''}">${g}</span>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Capacidades otorgadas (${caps.length})</h2>
      <p class="muted">Lo que este usuario puede hacer en el sistema según su rol</p>
      <ul class="caps">${capRows}</ul>
    </div>
  </main>
</body>
</html>`

      return response.header('Content-Type', 'text/html').send(html)
    })
  })
  .use(middleware.auth())
