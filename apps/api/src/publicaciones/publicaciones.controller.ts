import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Requiere, type Usuario, Yo } from '../auth/sesion';
import { Validar } from '../comun/validar';
import { nuevaPublicacion, type NuevaPublicacion, respaldo, respuesta } from './esquemas';
import { PublicacionesService } from './publicaciones.service';
import type { z } from 'zod';

@Controller()
export class PublicacionesController {
  constructor(private readonly pubs: PublicacionesService) {}

  @Get('water-sources/:id/posts')
  deLugar(@Param('id') id: string) {
    return this.pubs.deLugar(id);
  }

  /** 201 si se creó; 200 si ya existía (reenvío idempotente). */
  @Post('posts')
  @Requiere()
  async crear(@Yo() u: Usuario, @Body(new Validar(nuevaPublicacion)) b: NuevaPublicacion, @Res({ passthrough: true }) res: Response) {
    const r = await this.pubs.crear(u, b);
    res.status(r.creada ? 201 : 200);
    return r;
  }

  @Post('posts/:id/corroborations')
  @Requiere()
  @HttpCode(200)
  respaldar(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(respaldo)) b: z.infer<typeof respaldo>) {
    return this.pubs.respaldar(u, id, b);
  }

  @Post('posts/:id/comments')
  @Requiere()
  responder(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(respuesta)) b: z.infer<typeof respuesta>) {
    return this.pubs.responder(u, id, b.texto);
  }
}
