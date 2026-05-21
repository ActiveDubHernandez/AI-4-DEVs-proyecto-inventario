import { Link } from 'react-router-dom';
import type { ProductWithStock } from '../types/product';
import { StockBadge } from './StockBadge';
import './ProductCard.css';

const unitLabels: Record<ProductWithStock['unidadDeMedida'], string> = {
  unidades: 'Unidades',
  kg: 'Kilogramos',
  litros: 'Litros',
};

interface ProductCardProps {
  product: ProductWithStock;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article
      className="productCard"
      data-testid="product-card"
      data-product-name={product.nombre}
    >
      <header className="productCardHeader">
        <h2 className="productCardTitle">{product.nombre}</h2>
        <StockBadge
          stockActual={product.currentStock}
          stockMinimo={product.stockMinimo}
        />
      </header>

      <dl className="productCardMeta">
        <div className="productCardMetaRow">
          <dt>Categoría</dt>
          <dd>{product.categoria}</dd>
        </div>
        <div className="productCardMetaRow">
          <dt>Unidad</dt>
          <dd>{unitLabels[product.unidadDeMedida]}</dd>
        </div>
        <div className="productCardMetaRow">
          <dt>Stock actual</dt>
          <dd data-testid="product-current-stock">
            {product.currentStock} {product.unidadDeMedida}
          </dd>
        </div>
        <div className="productCardMetaRow">
          <dt>Stock mínimo</dt>
          <dd>
            {product.stockMinimo} {product.unidadDeMedida}
          </dd>
        </div>
      </dl>

      <Link
        className="productCardAction"
        to={`/movement?productId=${product.id}`}
      >
        Registrar movimiento
      </Link>
    </article>
  );
}
