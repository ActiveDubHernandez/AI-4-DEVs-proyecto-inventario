import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createMovement,
  fetchActiveProducts,
  fetchProductStock,
  getApiErrorMessage,
} from '../services/api';
import type { MovementReason, MovementType } from '../types/movement';
import type { Product, ProductStock } from '../types/product';
import './MovementForm.css';

const movementTypeOptions: Array<{ value: MovementType; label: string }> = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
];

const movementReasonOptions: Array<{ value: MovementReason; label: string }> = [
  { value: 'compra', label: 'Compra' },
  { value: 'venta', label: 'Venta' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'merma', label: 'Merma' },
  { value: 'devolucion', label: 'Devolución' },
];

interface MovementFormProps {
  initialProductId?: string;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}

export function MovementForm({ initialProductId }: MovementFormProps) {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadProductsError, setLoadProductsError] = useState<string | null>(null);

  const [productId, setProductId] = useState(initialProductId ?? '');
  const [tipo, setTipo] = useState<MovementType | ''>('');
  const [razon, setRazon] = useState<MovementReason | ''>('');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState(getTodayIsoDate());

  const [stockInfo, setStockInfo] = useState<ProductStock | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockFetchError, setStockFetchError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedCantidad = useMemo(
    () => parsePositiveInteger(cantidad),
    [cantidad],
  );

  const isSalida = tipo === 'salida';

  const exceedsAvailableStock = useMemo(() => {
    if (!isSalida || parsedCantidad === null || stockInfo === null) {
      return false;
    }

    return parsedCantidad > stockInfo.currentStock;
  }, [isSalida, parsedCantidad, stockInfo]);

  const cantidadError = useMemo(() => {
    if (!cantidad) {
      return null;
    }

    if (parsedCantidad === null) {
      return 'La cantidad debe ser un entero positivo mayor a cero.';
    }

    if (exceedsAvailableStock && stockInfo) {
      return `La cantidad supera el stock disponible (${stockInfo.currentStock}).`;
    }

    return null;
  }, [cantidad, parsedCantidad, exceedsAvailableStock, stockInfo]);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setLoadProductsError(null);

    try {
      const data = await fetchActiveProducts();
      setProducts(data);

      if (initialProductId && data.some((item) => item.id === initialProductId)) {
        setProductId(initialProductId);
      }
    } catch (error) {
      setLoadProductsError(getApiErrorMessage(error));
    } finally {
      setIsLoadingProducts(false);
    }
  }, [initialProductId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!isSalida || !productId) {
      return;
    }

    let isCancelled = false;

    const loadStock = async () => {
      setIsLoadingStock(true);
      setStockFetchError(null);

      try {
        const stock = await fetchProductStock(productId);

        if (!isCancelled) {
          setStockInfo(stock);
        }
      } catch (error) {
        if (!isCancelled) {
          setStockInfo(null);
          setStockFetchError(getApiErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingStock(false);
        }
      }
    };

    void loadStock();

    return () => {
      isCancelled = true;
    };
  }, [isSalida, productId]);

  const isFormComplete =
    productId !== '' &&
    tipo !== '' &&
    razon !== '' &&
    fecha !== '' &&
    parsedCantidad !== null;

  const isSubmitDisabled =
    !isFormComplete ||
    cantidadError !== null ||
    isSubmitting ||
    isLoadingStock ||
    (isSalida && stockFetchError !== null) ||
    (isSalida && stockInfo === null && !isLoadingStock) ||
    exceedsAvailableStock ||
    Boolean(successMessage);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled || parsedCantidad === null || !tipo || !razon) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createMovement({
        productId,
        tipo,
        cantidad: parsedCantidad,
        fecha,
        razon,
      });

      setSuccessMessage('Movimiento registrado correctamente.');
      window.setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((item) => item.id === productId);

  return (
    <form
      className="movementForm"
      data-testid="movement-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <header className="movementFormHeader">
        <h2>Registrar movimiento</h2>
        <p>Completa los datos del movimiento de inventario.</p>
      </header>

      {loadProductsError && (
        <div className="movementFormAlert movementFormAlertError" role="alert">
          <p>{loadProductsError}</p>
          <button type="button" onClick={() => void loadProducts()}>
            Reintentar carga de productos
          </button>
        </div>
      )}

      {successMessage && (
        <div className="movementFormAlert movementFormAlertSuccess" role="status">
          {successMessage}
        </div>
      )}

      {submitError && (
        <div className="movementFormAlert movementFormAlertError" role="alert">
          {submitError}
        </div>
      )}

      <div className="movementFormField">
        <label htmlFor="productId">Producto</label>
        <select
          id="productId"
          name="productId"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          disabled={isLoadingProducts || isSubmitting}
          required
        >
          <option value="">Selecciona un producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.nombre} ({product.categoria})
            </option>
          ))}
        </select>
      </div>

      <div className="movementFormField">
        <label htmlFor="tipo">Tipo de movimiento</label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(event) => setTipo(event.target.value as MovementType | '')}
          disabled={isSubmitting}
          required
        >
          <option value="">Selecciona el tipo</option>
          {movementTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="movementFormField">
        <label htmlFor="razon">Razón</label>
        <select
          id="razon"
          name="razon"
          value={razon}
          onChange={(event) => setRazon(event.target.value as MovementReason | '')}
          disabled={isSubmitting}
          required
        >
          <option value="">Selecciona la razón</option>
          {movementReasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="movementFormField">
        <label htmlFor="cantidad">Cantidad</label>
        <input
          id="cantidad"
          name="cantidad"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={cantidad}
          onChange={(event) => setCantidad(event.target.value)}
          disabled={isSubmitting}
          required
          aria-invalid={cantidadError ? true : undefined}
          aria-describedby={cantidadError ? 'cantidadError' : undefined}
        />
        {cantidadError && (
          <p id="cantidadError" className="movementFormFieldError" role="alert">
            {cantidadError}
          </p>
        )}
      </div>

      {isSalida && productId && (
        <div
          className={`movementFormStockPanel ${
            exceedsAvailableStock ? 'movementFormStockPanelDanger' : ''
          }`}
          role="status"
        >
          {isLoadingStock && <p>Consultando stock disponible…</p>}

          {!isLoadingStock && stockFetchError && (
            <p className="movementFormFieldError">{stockFetchError}</p>
          )}

          {!isLoadingStock && stockInfo && (
            <>
              <p>
                <strong>Stock disponible:</strong> {stockInfo.currentStock}{' '}
                {selectedProduct?.unidadDeMedida ?? 'unidades'}
              </p>
              <p className="movementFormStockHint">
                Mínimo configurado: {stockInfo.stockMinimo}
              </p>
            </>
          )}
        </div>
      )}

      <div className="movementFormField">
        <label htmlFor="fecha">Fecha</label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="movementFormActions">
        <button
          type="button"
          className="movementFormSecondaryButton"
          onClick={() => navigate('/')}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="movementFormSubmitButton"
          data-testid="movement-submit"
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? 'Registrando…' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  );
}
