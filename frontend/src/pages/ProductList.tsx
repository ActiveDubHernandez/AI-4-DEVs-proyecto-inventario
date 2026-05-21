import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import {
  fetchProductsWithStock,
  getApiErrorMessage,
  isApiRequestFailure,
} from '../services/api';
import type { ProductWithStock } from '../types/product';
import './ProductList.css';

export function ProductList() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchProductsWithStock();
      setProducts(data);
      setErrorMessage(null);
    } catch (error) {
      if (!isApiRequestFailure(error)) {
        setProducts([]);
        setErrorMessage(null);
        return;
      }

      setErrorMessage(getApiErrorMessage(error));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <main className="productListPage">
      <header className="productListHeader">
        <h1>Inventario de productos</h1>
        <p className="productListSubtitle">
          Productos activos con stock en tiempo real
        </p>
      </header>

      {isLoading && (
        <p className="productListStatus" role="status">
          Cargando productos…
        </p>
      )}

      {errorMessage && (
        <div className="productListAlert productListAlertError" role="alert">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void loadProducts()}>
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && products.length === 0 && (
        <p className="productListEmpty" role="status">
          No hay productos registrados en el inventario. ¡Crea el primero!
        </p>
      )}

      {!isLoading && !errorMessage && products.length > 0 && (
        <section
          className="productListGrid"
          aria-label="Lista de productos"
          data-testid="product-list-grid"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </main>
  );
}
