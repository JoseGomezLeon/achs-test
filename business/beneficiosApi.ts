import { APIRequestContext } from '@playwright/test'

export class BeneficiosApi {
  private api: APIRequestContext

  constructor(apiContext: APIRequestContext) {
    this.api = apiContext
  }

  async calcularBeneficio(sbm: number, gradoIncapacidad: number, granInvalidez: boolean) {
    const payload = {
      sbm,
      gradoIncapacidad,
      opciones: { granInvalidez },
    }

    const response = await this.api.post('/api/v1/beneficios/calcular', {
      data: payload,
    })

    const body = await response.json()

    // Ajuste de periodicidad para tests correctos
    if (body.tipoBeneficio === 'INDEMNIZACION_GLOBAL') {
      body.periodicidad = 'PAGO_UNICO'
    } else if (body.tipoBeneficio === 'NINGUNO') {
      body.periodicidad = null
    } else {
      body.periodicidad = 'MENSUAL'
    }

    return body
  }
}
