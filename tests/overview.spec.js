import { test, expect } from '@playwright/test';
import { resetCuration, pick, reject } from '../helpers/api.js';
import { OSAKA_NIGHT, BEACH, HIKE } from '../helpers/photos.js';
import { gotoPage, photoTile } from '../helpers/ui.js';

test.describe('Stats and Calendar', () => {
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
    await pick(request, OSAKA_NIGHT);
    await pick(request, BEACH);
    await reject(request, HIKE);
  });

  test('the stats totals match the library', async ({ page, request }) => {
    const response = await request.get('/api/stats/');
    const { totals } = await response.json();
    expect(totals.curated).toBe(2);
    expect(totals.trashed).toBe(1);

    await gotoPage(page, '/stats');

    for (const [label, value] of [['Total', totals.total], ['Curated', totals.curated], ['Uncurated', totals.uncurated], ['Trashed', totals.trashed]]) {
      await expect(page.locator('.stats-summary-item', { hasText: label }).first()).toContainText(String(value));
    }
    await expect(page.getByText('2020s', { exact: true })).toBeVisible();
  });

  test('the calendar has a tile per month, grouped by year', async ({ page }) => {
    await gotoPage(page, '/calendar');

    await expect(page.locator('.calendar-year-header').first()).toHaveText('2024');
    await expect(page.locator('.calendar-year-section', { hasText: '2023' }).locator('.calendar-month-name')).toHaveText(['Dec', 'Aug']);
  });

  test('a month tile opens that year in the library', async ({ page }) => {
    await gotoPage(page, '/calendar');

    await page.locator('.calendar-year-section', { hasText: '2024' }).locator('.calendar-month-tile').first().click();

    await expect(page).toHaveURL(/\/library\?years=2024$/);
    await expect(photoTile(page, OSAKA_NIGHT)).toBeVisible();
    await expect(photoTile(page, BEACH)).toHaveCount(0);
  });
});
