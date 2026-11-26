// Señal «Laboratorio oficial» y estado de evidencia química (PROYECTO.md §5).
// Reglas que se aplican aquí:
//  · solo cuentan mediciones validadas por revisión técnica;
//  · el criterio de agua de consumo solo se aplica a agua y Hg total (no a peces, cabello ni sedimentos);
//  · «no detectado» con un límite de detección mayor que el criterio no permite concluir;
//  · una medición posterior dentro del criterio no borra una anterior sobre el criterio: queda «no concluyente»;
//  · «dentro del criterio» nunca dice «potable».
export type NivelOficial = 'sin_analisis' | 'solicitado' | 'en_proceso' | 'dentro_criterio' | 'sobre_criterio' | 'no_concluyente';
export type EstadoEvidencia =
  | 'sin_informacion'
  | 'indicios_riesgo'
  | 'hg_detectado'
  | 'sobre_limite'
  | 'dentro_limite'
  | 'no_concluyente';

export interface MedicionValidada {
  id: string;
  fecha: string; // de muestreo, AAAA-MM-DD
  calificador: 'detectado' | 'no_detectado' | 'bajo_lc' | 'no_concluyente';
  valorNgL: number | null;
  limiteDeteccionNgL: number | null;
  valor: number | null;
  unidad: string;
  metodo: string;
  demo: boolean;
}

export interface Criterio {
  norma: string;
  valorNgL: number;
  verificado: boolean;
}

export interface SenalOficial {
  nivel: NivelOficial;
  estado: EstadoEvidencia;
  detalle: string;
  /** Última medición considerada (aplica a esa muestra, no a toda la comunidad). */
  medicion?: { id: string; fecha: string; valor: number | null; unidad: string; calificador: string; metodo: string; demo: boolean };
  criterio?: { norma: string; valor_ng_l: number; verificado: boolean };
  tramite?: 'solicitado' | 'en_proceso';
}

type Clase = 'sobre' | 'dentro_detectado' | 'dentro_no_detectado' | 'nc';

function clasificar(m: MedicionValidada, c: Criterio): Clase {
  if (m.calificador === 'no_concluyente') return 'nc';
  if (m.calificador === 'detectado') {
    if (m.valorNgL == null) return 'nc';
    return m.valorNgL > c.valorNgL ? 'sobre' : 'dentro_detectado';
  }
  // no_detectado / bajo el límite de cuantificación: depende de la sensibilidad del método.
  if (m.limiteDeteccionNgL == null || m.limiteDeteccionNgL > c.valorNgL) return 'nc';
  return 'dentro_no_detectado';
}

const AVISO_CRITERIO = ' El criterio usado está pendiente de verificar en la norma oficial.';

/** mediciones: agua, Hg total, validadas. tramite: estado del trámite activo más reciente, si hay. */
export function senalOficial(mediciones: MedicionValidada[], criterio: Criterio, tramite: 'solicitado' | 'en_proceso' | null): SenalOficial {
  const crit = { norma: criterio.norma, valor_ng_l: criterio.valorNgL, verificado: criterio.verificado };
  const extra = tramite ? { tramite } : {};
  if (mediciones.length === 0) {
    if (tramite === 'solicitado') return { nivel: 'solicitado', estado: 'sin_informacion', detalle: 'Se pidió un análisis. Todavía no hay resultados.', ...extra };
    if (tramite === 'en_proceso') return { nivel: 'en_proceso', estado: 'sin_informacion', detalle: 'Un laboratorio participante está trabajando en el caso.', ...extra };
    return { nivel: 'sin_analisis', estado: 'sin_informacion', detalle: 'No hay un análisis químico vigente.' };
  }
  const orden = [...mediciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const clases = orden.map((m) => clasificar(m, criterio));
  const ultima = orden[0]!;
  const medicion = {
    id: ultima.id,
    fecha: ultima.fecha,
    valor: ultima.valor,
    unidad: ultima.unidad,
    calificador: ultima.calificador,
    metodo: ultima.metodo,
    demo: ultima.demo,
  };
  const aviso = criterio.verificado ? '' : AVISO_CRITERIO;
  const base = { medicion, criterio: crit, ...extra };

  if (clases[0] === 'sobre')
    return { nivel: 'sobre_criterio', estado: 'sobre_limite', detalle: `Sobre el criterio para agua de consumo en la muestra del ${ultima.fecha}. Sigue la recomendación oficial.${aviso}`, ...base };
  if (clases.includes('sobre'))
    return {
      nivel: 'no_concluyente',
      estado: 'no_concluyente',
      detalle: 'Una medición anterior superó el criterio y otra posterior no. Una medición negativa no borra una positiva: la discrepancia se revisa con documentación.',
      ...base,
    };
  if (clases[0] === 'nc')
    return {
      nivel: 'no_concluyente',
      estado: 'no_concluyente',
      detalle: ultima.calificador === 'no_concluyente' ? 'El laboratorio informó un resultado no concluyente.' : 'El método no detecta concentraciones tan bajas como el criterio. Hay que repetir con un método más sensible.',
      ...base,
    };
  if (clases[0] === 'dentro_detectado')
    return { nivel: 'dentro_criterio', estado: 'hg_detectado', detalle: `Hg detectado, dentro del criterio. No certifica que el agua sea potable.${aviso}`, ...base };
  return {
    nivel: 'dentro_criterio',
    estado: 'dentro_limite',
    detalle: `No detectado con el límite del método (no significa ausente). No certifica que el agua sea potable.${aviso}`,
    ...base,
  };
}
