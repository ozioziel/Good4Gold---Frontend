# Pruebas y validación

## Pruebas automatizadas
| Suite | Comando | Qué cubre | Resultado |
|---|---|---|---|
| API: dominio e integración | `npm run api:test` | Reglas de evidencia, transiciones de solicitudes, roles, QR, sincronización idempotente, campañas con escrow simulado y rutas del laboratorio, contra PostGIS real (base aparte `gold2_test`) | 41 pruebas |
| Contrato de escrow | `cd contracts/escrow && cargo test` | Meta, orden de hitos, verificador, cancelación y reembolso proporcional | 6 pruebas |
| Laboratorio virtual | `cd science && uv run pytest` | Índices, z robusto, pentadas, decodificación de AMW, tramos y reglas de Gold2Risk | 6 pruebas |
| Tipos | `npm run typecheck` · `npm run api:typecheck` | Frontend y API | Sin errores |
| Build | `npm run build` · `npm run api:build` | Frontend y API | Correcto |

Las pruebas del API necesitan la base de Docker en marcha (`npm run api:db`).

## Pruebas en vivo (Stellar testnet)
Con 20 USDC de prueba del faucet de Circle se recorrieron dos campañas reales en el contrato:
- **Campaña A (meta 3 USDC):**
  1. Aporte de prueba de 1 USDC.
  2. El verificador libera el hito 1.
  3. El hito 2 queda bloqueado por falta de fondos.
  4. Aporte de 2 USDC con billetera, firmado fuera del servidor; reenviarlo da 409.
  5. Se libera el hito 2 y la campaña queda completada.
- **Campaña B (meta 4 USDC):** aporte de 2 USDC, hito 1 liberado (1 USDC), cancelación por moderación y reembolso de 1 USDC.
- **Saldos finales en la red:** organización DEMO 4 USDC; donante DEMO 16 USDC. Las dos campañas quedaron conciliadas con el contrato.

## Pruebas de punta a punta en navegador
Se hicieron con Chrome headless; los scripts no están versionados.
- **Sesión:** el rol obtiene su token.
- **Panel:** una transición de estado se aplica en el servidor.
- **QR:** un reporte en la cola local se sincroniza y no se duplica.
- **Donaciones:** un aporte se confirma en testnet y aparece en el río de transparencia.
- **Despliegue en Docker y en el sitio público:** las cinco páginas cargan sin errores de consola, las llamadas al API responden 200 y el service worker queda registrado.

**No probado todavía:**
- celulares reales de gama baja;
- firma con Freighter en un navegador con la extensión;
- recorrido completo solo con teclado y con lector de pantalla.

## Validación de los indicadores
- **Gold2Spectral contra los sedimentos de Dethier et al. (2023):** 75 pares tramo-año, Pearson r = 0,49 (log de sedimentos contra NDTI), Spearman ρ = 0,25. Detalle en [`metodologia.md`](metodologia.md#validación-disponible).
- **Validación con usuarios y especialistas:** el equipo contrastó la propuesta en mentorías y conversaciones con actores durante la semana de la hackathon.
- **Validación con muestras de campo:** pendiente.
