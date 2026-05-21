export type MovementType = 'entrada' | 'salida';

export type MovementReason =
  | 'compra'
  | 'venta'
  | 'ajuste'
  | 'merma'
  | 'devolucion';

export interface CreateMovementPayload {
  productId: string;
  tipo: MovementType;
  cantidad: number;
  fecha: string;
  razon: MovementReason;
}

export interface Movement {
  id: string;
  productId: string;
  tipo: MovementType;
  cantidad: number;
  fecha: string;
  razon: MovementReason;
  createdAt: string;
}
