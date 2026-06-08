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
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class CreateContactDto {
  @IsString() @MaxLength(80) name: string;
  @IsString() @MaxLength(40) phone: string;
  @IsOptional() @IsString() @MaxLength(40) relationship?: string;
  @IsOptional() @IsBoolean() notifyOnCrisis?: boolean;
}

@Injectable()
export class EmergencyContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.emergencyContact.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  create(userId: string, dto: CreateContactDto) {
    return this.prisma.emergencyContact.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        relationship: dto.relationship,
        notifyOnCrisis: dto.notifyOnCrisis ?? false,
      },
    });
  }
  remove(userId: string, id: string) {
    return this.prisma.emergencyContact.deleteMany({ where: { id, userId } });
  }
}

@ApiTags('emergency-contacts')
@Controller('emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly svc: EmergencyContactsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.svc.list(userId);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateContactDto) {
    return this.svc.create(userId, dto);
  }
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.remove(userId, id);
  }
}

@Module({
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService],
})
export class EmergencyContactsModule {}
