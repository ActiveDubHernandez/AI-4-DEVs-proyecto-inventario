import axios, { type AxiosError } from 'axios';
import type { CreateMovementPayload, Movement } from '../types/movement';
import type { Product, ProductStock } from '../types/product';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Returns true when the HTTP status is in the 2xx range.
 */
export function isHttpSuccess(status: number | undefined): boolean {
  return status !== undefined && status >= 200 && status < 300;
}

/**
 * True only for network failures or non-2xx responses (real request failures).
 */
export function isApiRequestFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return true;
  }

  if (!error.response) {
    return true;
  }

  return !isHttpSuccess(error.response.status);
}

/**
 * Extracts a user-facing message from NestJS or Axios errors.
 */
export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Error desconocido';
  }

  const axiosError = error as AxiosError<{ message?: string | string[] }>;

  if (!axiosError.response) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
  }

  const message = axiosError.response.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return `Error del servidor (${axiosError.response.status}). Intenta nuevamente.`;
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const response = await api.get<Product[]>('/products');

  if (!isHttpSuccess(response.status)) {
    throw response;
  }

  const { data } = response;

  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}

export async function fetchProductStock(productId: string): Promise<ProductStock> {
  const { data } = await api.get<ProductStock>(
    `/inventory/products/${productId}/stock`,
  );
  return data;
}

export async function mapProductsWithStock(
  productos: Product[],
): Promise<Array<Product & { currentStock: number }>> {
  if (productos.length === 0) {
    return [];
  }

  const productsWithStock = await Promise.all(
    productos.map(async (product) => {
      try {
        const stock = await fetchProductStock(product.id);
        return {
          ...product,
          currentStock: stock.currentStock,
        };
      } catch {
        return {
          ...product,
          currentStock: 0,
        };
      }
    }),
  );

  return productsWithStock;
}

export async function fetchProductsWithStock(): Promise<
  Array<Product & { currentStock: number }>
> {
  const products = await fetchActiveProducts();
  return mapProductsWithStock(products);
}

export async function createMovement(
  payload: CreateMovementPayload,
): Promise<Movement> {
  const { data } = await api.post<Movement>('/movements', payload);
  return data;
}
