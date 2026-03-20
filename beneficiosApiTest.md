## Plan de pruebas ##

-- Objetivo
Se requiere validar el EndPoint POST /api/v1/beneficios/calcular calcule de forma correcta :
- Grado de incapacidad
- SBM (Sueldo Base Mensual)
- Condicion de gran invalidez.

-- Alcance
Se requieren las siguientes validaciones : 
- Validacion de las reglas de negocio.
- Validacion de calculo de los montos.

-- Estrategias de pruebas.
Se aplicaran :
- Pruebas funcionales.
- Pruebas de borde.
- Validacion de calculos.

-- Principales casos de prueba.

📌 TC01 – Indemnización Sin Beneficio (Grado < 15.0)
Caso: Bajo mínimo
Input: 0.0
Resultado esperado: Tipo: Ninguno, Monto: 0

Caso: Dentro del rango
Input: 10.0
Resultado esperado: Tipo: Ninguno, Monto: 0

Caso: Borde superior
Input: 14.9
Resultado esperado: Tipo: Ninguno, Monto: 0

Caso: Cambio de tramo
Input: 15.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 1.5

📌 TC02 – Indemnización Global (15.0 ≤ Grado < 17.5)
Caso: Límite inferior
Input: 15.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 1.5

Caso: Dentro del rango
Input: 16.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 1.5

Caso: Borde superior
Input: 17.4
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 1.5

Caso: Cambio de tramo
Input: 17.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 3.0

Caso: Sobre el límite
Input: 17.6
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 3.0

📌 TC03 – Indemnización Global (17.5 ≤ Grado < 20.0)
Caso: Límite inferior
Input: 17.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 3.0

Caso: Dentro del rango
Input: 18.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 3.0

Caso: Borde superior
Input: 19.9
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 3.0

Caso: Cambio de tramo
Input: 20.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 4.5

Caso: Sobre el límite
Input: 20.1
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 4.5

📌 TC04 – Indemnización Global (20.0 ≤ Grado < 22.5)
Caso: Límite inferior
Input: 20.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 4.5

Caso: Dentro del rango
Input: 21.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 4.5

Caso: Borde superior
Input: 22.4
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 4.5

Caso: Cambio de tramo
Input: 22.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 6.0

Caso: Sobre el límite
Input: 22.6
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 6.0

📌 TC05 – Indemnización Global (22.5 ≤ Grado < 25.0)
Caso: Límite inferior
Input: 22.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 6.0

Caso: Dentro del rango
Input: 23.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 6.0

Caso: Borde superior
Input: 24.9
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 6.0

Caso: Cambio de tramo
Input: 25.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 7.5

Caso: Sobre el límite
Input: 25.1
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 7.5

📌 TC06 – Indemnización Global (25.0 ≤ Grado < 27.5)
Caso: Límite inferior
Input: 25.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 7.5

Caso: Dentro del rango
Input: 26.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 7.5

Caso: Borde superior
Input: 27.4
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 7.5

Caso: Cambio de tramo
Input: 27.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 9.0

Caso: Sobre el límite
Input: 27.6
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 9.0

📌 TC07 – Indemnización Global (27.5 ≤ Grado < 30.0)
Caso: Límite inferior
Input: 27.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 9.0

Caso: Dentro del rango
Input: 28.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 9.0

Caso: Borde superior
Input: 29.9
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 9.0

Caso: Cambio de tramo
Input: 30.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 10.5

Caso: Sobre el límite
Input: 30.1
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 10.5

📌 TC08 – Indemnización Global (30.0 ≤ Grado < 32.5)
Caso: Límite inferior
Input: 30.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 10.5

Caso: Dentro del rango
Input: 31.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 10.5

Caso: Borde superior
Input: 32.4
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 10.5

Caso: Cambio de tramo
Input: 32.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 12.0

Caso: Sobre el límite
Input: 32.6
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 12.0

📌 TC09 – Indemnización Global (32.5 ≤ Grado < 35.0)
Caso: Límite inferior
Input: 32.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 12.0

Caso: Dentro del rango
Input: 33.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 12.0

Caso: Borde superior
Input: 34.9
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 12.0

Caso: Cambio de tramo
Input: 35.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 13.5

Caso: Sobre el límite
Input: 35.1
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 13.5

📌 TC10 – Indemnización Global (35.0 ≤ Grado ≤ 37.5)
Caso: Límite inferior
Input: 35.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 13.5

Caso: Dentro del rango
Input: 36.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 13.5

Caso: Borde superior
Input: 37.4
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 13.5

Caso: Límite máximo
Input: 37.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 15.0

📌 TC11 – Indemnización Global (37.5 ≤ Grado < 40.0)
Caso: Límite inferior
Input: 37.5
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 15.0

Caso: Dentro del rango
Input: 38.0
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 15.0

Caso: Borde superior
Input: 39.9
Resultado esperado: Tipo: Indemnización Global, Monto: SBM × 15.0

Caso: Cambio de tramo
Input: 40.0
Resultado esperado: Tipo: Pensión de Invalidez Parcial, Monto: SBM × 0.3

📌 TC12 – Pensión de Invalidez Parcial (40 ≤ Grado < 70)
Caso: Límite inferior
Input: 40.0
Resultado esperado: Tipo: Pensión de Invalidez Parcial, Monto: SBM × 0.3

Caso: Dentro del rango
Input: 55.0
Resultado esperado: Tipo: Pensión de Invalidez Parcial, Monto: SBM × 0.3

Caso: Borde superior
Input: 69.9
Resultado esperado: Tipo: Pensión de Invalidez Parcial, Monto: SBM × 0.3

Caso: Cambio de tramo
Input: 70.0
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 0.7

📌 TC13 – Pensión de Invalidez Total (Grado ≥ 70, granInvalidez: false)
Caso: Límite inferior
Input: 70.0, granInvalidez: false
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 0.7

Caso: Dentro del rango
Input: 85.0, granInvalidez: false
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 0.7

Caso: Borde superior
Input: 99.9, granInvalidez: false
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 0.7

📌 TC14 – Pensión de Invalidez Total (Grado ≥ 70, granInvalidez: true)

Caso: Límite inferior
Input: 70.0, granInvalidez: true
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 1.0

Caso: Dentro del rango
Input: 85.0, granInvalidez: true
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 1.0

Caso: Borde superior
Input: 99.9, granInvalidez: true
Resultado esperado: Tipo: Pensión de Invalidez Total, Monto: SBM × 1.0


## Test Automatizados ##

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

  ## Instrucciones de ejecucion ##
  1. Descargar proyecto achs-test desde xxxxxxxxxxxxxxxxxxxxxxxxxxx
  2. Instalar Node.js
  3. Instalar Playwright.
  4. Ejecutar la Api apiMock.mjs
  5. Desde la ruta del proyecto, ejecutar entrega.js








