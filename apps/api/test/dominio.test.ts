import { describe, expect, it } from 'vitest';
import { senalComunidad } from '../src/dominio/comunidad';
import { type MedicionValidada, senalOficial } from '../src/dominio/evidencia';
import { codificar, decodificar } from '../src/dominio/qr';
import { tiposPermitidos } from '../src/dominio/roles';
import { accionesPara, type ContextoTransicion, motivoRechazo } from '../src/dominio/solicitudes';
import { normalizar } from '../src/dominio/unidades';

const CRITERIO = { norma: 'NB 512:2016', valorNgL: 1000, verificado: false };
const med = (p: Partial<MedicionValidada>): MedicionValidada => ({
  id: 'm',
  fecha: '2026-01-01',
  calificador: 'detectado',
  valorNgL: 100,
  limiteDeteccionNgL: 50,
  valor: 0.1,
  unidad: 'µg/L',
  metodo: 'CV-AFS',
  demo: true,
  ...p,
});

describe('señal oficial y principios de evidencia', () => {
  it('sin mediciones: sin información, o el estado del trámite', () => {
    expect(senalOficial([], CRITERIO, null).nivel).toBe('sin_analisis');
    expect(senalOficial([], CRITERIO, 'en_proceso').nivel).toBe('en_proceso');
  });

  it('dentro del criterio nunca dice «potable» y avisa que el criterio no está verificado', () => {
    const s = senalOficial([med({ valorNgL: 420 })], CRITERIO, null);
    expect(s.nivel).toBe('dentro_criterio');
    expect(s.estado).toBe('hg_detectado');
    expect(s.detalle).toMatch(/No certifica que el agua sea potable/);
    expect(s.detalle).toMatch(/pendiente de verificar/);
  });

  it('«no detectado» con límite de detección mayor que el criterio no permite concluir', () => {
    const s = senalOficial([med({ calificador: 'no_detectado', valorNgL: null, limiteDeteccionNgL: 2000 })], CRITERIO, null);
    expect(s.nivel).toBe('no_concluyente');
  });

  it('«no detectado» con método sensible: dentro del límite, sin decir «ausente»', () => {
    const s = senalOficial([med({ calificador: 'no_detectado', valorNgL: null, limiteDeteccionNgL: 10 })], CRITERIO, null);
    expect(s.estado).toBe('dentro_limite');
    expect(s.detalle).toMatch(/no significa ausente/);
  });

  it('una medición negativa posterior no borra una positiva anterior', () => {
    const s = senalOficial(
      [med({ id: 'a', fecha: '2026-01-01', valorNgL: 1800 }), med({ id: 'b', fecha: '2026-03-01', valorNgL: 200 })],
      CRITERIO,
      null,
    );
    expect(s.nivel).toBe('no_concluyente');
    expect(s.medicion?.id).toBe('b');
  });

  it('la última medición sobre el criterio manda', () => {
    const s = senalOficial([med({ fecha: '2026-01-01', valorNgL: 200 }), med({ fecha: '2026-03-01', valorNgL: 1800 })], CRITERIO, null);
    expect(s.nivel).toBe('sobre_criterio');
  });
});

describe('señal comunidad', () => {
  it('«riesgoso» con 3 personas distintas; una pregunta no es un reporte', () => {
    expect(senalComunidad([{ tipo: 'pregunta', autor: 'a', coinciden: ['b', 'c'] }]).nivel).toBe('sin_reportes');
    expect(senalComunidad([{ tipo: 'lo_vi', autor: 'a', coinciden: ['b'] }]).nivel).toBe('reportes');
    expect(senalComunidad([{ tipo: 'lo_vi', autor: 'a', coinciden: ['b', 'c'] }]).nivel).toBe('riesgoso');
    // La misma persona respaldando dos veces cuenta una vez.
    expect(senalComunidad([{ tipo: 'lo_vi', autor: 'a', coinciden: ['a', 'b'] }]).nivel).toBe('reportes');
  });
});

describe('transiciones de solicitudes', () => {
  const ctx = (p: Partial<ContextoTransicion> = {}): ContextoTransicion => ({
    rol: 'moderador',
    rolVerificado: true,
    organizacionUsuario: null,
    organizacionAsignada: null,
    mediciones: { total: 0, pendientes: 0, validadas: 0 },
    ...p,
  });

  it('un ciudadano no avanza ningún caso', () => {
    for (const e of ['solicitada', 'en_revision', 'asignada', 'revision_tecnica'] as const) expect(accionesPara('ciudadano', e)).toEqual([]);
  });

  it('rechazar exige motivo', () => {
    expect(motivoRechazo('solicitada', 'rechazada', ctx())).toMatch(/motivo/);
    expect(motivoRechazo('solicitada', 'rechazada', ctx({ nota: 'Duplicada de otra solicitud' }))).toBeNull();
  });

  it('sin rol verificado no hay acción institucional', () => {
    expect(motivoRechazo('en_revision', 'asignada', ctx({ rol: 'ong', rolVerificado: false, organizacionUsuario: 'o1' }))).toMatch(/verificado/);
  });

  it('solo la organización asignada avanza el caso', () => {
    expect(motivoRechazo('asignada', 'en_muestreo', ctx({ rol: 'ong', organizacionUsuario: 'o2', organizacionAsignada: 'o1' }))).toMatch(/asignada/);
  });

  it('no se publica sin resultados validados', () => {
    expect(motivoRechazo('en_analisis', 'revision_tecnica', ctx({ rol: 'laboratorio' }))).toMatch(/cargar/);
    const c = ctx({ rol: 'investigador', mediciones: { total: 1, pendientes: 1, validadas: 0 } });
    expect(motivoRechazo('revision_tecnica', 'resultados_publicados', c)).toMatch(/sin revisión/);
  });
});

describe('roles y unidades', () => {
  it('solo la autoridad publica recomendaciones oficiales', () => {
    expect(tiposPermitidos('autoridad')).toContain('oficial');
    expect(tiposPermitidos('laboratorio')).not.toContain('oficial');
    expect(tiposPermitidos('ciudadano')).not.toContain('oficial');
  });

  it('normaliza por matriz y rechaza unidades que no corresponden', () => {
    expect(normalizar(0.42, 'µg/L', 'agua')).toEqual({ valor: 420, unidad: 'ng/L' });
    expect(normalizar(4, 'µg/g', 'cabello')).toEqual({ valor: 4000, unidad: 'ng/g' });
    expect(normalizar(1, 'µg/L', 'pez')).toBeNull();
  });
});

describe('QR v1', () => {
  const r = { id: '3f0c8a52-2b1e-4c7a-9d3e-1a2b3c4d5e6f', t: 'obs' as const, c: 'rio-rio-beni', d: '2026-11-26', x: 'Agua turbia', a: 'Rosa' };

  it('ida y vuelta', () => {
    expect(decodificar(codificar(r))).toEqual({ v: 1, ...r });
  });

  it('rechaza códigos ajenos, alterados o demasiado largos', () => {
    expect(decodificar('https://example.com')).toBeNull();
    expect(decodificar('G2R1:no-es-base64-json')).toBeNull();
    expect(decodificar(codificar({ ...r, c: 'RIO:Beni' }))).toBeNull();
    expect(decodificar('G2R1:' + 'a'.repeat(2000))).toBeNull();
  });
});
