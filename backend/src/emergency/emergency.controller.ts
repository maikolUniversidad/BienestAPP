import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmergencyService } from './emergency.service';
import { SosDto } from './dto/sos.dto';

@ApiTags('emergency')
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergency: EmergencyService) {}

  @Post('sos')
  sos(@CurrentUser('id') userId: string, @Body() dto: SosDto) {
    return this.emergency.sos(userId, dto);
  }

  @Get('tickets/:id')
  getTicket(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emergency.getTicket(userId, id);
  }
}
