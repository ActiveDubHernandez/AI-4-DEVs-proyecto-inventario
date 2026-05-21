import { expect, test } from '@playwright/test';
import {
  createMovement,
  createProduct,
  deactivateProduct,
  todayIsoDate,
} from './helpers/api-helpers';
import {
  getCurrentStockFromCard,
  productCard,
  waitForProductListReady,
} from './helpers/ui-helpers';

const runId = `${Date.now()}`;
const productAlertName = `E2E Alerta ${runId}`;
const productHealthyName = `E2E Saludable ${runId}`;

let alertProductId = '';
let okProductId = '';

test.describe('Product list E2E', () => {
  test.beforeAll(async () => {
    const alertProduct = await createProduct({
      nombre: productAlertName,
      descripcion: 'Producto bajo mínimo para E2E',
      unidadDeMedida: 'unidades',
      categoria: 'E2E',
      stockMinimo: 10,
    });

    const okProduct = await createProduct({
      nombre: productHealthyName,
      descripcion: 'Producto con stock saludable',
      unidadDeMedida: 'unidades',
      categoria: 'E2E',
      stockMinimo: 5,
    });

    alertProductId = alertProduct.id;
    okProductId = okProduct.id;

    await createMovement({
      productId: okProductId,
      tipo: 'entrada',
      cantidad: 20,
      fecha: todayIsoDate(),
      razon: 'compra',
    });
  });

  test.afterAll(async () => {
    await deactivateProduct(alertProductId);
    await deactivateProduct(okProductId);
  });

  test('loads interactive list components and red badge for low stock products', async ({
    page,
  }) => {
    await page.goto('/');

    await waitForProductListReady(page);

    const alertCard = productCard(page, productAlertName);
    const okCard = productCard(page, productHealthyName);

    await expect(alertCard).toBeVisible();
    await expect(okCard).toBeVisible();

    await expect(alertCard.getByRole('link', { name: 'Registrar movimiento' })).toBeVisible();
    await expect(okCard.getByRole('link', { name: 'Registrar movimiento' })).toBeVisible();

    const alertBadge = alertCard.getByTestId('stock-badge-danger');
    const okBadge = okCard.getByTestId('stock-badge-ok');

    await expect(alertBadge).toBeVisible();
    await expect(alertBadge).toHaveText('Stock bajo');

    await expect(okBadge).toBeVisible();
    await expect(okBadge).toHaveText('Stock OK');

    const alertStock = await getCurrentStockFromCard(page, productAlertName);
    const okStock = await getCurrentStockFromCard(page, productHealthyName);

    expect(alertStock).toBeLessThanOrEqual(10);
    expect(okStock).toBeGreaterThan(5);
  });
});
