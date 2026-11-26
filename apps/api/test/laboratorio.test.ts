// Rutas del laboratorio virtual con una corrida mínima escrita como lo haría science/g2/cargar.py.
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configurar } from '../src/app';
import { AppModule } from '../src/app.module';
import { Db } from '../src/db/db.service';

let app: INestApplication;
const api = () => request(app.getHttpServer());

beforeAll(async () => {
  const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = m.createNestApplication();
  configurar(app);
  await app.init();
  const db = app.get(Db);
  const c = await db.fila<{ id: string }>(
    `INSERT INTO corridas_modelo (componente, version, estado, parametros, manifiesto) VALUES ('gold2-lab', 'v0', 'v0_sin_revision', '{}', '{"tramos":{}}') RETURNING id`,
  );
  await db.filas(
    `INSERT INTO tramos VALUES ('kaka-01', 'Kaka', 'rio:rio-kaka', 1, NULL, '{mapiri-05}', 16.1, 'SRID=4326;LINESTRING(-67.9 -15.5, -67.8 -15.45)', $1)`,
    [c!.id],
  );
  await db.filas(`INSERT INTO mineria_tramo VALUES ('kaka-01', 2025, 12.5, 868.7, $1)`, [c!.id]);
  await db.filas(
    `INSERT INTO indicadores_temporada (tramo_id, anio, escenas, suficiente, ndti_agua, z_ndti_agua, fechas, corrida_id) VALUES ('kaka-01', 2025, 9, true, 0.081, 2.4, '{2025-07-14}', $1)`,
    [c!.id],
  );
  await db.filas(
    `INSERT INTO evaluaciones_riesgo VALUES ('kaka-01', 2025, 'alta', '[{"id":"R1"}]', '[]', '{"mineria_aguas_arriba_ha": 5000}', 'v0', NULL, $1)`,
    [c!.id],
  );
});
afterAll(async () => {
  await app?.close();
});

describe('laboratorio virtual', () => {
  it('tramos como GeoJSON con prioridad y aviso de alcance', async () => {
    const r = (await api().get('/laboratory/tramos').expect(200)).body;
    expect(r.type).toBe('FeatureCollection');
    expect(r.aviso).toMatch(/no mide ni estima mercurio/);
    const k = r.features.find((f: { properties: { id: string } }) => f.properties.id === 'kaka-01');
    expect(k.geometry.type).toBe('LineString');
    expect(k.properties).toMatchObject({ prioridad: 'alta', mineriaTramoHa: 868.7, mineriaAguasArribaHa: 5000, anio: 2025 });
  });

  it('serie de un tramo y 404 si no existe', async () => {
    const r = (await api().get('/laboratory/tramos/kaka-01').expect(200)).body;
    expect(r.aguasArriba).toEqual(['mapiri-05']);
    expect(r.indicadores[0]).toMatchObject({ anio: 2025, zNdti: 2.4, fechas: ['2025-07-14'] });
    expect(r.riesgo[0].prioridad).toBe('alta');
    await api().get('/laboratory/tramos/no-existe').expect(404);
  });

  it('Gold2Mercury en pausa: ninguna predicción publicada', async () => {
    const r = (await api().get('/laboratory/predictions').expect(200)).body;
    expect(r).toMatchObject({ estado: 'en_pausa', predicciones: [] });
    expect((await api().get('/laboratory/runs').expect(200)).body.length).toBeGreaterThan(0);
  });
});
