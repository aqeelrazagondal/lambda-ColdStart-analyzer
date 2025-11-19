import { IsArray, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class ScanLambdasDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  regions?: string[];
}
