import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IsDateRangeValid } from '../../common/validators/is-date-range-valid.validator';
import { MovementType } from '../entities/movement-type.enum';

export class FilterMovementsDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(MovementType)
  tipo?: MovementType;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  @IsDateRangeValid()
  fechaFin?: string;
}
