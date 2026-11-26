import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Db } from '../db/db.service';
import type { Rol } from '../dominio/roles';
import { CLAVE_ROLES, type PeticionConUsuario, type Usuario } from './sesion';
import { Tokens } from './tokens';

/**
 * Guardia global. Si llega un token válido, adjunta la persona a la petición.
 * Las rutas con @Requiere() exigen sesión y, si se indican, uno de los roles. El resto es público (visitante).
 */
@Injectable()
export class Guardia implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: Tokens,
    private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PeticionConUsuario>();
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo === 'Bearer' && token) {
      const r = await this.tokens.verificar(token);
      if (r) {
        const u = await this.db.fila<Usuario>('SELECT id, nombre, rol, rol_verificado, organizacion_id, demo FROM usuarios WHERE id = $1', [r.sub]);
        if (u) req.usuario = u;
      }
    }
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (roles === undefined) return true;
    if (!req.usuario) throw new UnauthorizedException('Necesitas ingresar para hacer esto.');
    if (roles.length > 0 && !roles.includes(req.usuario.rol)) throw new ForbiddenException(`Tu rol (${req.usuario.rol}) no puede hacer esto.`);
    return true;
  }
}
