# Documentación de Gold2Life

Documentación técnica del proyecto, presentado a Gold4Good 2026 en los desafíos **ORO-3.1** («Información verificada, riesgos y prevención») y **ORO-3.3** («Mapa vivo de estudios y proyectos sobre mercurio»).

## Para entender el proyecto
| Documento | Contenido |
|---|---|
| [`PROYECTO.md`](PROYECTO.md) | Problema, actores, los cinco espacios, flujo central y principios de evidencia |
| [`ESTADO.md`](ESTADO.md) | Qué está hecho, qué es real y qué es DEMO, y qué se probó |
| [`roadmap.md`](roadmap.md) | Qué sigue: corto, mediano y largo plazo |

## Documentación técnica
| Documento | Contenido |
|---|---|
| [`arquitectura.md`](arquitectura.md) | Componentes, flujos de datos y decisiones técnicas |
| [`modulos.md`](modulos.md) | Funcionamiento de cada espacio de la plataforma |
| [`api-y-datos.md`](api-y-datos.md) | Rutas del API y modelo de datos |
| [`geoespacial-y-satelital.md`](geoespacial-y-satelital.md) | Mapas, globo, tramos de río y procesamiento de Sentinel-2 |
| [`metodologia.md`](metodologia.md) | Laboratorio virtual: huella minera, indicadores espectrales, reglas de prioridad y uso de IA |
| [`participacion-y-verificacion.md`](participacion-y-verificacion.md) | Participación comunitaria, tres señales, flujo de solicitudes y revisión técnica |
| [`seguridad-y-privacidad.md`](seguridad-y-privacidad.md) | Datos personales, ubicaciones, claves, roles y blockchain |
| [`FUENTES.md`](FUENTES.md) | Fuentes de datos, licencias y su verificación |
| [`DESPLIEGUE.md`](DESPLIEGUE.md) | Despliegue con Docker en un VPS |
| [`pruebas.md`](pruebas.md) | Pruebas automatizadas, pruebas en vivo y validación |
| [`limitaciones.md`](limitaciones.md) | Limitaciones técnicas y científicas |

## Documentación por componente
- [`apps/api/README.md`](../apps/api/README.md): API (NestJS + PostGIS).
- [`contracts/escrow/README.md`](../contracts/escrow/README.md): contrato de escrow por hitos (Soroban, Stellar testnet).
- [`science/README.md`](../science/README.md): pipeline del laboratorio virtual (Python).

## Documentos de diseño y contexto
- [`diseno.md`](diseno.md): sistema visual aplicado.
- [`contexto/`](contexto/): plan, contexto, diseño UX, ciencia de datos e implementación. Son los documentos de partida del proyecto.
- [`TRABAJO-REALIZADO.md`](TRABAJO-REALIZADO.md): registro del trabajo de backend, escrow, laboratorio y despliegue.
