import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { resetCuration, updateSetting, getSettings, findPhoto, LIBRARY_DIR, RUN_DIR } from '../helpers/api.js';
import { BURST_FIRST, BURST_SECOND } from '../helpers/photos.js';
import { gotoPage, runOperation, textButton, segment, selectedSegment, formSection, burstStack, burstBadge, burstIndicator, photoTile, sidebarLink } from '../helpers/ui.js';

const THUMBNAILS_DIR = path.join(RUN_DIR, 'thumbnails');

test.describe('Settings', () => {
  test.afterEach(async ({ request }) => {
    await updateSetting(request, 'burst_detection_enabled', 'false');
  });

  test('the settings tabs each open their pane', async ({ page }) => {
    await gotoPage(page, '/settings');

    for (const [tab, heading] of [['Library', 'Library Maintenance'], ['Burst', 'Burst Detection'], ['Export', 'Minimum Rating'], ['Import', 'Import Behavior']]) {
      await page.locator('.settings-tab', { hasText: tab }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
  });

  test('a changed setting is saved', async ({ page, request }) => {
    await gotoPage(page, '/settings/import');

    await segment(page, 'File Transfer', 'Move').click();

    await expect.poll(async () => (await getSettings(request)).import_mode).toBe('move');
    await gotoPage(page, '/settings/import');
    await expect(selectedSegment(page, 'File Transfer')).toHaveText('Move');
    await updateSetting(request, 'import_mode', 'copy');
  });

  test('turning on burst detection and rebuilding groups the burst frames', async ({ page, request }) => {
    await resetCuration(request);
    await gotoPage(page, '/settings/burst');

    await segment(page, 'Enable Burst Detection', 'Enabled').click();
    await expect(formSection(page, 'Rebuild Burst Data')).toBeVisible();
    await runOperation(page, request, textButton(page, 'Rebuild Burst Data'), '/api/burst/rebuild/');

    await gotoPage(page, '/curate');
    await expect(burstBadge(page, BURST_SECOND)).toHaveText('2');
    await expect(photoTile(page, BURST_FIRST)).toHaveCount(0);

    await burstStack(page, BURST_SECOND).click();
    await expect(burstIndicator(page, BURST_SECOND)).toHaveText('1/2');
    await expect(burstIndicator(page, BURST_FIRST)).toHaveText('2/2');
  });

  test('Rebuild Thumbnails regenerates a missing thumbnail', async ({ page, request }) => {
    const photo = await findPhoto(request, BURST_FIRST);
    const thumbnail = path.join(THUMBNAILS_DIR, path.relative(LIBRARY_DIR, photo.filePath)).replace(/\.\w+$/, '.jpg');
    expect(fs.existsSync(thumbnail)).toBe(true);
    fs.rmSync(thumbnail);
    await gotoPage(page, '/settings/library');

    await runOperation(page, request, textButton(page, 'Rebuild Thumbnails'), '/api/thumbnails/rebuild/');

    expect(fs.existsSync(thumbnail)).toBe(true);
  });

  test('the sidebar marks the current page', async ({ page }) => {
    await gotoPage(page, '/albums');

    await expect(sidebarLink(page, 'Albums')).toHaveClass(/is-active/);
    await sidebarLink(page, 'Calendar').click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(sidebarLink(page, 'Calendar')).toHaveClass(/is-active/);
    await expect(sidebarLink(page, 'Albums')).not.toHaveClass(/is-active/);
    await expect(photoTile(page, BURST_FIRST)).toHaveCount(0);
  });
});
