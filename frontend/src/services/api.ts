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
 * Extracts a user-facing message from NestJS or Axios errors.
 */
export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Error desconocido';
  }

  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  if (axiosError.response?.status === 0 || !axiosError.response) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
  }

  return axiosError.message;
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/products');
  return data;
}

export async function fetchProductStock(productId: string): Promise<ProductStock> {
  const { data } = await api.get<ProductStock>(
    `/inventory/products/${productId}/stock`,
  );
  return data;
}

export async function fetchProductsWithStock(): Promise<
  Array<Product & { currentStock: number }>
> {
  const products = await fetchActiveProducts();

  const productsWithStock = await Promise.all(
    products.map(async (product) => {
      const stock = await fetchProductStock(product.id);
      return {
        ...product,
        currentStock: stock.currentStock,
      };
    }),
  );

  return productsWithStock;
}

export async function createMovement(
  payload: CreateMovementPayload,
): Promise<Movement> {
  const { data } = await api.post<Movement>('/movements', payload);
  return data;
}
