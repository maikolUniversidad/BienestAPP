import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

/**
 * Rutas en la raíz (fuera del prefijo /api/v1) para que la URL base no devuelva 404.
 */
@ApiTags('root')
@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      service: 'BienestAPP API',
      status: 'ok',
      version: '0.1.0',
      docs: '/docs',
      api: '/api/v1',
      panel: 'https://bienest-admin.vercel.app',
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
