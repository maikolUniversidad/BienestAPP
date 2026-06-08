import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class PetDto {
  @IsString() name: string;
  @IsOptional() @IsString() species?: string;
}

/**
 * Mascota virtual de bienestar. Diseñada para REFORZAR hábitos saludables sin
 * manipulación emocional: mensajes medidos, sin culpa ni presión. La felicidad sube
 * con hábitos positivos y el nivel evoluciona suavemente.
 */
@Injectable()
export class PetService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const pet = await this.prisma.virtualPet.findUnique({ where: { userId } });
    if (!pet) return null;
    return { ...pet, message: this.message(pet.happiness) };
  }

  async create(userId: string, dto: PetDto) {
    return this.prisma.virtualPet.upsert({
      where: { userId },
      update: { name: dto.name, species: dto.species ?? 'companion' },
      create: { userId, name: dto.name, species: dto.species ?? 'companion' },
    });
  }

  private message(happiness: number): string {
    if (happiness >= 80) return 'Hoy te ves muy bien cuidándote. ¡Gracias por incluirme!';
    if (happiness >= 50) return 'Vamos paso a paso, a tu ritmo. Estoy contigo.';
    return 'Cuando quieras, podemos empezar con algo pequeño. Sin presión.';
  }
}

@ApiTags('pet')
@Controller('pet')
export class PetController {
  constructor(private readonly pet: PetService) {}

  @Get()
  get(@CurrentUser('id') userId: string) {
    return this.pet.get(userId);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: PetDto) {
    return this.pet.create(userId, dto);
  }
}

@Module({
  controllers: [PetController],
  providers: [PetService],
})
export class PetModule {}
