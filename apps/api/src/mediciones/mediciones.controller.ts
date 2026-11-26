import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { z } from 'zod';
import { Requiere, type Usuario, Yo } from '../auth/sesion';
import { Validar } from '../comun/validar';
import { MedicionesService, nuevaMedicion, nuevaMuestra, revision } from './mediciones.service';

@Controller()
export class MedicionesController {
  constructor(private readonly mediciones: MedicionesService) {}

  @Get('water-sources/:id/measurements')
  deLugar(@Param('id') id: string) {
    return this.mediciones.deLugar(id);
  }

  @Post('samples')
  @Requiere('laboratorio')
  muestra(@Yo() u: Usuario, @Body(new Validar(nuevaMuestra)) b: z.infer<typeof nuevaMuestra>) {
    return this.mediciones.crearMuestra(u, b);
  }

  @Post('measurements')
  @Requiere('laboratorio')
  medicion(@Yo() u: Usuario, @Body(new Validar(nuevaMedicion)) b: z.infer<typeof nuevaMedicion>) {
    return this.mediciones.crearMedicion(u, b);
  }

  @Post('measurements/:id/reviews')
  @Requiere('investigador', 'moderador')
  revisar(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(revision)) b: z.infer<typeof revision>) {
    return this.mediciones.revisar(u, id, b);
  }
}
