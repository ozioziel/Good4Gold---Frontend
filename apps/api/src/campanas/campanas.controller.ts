import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { z } from 'zod';
import { Requiere, type Usuario, Yo } from '../auth/sesion';
import { Validar } from '../comun/validar';
import { cancelacion, CampanasService, donacionDemo, enviarDonacion, nuevaCampana, prepararDonacion, reembolso, revisionHito } from './campanas.service';

@Controller()
export class CampanasController {
  constructor(private readonly campanas: CampanasService) {}

  @Get('escrow')
  info() {
    return this.campanas.info();
  }

  @Get('campaigns')
  listar(@Query('solicitudId', new ParseUUIDPipe({ optional: true })) solicitudId?: string) {
    return this.campanas.listar(solicitudId);
  }

  @Get('campaigns/:id')
  una(@Param('id', ParseUUIDPipe) id: string) {
    return this.campanas.una(id);
  }

  @Post('campaigns')
  @Requiere('ong', 'investigador', 'laboratorio')
  crear(@Yo() u: Usuario, @Body(new Validar(nuevaCampana)) b: z.infer<typeof nuevaCampana>) {
    return this.campanas.crear(u, b);
  }

  /** DEMO: aporte firmado por un donante de prueba que custodia el servidor (testnet). */
  @Post('campaigns/:id/donations/demo')
  @Requiere()
  donarDemo(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(donacionDemo)) b: z.infer<typeof donacionDemo>) {
    return this.campanas.donarDemo(u, id, b.monto);
  }

  /** Billetera: prepara la transacción para que el donante la firme. No exige cuenta en la plataforma. */
  @Post('campaigns/:id/donations/prepare')
  preparar(@Param('id', ParseUUIDPipe) id: string, @Body(new Validar(prepararDonacion)) b: z.infer<typeof prepararDonacion>, @Yo() u?: Usuario) {
    return this.campanas.preparar(u, id, b);
  }

  /** Billetera: envía la transacción firmada. La donación se confirma solo si la red la confirma. */
  @Post('donations/:id/submit')
  @HttpCode(200)
  enviar(@Param('id', ParseUUIDPipe) id: string, @Body(new Validar(enviarDonacion)) b: z.infer<typeof enviarDonacion>) {
    return this.campanas.enviar(id, b.xdr);
  }

  @Post('milestones/:id/reviews')
  @Requiere('investigador', 'ong', 'autoridad', 'laboratorio')
  aprobar(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(revisionHito)) b: z.infer<typeof revisionHito>) {
    return this.campanas.aprobarHito(u, id, b);
  }

  @Post('campaigns/:id/cancel')
  @Requiere('moderador')
  @HttpCode(200)
  cancelar(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(cancelacion)) b: z.infer<typeof cancelacion>) {
    return this.campanas.cancelar(u, id, b.motivo);
  }

  /** Cualquiera puede pedir el reembolso de un donante: el dinero solo va a esa dirección. */
  @Post('campaigns/:id/refunds')
  reembolsar(@Param('id', ParseUUIDPipe) id: string, @Body(new Validar(reembolso)) b: z.infer<typeof reembolso>) {
    return this.campanas.reembolsar(id, b.direccion);
  }
}
