import { test, expect } from '@playwright/test';
import { resetCuration, pick, reject } from '../helpers/api.js';
import { OSAKA_NIGHT, CLIP, BURST_FIRST, KYOTO_GARDEN, KYOTO_TEMPLE, BIRTHDAY, BEACH, HIKE, SCREENSHOT } from '../helpers/photos.js';
import { gotoPage, photoTile, photoTiles, openFilters, closeFilters, openFilterSection, filterOption, filterBadge, filterPanel, toolbarButton } from '../helpers/ui.js';

// Every photo except the rejected burst frame and the untouched second frame is in the library.
const PICKED = [OSAKA_NIGHT, CLIP, KYOTO_GARDEN, KYOTO_TEMPLE, BIRTHDAY, BEACH, HIKE, SCREENSHOT];

test.describe('Library', () => {
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
    for (const stamp of PICKED) {
      await pick(request, stamp);
    }
    await pick(request, KYOTO_TEMPLE, 5);
    await pick(request, BEACH, 3);
    await reject(request, BURST_FIRST);
  });

  test('shows picked photos only', async ({ page }) => {
    await gotoPage(page, '/library');

    await expect(photoTiles(page)).toHaveCount(PICKED.length);
    await expect(photoTile(page, BURST_FIRST)).toHaveCount(0);
  });

  test('filter by camera make, and the badge counts it', async ({ page }) => {
    await gotoPage(page, '/library');
    await openFilters(page);

    await openFilterSection(page, 'Camera');
    await filterOption(page, 'Apple').click();

    await expect(page).toHaveURL(/cameraMakes=Apple/);
    await expect(photoTiles(page)).toHaveCount(2);
    await expect(photoTile(page, BIRTHDAY)).toBeVisible();
    await expect(photoTile(page, BEACH)).toBeVisible();
    await closeFilters(page);
    await expect(filterBadge(page)).toHaveText('1');
  });

  test('filter by country', async ({ page }) => {
    await gotoPage(page, '/library');
    await openFilters(page);

    await openFilterSection(page, 'Location');
    await filterOption(page, 'Japan').click();

    await expect(photoTiles(page)).toHaveCount(3);
    for (const stamp of [OSAKA_NIGHT, KYOTO_GARDEN, KYOTO_TEMPLE]) {
      await expect(photoTile(page, stamp)).toBeVisible();
    }
  });

  test('filter by rating', async ({ page }) => {
    await gotoPage(page, '/library');
    await openFilters(page);

    await filterOption(page, '5 Stars').click();
    await filterOption(page, '3 Stars').click();

    await expect(page).toHaveURL(/ratings=5.*ratings=3|ratings=3.*ratings=5/);
    await expect(photoTiles(page)).toHaveCount(2);
    await expect(photoTile(page, KYOTO_TEMPLE)).toBeVisible();
    await expect(photoTile(page, BEACH)).toBeVisible();
  });

  test('filter to videos, and to portrait photos', async ({ page }) => {
    await gotoPage(page, '/library');
    await openFilters(page);

    await filterOption(page, 'Videos only').click();
    await expect(photoTiles(page)).toHaveCount(1);
    await expect(photoTile(page, CLIP)).toBeVisible();

    await filterOption(page, 'All').first().click();
    await openFilterSection(page, 'Orientation');
    await filterOption(page, 'Portrait').click();
    await expect(photoTiles(page)).toHaveCount(2);
    await expect(photoTile(page, KYOTO_GARDEN)).toBeVisible();
    await expect(photoTile(page, BIRTHDAY)).toBeVisible();
  });

  test('filter by year and file format together', async ({ page }) => {
    await gotoPage(page, '/library');
    await openFilters(page);

    await openFilterSection(page, 'Year');
    await filterOption(page, '2021').click();
    await filterOption(page, '2022').click();
    await openFilterSection(page, 'File Format');
    await filterOption(page, 'PNG').click();

    await expect(photoTiles(page)).toHaveCount(1);
    await expect(photoTile(page, SCREENSHOT)).toBeVisible();
  });

  test('filters that match nothing say so, and Clear all resets them', async ({ page }) => {
    await gotoPage(page, '/library?cameraMakes=Google&countries=Japan');

    await expect(page.getByText('No photos found', { exact: true })).toBeVisible();
    await expect(page.getByText('Try adjusting your filters', { exact: true })).toBeVisible();
    await expect(filterBadge(page)).toHaveText('2');

    await openFilters(page);
    await filterPanel(page).getByText('Clear all', { exact: true }).click();

    await expect(page).toHaveURL(/\/library$/);
    await expect(photoTiles(page)).toHaveCount(PICKED.length);
    await expect(filterBadge(page)).toHaveCount(0);
  });

  test('clicking outside the filter panel closes it', async ({ page }) => {
    await gotoPage(page, '/library');
    await openFilters(page);

    await page.mouse.click(400, 450);

    await expect(filterPanel(page)).toHaveCount(0);
  });

  test('Library pages can be curated too', async ({ page, request }) => {
    await gotoPage(page, '/library');
    await photoTile(page, HIKE).click();

    await toolbarButton(page, 'Reject').click();

    await expect(photoTile(page, HIKE)).toHaveClass(/is-fading/);
    await gotoPage(page, '/trash');
    await expect(photoTile(page, HIKE)).toBeVisible();
  });
});
