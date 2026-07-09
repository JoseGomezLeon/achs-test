import { test, expect } from '@playwright/test'

// @smoke — verifica que el servidor AdonisJS + Inertia.js + React renderizan correctamente
test.describe('Home page — smoke E2E', () => {
  test('carga la página principal y renderiza el componente React', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/AdonisJS/i)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('It works')
  })

  test('la página de login existe y tiene formulario', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('la ruta raíz responde sin error de servidor', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBeLessThan(500)
  })
})
