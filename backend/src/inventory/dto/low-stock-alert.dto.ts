export class LowStockAlertDto {
  productId: string;
  nombre: string;
  categoria: string;
  currentStock: number;
  stockMinimo: number;
  unidadDeMedida: string;
}
