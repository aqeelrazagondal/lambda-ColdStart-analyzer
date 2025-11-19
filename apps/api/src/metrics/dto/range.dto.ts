import { IsOptional, Matches } from 'class-validator';

// Accept ranges like 1d, 7d, 30d, 12h, 90m, etc.
export class RangeDto {
  @IsOptional()
  @Matches(/^\d+[smhdw]$/i, { message: 'range must match /^(number)(s|m|h|d|w)$/' })
  range?: string;
}
