import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Rol } from '../dominio/roles';

/** Persona autenticada, leída de la base en cada petición (el rol del token no basta). */
export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  rol_verificado: boolean;
  organizacion_id: string | null;
  demo: boolean;
}

export type PeticionConUsuario = Request & { usuario?: Usuario };

export const CLAVE_ROLES = 'g2:roles';
/** Exige sesión. Sin argumentos: cualquier rol. Con argumentos: solo esos roles. */
export const Requiere = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

export const Yo = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<PeticionConUsuario>().usuario);
