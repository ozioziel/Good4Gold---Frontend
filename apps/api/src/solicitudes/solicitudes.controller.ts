import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { Requiere, type Usuario, Yo } from '../auth/sesion';
import { Validar } from '../comun/validar';
import { ESTADOS } from '../dominio/solicitudes';
import { cambioEstado, nuevaSolicitud, SolicitudesService } from './solicitudes.service';

const filtro = z.object({ fuenteId: z.string().max(80).optional(), estado: z.enum(ESTADOS).optional() });

@Controller('research-requests')
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Get()
  listar(@Query(new Validar(filtro)) f: z.infer<typeof filtro>, @Yo() u?: Usuario) {
    return this.solicitudes.listar(f, u);
  }

  @Get(':id')
  una(@Param('id', ParseUUIDPipe) id: string, @Yo() u?: Usuario) {
    return this.solicitudes.una(id, u);
  }

  @Post()
  @Requiere()
  crear(@Yo() u: Usuario, @Body(new Validar(nuevaSolicitud)) b: z.infer<typeof nuevaSolicitud>) {
    return this.solicitudes.crear(u, b);
  }

  @Post(':id/support')
  @Requiere()
  @HttpCode(200)
  apoyar(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudes.apoyar(u, id);
  }

  @Patch(':id/status')
  @Requiere()
  cambiar(@Yo() u: Usuario, @Param('id', ParseUUIDPipe) id: string, @Body(new Validar(cambioEstado)) b: z.infer<typeof cambioEstado>) {
    return this.solicitudes.cambiarEstado(u, id, b);
  }
}
