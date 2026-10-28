import { test, expect } from '@playwright/test';

test.describe('Result Page Visual Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analysis/preview');
  });

  test('result page renders without crashing', async ({ page }) => {
    await expect(page.locator('main.result-read')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('overview photograph uses contained, centered framing', async ({ page }) => {
    const viewport = page.locator('.result-read__photo-viewport--overview');
    await expect(viewport).toBeVisible();
    const image = viewport.locator('img').first();
    await expect(image).toBeVisible();
    await expect(viewport).toHaveAttribute('data-object-fit', 'contain');
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(image).toHaveCSS('object-position', '50% 50%');

    const safeArea = viewport.locator('.result-read__photo-viewport-safe-area');
    await expect(safeArea).toBeVisible();
    const [viewportBox, safeAreaBox] = await Promise.all([
      viewport.boundingBox(),
      safeArea.boundingBox(),
    ]);
    expect(viewportBox).not.toBeNull();
    expect(safeAreaBox).not.toBeNull();
    expect(safeAreaBox.x).toBeGreaterThanOrEqual(viewportBox.x - 0.5);
    expect(safeAreaBox.y).toBeGreaterThanOrEqual(viewportBox.y - 0.5);
    expect(safeAreaBox.x + safeAreaBox.width).toBeLessThanOrEqual(viewportBox.x + viewportBox.width + 0.5);
    expect(safeAreaBox.y + safeAreaBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 0.5);
  });

  test('DiagnosticPanel tabs cycle gracefully', async ({ page }) => {
    const tabList = page.getByRole('tablist', { name: 'Diagnostic Modes' }).first();
    await expect(tabList).toBeVisible();
    const tabs = tabList.getByRole('tab');
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }
  });
});
