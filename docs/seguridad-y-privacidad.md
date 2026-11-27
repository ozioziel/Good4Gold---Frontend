# Seguridad y privacidad

## Datos personales y comunidades
- **Ubicaciones:** se redondean a unos 100 m antes de guardarse. Nunca se registra la ubicación exacta de una vivienda.
- **Solicitudes públicas:** muestran solo el nombre visible y el rol de quien pidió.
- **Datos de salud:** no se recogen datos de salud individuales. Las cifras de cabello del Inicio son agregados publicados (Valdivieso et al., 2025).
- **QR:** sin fotos, contraseñas, datos médicos ni ubicaciones exactas.
- **Registro en nombre de familias:** el representante solo puede hacerlo con consentimiento, y el servidor lo exige (`CHECK familias_representadas IS NULL OR consentimiento`).
- **Lugares reales:** aparecen como «sin información suficiente» hasta que exista una medición; los ejemplos con resultados usan **comunidades ficticias marcadas DEMO**, para no estigmatizar territorios.

## Autenticación y permisos
- **Modo actual:** `AUTH_MODE=demo`, en el que la persona elige un rol. El token es un JWT HS256 firmado por el servidor (7 días), y **el rol se vuelve a leer de la base en cada petición**: un token no basta para escalar permisos.
- **Validación en el servidor:** todas las mutaciones validan rol, verificación del rol y organización. La interfaz solo muestra lo que el servidor permite.
- **Auditoría:** cada mutación queda en la tabla `auditoria`.
- **Pendiente:** autenticación real con cuentas verificadas. Ver [`roadmap.md`](roadmap.md).

## Claves y configuración
- **Ubicación de las claves:** están en `.env` (raíz para `docker compose`, `apps/api/.env` para desarrollo). Git las ignora y `.dockerignore` las deja fuera de las imágenes.
- **Ejemplos sin valores reales:** `.env.example` documenta las variables sin credenciales.
- **Stellar:** las claves son **solo de testnet**, y la API rechaza otra red (`STELLAR_RED=testnet`).
- **Contraseñas de base de datos:** usar valores hexadecimales (`openssl rand -hex 24`), porque viajan dentro de la URL de conexión.

## Blockchain
- **Qué va en la cadena:** solo direcciones, montos, hashes de evidencia y una referencia opaca a la campaña.
- **Qué no va:** datos personales, informes ni coordenadas.
- **Aporte con billetera:** el servidor solo envía una transacción firmada si es **exactamente** el aporte que preparó (contrato, función, campaña, donante y monto).
- **Verificador DEMO:** en la demostración firma con una clave que custodia el servidor. En producción, la organización verificadora firmaría con su propia billetera.

## Infraestructura
- **Base de datos:** no publica puertos fuera de la red de Docker.
- **nginx:** envía los encabezados `X-Content-Type-Options` y `Referrer-Policy`.
- **HTTPS:** con Caddy (certificado automático) o con el nginx del host más certbot. Es necesario para la PWA, la cámara del QR y la billetera.
