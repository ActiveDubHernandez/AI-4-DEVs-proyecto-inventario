import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as fc from 'fast-check';
import { MovementReason } from '../entities/movement-reason.enum';
import { MovementType } from '../entities/movement-type.enum';
import { CreateMovementDto } from './create-movement.dto';

const validProductId = '123e4567-e89b-12d3-a456-426614174000';

function buildValidDto(
  overrides: Partial<CreateMovementDto> = {},
): CreateMovementDto {
  return plainToInstance(
    CreateMovementDto,
    {
      productId: validProductId,
      tipo: MovementType.ENTRADA,
      cantidad: 5,
      fecha: '2026-05-19',
      razon: MovementReason.COMPRA,
      ...overrides,
    },
    { enableImplicitConversion: true },
  );
}

async function hasValidationErrors(dto: CreateMovementDto): Promise<boolean> {
  const errors = await validate(dto);
  return errors.length > 0;
}

describe('CreateMovementDto PBT', () => {
  it('P2: accepts only positive integer cantidad values', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10_000 }), async (cantidad) => {
        const dto = buildValidDto({ cantidad });
        const isInvalid = await hasValidationErrors(dto);
        expect(isInvalid).toBe(false);
      }),
      { numRuns: 120 },
    );
  });

  /**
   * P2 (Cantidad siempre entera positiva): rejects zero and negative values.
   */
  it('P2: rejects cantidad <= 0 deterministically', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: -500, max: 0 }), async (cantidad) => {
        const dto = buildValidDto({ cantidad });
        const isInvalid = await hasValidationErrors(dto);
        expect(isInvalid).toBe(true);
      }),
      { numRuns: 120 },
    );
  });

  /**
   * P2: rejects decimal cantidad values.
   */
  it('P2: rejects decimal cantidad values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 0.01, max: 500, noNaN: true }).filter(
          (value) => !Number.isInteger(value),
        ),
        async (cantidad) => {
          const dto = buildValidDto({ cantidad });
          const isInvalid = await hasValidationErrors(dto);
          expect(isInvalid).toBe(true);
        },
      ),
      { numRuns: 120 },
    );
  });

  it('P2: rejects non-integer numeric representations', async () => {
    const invalidValues = [0, -1, -100, 1.5, 2.01, 0.99];

    for (const cantidad of invalidValues) {
      const dto = buildValidDto({ cantidad });
      const isInvalid = await hasValidationErrors(dto);
      expect(isInvalid).toBe(true);
    }
  });
});
