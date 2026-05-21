export type UnitOfMeasure = 'unidades' | 'kg' | 'litros';

export interface Product {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidadDeMedida: UnitOfMeasure;
  categoria: string;
  stockMinimo: number;
  estado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStock {
  productId: string;
  nombre: string;
  currentStock: number;
  stockMinimo: number;
  isBelowMinimum: boolean;
}

export interface ProductWithStock extends Product {
  currentStock: number;
}
