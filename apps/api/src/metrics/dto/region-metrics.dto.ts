import { IsOptional, IsString } from 'class-validator';
import { RangeDto } from './range.dto';

export class RegionMetricsDto extends RangeDto {
  @IsOptional()
  @IsString()
  region?: string;
}
