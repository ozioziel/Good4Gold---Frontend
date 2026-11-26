import { z } from 'zod';

const ID_LUGAR = /^(rio|punto):[a-z0-9-]{1,74}$/;

export const nuevaPublicacion = z
  .object({
    // El UUID lo genera el teléfono: reenviar la misma publicación no la duplica.
    id: z.uuid(),
    fuenteId: z.string().min(1).max(80).optional(),
    // Un río o punto del mapa base que aún no existe en la base (no se pueden crear lugares «demo:»).
    lugar: z
      .object({
        id: z.string().regex(ID_LUGAR, 'El id debe ser rio:… o punto:…'),
        nombre: z.string().trim().min(1).max(120),
        tipo: z.enum(['rio', 'arroyo', 'pozo', 'red', 'vertiente', 'punto']).default('rio'),
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      })
      .optional(),
    tipo: z.enum(['lo_vi', 'pregunta', 'analisis', 'oficial']),
    texto: z.string().trim().min(1).max(1000),
    fecha: z.iso.date().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((b) => b.fuenteId || b.lugar, { message: 'Indica fuenteId o lugar' });
export type NuevaPublicacion = z.infer<typeof nuevaPublicacion>;

export const respaldo = z
  .object({
    postura: z.enum(['coincide', 'no_coincide']),
    motivo: z.string().trim().max(280).optional(),
  })
  .strict()
  .refine((b) => b.postura === 'coincide' || !!b.motivo, { message: 'Para cuestionar una publicación explica por qué', path: ['motivo'] });

export const respuesta = z.object({ texto: z.string().trim().min(1).max(1000) }).strict();
