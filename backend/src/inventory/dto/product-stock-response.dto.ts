export class ProductStockResponseDto {
  productId: string;
  nombre: string;
  currentStock: number;
  stockMinimo: number;
  isBelowMinimum: boolean;
}
