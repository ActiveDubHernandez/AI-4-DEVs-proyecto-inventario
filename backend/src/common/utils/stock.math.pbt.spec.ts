import * as fc from 'fast-check';
import { MovementType } from '../../movements/entities/movement-type.enum';
import {
  applyMovementWithNonNegativeGuard,
  calculateStockFromMovements,
  simulateMovementSequence,
  type StockMovementRecord,
} from './stock.math';

const movementArbitrary: fc.Arbitrary<StockMovementRecord> = fc.record({
  tipo: fc.constantFrom(MovementType.ENTRADA, MovementType.SALIDA),
  cantidad: fc.integer({ min: 1, max: 100 }),
});

const movementSequenceArbitrary = fc.array(movementArbitrary, {
  minLength: 0,
  maxLength: 80,
});

describe('Stock math PBT', () => {
  /**
   * P1 (Stock nunca negativo): rejected salidas prevent inventory below zero.
   */
  it('P1: simulated inventory never ends below zero', () => {
    fc.assert(
      fc.property(movementSequenceArbitrary, (movements) => {
        const { finalStock } = simulateMovementSequence(movements);
        expect(finalStock).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * P1 extended: every accepted step keeps non-negative stock.
   */
  it('P1: each accepted movement keeps stock non-negative', () => {
    fc.assert(
      fc.property(movementSequenceArbitrary, (movements) => {
        let currentStock = 0;

        for (const movement of movements) {
          const result = applyMovementWithNonNegativeGuard(
            currentStock,
            movement.tipo,
            movement.cantidad,
          );

          if (result.accepted) {
            expect(result.newStock).toBeGreaterThanOrEqual(0);
            currentStock = result.newStock;
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * P3 (Stock consistente): final stock equals entries minus exits for accepted movements.
   */
  it('P3: final stock matches sum(entries) - sum(exits) on accepted movements', () => {
    fc.assert(
      fc.property(movementSequenceArbitrary, (movements) => {
        const { finalStock, acceptedMovements } =
          simulateMovementSequence(movements);
        const expectedStock = calculateStockFromMovements(acceptedMovements);

        expect(finalStock).toBe(expectedStock);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * P3 extended: formula is commutative with operation order for accepted sequence.
   */
  it('P3: incremental simulation equals batch formula', () => {
    fc.assert(
      fc.property(movementSequenceArbitrary, (movements) => {
        const { acceptedMovements } = simulateMovementSequence(movements);
        const batchStock = calculateStockFromMovements(acceptedMovements);

        let incrementalStock = 0;
        for (const movement of acceptedMovements) {
          const result = applyMovementWithNonNegativeGuard(
            incrementalStock,
            movement.tipo,
            movement.cantidad,
          );
          incrementalStock = result.newStock;
        }

        expect(incrementalStock).toBe(batchStock);
      }),
      { numRuns: 200 },
    );
  });

  it('P1: salida greater than stock is always rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (currentStock, extra) => {
          const cantidad = currentStock + extra;
          const result = applyMovementWithNonNegativeGuard(
            currentStock,
            MovementType.SALIDA,
            cantidad,
          );

          expect(result.accepted).toBe(false);
          expect(result.newStock).toBe(currentStock);
        },
      ),
      { numRuns: 150 },
    );
  });
});
