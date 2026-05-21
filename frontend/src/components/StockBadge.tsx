import './StockBadge.css';

interface StockBadgeProps {
  stockActual: number;
  stockMinimo: number;
}

export function StockBadge({ stockActual, stockMinimo }: StockBadgeProps) {
  const isAlert = stockActual <= stockMinimo;

  if (!isAlert) {
    return (
      <span
        className="stockBadge stockBadgeOk"
        data-testid="stock-badge-ok"
        aria-label="Stock en nivel normal"
      >
        Stock OK
      </span>
    );
  }

  return (
    <span
      className="stockBadge stockBadgeDanger"
      data-testid="stock-badge-danger"
      role="status"
      aria-label={`Alerta: stock ${stockActual}, mínimo ${stockMinimo}`}
    >
      Stock bajo
    </span>
  );
}
