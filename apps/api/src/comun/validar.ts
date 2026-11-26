import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** Valida el cuerpo o la consulta con un esquema zod. Responde 400 con los campos inválidos. */
export class Validar<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly esquema: T) {}

  transform(valor: unknown): z.infer<T> {
    const r = this.esquema.safeParse(valor);
    if (!r.success) {
      throw new BadRequestException({
        mensaje: 'Datos inválidos',
        errores: r.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      });
    }
    return r.data;
  }
}

/** Redondea coordenadas a 3 decimales (~100 m): nunca se guarda la ubicación exacta de una vivienda. */
export const aproximar = (n: number) => Math.round(n * 1000) / 1000;

export const punto = (lat?: number | null, lon?: number | null) =>
  lat == null || lon == null ? null : `SRID=4326;POINT(${aproximar(lon)} ${aproximar(lat)})`;
