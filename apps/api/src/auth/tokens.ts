import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { CONFIG, type Config } from '../config';
import { ROLES, type Rol } from '../dominio/roles';

export interface Reclamos {
  sub: string;
  rol: Rol;
}

/** Tokens de demostración firmados por el servidor (HS256). En producción: Supabase Auth u otro proveedor. */
@Injectable()
export class Tokens {
  private readonly clave: Uint8Array;

  constructor(@Inject(CONFIG) config: Config) {
    this.clave = new TextEncoder().encode(config.JWT_SECRET);
  }

  firmar(r: Reclamos) {
    return new SignJWT({ rol: r.rol, demo: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(r.sub)
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.clave);
  }

  async verificar(token: string): Promise<Reclamos | null> {
    try {
      const { payload } = await jwtVerify(token, this.clave, { algorithms: ['HS256'] });
      const rol = payload['rol'];
      if (typeof payload.sub !== 'string' || typeof rol !== 'string' || !ROLES.includes(rol as Rol)) return null;
      return { sub: payload.sub, rol: rol as Rol };
    } catch {
      return null;
    }
  }
}
