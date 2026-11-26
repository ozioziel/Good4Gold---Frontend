import { Global, Module } from '@nestjs/common';
import { CONFIG, leerConfig } from '../config';
import { Db } from './db.service';

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => leerConfig() }, Db],
  exports: [CONFIG, Db],
})
export class DbModule {}
