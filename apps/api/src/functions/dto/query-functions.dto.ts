import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryFunctionsDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  runtime?: string;

  @IsOptional()
  @IsString()
  q?: string; // search by name contains

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  pageSize?: number;
}
