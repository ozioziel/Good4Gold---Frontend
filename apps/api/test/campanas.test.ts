// Campañas y donaciones: reglas de la API con un escrow en memoria (el contrato tiene sus propias pruebas).
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configurar } from '../src/app';
import { AppModule } from '../src/app.module';
import { ESCROW } from '../src/campanas/escrow';
import { EscrowFalso } from './escrow-falso';

let app: INestApplication;
const escrow = new EscrowFalso();
const api = () => request(app.getHttpServer());
const UNIVERSIDAD = '00000000-0000-4000-8000-0000000000a3';
const ONG = '00000000-0000-4000-8000-0000000000a1';

async function como(rol: string) {
  const r = await api().post('/auth/demo').send({ rol }).expect(201);
  return { Authorization: `Bearer ${r.body.token}` };
}

/** Lleva una solicitud nueva hasta «asignada» por la ONG demo. */
async function casoAceptado(ong: Record<string, string>) {
  const rep = await como('representante');
  const mod = await como('moderador');
  const s = (await api().post('/research-requests').set(rep).send({ fuenteId: 'rio:rio-beni', motivo: 'Necesitamos análisis.' }).expect(201)).body.id;
  await api().patch(`/research-requests/${s}/status`).set(mod).send({ estado: 'en_revision' }).expect(200);
  await api().patch(`/research-requests/${s}/status`).set(ong).send({ estado: 'asignada' }).expect(200);
  return s as string;
}

const cuerpo = (solicitudId: string, extra: object = {}) => ({
  solicitudId,
  titulo: 'Análisis del río Beni',
  causa: 'investigar',
  verificadorOrganizacionId: UNIVERSIDAD,
  criterioExito: 'Resultados publicados con método y alcance.',
  politicaSobrantes: 'Reembolso proporcional a cada donante.',
  hitos: [
    { titulo: 'Muestreo', monto: '10' },
    { titulo: 'Análisis', monto: '20.5' },
  ],
  ...extra,
});

beforeAll(async () => {
  const m = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ESCROW).useValue(escrow).compile();
  app = m.createNestApplication();
  configurar(app);
  await app.init();
});
afterAll(async () => {
  await app?.close();
});

describe('campañas con escrow por hitos', () => {
  it('flujo completo: crear desde un caso aceptado → donar → liberar hitos en orden → completada', async () => {
    const ong = await como('ong');
    const s = await casoAceptado(ong);

    // El verificador debe ser otra organización.
    await api().post('/campaigns').set(ong).send(cuerpo(s, { verificadorOrganizacionId: ONG })).expect(400);
    const c = (await api().post('/campaigns').set(ong).send(cuerpo(s)).expect(201)).body;
    expect(c.meta).toBe('30.5');
    // Un caso, una campaña; y el caso pasa a «pendiente de recursos».
    await api().post('/campaigns').set(ong).send(cuerpo(s)).expect(409);
    const sol = (await api().get(`/research-requests/${s}`).expect(200)).body;
    expect(sol.estado).toBe('pendiente_recursos');

    const ciudadano = await como('ciudadano');
    await api().post(`/campaigns/${c.id}/donations/demo`).set(ciudadano).send({ monto: '15' }).expect(201);
    // No se acepta más que lo que falta para la meta.
    await api().post(`/campaigns/${c.id}/donations/demo`).set(ciudadano).send({ monto: '16' }).expect(409);

    const det = (await api().get(`/campaigns/${c.id}`).expect(200)).body;
    expect(det.reunido).toBe('15');
    expect(det.cadena).toMatchObject({ aportado: '15', conciliada: true });
    const [h1, h2] = det.hitos;

    // Solo la organización verificadora aprueba; en orden; con fondos suficientes.
    const verificador = await como('investigador'); // pertenece a «Universidad demo»
    await api().post(`/milestones/${h1.id}/reviews`).set(ong).send({ evidenciaRef: 'acta-muestreo.pdf' }).expect(403);
    await api().post(`/milestones/${h2.id}/reviews`).set(verificador).send({ evidenciaRef: 'informe.pdf' }).expect(409);
    const r1 = (await api().post(`/milestones/${h1.id}/reviews`).set(verificador).send({ evidenciaRef: 'acta-muestreo.pdf', nota: 'Cadena de custodia completa.' }).expect(201)).body;
    expect(r1.evidenciaHash).toMatch(/^[0-9a-f]{64}$/);
    await api().post(`/milestones/${h2.id}/reviews`).set(verificador).send({ evidenciaRef: 'informe.pdf' }).expect(409); // faltan fondos

    await api().post(`/campaigns/${c.id}/donations/demo`).set(ciudadano).send({ monto: '15.5' }).expect(201);
    const r2 = (await api().post(`/milestones/${h2.id}/reviews`).set(verificador).send({ evidenciaRef: 'informe.pdf' }).expect(201)).body;
    expect(r2.campanaCompletada).toBe(true);
    const fin = (await api().get(`/campaigns/${c.id}`).expect(200)).body;
    expect(fin.estado).toBe('completada');
    expect(fin.cadena).toMatchObject({ liberado: '30.5', estado: 'completada', conciliada: true });
    await api().post(`/campaigns/${c.id}/donations/demo`).set(ciudadano).send({ monto: '1' }).expect(409);
  });

  it('solo la organización asignada propone la campaña, y solo con el caso aceptado', async () => {
    const ong = await como('ong');
    const s = await casoAceptado(ong);
    await api().post('/campaigns').set(await como('laboratorio')).send(cuerpo(s)).expect(403);
    await api().post('/campaigns').set(await como('ciudadano')).send(cuerpo(s)).expect(403);
    const otra = (await api().post('/research-requests').set(await como('ciudadano')).send({ fuenteId: 'rio:rio-kaka', motivo: 'x' }).expect(201)).body.id;
    await api().post('/campaigns').set(ong).send(cuerpo(otra)).expect(403);
  });

  it('billetera: preparar → firmar → enviar; una transacción ajena se rechaza', async () => {
    const ong = await como('ong');
    const c = (await api().post('/campaigns').set(ong).send(cuerpo(await casoAceptado(ong))).expect(201)).body;
    const donante = 'GAUL4KVUD3ILG7RTDP7KHKQGUNXS7ZUMKHSHRIOWICYFCSI5JOYOXG47';
    escrow.saldos.set(donante, 100n * 10_000_000n);
    await api().post(`/campaigns/${c.id}/donations/prepare`).send({ direccion: 'no-es-direccion', monto: '5' }).expect(400);
    const p = (await api().post(`/campaigns/${c.id}/donations/prepare`).send({ direccion: donante, monto: '5' }).expect(201)).body;
    expect(p.red).toBe('testnet');
    await api().post(`/donations/${p.donacionId}/submit`).send({ xdr: p.xdr + '-SIN-FIRMA-VALIDA' }).expect(409);
    // Tras un rechazo, la donación queda fallida y no se puede reenviar.
    await api().post(`/donations/${p.donacionId}/submit`).send({ xdr: p.xdr + '-FIRMADO' }).expect(409);

    const p2 = (await api().post(`/campaigns/${c.id}/donations/prepare`).send({ direccion: donante, monto: '5' }).expect(201)).body;
    const ok = (await api().post(`/donations/${p2.donacionId}/submit`).send({ xdr: p2.xdr + '-FIRMADO' }).expect(200)).body;
    expect(ok.estado).toBe('confirmada');
    const det = (await api().get(`/campaigns/${c.id}`).expect(200)).body;
    expect(det.donaciones).toHaveLength(1);
    expect(det.cadena.conciliada).toBe(true);
  });

  it('cancelar reembolsa lo no liberado en proporción; solo moderación cancela', async () => {
    const ong = await como('ong');
    const c = (await api().post('/campaigns').set(ong).send(cuerpo(await casoAceptado(ong))).expect(201)).body;
    const ciudadano = await como('ciudadano');
    await api().post(`/campaigns/${c.id}/donations/demo`).set(ciudadano).send({ monto: '12' }).expect(201);
    const det = (await api().get(`/campaigns/${c.id}`).expect(200)).body;
    await api().post(`/milestones/${det.hitos[0].id}/reviews`).set(await como('investigador')).send({ evidenciaRef: 'acta.pdf' }).expect(201);

    await api().post(`/campaigns/${c.id}/refunds`).send({ direccion: det.donaciones[0].direccion }).expect(409); // aún abierta
    await api().post(`/campaigns/${c.id}/cancel`).set(ong).send({ motivo: 'Disputa documentada sobre el plan.' }).expect(403);
    await api().post(`/campaigns/${c.id}/cancel`).set(await como('moderador')).send({ motivo: 'corto' }).expect(400);
    await api().post(`/campaigns/${c.id}/cancel`).set(await como('moderador')).send({ motivo: 'Disputa documentada: el laboratorio no puede continuar.' }).expect(200);
    const r = (await api().post(`/campaigns/${c.id}/refunds`).send({ direccion: det.donaciones[0].direccion }).expect(201)).body;
    expect(r.monto).toBe('2'); // aportó 12, se liberaron 10 → vuelve 2
    await api().post(`/campaigns/${c.id}/refunds`).send({ direccion: det.donaciones[0].direccion }).expect(409);
    const fin = (await api().get(`/campaigns/${c.id}`).expect(200)).body;
    expect(fin.movimientos.map((m: { tipo: string }) => m.tipo)).toEqual(['creacion', 'cancelacion', 'reembolso']);
  });

  it('información pública del escrow', async () => {
    const r = (await api().get('/escrow').expect(200)).body;
    expect(r).toMatchObject({ red: 'testnet', activo: { codigo: 'USDC', decimales: 7 } });
  });
});
