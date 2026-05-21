import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
} from 'class-validator';
import { MovementReason } from '../entities/movement-reason.enum';
import { MovementType } from '../entities/movement-type.enum';

export class CreateMovementDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsEnum(MovementType)
  tipo: MovementType;

  @IsInt()
  @Min(1)
  cantidad: number;

  @Type(() => Date)
  @IsDate()
  fecha: Date;

  @IsEnum(MovementReason)
  razon: MovementReason;
}
