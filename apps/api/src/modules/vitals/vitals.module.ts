import { Module } from '@nestjs/common';
import { VitalsController } from './vitals.controller';
import { VitalsService } from './vitals.service';
import { GrowthChartService } from './growth-chart.service';

@Module({
  controllers: [VitalsController],
  providers: [VitalsService, GrowthChartService],
  exports: [VitalsService, GrowthChartService],
})
export class VitalsModule {}
