import type { Page } from '@playwright/test'

export const PASSWORD = 'Test1234!'

export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/signup', { waitUntil: 'networkidle' })
  await page.locator('#fullName').fill(email.split('@')[0])
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('#passwordConfirmation').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()

  await page.waitForURL('http://localhost:3333/', { timeout: 3000 }).catch(async () => {
    // Email ya registrado — ir directo a login
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('http://localhost:3333/')
  })
}
