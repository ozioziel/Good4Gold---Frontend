import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { configurar } from './app';
import { AppModule } from './app.module';

async function iniciar() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const config = configurar(app);
  await app.listen(config.PORT);
  console.log(`API de ${config.MARCA} en http://localhost:${config.PORT}`);
}

void iniciar();
