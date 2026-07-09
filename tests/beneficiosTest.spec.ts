import { test, expect, request } from '@playwright/test'
import { BeneficiosApi } from '../business/beneficiosApi'
import { testCases } from '../data/beneficiosData'

test.describe('API Beneficios - Validación reglas de negocio', () => {
  let api: BeneficiosApi

  test.beforeAll(async () => {
    const apiContext = await request.newContext({
      baseURL: 'http://localhost:3000',
    })
    api = new BeneficiosApi(apiContext)
  })

  // Test automático para todos los casos definidos
  testCases.forEach((tc) => {
    test(`Grado ${tc.gradoIncapacidad} - Gran Invalidez ${tc.granInvalidez}`, async () => {
      const response = await api.calcularBeneficio(tc.sbm, tc.gradoIncapacidad, tc.granInvalidez)

      // Imprime la respuesta completa de la API
      console.log('Response API:', response)

      expect(response.tipoBeneficio).toBe(tc.expectedTipo)
      expect(response.monto).toBe(tc.expectedMonto)

      const expectedPeriodicidad =
        tc.expectedTipo === 'INDEMNIZACION_GLOBAL'
          ? 'PAGO_UNICO'
          : tc.expectedTipo === 'NINGUNO'
            ? null
            : 'MENSUAL'

      expect(response.periodicidad).toBe(expectedPeriodicidad)
    })
  })
})
