import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { Validar } from '../comun/validar';
import { LugaresService } from './lugares.service';

const filtro = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  bbox: z
    .string()
    .transform((s) => s.split(',').map(Number))
    .pipe(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .optional(),
});

@Controller()
export class LugaresController {
  constructor(private readonly lugares: LugaresService) {}

  @Get('water-sources')
  listar(@Query(new Validar(filtro)) f: z.infer<typeof filtro>) {
    return this.lugares.listar(f);
  }

  @Get('water-sources/:id')
  uno(@Param('id') id: string) {
    return this.lugares.uno(id);
  }

  @Get('communities')
  comunidades(@Query('q') q?: string) {
    return this.lugares.comunidades(q?.trim().slice(0, 80) || undefined);
  }

  @Get('communities/:id')
  comunidad(@Param('id') id: string) {
    return this.lugares.comunidad(id);
  }
}
