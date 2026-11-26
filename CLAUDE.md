# Instrucciones para Claude Code — Gold2…

> Ubicación de los documentos: `plan.md`, `contexto-proyecto.md`, `diseno-ux.md`, `ciencia-datos.md` e `implementacion.md` viven en `docs/contexto/`. El estado actual está en `docs/ESTADO.md`, el diseño aplicado en `docs/diseno.md` y las fuentes en `docs/FUENTES.md`.
> Decisión vigente (2026-11-25): primero todo el frontend con datos simulados marcados DEMO, pestaña por pestaña, con aprobación del estilo de cada una antes de pasar a la siguiente.

## Antes de editar

1. Lee `plan.md` completo y `contexto-proyecto.md`. Lee `diseno-ux.md`, `ciencia-datos.md` e `implementacion.md` según el módulo que vayas a trabajar.
2. Inspecciona el repositorio actual, estructura, dependencias, datos, configuración y estado de git; conserva trabajo existente. No asumas que el stack sugerido está instalado.
3. Si existen skills locales de frontend, 3D, GIS, UX, PWA, backend o blockchain, revisa las pertinentes y usa las que aporten valor. No supongas acceso a repositorios/skills ajenos.
4. Presenta un resumen corto de entendimiento, alcance, arquitectura y prioridades. Señala decisiones realmente bloqueantes; no vuelvas a preguntar por decisiones ya fijadas en el plan.

## Reglas del producto

- Cinco pestañas: Inicio, Mapa comunitario, Laboratorio, Infórmate y Donaciones. Autenticación y roles. Investigaciones dentro de Laboratorio.
- Mantener el enfoque rural: PWA, datos descargables, QR de contenido sin conexión, interfaz ligera, accesibilidad, no requerir hardware adicional.
- Separar reportes ciudadanos, estimaciones de IA, mediciones químicas y alertas oficiales. Un voto no determina contaminación; un resultado de Hg no certifica potabilidad. No inventar cifras científicas, precisión, alianzas o datos de producción.
- Priorizar flujos funcionales de extremo a extremo. Usar datos reales citados cuando se puedan obtener y marcar explícitamente datos simulados. No enviar correos reales ni operar con fondos reales durante pruebas sin autorización.
- Donaciones en testnet, asociadas a solicitudes, con hitos, evidencia, verificador y trazabilidad. No incluir datos sensibles en blockchain ni presentar una planta virtual como impacto real.
- Diseño específico por pestaña (ver `diseno-ux.md`). No usar una plantilla genérica. Conservar Inicio y Donaciones como narrativas distintas.

## Implementación y entrega

- Mantener versiones configurables, secretos en variables de entorno y `.env.example` sin credenciales. No introducir claves privadas ni datos personales en git. Seguir convenciones del repo y añadir `.gitignore` cuando falte.
- Implementar por verticales y probar integración. Mantener un registro de funcionalidades terminadas, parciales y pendientes, comandos reproducibles, fuentes/licencias y limitaciones reales.
- No declarar un requisito hecho sin probarlo. Ejecutar lint, pruebas y build disponibles; documentar bloqueos. Probar navegación, roles, sincronización idempotente, QR en modo avión, separación de evidencia y flujo de donación demo.
- No publicar ni desplegar por cuenta propia si requiere autorización, credenciales o costos. No cambiar decisiones de alcance aprobadas sin justificarlo. Mantener la marca provisional configurable.
- `plan.md` prevalece como documento de alcance. Los archivos auxiliares explican la intención y sirven como criterios; el MVP debe adaptarse al plazo y al estado real del repositorio.
