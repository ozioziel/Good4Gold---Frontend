import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { Guardia } from './guardia';
import { Tokens } from './tokens';

@Module({
  controllers: [AuthController],
  providers: [Tokens, { provide: APP_GUARD, useClass: Guardia }],
  exports: [Tokens],
})
export class AuthModule {}
