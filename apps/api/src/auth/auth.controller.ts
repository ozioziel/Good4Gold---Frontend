import { Body, Controller, ForbiddenException, Get, Inject, NotFoundException, Post } from '@nestjs/common';
import { z } from 'zod';
import { Validar } from '../comun/validar';
import { CONFIG, type Config } from '../config';
import { Db } from '../db/db.service';
import { ROLES, type Rol } from '../dominio/roles';
import { Requiere, type Usuario, Yo } from './sesion';
import { Tokens } from './tokens';

// Organización DEMO que recibe cada rol institucional al ingresar (ninguna alianza es real).
const ORG_DEMO: Partial<Record<Rol, string>> = {
  laboratorio: 'Laboratorio demo Andino',
  ong: 'ONG demo Ríos Vivos',
  investigador: 'Universidad demo',
  autoridad: 'Autoridad sanitaria demo',
};

const ingresoDemo = z.union([
  z.object({ usuarioId: z.uuid() }).strict(),
  z.object({ rol: z.enum(ROLES), nombre: z.string().trim().min(1).max(60).optional() }).strict(),
]);

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(CONFIG) private readonly config: Config,
    private readonly db: Db,
    private readonly tokens: Tokens,
  ) {}

  /**
   * Ingreso de demostración: elige un rol (se crea una persona DEMO con su rol verificado
   * para poder recorrer el flujo) o entra como una persona DEMO de las semillas.
   */
  @Post('demo')
  async demo(@Body(new Validar(ingresoDemo)) b: z.infer<typeof ingresoDemo>) {
    if (this.config.AUTH_MODE !== 'demo') throw new ForbiddenException('El ingreso de demostración está desactivado.');
    let u: Usuario | null;
    if ('usuarioId' in b) {
      u = await this.db.fila<Usuario>('SELECT id, nombre, rol, rol_verificado, organizacion_id, demo FROM usuarios WHERE id = $1 AND demo', [b.usuarioId]);
      if (!u) throw new NotFoundException('No existe esa persona de demostración.');
    } else {
      const org = ORG_DEMO[b.rol];
      u = await this.db.fila<Usuario>(
        `INSERT INTO usuarios (nombre, rol, rol_verificado, organizacion_id, demo)
         VALUES ($1, $2, $3, (SELECT id FROM organizaciones WHERE nombre = $4), true)
         RETURNING id, nombre, rol, rol_verificado, organizacion_id, demo`,
        [b.nombre ?? 'Tú', b.rol, b.rol !== 'ciudadano', org ?? null],
      );
    }
    return { token: await this.tokens.firmar({ sub: u!.id, rol: u!.rol }), usuario: u };
  }

  /** Personas DEMO de las semillas, para entrar como ellas en el pitch. */
  @Get('demo/personas')
  personas() {
    return this.db.filas(
      `SELECT u.id, u.nombre, u.rol, o.nombre AS organizacion FROM usuarios u
       LEFT JOIN organizaciones o ON o.id = u.organizacion_id
       WHERE u.demo AND u.id::text LIKE '00000000-0000-4000-8000-%' ORDER BY u.id`,
    );
  }

  @Get('yo')
  @Requiere()
  yo(@Yo() u: Usuario) {
    return u;
  }
}
