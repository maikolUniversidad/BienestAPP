import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  list(type?: string) {
    return this.prisma.contentActivity.findMany({
      where: { active: true, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // Biblioteca pública (educación en salud mental, sin datos personales).
  @Public()
  @Get()
  list(@Query('type') type?: string) {
    return this.content.list(type);
  }
}

@Module({
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
