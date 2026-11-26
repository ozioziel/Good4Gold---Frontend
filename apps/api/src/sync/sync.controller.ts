import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { z } from 'zod';
import { Requiere, type Usuario, Yo } from '../auth/sesion';
import { Validar } from '../comun/validar';
import { lote, SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('operations')
  @Requiere()
  @HttpCode(200)
  aplicar(@Yo() u: Usuario, @Body(new Validar(lote)) b: z.infer<typeof lote>) {
    return this.sync.aplicar(u, b);
  }

  @Get('communities/:id')
  paquete(@Param('id') id: string) {
    return this.sync.paquete(id);
  }
}
