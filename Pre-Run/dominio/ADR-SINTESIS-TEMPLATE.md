# ADR — Dominio de Negocio: [NOMBRE DEL MÓDULO]

> **Instrucciones:** completa este documento antes de ejecutar Pre-Run.
> El agente derivará de aquí todas las interfaces, stubs, feature files y tests.
> Borra las instrucciones (líneas con >) cuando el documento esté listo.
> Cambia el estado a `Aceptada` cuando el equipo lo haya revisado.

**Estado:** Borrador → Aceptada
**Fecha:** YYYY-MM-DD
**Módulo:** [nombre del módulo, ej: pagos, autenticación, notificaciones]

---

## Contexto

> Describe en 2-3 párrafos qué problema resuelve este módulo y por qué necesita un ADR
> de negocio antes de implementar. ¿Qué decisiones anteriores se sintetizan aquí?

---

## 1. Sistemas externos

> Lista los sistemas externos que este módulo consume en runtime.
> Para cada uno: qué interfaz TypeScript lo abstrae, qué implementación real usa en producción,
> y qué stub determinista usará en tests.

| Sistema externo                 | Interfaz de dominio | Implementación producción | Stub para tests |
| ------------------------------- | ------------------- | ------------------------- | --------------- |
| [ej: Proveedor de identidad]    | `[NombreAdapter]`   | `[ImplAdapter]`           | `[StubAdapter]` |
| [ej: Base de datos / auditoría] | `[NombreWriter]`    | `[ImplWriter]`            | `[StubWriter]`  |

### 1.1. Contrato de [NombreAdapter]

```typescript
export interface [NombreAdapter] {
  /** @throws {[ErrorDeAutenticacion]} cuando el token es inválido o expirado */
  [metodo](input: [TipoEntrada]): Promise<[TipoSalida]>
}
```

### 1.2. Contrato de [NombreWriter]

```typescript
export interface [NombreWriter] {
  /** Insert-only — nunca actualiza ni elimina */
  write(entry: [TipoEntrada]): Promise<void>
}
```

### 1.3. Tokens de desarrollo para el stub

> Define los tokens o identificadores deterministas que el stub reconocerá.
> Cada token debe representar un caso de uso diferente (un rol, un tipo de sujeto, un caso borde).
> El agente creará un StubAdapter con exactamente estos tokens.

| Token / ID      | Sujeto que representa | Características                    |
| --------------- | --------------------- | ---------------------------------- |
| `[token-1]`     | [descripción]         | [rol, permisos, atributos]         |
| `[token-2]`     | [descripción]         | [rol, permisos, atributos]         |
| `[token-error]` | Token inválido        | Debe lanzar error de autenticación |

---

## 2. Roles y capacidades

### 2.1. Roles del sistema

> Lista los roles de negocio. Estos son los roles que tienen los usuarios humanos.
> No mezclar con roles técnicos o de sistema.

| Identificador del rol | Descripción                              |
| --------------------- | ---------------------------------------- |
| `[rol_1]`             | [qué puede hacer en términos de negocio] |
| `[rol_2]`             | [qué puede hacer en términos de negocio] |
| `[rol_N]`             | [qué puede hacer en términos de negocio] |

### 2.2. Matriz de capacidades

> Define exactamente qué puede hacer cada rol.
> Una celda vacía significa denegación implícita (deny-by-default).
> Las capacidades deben usar el formato `recurso:accion` en minúsculas.

| Capacidad            | [rol_1] | [rol_2] | [rol_3] | [rol_N] |
| -------------------- | :-----: | :-----: | :-----: | :-----: |
| `[recurso]:[accion]` |    ✓    |         |         |    ✓    |
| `[recurso]:[accion]` |         |    ✓    |         |         |
| `[recurso]:[accion]` |         |    ✓    |    ✓    |         |

> **Nota:** si existe alguna capacidad que solo pueden ejercer procesos automatizados
> (jobs, agentes), indícala aquí con una nota. Los humanos no deben tenerla.

### 2.3. Agentes y procesos automatizados (si aplica)

> Lista los agentes batch o procesos automáticos que interactúan con el módulo.

| Agente         | Capacidades máximas              |
| -------------- | -------------------------------- |
| `[nombre-job]` | `[capacidad_1]`, `[capacidad_2]` |

### 2.4. Sujetos externos (si aplica)

> Usuarios o sistemas de terceros que acceden con capacidades limitadas.

| Tipo de sujeto externo | Capacidades permitidas |
| ---------------------- | ---------------------- |
| `[tipo-externo]`       | `[capacidad_1]`        |

---

## 3. Reglas de negocio críticas

### 3.1. Regla de acceso por defecto

> Define la política de acceso por defecto. Recomendado: deny-by-default.
> CapabilitySet vacío → ninguna acción permitida.

### 3.2. Flujos que requieren múltiples actores (si aplica)

> Si alguna operación requiere que dos personas distintas participen (doble firma,
> aprobación, etc.), documéntalo aquí con el flujo exacto.

```
[Actor 1] → [capacidad de solicitud]
[Actor 2] → [capacidad de aprobación]  (el Actor 1 no puede aprobar lo suyo)
[Sistema] → [capacidad de ejecución]   (debe existir aprobación vigente)
```

### 3.3. Relación de sujeto con recursos (si aplica)

> ¿El acceso a un recurso depende de la relación del sujeto con ese recurso?
> Por ejemplo: un usuario solo puede acceder a recursos de su unidad organizativa.

### 3.4. Códigos de error (contratos estables)

> Define los códigos de error que el módulo puede devolver. Estos no deben cambiar
> entre versiones porque los clientes los referencian por string.

| Código       | HTTP | Cuándo          |
| ------------ | ---- | --------------- |
| `[codigo_1]` | 401  | [cuándo ocurre] |
| `[codigo_2]` | 403  | [cuándo ocurre] |
| `[codigo_3]` | 403  | [cuándo ocurre] |

---

## 4. Límites de arquitectura (AFF)

> Define las reglas de importación que el código debe respetar.
> El agente las codificará en `.dependency-cruiser.cjs`.
> Usa el formato: `[capa A] → [capa B]` (puede importar) y `[capa A] ↛ [capa B]` (no puede importar).

```
[capa de entrada / middleware]
  → [capa de identidad]
  → [capa de contexto de acceso]
  ↛ [capa de autorización] (no directamente)

[capa de contexto de acceso]
  → [capa de identidad]
  ↛ [framework / HTTP]

[capa de autorización]
  ↛ [capa de identidad]
  ↛ [framework / HTTP]

[capa de identidad]
  ↛ [framework / HTTP]
  ↛ [otras capas del dominio]
```

No puede haber dependencias circulares entre capas de dominio.

---

## 5. Alcance del piloto

> Define qué se implementa en esta primera iteración y qué queda diferido.

| Componente          | Estado                       |
| ------------------- | ---------------------------- |
| [Interfaz] + [Stub] | Implementado en Pre-Run      |
| [Clase A]           | Implementado en TDD sprint 1 |
| [Clase B]           | Diferido (sprint N)          |
| [Integración real]  | Diferido (sprint N)          |
