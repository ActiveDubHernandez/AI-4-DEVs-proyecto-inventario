export const apiBaseUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3000';

export interface ProductResponse {
  id: string;
  nombre: string;
  stockMinimo: number;
  estado: boolean;
}

export interface CreateProductPayload {
  nombre: string;
  descripcion?: string;
  unidadDeMedida: 'unidades' | 'kg' | 'litros';
  categoria: string;
  stockMinimo: number;
}

export interface CreateMovementPayload {
  productId: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  fecha: string;
  razon: 'compra' | 'venta' | 'ajuste' | 'merma' | 'devolucion';
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<ProductResponse> {
  const response = await fetch(`${apiBaseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJson<ProductResponse>(response);
}

export async function deactivateProduct(productId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/products/${productId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DELETE product failed ${response.status}: ${body}`);
  }
}

export async function createMovement(
  payload: CreateMovementPayload,
): Promise<{ id: string }> {
  const response = await fetch(`${apiBaseUrl}/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJson<{ id: string }>(response);
}

export async function fetchProductStock(productId: string): Promise<number> {
  const response = await fetch(
    `${apiBaseUrl}/inventory/products/${productId}/stock`,
  );

  const data = await parseJson<{ currentStock: number }>(response);
  return data.currentStock;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
