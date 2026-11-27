# Limitaciones técnicas y científicas

## Científicas
- **El satélite no mide mercurio.** Gold2Mining y Gold2Spectral producen indicadores de actividad minera y de cambio ambiental, y Gold2Risk los traduce en prioridad de muestreo. Ninguno confirma ni estima contaminación por mercurio.
- **Umbrales v0.** Los umbrales de Gold2Risk (20 ha, 50 ha, z ≥ 2) son ilustrativos y no los ha revisado un especialista.
- **R2 suma minería sin considerar distancia.** Todo el Beni sale con prioridad «media» por la minería acumulada aguas arriba, aunque esté a más de 100 km. Es la primera mejora prevista: atenuar el efecto con la distancia.
- **NDTI es turbidez relativa,** no NTU ni sedimentos medidos. Se satura con cientos de mg/L, y su validación contra sedimentos calibrados es de débil a moderada (r = 0,49). Los ríos estrechos (Tipuani, Coroico) tienen pocos píxeles de agua a 20 m.
- **Época seca solamente.** Las nubes de los Yungas impiden una serie útil el resto del año, y la crecida, cuando más mercurio viaja con los sedimentos, queda fuera.
- **Cobertura de Amazon Mining Watch.** El producto sigue su propio límite de la cuenca amazónica: en las cabeceras andinas, un cero puede significar «fuera de cobertura». Su detección es automática y puede confundir, por ejemplo, playas de río con minería.
- **«Aguas arriba» es aproximado.** Se calcula con la red de OSM y una franja de 3 km; no es una cuenca hidrológica.
- **Gold2Mercury en pausa.** No hay muestras de Bolivia con coordenadas para validar un modelo.
- **Sin validación con mediciones directas de campo.** La serie de sedimentos de SO-HYBAM en Rurrenabaque existe (CC BY 4.0), pero su servicio de descarga no funcionaba al consultarlo. Los estudios del IRD con mercurio por río estaban en mantenimiento.
- **NB 512:2016.** El valor de Hg para agua potable (0,001 mg/L) está pendiente de verificar en la tabla oficial; el sistema lo marca como no verificado.

## Técnicas
- **Autenticación de demostración** (`AUTH_MODE=demo`): no hay cuentas verificadas.
- **Datos de ejemplo:** lugares, publicaciones, solicitudes y algunas mediciones son DEMO, y están marcados.
- **Escrow solo en testnet.** El verificador firma con una clave que custodia el servidor. Si el contrato crea una campaña pero falla la base de datos, la campaña queda solo en la cadena y hay que conciliarla a mano.
- **Sin extracción asistida de metadatos desde PDF.** La biblioteca de estudios se carga a mano (7 registros).
- **Sin pruebas en dispositivos reales.** No se probó en celulares de gama baja, ni la PWA instalada en modo avión real.
- **Caché de Cloudflare.** En el despliegue público, Cloudflare guarda `sw.js` por 4 horas: hay que configurar una regla para respetar los encabezados del origen.
- **Contenido editorial.** Los textos de las cartas de Infórmate son borradores pendientes de revisión con especialistas y con la autoridad sanitaria.
- **Idiomas.** Por ahora solo hay español. Los idiomas originarios y el audio son una ampliación prevista, a revisar con las comunidades.
