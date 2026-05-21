import { MovementType } from '../../movements/entities/movement-type.enum';

export interface StockMovementRecord {
  tipo: MovementType;
  cantidad: number;
}

/**
 * Pure stock formula: sum(entries) - sum(exits).
 */
export function calculateStockFromMovements(
  movements: StockMovementRecord[],
): number {
  return movements.reduce((accumulator, movement) => {
    if (movement.tipo === MovementType.ENTRADA) {
      return accumulator + movement.cantidad;
    }

    return accumulator - movement.cantidad;
  }, 0);
}

export interface MovementApplicationResult {
  accepted: boolean;
  newStock: number;
}

/**
 * Applies one movement using the same business guard as MovementsService.
 */
export function applyMovementWithNonNegativeGuard(
  currentStock: number,
  tipo: MovementType,
  cantidad: number,
): MovementApplicationResult {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { accepted: false, newStock: currentStock };
  }

  if (tipo === MovementType.SALIDA && cantidad > currentStock) {
    return { accepted: false, newStock: currentStock };
  }

  const delta = tipo === MovementType.ENTRADA ? cantidad : -cantidad;
  return { accepted: true, newStock: currentStock + delta };
}

/**
 * Simulates a sequence of movements, skipping rejected salidas.
 */
export function simulateMovementSequence(
  movements: StockMovementRecord[],
): { finalStock: number; acceptedMovements: StockMovementRecord[] } {
  let currentStock = 0;
  const acceptedMovements: StockMovementRecord[] = [];

  for (const movement of movements) {
    const result = applyMovementWithNonNegativeGuard(
      currentStock,
      movement.tipo,
      movement.cantidad,
    );

    if (result.accepted) {
      currentStock = result.newStock;
      acceptedMovements.push(movement);
    }
  }

  return { finalStock: currentStock, acceptedMovements };
}
