import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth.js'

// Los tests crean usuarios en la BD — deben correr de forma secuencial
test.describe.configure({ mode: 'serial' })

// ── Bloque 1: Autenticación ────────────────────────────────────────────
test.describe('Autenticación — control de acceso a /mi-acceso', () => {
  test('1 — usuario sin sesión activa es redirigido a /login al acceder a /mi-acceso', async ({
    page,
  }) => {
    await page.goto('/mi-acceso')
    await expect(page).toHaveURL(/\/login/)
  })

  test('2 — login exitoso con credenciales válidas establece sesión y accede al sistema', async ({
    page,
  }) => {
    await loginAs(page, 'analista@test.rbac')
    await expect(page).toHaveURL('http://localhost:3333/')
  })

  test('3 — logout destruye la sesión y bloquea el acceso posterior a /mi-acceso', async ({
    page,
  }) => {
    await loginAs(page, 'analista@test.rbac')
    await page.goto('/mi-acceso')
    await page.locator('button[type="submit"]').click() // botón cerrar sesión
    await page.goto('/mi-acceso')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── Bloque 2: Analista — gestiona prestaciones del trabajador ──────────
test.describe('Analista — gestiona prestaciones del trabajador lesionado', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'analista@test.rbac')
    await page.goto('/mi-acceso')
  })

  test('4 — analista puede otorgar prestaciones al trabajador', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('prestacion:otorgar')
  })

  test('5 — analista puede denegar prestaciones al trabajador', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('prestacion:denegar')
  })

  test('6 — analista puede consultar el estado de prestaciones', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('prestacion:consultar')
  })

  test('7 — analista NO puede aprobar cierre de liquidación (exclusivo del supervisor)', async ({
    page,
  }) => {
    await expect(page.locator('li.cap')).not.toContainText('liquidacion:aprobar-cierre')
  })
})

// ── Bloque 3: Supervisor — aprueba cierres, no los ejecuta ────────────
test.describe('Supervisor — aprueba el cierre mensual de liquidaciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'supervisor@test.rbac')
    await page.goto('/mi-acceso')
  })

  test('8 — supervisor puede aprobar el cierre mensual de liquidaciones', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('liquidacion:aprobar-cierre')
  })

  test('9 — supervisor puede consultar el estado de liquidaciones', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('liquidacion:consultar')
  })

  test('10 — supervisor NO puede solicitar cierre (eso es labor del operador de pagos)', async ({
    page,
  }) => {
    await expect(page.locator('li.cap')).not.toContainText('liquidacion:solicitar-cierre')
  })

  test('11 — supervisor NO puede otorgar prestaciones (exclusivo del analista)', async ({
    page,
  }) => {
    await expect(page.locator('li.cap')).not.toContainText('prestacion:otorgar')
  })
})

// ── Bloque 4: Operador de Pagos — solicita cierres, no los aprueba ────
test.describe('Operador de Pagos — solicita y calcula liquidaciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'operador@test.rbac')
    await page.goto('/mi-acceso')
  })

  test('12 — operador de pagos puede solicitar el inicio del cierre mensual', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('liquidacion:solicitar-cierre')
  })

  test('13 — operador de pagos puede calcular el monto de las liquidaciones', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('liquidacion:calcular')
  })

  test('14 — operador NO puede aprobar el cierre que él mismo solicitó (regla anti-auto-aprobación ADR-007)', async ({
    page,
  }) => {
    await expect(page.locator('li.cap')).not.toContainText('liquidacion:aprobar-cierre')
  })

  test('15 — operador de pagos NO puede otorgar ni denegar prestaciones', async ({ page }) => {
    await expect(page.locator('li.cap')).not.toContainText('prestacion:otorgar')
    await expect(page.locator('li.cap')).not.toContainText('prestacion:denegar')
  })
})

// ── Bloque 5: Auditor — solo lectura, sin operaciones ─────────────────
test.describe('Auditor — lee trazabilidad, no opera el sistema', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'auditor@test.rbac')
    await page.goto('/mi-acceso')
  })

  test('16 — auditor puede leer el registro de auditoría del sistema', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('auditoria:leer')
  })

  test('17 — auditor tiene exactamente 1 capacidad y no puede operar el sistema', async ({
    page,
  }) => {
    await expect(page.locator('li.cap')).toHaveCount(1)
    await expect(page.locator('li.cap')).not.toContainText('liquidacion:aprobar-cierre')
    await expect(page.locator('li.cap')).not.toContainText('prestacion:otorgar')
  })
})

// ── Bloque 6: Empleador externo — consulta su hecho causal ────────────
test.describe('Empleador externo — acceso restringido al estado de su caso', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'empleador@test.rbac')
    await page.goto('/mi-acceso')
  })

  test('18 — empleador externo puede consultar el estado de su hecho causal', async ({ page }) => {
    await expect(page.locator('li.cap')).toContainText('hecho-causal:consultar-estado')
  })

  test('19 — empleador externo NO puede acceder a operaciones internas de liquidación', async ({
    page,
  }) => {
    await expect(page.locator('li.cap')).not.toContainText('liquidacion:aprobar-cierre')
    await expect(page.locator('li.cap')).not.toContainText('liquidacion:solicitar-cierre')
    await expect(page.locator('li.cap')).not.toContainText('prestacion:otorgar')
  })
})

// ── Bloque 7: Deny by default ─────────────────────────────────────────
test.describe('Deny-by-default — ningún acceso sin rol reconocido', () => {
  test('20 — usuario sin rol RBAC reconocido no obtiene ninguna capacidad en el sistema', async ({
    page,
  }) => {
    await loginAs(page, 'sinrol@test.rbac')
    await page.goto('/mi-acceso')
    await expect(page.locator('li.cap.none')).toBeVisible()
    await expect(page.locator('li.cap.none')).toContainText('Sin capacidades')
  })
})
