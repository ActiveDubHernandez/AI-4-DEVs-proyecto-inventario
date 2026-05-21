import { expect, test } from '@playwright/test';
import {
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
const productFlowName = `E2E Flujo Movimiento ${runId}`;

let flowProductId = '';

test.describe.configure({ mode: 'serial' });

test.describe('Movement form E2E flow', () => {
  test.beforeAll(async () => {
    const product = await createProduct({
      nombre: productFlowName,
      descripcion: 'Producto para flujo entrada/salida',
      unidadDeMedida: 'unidades',
      categoria: 'E2E',
      stockMinimo: 0,
    });

    flowProductId = product.id;
  });

  test.afterAll(async () => {
    await deactivateProduct(flowProductId);
  });

  test('shows initial stock on product list', async ({ page }) => {
    await page.goto('/');
    await waitForProductListReady(page);

    const initialStock = await getCurrentStockFromCard(page, productFlowName);
    expect(initialStock).toBe(0);
  });

  test('registers entrada and updates stock in list', async ({ page }) => {
    await page.goto(`/movements/new?productId=${flowProductId}`);

    await expect(page.getByTestId('movement-form')).toBeVisible();
    await expect(page.getByLabel('Producto')).toHaveValue(flowProductId, {
      timeout: 15_000,
    });

    await page.getByLabel('Tipo de movimiento').selectOption('entrada');
    await page.getByLabel('Razón').selectOption('compra');
    await page.getByLabel('Cantidad').fill('15');
    await page.getByTestId('movement-submit').click();

    await expect(page.getByText('Movimiento registrado correctamente.')).toBeVisible();
    await page.waitForURL('/');

    await waitForProductListReady(page);
    const stockAfterEntrada = await getCurrentStockFromCard(page, productFlowName);
    expect(stockAfterEntrada).toBe(15);
  });

  test('registers valid salida and discounts stock in list', async ({ page }) => {
    await page.goto(`/movements/new?productId=${flowProductId}`);

    await page.getByLabel('Tipo de movimiento').selectOption('salida');
    await page.getByLabel('Razón').selectOption('venta');
    await page.getByLabel('Cantidad').fill('5');

    await expect(page.getByText(/Stock disponible:\s*15/)).toBeVisible();
    await page.getByTestId('movement-submit').click();

    await expect(page.getByText('Movimiento registrado correctamente.')).toBeVisible();
    await page.waitForURL('/');

    const stockAfterSalida = await getCurrentStockFromCard(page, productFlowName);
    expect(stockAfterSalida).toBe(10);
  });

  test('blocks invalid salida exceeding available stock with explicit UI error', async ({
    page,
  }) => {
    await page.goto(`/movements/new?productId=${flowProductId}`);

    await page.getByLabel('Tipo de movimiento').selectOption('salida');
    await page.getByLabel('Razón').selectOption('venta');
    await page.getByLabel('Cantidad').fill('11');

    await expect(page.getByText(/Stock disponible:\s*10/)).toBeVisible();
    await expect(page.getByText(/supera el stock disponible/i)).toBeVisible();

    const submitButton = page.getByTestId('movement-submit');
    await expect(submitButton).toBeDisabled();

    await submitButton.click({ force: true });
    await expect(page).toHaveURL(/\/movements\/new/);
    await expect(page.getByText('Movimiento registrado correctamente.')).toHaveCount(0);

    await page.goto('/');
    const unchangedStock = await getCurrentStockFromCard(page, productFlowName);
    expect(unchangedStock).toBe(10);

    await expect(
      productCard(page, productFlowName).getByTestId('stock-badge-ok'),
    ).toBeVisible();
  });
});
