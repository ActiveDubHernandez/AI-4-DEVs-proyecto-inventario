import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Ensures fechaInicio is not after fechaFin when both query params are present.
 */
@ValidatorConstraint({ name: 'isDateRangeValid', async: false })
export class IsDateRangeValidConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as {
      fechaInicio?: string;
      fechaFin?: string;
    };

    if (!object.fechaInicio || !object.fechaFin) {
      return true;
    }

    return new Date(object.fechaInicio) <= new Date(object.fechaFin);
  }

  defaultMessage(): string {
    return 'fechaInicio no puede ser posterior a fechaFin';
  }
}

/**
 * Property decorator for date range validation on DTO query filters.
 */
export function IsDateRangeValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRangeValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsDateRangeValidConstraint,
    });
  };
}
