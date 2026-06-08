import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class GrantConsentDto {
  @IsEnum(ConsentType) type: ConsentType;
  @IsString() version: string;
  @IsOptional() @IsBoolean() granted?: boolean;
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.consent.findMany({ where: { userId }, orderBy: { grantedAt: 'desc' } });
  }
  grant(userId: string, dto: GrantConsentDto) {
    return this.prisma.consent.create({
      data: {
        userId,
        type: dto.type,
        version: dto.version,
        granted: dto.granted ?? true,
      },
    });
  }
  revoke(userId: string, id: string) {
    return this.prisma.consent.updateMany({
      where: { id, userId },
      data: { granted: false, revokedAt: new Date() },
    });
  }
}

@ApiTags('consents')
@Controller('consents')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.consent.list(userId);
  }
  @Post()
  grant(@CurrentUser('id') userId: string, @Body() dto: GrantConsentDto) {
    return this.consent.grant(userId, dto);
  }
  @Delete(':id')
  revoke(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.consent.revoke(userId, id);
  }
}

@Module({
  controllers: [ConsentController],
  providers: [ConsentService],
})
export class ConsentModule {}
