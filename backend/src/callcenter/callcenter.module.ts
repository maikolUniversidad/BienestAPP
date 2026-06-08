import { Module } from '@nestjs/common';
import { CallcenterService } from './callcenter.service';
import { CallcenterController } from './callcenter.controller';

@Module({
  controllers: [CallcenterController],
  providers: [CallcenterService],
})
export class CallcenterModule {}
