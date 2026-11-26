import { Controller, Get, Inject } from '@nestjs/common';
import { CONFIG, type Config } from '../config';
import { Db } from '../db/db.service';

@Controller('health')
export class SaludController {
  constructor(
    private readonly db: Db,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  @Get()
  async estado() {
    const r = await this.db.fila<{ postgis: string }>('SELECT postgis_lib_version() AS postgis');
    return { ok: true, marca: this.config.MARCA, auth: this.config.AUTH_MODE, postgis: r?.postgis ?? null };
  }
}
