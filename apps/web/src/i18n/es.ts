// Diccionario en español. Todo texto visible o aria-label vive aquí (penguin: i18n desde el inicio).
import mapa from './es-mapa';
import cuenta from './es-cuenta';
import informate from './es-informate';
import laboratorio from './es-laboratorio';
import donaciones from './es-donaciones';

const es = {
  mapa,
  cuenta,
  informate,
  laboratorio,
  donaciones,
  comun: {
    saltarContenido: 'Saltar al contenido',
    demo: 'Demo',
    fuente: 'Fuente',
    verFuente: 'Ver fuente',
    abrirMenu: 'Abrir navegación',
    cerrar: 'Cerrar',
    enConstruccion: 'Esta sección se está diseñando',
    enConstruccionTexto:
      'Primero aprobamos el estilo del Inicio. Después construiremos esta pestaña con su propia experiencia.',
    volverInicio: 'Volver al inicio',
  },
  nav: {
    principal: 'Navegación principal',
    inicio: 'Inicio',
    mapa: 'Mapa comunitario',
    mapaCorto: 'Mapa',
    laboratorio: 'Laboratorio',
    laboratorioCorto: 'Laboratorio',
    informate: 'Infórmate',
    informateCorto: 'Infórmate',
    donaciones: 'Donaciones',
    donacionesCorto: 'Donar',
    ingresar: 'Ingresar',
  },
  tema: {
    modoClaro: 'Modo claro',
    aClaro: 'Cambiar a modo claro',
    aOscuro: 'Cambiar a modo oscuro',
  },
  inicio: {
    titulo: 'El lado invisible del oro',
    resumen: 'Resumen del recorrido',
    desliza: 'Desliza para descubrir',
    saltar: 'Saltar recorrido',
    versionLigera: 'Versión ligera',
    versionAnimada: 'Versión animada',
    capitulo: 'Capítulo {{n}}: {{nombre}}',
    capitulos: 'Capítulos del recorrido',
    contador: '{{n}} / {{total}}',
    cargandoEscena: 'Preparando la escena',
    sinWebgl: 'Tu dispositivo no puede mostrar la escena 3D. Te mostramos la versión ligera, con el mismo contenido.',
    nombres: ['El valor', 'Lo que no vemos', 'Amenaza invisible', 'Nueva perspectiva', 'Nuestra solución', 'Amanecer'],
    c1: {
      titulo: 'Conocemos el valor del oro.',
    },
    c2: {
      titulo: 'Pero no siempre conocemos su costo.',
      datoValor: '≈ 38 %',
      datoTexto:
        'de las emisiones de mercurio al aire causadas por actividades humanas provienen de la minería de oro artesanal y de pequeña escala: la mayor fuente del mundo.',
      datoFuente: 'PNUMA, Evaluación Mundial del Mercurio 2018 · datos de 2015',
      nota: 'No toda la minería de oro usa mercurio. Donde se usa, parte se libera al aire, al suelo y al agua.',
      hgTitulo: 'Mercurio (Hg)',
      hgTexto: 'En parte de la minería artesanal se usa para separar el oro. Después, se libera y llega a los ríos.',
    },
    c3: {
      titulo: 'Una amenaza que no siempre podemos ver.',
      texto:
        'El mercurio liberado llega a ríos y sedimentos. Allí puede transformarse en metilmercurio, que se acumula en los peces y sube por la cadena alimentaria hasta nuestros platos.',
      fuente: 'OMS, El mercurio y la salud',
      datoValor: '4 µg/g',
      datoTexto: 'de mercurio en cabello humano: el registro más reciente (2022–2023) reunido para la cuenca del Beni.',
      datoFuente: 'Valdivieso et al., 2025 · Revista Boliviana de Química 42(2)',
      nota: 'Las partículas plateadas son una metáfora: el mercurio no se ve a simple vista.',
    },
    c4: {
      titulo: 'Lo invisible no tiene por qué permanecer desconocido.',
      leyendaLocalidades: 'Localidades de la cuenca del Beni',
      leyendaNota: 'Puntos de referencia geográfica. No indican contaminación.',
      leyendaFuente: 'OpenStreetMap',
    },
    c5: {
      overline: 'Nuestra solución',
      titulo: 'Cuatro caminos, una misma red.',
      paneles: [
        {
          titulo: 'Una comunidad conectada',
          texto: 'Consulta, comparte información y solicita investigaciones, incluso sin conexión permanente.',
          accion: 'Ir al mapa comunitario',
        },
        {
          titulo: 'Un laboratorio sin fronteras',
          texto: 'Satélites, inteligencia artificial y evidencia científica en un mismo lugar.',
          accion: 'Abrir el laboratorio',
        },
        {
          titulo: 'Conocimiento que protege',
          texto: 'Información visual y accesible para prevenir los riesgos del mercurio.',
          accion: 'Ver las cartas',
        },
        {
          titulo: 'Recursos que transforman',
          texto: 'Donaciones transparentes para financiar investigaciones e intervenciones.',
          accion: 'Ver campañas',
        },
      ],
    },
    c6: {
      linea1: 'El oro tiene valor.',
      linea2: 'La vida no tiene precio.',
      cta1: 'Explorar mi comunidad',
      cta2: 'Explorar laboratorio',
    },
    fuentes: {
      titulo: 'Fuentes de esta página',
      nota: 'Cifras con fuente, fecha y contexto. Las escenas son ilustrativas: no muestran mediciones.',
    },
  },
};

export default es;
export type Diccionario = typeof es;
