// Pruebas de integración contra PostgreSQL/PostGIS real (base gold2_test, ver test/preparar.ts).
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configurar } from '../src/app';
import { AppModule } from '../src/app.module';
import { codificar } from '../src/dominio/qr';

let app: INestApplication;
const api = () => request(app.getHttpServer());

async function ingresar(rol: string, nombre?: string) {
  const r = await api().post('/auth/demo').send({ rol, ...(nombre ? { nombre } : {}) }).expect(201);
  return { token: r.body.token as string, id: r.body.usuario.id as string, h: { Authorization: `Bearer ${r.body.token}` } };
}

beforeAll(async () => {
  const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = m.createNestApplication();
  configurar(app);
  await app.init();
});
afterAll(async () => {
  await app?.close();
});

describe('lugares y señales', () => {
  it('un río real sin mediciones aparece «sin información suficiente»', async () => {
    const r = await api().get('/water-sources/rio:rio-kaka').expect(200);
    expect(r.body.ficticia).toBe(false);
    expect(r.body.senales.oficial.nivel).toBe('sin_analisis');
    expect(r.body.estadoEvidencia).toBe('sin_informacion');
  });

  it('las tres señales de un lugar DEMO salen separadas y con su aclaración', async () => {
    const r = await api().get('/water-sources/demo:villa-tajibo').expect(200);
    expect(r.body.senales.oficial.nivel).toBe('dentro_criterio');
    expect(r.body.senales.oficial.aclaracion).toMatch(/No certifica/);
    expect(r.body.senales.virtual.aclaracion).toMatch(/No mide mercurio/);
    expect(r.body.senales.comunidad.aclaracion).toMatch(/No confirma mercurio/);
  });

  it('San Lucero: «no detectado» con un método poco sensible es no concluyente', async () => {
    const r = await api().get('/water-sources/demo:san-lucero').expect(200);
    expect(r.body.senales.oficial.nivel).toBe('no_concluyente');
  });

  it('busca por nombre y por bbox; la comunidad trae sus fuentes', async () => {
    expect((await api().get('/water-sources?q=beni').expect(200)).body.map((f: { id: string }) => f.id)).toContain('rio:rio-beni');
    const bbox = (await api().get('/water-sources?bbox=-68.3,-15.7,-67.7,-15.2').expect(200)).body.map((f: { id: string }) => f.id);
    expect(bbox).toContain('rio:rio-mapiri');
    expect(bbox).not.toContain('rio:rio-beni');
    const c = await api().get('/communities/rurrenabaque').expect(200);
    expect(c.body.fuentes.map((f: { id: string }) => f.id)).toContain('rio:rio-beni');
  });
});

describe('autenticación y permisos', () => {
  it('sin sesión no se publica', async () => {
    await api().post('/posts').send({ id: randomUUID(), fuenteId: 'rio:rio-beni', tipo: 'pregunta', texto: 'Hola' }).expect(401);
  });

  it('un token alterado no da acceso', async () => {
    const { token } = await ingresar('ciudadano');
    await api().get('/auth/yo').set({ Authorization: `Bearer ${token}x` }).expect(401);
  });

  it('un ciudadano no publica recomendaciones oficiales ni carga mediciones', async () => {
    const c = await ingresar('ciudadano');
    await api().post('/posts').set(c.h).send({ id: randomUUID(), fuenteId: 'rio:rio-beni', tipo: 'oficial', texto: 'No beber' }).expect(403);
    await api().post('/samples').set(c.h).send({ fuenteId: 'rio:rio-beni', matriz: 'agua', fechaMuestreo: '2026-11-01' }).expect(403);
  });
});

describe('publicar, respaldar y responder', () => {
  it('publica en un río nuevo del mapa base, idempotente por id', async () => {
    const c = await ingresar('ciudadano', 'Lucía');
    const id = randomUUID();
    const cuerpo = {
      id,
      lugar: { id: 'rio:rio-quiquibey', nombre: 'Río Quiquibey', tipo: 'rio', lat: -14.712345, lon: -67.345678 },
      tipo: 'lo_vi',
      texto: 'Agua más turbia que de costumbre.',
      lat: -14.712345,
      lon: -67.345678,
    };
    await api().post('/posts').set(c.h).send(cuerpo).expect(201);
    await api().post('/posts').set(c.h).send(cuerpo).expect(200);
    const pubs = (await api().get('/water-sources/rio:rio-quiquibey/posts').expect(200)).body;
    expect(pubs).toHaveLength(1);
    // Ubicación aproximada (~100 m), nunca la exacta.
    expect(pubs[0].lat).toBeCloseTo(-14.712, 3);
    expect(pubs[0].autor).toMatchObject({ nombre: 'Lucía', rol: 'ciudadano' });
  });

  it('no se crean lugares «demo:» desde la API', async () => {
    const c = await ingresar('ciudadano');
    const r = await api()
      .post('/posts')
      .set(c.h)
      .send({ id: randomUUID(), lugar: { id: 'demo:falso', nombre: 'X', lat: -15, lon: -67 }, tipo: 'lo_vi', texto: 'x' });
    expect(r.status).toBe(400);
  });

  it('tres personas vuelven «riesgoso» el lugar en la señal comunidad, pero la señal oficial no cambia', async () => {
    const autor = await ingresar('ciudadano');
    const id = randomUUID();
    await api().post('/posts').set(autor.h).send({ id, fuenteId: 'rio:rio-tipuani', tipo: 'lo_vi', texto: 'Dragas trabajando.' }).expect(201);
    for (let i = 0; i < 2; i++) {
      const v = await ingresar('ciudadano');
      await api().post(`/posts/${id}/corroborations`).set(v.h).send({ postura: 'coincide' }).expect(200);
    }
    const r = (await api().get('/water-sources/rio:rio-tipuani').expect(200)).body;
    expect(r.senales.comunidad.nivel).toBe('riesgoso');
    expect(r.senales.oficial.nivel).toBe('sin_analisis');
    expect(r.estadoEvidencia).toBe('indicios_riesgo');
  });

  it('no se respalda lo propio, cuestionar exige motivo y lo oficial no se vota', async () => {
    const a = await ingresar('ciudadano');
    const id = randomUUID();
    await api().post('/posts').set(a.h).send({ id, fuenteId: 'rio:rio-coroico', tipo: 'lo_vi', texto: 'Algo vi.' }).expect(201);
    await api().post(`/posts/${id}/corroborations`).set(a.h).send({ postura: 'coincide' }).expect(400);
    const b = await ingresar('ciudadano');
    await api().post(`/posts/${id}/corroborations`).set(b.h).send({ postura: 'no_coincide' }).expect(400);
    await api().post(`/posts/${id}/corroborations`).set(b.h).send({ postura: 'no_coincide', motivo: 'Pasé ayer y estaba claro.' }).expect(200);
    await api().post(`/posts/${id}/comments`).set(b.h).send({ texto: 'Puedo acompañar a tomar una foto.' }).expect(201);
    await api().post('/posts/00000000-0000-4000-8000-0000000000d3/corroborations').set(b.h).send({ postura: 'coincide' }).expect(400);
  });
});

describe('ciclo completo de una solicitud', () => {
  it('solicitar → revisar → aceptar → muestrear → cargar → revisión técnica → publicar → cerrar', async () => {
    const rep = await ingresar('representante', 'Sonia');
    const mod = await ingresar('moderador');
    const ong = await ingresar('ong');
    const lab = await ingresar('laboratorio');
    const inv = await ingresar('investigador');

    // Registrar en nombre de familias exige consentimiento.
    await api().post('/research-requests').set(rep.h).send({ fuenteId: 'rio:rio-mapiri', motivo: 'Comemos pescado.', familiasRepresentadas: 12 }).expect(400);
    const s = (
      await api()
        .post('/research-requests')
        .set(rep.h)
        .send({ fuenteId: 'rio:rio-mapiri', motivo: 'Comemos pescado.', matriz: 'agua', familiasRepresentadas: 12, consentimiento: true })
        .expect(201)
    ).body.id as string;

    const paso = (h: Record<string, string>, estado: string, nota?: string) => api().patch(`/research-requests/${s}/status`).set(h).send({ estado, ...(nota ? { nota } : {}) });

    await paso(ong.h, 'en_revision').expect(409); // solo moderación revisa
    await paso(mod.h, 'rechazada').expect(409); // rechazar exige motivo
    await paso(mod.h, 'en_revision', 'Sin datos personales.').expect(200);
    await paso(ong.h, 'asignada').expect(200);
    expect((await api().get('/water-sources/rio:rio-mapiri').expect(200)).body.senales.oficial.nivel).toBe('en_proceso');

    const otraOng = await ingresar('investigador');
    await paso(otraOng.h, 'en_muestreo').expect(409); // no es la organización asignada
    await paso(ong.h, 'en_muestreo').expect(200);

    const muestra = (
      await api().post('/samples').set(lab.h).send({ fuenteId: 'rio:rio-mapiri', solicitudId: s, matriz: 'agua', fechaMuestreo: '2026-11-20', cadenaCustodia: 'CC-T-1' }).expect(201)
    ).body.id as string;
    await paso(lab.h, 'en_analisis').expect(200);
    await paso(lab.h, 'revision_tecnica').expect(409); // falta el resultado

    // «No detectado» exige el límite de detección; la unidad debe corresponder a la matriz.
    await api().post('/measurements').set(lab.h).send({ muestraId: muestra, analito: 'hg_total', calificador: 'no_detectado', unidad: 'ng/L', metodo: 'CV-AFS' }).expect(400);
    await api().post('/measurements').set(lab.h).send({ muestraId: muestra, analito: 'hg_total', calificador: 'detectado', valor: 3, unidad: 'µg/g', metodo: 'CV-AFS' }).expect(400);
    const m = (
      await api().post('/measurements').set(lab.h).send({ muestraId: muestra, analito: 'hg_total', calificador: 'detectado', valor: 0.3, unidad: 'µg/L', limiteDeteccion: 0.02, metodo: 'CV-AFS' }).expect(201)
    ).body.id as string;

    // Sin revisión técnica, el resultado no aparece en el mapa.
    expect((await api().get('/water-sources/rio:rio-mapiri/measurements').expect(200)).body).toHaveLength(0);

    await paso(lab.h, 'revision_tecnica').expect(200);
    await paso(inv.h, 'resultados_publicados').expect(409); // medición pendiente
    await api().post(`/measurements/${m}/reviews`).set(lab.h).send({ decision: 'validada', nota: 'ok' }).expect(403); // el laboratorio no se valida a sí mismo
    await api().post(`/measurements/${m}/reviews`).set(inv.h).send({ decision: 'validada', nota: 'Método y blancos correctos.' }).expect(201);
    await paso(inv.h, 'resultados_publicados').expect(200);

    const lugar = (await api().get('/water-sources/rio:rio-mapiri').expect(200)).body;
    expect(lugar.senales.oficial.nivel).toBe('dentro_criterio');
    expect(lugar.senales.oficial.medicion.fecha).toBe('2026-11-20');
    const meds = (await api().get('/water-sources/rio:rio-mapiri/measurements').expect(200)).body;
    expect(meds[0]).toMatchObject({ valorNormalizado: 300, unidadNormalizada: 'ng/L' });
    expect(meds[0].criterio.verificado).toBe(false);

    await paso(ong.h, 'cerrada').expect(200);
    const detalle = (await api().get(`/research-requests/${s}`).expect(200)).body;
    expect(detalle.historial.map((e: { estado: string }) => e.estado)).toEqual([
      'solicitada',
      'en_revision',
      'asignada',
      'en_muestreo',
      'en_analisis',
      'revision_tecnica',
      'resultados_publicados',
      'cerrada',
    ]);
    expect(detalle.historial[0].nota).toMatch(/12 familias/);
  });

  it('los apoyos no se duplican', async () => {
    const c = await ingresar('ciudadano');
    const s = '00000000-0000-4000-8000-0000000000f2';
    const a = (await api().post(`/research-requests/${s}/support`).set(c.h).expect(200)).body.apoyos;
    const b = (await api().post(`/research-requests/${s}/support`).set(c.h).expect(200)).body.apoyos;
    expect(b).toBe(a);
  });
});

describe('sincronización sin conexión', () => {
  it('un reporte por QR se crea una sola vez aunque lo suban dos teléfonos o se reenvíe', async () => {
    const transporta1 = await ingresar('ciudadano', 'Promotor 1');
    const transporta2 = await ingresar('ciudadano', 'Promotor 2');
    const id = randomUUID();
    const codigo = codificar({ id, t: 'sol', c: 'rio-rio-beni', d: '2026-11-25', x: 'Pedimos análisis del agua del río.', a: 'Doña Carmen' });
    const op1 = randomUUID();

    const r1 = (await api().post('/sync/operations').set(transporta1.h).send({ operaciones: [{ opId: op1, tipo: 'reporte_qr', codigo }] }).expect(200)).body;
    expect(r1.acuses[0]).toMatchObject({ resultado: 'creada', publicacionId: id, repetida: false });
    expect(r1.acuses[0].solicitudId).toBeTruthy();

    // Reenvío de la misma operación: mismo acuse, sin aplicar de nuevo.
    const r2 = (await api().post('/sync/operations').set(transporta1.h).send({ operaciones: [{ opId: op1, tipo: 'reporte_qr', codigo }] }).expect(200)).body;
    expect(r2.acuses[0]).toMatchObject({ resultado: 'creada', repetida: true });

    // Otro teléfono que escaneó el mismo QR: duplicada.
    const r3 = (await api().post('/sync/operations').set(transporta2.h).send({ operaciones: [{ opId: randomUUID(), tipo: 'reporte_qr', codigo }] }).expect(200)).body;
    expect(r3.acuses[0].resultado).toBe('duplicada');

    const pubs = (await api().get('/water-sources/rio:rio-beni/posts').expect(200)).body.filter((p: { id: string }) => p.id === id);
    expect(pubs).toHaveLength(1);
    // La autoría es la declarada; el transportista no se vuelve autor.
    expect(pubs[0]).toMatchObject({ autoria: 'declarada', origen: 'qr', moderacion: 'por_revisar' });
    expect(pubs[0].autor).toMatchObject({ nombre: 'Doña Carmen', declarado: true });
    const sol = (await api().get(`/research-requests/${r1.acuses[0].solicitudId}`).expect(200)).body;
    expect(sol).toMatchObject({ solicitante: 'Doña Carmen', autoriaDeclarada: true, estado: 'solicitada' });
  });

  it('un lote mezcla aceptadas y rechazadas sin perder ninguna', async () => {
    const c = await ingresar('ciudadano');
    const propia = randomUUID();
    const r = (
      await api()
        .post('/sync/operations')
        .set(c.h)
        .send({
          operaciones: [
            { opId: randomUUID(), tipo: 'publicacion', publicacion: { id: propia, fuenteId: 'rio:rio-kaka', tipo: 'pregunta', texto: '¿Hay estudios aquí?' } },
            { opId: randomUUID(), tipo: 'reporte_qr', codigo: 'G2R1:basura' },
            { opId: randomUUID(), tipo: 'publicacion', publicacion: { id: randomUUID(), fuenteId: 'rio:rio-kaka', tipo: 'oficial', texto: 'No beber' } },
            { opId: randomUUID(), tipo: 'reporte_qr', codigo: codificar({ id: randomUUID(), t: 'obs', c: 'arroyo-desconocido', d: '2026-11-25', x: 'Turbia' }) },
          ],
        })
        .expect(200)
    ).body.acuses;
    expect(r.map((a: { resultado: string }) => a.resultado)).toEqual(['creada', 'rechazada', 'rechazada', 'creada']);
    expect(r[3].motivo).toMatch(/por ubicar/);
  });

  it('el paquete de una comunidad trae fuentes, señales y publicaciones', async () => {
    const p = (await api().get('/sync/communities/rurrenabaque').expect(200)).body;
    expect(p.version).toBe(1);
    const beni = p.fuentes.find((f: { id: string }) => f.id === 'rio:rio-beni');
    expect(beni.senales).toBeDefined();
    expect(beni.publicaciones.length).toBeGreaterThan(0);
  });
});
