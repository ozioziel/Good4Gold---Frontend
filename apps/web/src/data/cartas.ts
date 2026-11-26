// Catálogo inicial de cartas de Infórmate (plan.md §2.5.2). Los textos son borradores editoriales:
// deben revisarse con fuentes oficiales y especialistas antes de publicarse (estado «revision»).
export type Categoria = 'oro' | 'mercurio' | 'agua' | 'salud' | 'prevencion' | 'naturaleza' | 'mineria' | 'comunidad';
export type Ilus =
  | 'pepitas'
  | 'gotas'
  | 'origen'
  | 'rio'
  | 'vapor'
  | 'pez'
  | 'plato'
  | 'vaso'
  | 'olla'
  | 'frasco'
  | 'alerta'
  | 'persona'
  | 'cerebro'
  | 'madre'
  | 'manos'
  | 'casco'
  | 'bosque'
  | 'sedimento'
  | 'mesa'
  | 'documento'
  | 'casas'
  | 'balanza'
  | 'satelite'
  | 'celular'
  | 'brote';

export interface Fuente {
  titulo: string;
  url: string;
}

export interface Carta {
  id: string;
  categoria: Categoria;
  titulo: string;
  texto: string;
  ilus: Ilus;
  fuente: Fuente;
  accion?: { texto: string; to: string };
  estado: 'revision' | 'publicada';
  revisada: string;
}

export const FUENTES = {
  ops: { titulo: 'OPS · Mi comunidad se cuida del mercurio', url: 'https://www.paho.org/es/documentos/mi-comunidad-se-cuida-mercurio' },
  oms: { titulo: 'OMS · El mercurio y la salud', url: 'https://www.who.int/es/news-room/fact-sheets/detail/mercury-and-health' },
  pnuma: { titulo: 'PNUMA · Evaluación Mundial del Mercurio 2018', url: 'https://wedocs.unep.org/bitstream/handle/20.500.11822/29830/GMAKF_EN.pdf' },
  planetgold: { titulo: 'planetGOLD', url: 'https://www.planetgold.org/' },
  minamata: { titulo: 'Convenio de Minamata sobre el Mercurio', url: 'https://minamataconvention.org/' },
  nb512: { titulo: 'AAPS · Compendio normativo de calidad del agua (NB 512)', url: 'https://www.aaps.gob.bo/images/transparencia/comunicacion/Compendio%20Normativo%20calidad%20agua-2018.pdf' },
  plataforma: { titulo: 'Gold2Life · Cómo funciona el mapa', url: '/mapa' },
} satisfies Record<string, Fuente>;

export const CATEGORIAS: Categoria[] = ['oro', 'mercurio', 'agua', 'salud', 'prevencion', 'naturaleza', 'mineria', 'comunidad'];

const c = (
  id: string,
  categoria: Categoria,
  titulo: string,
  texto: string,
  ilus: Ilus,
  fuente: Fuente,
  accion?: Carta['accion'],
): Carta => ({ id, categoria, titulo, texto, ilus, fuente, accion, estado: 'revision', revisada: '2026-11-26' });

export const CARTAS: Carta[] = [
  c('por-que-oro', 'oro', '¿Por qué el oro?', 'El oro se usa en joyería, tecnología y actividades económicas. Su extracción debe proteger la salud de las personas y el ambiente.', 'pepitas', FUENTES.planetgold),
  c('oro-mercurio', 'oro', 'Oro y mercurio', 'En parte de la minería artesanal se utiliza mercurio para separar oro de otros materiales. Su liberación puede contaminar aire, suelo y agua.', 'gotas', FUENTES.pnuma),
  c('origen-responsable', 'oro', 'Origen responsable', 'Conocer el origen del oro y las condiciones de extracción ayuda a promover cadenas de suministro responsables.', 'origen', FUENTES.planetgold),
  c('que-es-hg', 'mercurio', '¿Qué es el mercurio?', 'Es un elemento químico tóxico. Algunas de sus formas pueden afectar la salud incluso cuando no se ven ni se huelen.', 'gotas', FUENTES.oms),
  c('suelo-rio', 'mercurio', 'Del suelo al río', 'El mercurio liberado al ambiente puede llegar al agua y los sedimentos, y transportarse a otros lugares.', 'rio', FUENTES.ops),
  c('hg-aire', 'mercurio', 'Mercurio en el aire', 'Respirar vapores de mercurio es una vía de exposición importante en actividades que lo utilizan. Evita acercarte a zonas de procesamiento sin protección adecuada.', 'vapor', FUENTES.oms),
  c('metilmercurio', 'mercurio', 'Metilmercurio', 'Algunos microorganismos transforman mercurio en metilmercurio, una forma que puede acumularse en organismos acuáticos.', 'pez', FUENTES.oms),
  c('rio-plato', 'mercurio', 'Del río al plato', 'El metilmercurio puede acumularse en peces y aumentar a través de la cadena alimentaria. Las recomendaciones de consumo deben adaptarse a cada región.', 'plato', FUENTES.oms),
  c('agua-transparente', 'agua', 'Agua transparente', 'Que el agua se vea limpia no significa que esté libre de contaminantes. Algunos solo se detectan mediante análisis.', 'vaso', FUENTES.ops),
  c('hervir', 'agua', 'Hervir no basta', 'Hervir el agua ayuda a eliminar muchos microorganismos, pero no elimina el mercurio ni otros metales disueltos.', 'olla', FUENTES.ops),
  c('que-hay', 'agua', '¿Qué hay en mi agua?', 'Consulta análisis de tu fuente de agua. Si no existen datos recientes, solicita una investigación.', 'frasco', FUENTES.plataforma, { texto: 'Buscar mi fuente', to: '/mapa' }),
  c('prueba-no-basta', 'agua', 'Una prueba no basta', 'Un resultado de mercurio dentro del límite no demuestra que el agua sea potable: también hay que evaluar otros contaminantes.', 'balanza', FUENTES.nb512),
  c('sospecha', 'agua', 'Ante una sospecha', 'Si existe una alerta de contaminación química, sigue las indicaciones de la autoridad sanitaria y utiliza una fuente alternativa segura para beber y cocinar.', 'alerta', FUENTES.ops),
  c('pruebas-confiables', 'agua', 'Pruebas confiables', 'Una medición debe identificar la sustancia analizada, la fecha, la fuente y el método. Una fotografía no reemplaza un análisis químico.', 'frasco', FUENTES.ops),
  c('como-entra', 'salud', '¿Cómo entra al cuerpo?', 'Podemos exponernos al mercurio al respirar vapores o consumir alimentos contaminados, entre otras vías.', 'persona', FUENTES.oms),
  c('sistema-nervioso', 'salud', 'El sistema nervioso', 'La exposición al mercurio puede afectar el sistema nervioso y otros órganos. Los efectos dependen de la forma, dosis y duración de la exposición.', 'cerebro', FUENTES.oms),
  c('embarazo', 'salud', 'Embarazo e infancia', 'El desarrollo del sistema nervioso de fetos y niños es especialmente vulnerable al metilmercurio. Consulta recomendaciones sanitarias locales.', 'madre', FUENTES.oms),
  c('pescado-nutricion', 'salud', 'Pescado y nutrición', 'El pescado aporta nutrientes importantes. Sigue orientaciones locales sobre especies y consumo para reducir la exposición sin perder sus beneficios.', 'pez', FUENTES.oms),
  c('orientacion', 'salud', 'Busca orientación', 'Si sospechas exposición al mercurio, consulta a un centro de salud. Los síntomas por sí solos no permiten confirmar una intoxicación.', 'manos', FUENTES.ops),
  c('no-manipules', 'prevencion', 'No manipules mercurio', 'No manipules mercurio ni intentes realizar experimentos caseros con él. Ante un derrame, solicita orientación especializada.', 'alerta', FUENTES.ops),
  c('proteccion-trabajo', 'prevencion', 'Protección en el trabajo', 'Reducir la exposición laboral requiere procesos más seguros, controles técnicos, capacitación y medidas de protección adecuadas.', 'casco', FUENTES.planetgold),
  c('mujeres-mineria', 'prevencion', 'Mujeres en la minería', 'La seguridad laboral debe proteger a todas las personas y considerar los riesgos específicos que enfrentan las mujeres, incluidas las embarazadas.', 'madre', FUENTES.planetgold),
  c('rios-conectados', 'naturaleza', 'Ríos conectados', 'Las cuencas conectan territorios: una alteración aguas arriba puede afectar lugares aguas abajo.', 'rio', FUENTES.pnuma),
  c('bosques-agua', 'naturaleza', 'Bosques y agua', 'Los bosques ayudan a proteger suelos, ecosistemas y fuentes de agua. La pérdida de vegetación puede incrementar la erosión.', 'bosque', FUENTES.pnuma),
  c('sedimentos', 'naturaleza', 'Sedimentos', 'Los sedimentos pueden transportar contaminantes, pero el agua turbia no demuestra por sí sola que contenga mercurio.', 'sedimento', FUENTES.ops),
  c('alternativas', 'mineria', 'Alternativas al mercurio', 'Existen tecnologías de recuperación de oro sin mercurio. Su elección depende de las características del mineral y del asesoramiento técnico.', 'mesa', FUENTES.planetgold),
  c('minamata', 'mineria', 'Minamata', 'El Convenio de Minamata promueve la protección de la salud y el ambiente frente a emisiones y liberaciones de mercurio.', 'documento', FUENTES.minamata),
  c('comunidad-informa', 'comunidad', 'Tu comunidad informa', 'Comparte observaciones y consultas en el mapa. Un reporte ayuda a priorizar investigaciones, pero no confirma contaminación.', 'casas', FUENTES.plataforma, { texto: 'Abrir el mapa', to: '/mapa' }),
  c('quien-confirma', 'comunidad', '¿Quién lo confirma?', 'Los análisis químicos adecuados y la evidencia científica respaldan las conclusiones sobre mercurio. Los votos no sustituyen las mediciones.', 'frasco', FUENTES.plataforma),
  c('desde-espacio', 'comunidad', 'Desde el espacio', 'Los satélites permiten observar cambios ambientales y orientar investigaciones. No certifican directamente si el agua contiene mercurio.', 'satelite', FUENTES.plataforma, { texto: 'Ver el laboratorio', to: '/laboratorio' }),
  c('solicita', 'comunidad', 'Solicita un análisis', 'Si tu comunidad no tiene información suficiente, crea una solicitud para que investigadores u organizaciones participantes puedan atenderla.', 'manos', FUENTES.plataforma, { texto: 'Pedir un análisis', to: '/mapa' }),
  c('sin-internet', 'comunidad', 'Sin internet', 'Guarda tu reporte y compártelo por QR. Cuando alguien recupere conexión, podrá sincronizarlo con el mapa.', 'celular', FUENTES.plataforma),
  c('donar', 'comunidad', 'Donar para investigar', 'Las campañas permiten financiar mediciones y acciones preventivas. Los resultados y desembolsos deben respaldarse con evidencias.', 'brote', FUENTES.plataforma, { texto: 'Ver campañas', to: '/donaciones' }),
];
