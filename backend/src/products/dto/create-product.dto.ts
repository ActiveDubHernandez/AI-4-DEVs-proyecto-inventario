import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UnitOfMeasure } from '../entities/unit-of-measure.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(UnitOfMeasure)
  unidadDeMedida: UnitOfMeasure;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria: string;

  @IsInt()
  @Min(0)
  stockMinimo: number;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
