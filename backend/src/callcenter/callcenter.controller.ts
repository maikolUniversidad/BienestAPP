import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CaseStatus, RoleName } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CallcenterService } from './callcenter.service';

class StatusDto {
  @IsEnum(CaseStatus)
  status: CaseStatus;
}
class NoteDto {
  @IsString()
  body: string;
}
class EscalateDto {
  @IsString()
  target: string; // psychologist | physician | emergency_line
}
class CallLogDto {
  @IsOptional()
  @IsInt()
  durationSec?: number;

  @IsOptional()
  @IsString()
  outcome?: string;
}

@ApiTags('callcenter')
@Controller('callcenter')
@Roles(
  RoleName.CALLCENTER_OPERATOR,
  RoleName.PSYCHOLOGIST,
  RoleName.PHYSICIAN,
  RoleName.EPS_ADMIN,
  RoleName.SUPERADMIN,
)
export class CallcenterController {
  constructor(private readonly callcenter: CallcenterService) {}

  @Get('queue')
  queue() {
    return this.callcenter.queue();
  }

  @Get('cases/:id')
  getCase(@CurrentUser('id') operatorId: string, @Param('id') id: string) {
    return this.callcenter.getCase(operatorId, id);
  }

  @Patch('cases/:id/status')
  setStatus(
    @CurrentUser('id') operatorId: string,
    @Param('id') id: string,
    @Body() dto: StatusDto,
  ) {
    return this.callcenter.setStatus(operatorId, id, dto.status);
  }

  @Post('cases/:id/notes')
  addNote(
    @CurrentUser('id') operatorId: string,
    @Param('id') id: string,
    @Body() dto: NoteDto,
  ) {
    return this.callcenter.addNote(operatorId, id, dto.body);
  }

  @Post('cases/:id/escalate')
  escalate(
    @CurrentUser('id') operatorId: string,
    @Param('id') id: string,
    @Body() dto: EscalateDto,
  ) {
    return this.callcenter.escalate(operatorId, id, dto.target);
  }

  @Post('cases/:id/call-log')
  logCall(
    @CurrentUser('id') operatorId: string,
    @Param('id') id: string,
    @Body() dto: CallLogDto,
  ) {
    return this.callcenter.logCall(operatorId, id, dto.durationSec, dto.outcome);
  }
}
