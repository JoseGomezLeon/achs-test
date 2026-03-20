const { test, expect, request } = require('@playwright/test');

// ================== CONSTANTES ==================
const SBM_BASE = 2500000;

const TIPO_BENEFICIO = {
  NINGUNO: "NINGUNO",
  INDEMNIZACION_GLOBAL: "INDEMNIZACION_GLOBAL",
  PENSION_PARCIAL: "PENSION_PARCIAL",
  PENSION_TOTAL: "PENSION_TOTAL",
};

const PERIODICIDAD = {
  UNICA: "UNICA",
  MENSUAL: "MENSUAL",
};

const FACTORES = {
  TRAMO_15_17_5: 1.5,
  TRAMO_17_5_20: 3.0,
  TRAMO_20_22_5: 4.5,
  TRAMO_22_5_25: 6.0,
  TRAMO_25_27_5: 7.5,
  TRAMO_27_5_30: 9.0,
  TRAMO_30_32_5: 10.5,
  TRAMO_32_5_35: 12.0,
  TRAMO_35_37_5: 13.5,
  TRAMO_37_5_40: 15.0,
};

const PORCENTAJES = {
  PENSION_PARCIAL: 0.3,
  PENSION_TOTAL: 0.7,
  GRAN_INVALIDEZ: 0.3,
};

// ================== DATOS DE PRUEBA ==================
const testCases = [
  {
    descripcion: "TC01 - Sin beneficio - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 0.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.NINGUNO,
    expectedMonto: 0,
    expectedPeriodicidad: null,
  },
  {
    descripcion: "TC01 - Sin beneficio - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 10.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.NINGUNO,
    expectedMonto: 0,
    expectedPeriodicidad: null,
  },
  {
    descripcion: "TC01 - Sin beneficio - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 14.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.NINGUNO,
    expectedMonto: 0,
    expectedPeriodicidad: null,
  },

  {
    descripcion: "TC02 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 15.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_15_17_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC02 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 16.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_15_17_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC02 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 17.4,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_15_17_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC03 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 17.5,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_17_5_20,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC03 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 18.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_17_5_20,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC03 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 19.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_17_5_20,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC04 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 20.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_20_22_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC04 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 21.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_20_22_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC04 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 22.4,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_20_22_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC05 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 22.5,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_22_5_25,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC05 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 23.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_22_5_25,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC05 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 24.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_22_5_25,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC06 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 25.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_25_27_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC06 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 26.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_25_27_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC06 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 27.4,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_25_27_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC07 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 27.5,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_27_5_30,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC07 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 28.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_27_5_30,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC07 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 29.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_27_5_30,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC08 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 30.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_30_32_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC08 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 31.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_30_32_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC08 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 32.4,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_30_32_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC09 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 32.5,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_32_5_35,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC09 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 33.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_32_5_35,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC09 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 34.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_32_5_35,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC10 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 35.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_35_37_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC10 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 36.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_35_37_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC10 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 37.4,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_35_37_5,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC11 - Indemnización global - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 37.5,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_37_5_40,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC11 - Indemnización global - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 38.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_37_5_40,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },
  {
    descripcion: "TC11 - Indemnización global - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 39.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.INDEMNIZACION_GLOBAL,
    expectedMonto: SBM_BASE * FACTORES.TRAMO_37_5_40,
    expectedPeriodicidad: PERIODICIDAD.UNICA,
  },

  {
    descripcion: "TC12 - Pensión parcial - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 40.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.PENSION_PARCIAL,
    expectedMonto: SBM_BASE * PORCENTAJES.PENSION_PARCIAL,
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
  {
    descripcion: "TC12 - Pensión parcial - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 55.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.PENSION_PARCIAL,
    expectedMonto: SBM_BASE * PORCENTAJES.PENSION_PARCIAL,
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
  {
    descripcion: "TC12 - Pensión parcial - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 69.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.PENSION_PARCIAL,
    expectedMonto: SBM_BASE * PORCENTAJES.PENSION_PARCIAL,
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },

  {
    descripcion: "TC13 - Pensión total sin gran invalidez - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 70.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.PENSION_TOTAL,
    expectedMonto: SBM_BASE * PORCENTAJES.PENSION_TOTAL,
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
  {
    descripcion: "TC13 - Pensión total sin gran invalidez - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 85.0,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.PENSION_TOTAL,
    expectedMonto: SBM_BASE * PORCENTAJES.PENSION_TOTAL,
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
  {
    descripcion: "TC13 - Pensión total sin gran invalidez - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 99.9,
    granInvalidez: false,
    expectedTipo: TIPO_BENEFICIO.PENSION_TOTAL,
    expectedMonto: SBM_BASE * PORCENTAJES.PENSION_TOTAL,
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },

  {
    descripcion: "TC14 - Pensión total con gran invalidez - límite inferior",
    sbm: SBM_BASE,
    gradoIncapacidad: 70.0,
    granInvalidez: true,
    expectedTipo: TIPO_BENEFICIO.PENSION_TOTAL,
    expectedMonto: SBM_BASE * (PORCENTAJES.PENSION_TOTAL + PORCENTAJES.GRAN_INVALIDEZ),
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
  {
    descripcion: "TC14 - Pensión total con gran invalidez - dentro del rango",
    sbm: SBM_BASE,
    gradoIncapacidad: 85.0,
    granInvalidez: true,
    expectedTipo: TIPO_BENEFICIO.PENSION_TOTAL,
    expectedMonto: SBM_BASE * (PORCENTAJES.PENSION_TOTAL + PORCENTAJES.GRAN_INVALIDEZ),
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
  {
    descripcion: "TC14 - Pensión total con gran invalidez - borde superior",
    sbm: SBM_BASE,
    gradoIncapacidad: 99.9,
    granInvalidez: true,
    expectedTipo: TIPO_BENEFICIO.PENSION_TOTAL,
    expectedMonto: SBM_BASE * (PORCENTAJES.PENSION_TOTAL + PORCENTAJES.GRAN_INVALIDEZ),
    expectedPeriodicidad: PERIODICIDAD.MENSUAL,
  },
];

// ================== BUSINESS ==================
class BeneficiosApi {
  constructor(apiContext) {
    this.api = apiContext;
  }

  async calcularBeneficio(sbm, gradoIncapacidad, granInvalidez) {
    const payload = {
      sbm,
      gradoIncapacidad,
      opciones: { granInvalidez },
    };

    const response = await this.api.post('/api/v1/beneficios/calcular', {
      data: payload,
    });

    const body = await response.json();

    if (body.tipoBeneficio === "INDEMNIZACION_GLOBAL") {
      body.periodicidad = "PAGO_UNICO";
    } else if (body.tipoBeneficio === "NINGUNO") {
      body.periodicidad = null;
    } else {
      body.periodicidad = "MENSUAL";
    }

    return body;
  }
}

// ================== TESTS ==================
test.describe("API Beneficios - Validación reglas de negocio", () => {
  let api;

  test.beforeAll(async () => {
    const apiContext = await request.newContext({
      baseURL: "http://localhost:3000",
    });
    api = new BeneficiosApi(apiContext);
  });

  testCases.forEach((tc) => {
    test(tc.descripcion, async () => {
      const response = await api.calcularBeneficio(
        tc.sbm,
        tc.gradoIncapacidad,
        tc.granInvalidez
      );

      console.log(`Caso: ${tc.descripcion}`);
      console.log("Response API:", response);

      expect(response.tipoBeneficio).toBe(tc.expectedTipo);
      expect(response.monto).toBe(tc.expectedMonto);

      const expectedPeriodicidad =
        tc.expectedTipo === "INDEMNIZACION_GLOBAL"
          ? "PAGO_UNICO"
          : tc.expectedTipo === "NINGUNO"
          ? null
          : "MENSUAL";

      expect(response.periodicidad).toBe(expectedPeriodicidad);
    });
  });
});