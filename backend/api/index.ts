import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { Express } from 'express';
import { AppModule } from '../src/app.module';

/**
 * Entry point serverless para Vercel (Fluid Compute reutiliza la instancia entre
 * invocaciones, por eso cacheamos la app Nest inicializada). Para desarrollo local
 * se sigue usando `src/main.ts` con `npm run start:dev`.
 */
const expressApp: Express = express();
let initialized = false;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
  });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1', { exclude: ['/', 'health'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('BienestAPP API')
    .setDescription('SuperApp de Bienestar — Nueva EPS')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.init();
  initialized = true;
}

export default async function handler(req: express.Request, res: express.Response) {
  if (!initialized) await bootstrap();
  expressApp(req, res);
}
