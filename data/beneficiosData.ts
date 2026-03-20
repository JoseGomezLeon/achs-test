export interface BeneficioTestCase {
  descripcion: string;
  sbm: number;
  gradoIncapacidad: number;
  granInvalidez: boolean;
  expectedTipo: string;
  expectedMonto: number;
  expectedPeriodicidad?: string | null;
}

export const SBM_BASE = 2500000;

export const TIPO_BENEFICIO = {
  NINGUNO: "NINGUNO",
  INDEMNIZACION_GLOBAL: "INDEMNIZACION_GLOBAL",
  PENSION_PARCIAL: "PENSION_PARCIAL",
  PENSION_TOTAL: "PENSION_TOTAL",
} as const;

export const PERIODICIDAD = {
  UNICA: "UNICA",
  MENSUAL: "MENSUAL",
} as const;

export const FACTORES = {
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
} as const;

export const PORCENTAJES = {
  PENSION_PARCIAL: 0.3,
  PENSION_TOTAL: 0.7,
  GRAN_INVALIDEZ: 0.3,
} as const;

export const testCases: BeneficioTestCase[] = [
  // TC01 - Sin beneficio (Grado < 15)
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

  // TC02 - Indemnización Global (15.0 ≤ Grado < 17.5)
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

  // TC03 - Indemnización Global (17.5 ≤ Grado < 20.0)
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

  // TC04 - Indemnización Global (20.0 ≤ Grado < 22.5)
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

  // TC05 - Indemnización Global (22.5 ≤ Grado < 25.0)
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

  // TC06 - Indemnización Global (25.0 ≤ Grado < 27.5)
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

  // TC07 - Indemnización Global (27.5 ≤ Grado < 30.0)
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

  // TC08 - Indemnización Global (30.0 ≤ Grado < 32.5)
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

  // TC09 - Indemnización Global (32.5 ≤ Grado < 35.0)
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

  // TC10 - Indemnización Global (35.0 ≤ Grado < 37.5)
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

  // TC11 - Indemnización Global (37.5 ≤ Grado < 40.0)
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

  // TC12 - Pensión Parcial (40 ≤ Grado < 70)
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

  // TC13 - Pensión Total (Grado ≥ 70, granInvalidez: false)
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

  // TC14 - Pensión Total (Grado ≥ 70, granInvalidez: true)
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