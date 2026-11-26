import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CampanasController } from './campanas/campanas.controller';
import { CampanasService } from './campanas/campanas.service';
import { ESCROW, EscrowNoConfigurado, EscrowStellar, leerConfigStellar } from './campanas/escrow';
import { DbModule } from './db/db.module';
import { LugaresController } from './lugares/lugares.controller';
import { LugaresService } from './lugares/lugares.service';
import { MedicionesController } from './mediciones/mediciones.controller';
import { MedicionesService } from './mediciones/mediciones.service';
import { PublicacionesController } from './publicaciones/publicaciones.controller';
import { PublicacionesService } from './publicaciones/publicaciones.service';
import { SaludController } from './salud/salud.controller';
import { SolicitudesController } from './solicitudes/solicitudes.controller';
import { SolicitudesService } from './solicitudes/solicitudes.service';
import { SyncController } from './sync/sync.controller';
import { SyncService } from './sync/sync.service';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [CampanasController, SaludController, LugaresController, PublicacionesController, SolicitudesController, MedicionesController, SyncController],
  providers: [
    CampanasService,
    // Escrow en Stellar testnet si hay configuración; si no, las campañas responden 503.
    { provide: ESCROW, useFactory: () => { const c = leerConfigStellar(); return c ? new EscrowStellar(c) : new EscrowNoConfigurado(); } },
    LugaresService, PublicacionesService, SolicitudesService, MedicionesService, SyncService],
})
export class AppModule {}
