import { expect, type Locator, type Page } from '@playwright/test';

export function productCard(page: Page, productName: string): Locator {
  return page.locator(
    `[data-testid="product-card"][data-product-name="${productName}"]`,
  );
}

export async function getCurrentStockFromCard(
  page: Page,
  productName: string,
): Promise<number> {
  const stockText = await productCard(page, productName)
    .getByTestId('product-current-stock')
    .innerText();

  const stockValue = Number.parseInt(stockText.split(' ')[0] ?? '', 10);
  expect(Number.isNaN(stockValue)).toBeFalsy();
  return stockValue;
}

export async function waitForProductListReady(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Inventario de productos' })).toBeVisible();
  await expect(page.getByTestId('product-list-grid')).toBeVisible();
}
