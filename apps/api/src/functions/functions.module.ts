import { Module } from '@nestjs/common';
import { FunctionsController } from './functions.controller';
import { FunctionsService } from './functions.service';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [OrgsModule],
  controllers: [FunctionsController],
  providers: [FunctionsService],
})
export class FunctionsModule {}
