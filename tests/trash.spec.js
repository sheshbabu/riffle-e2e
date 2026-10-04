import { test, expect } from '@playwright/test';
import { resetCuration, reject, findPhoto, allPhotos, importNewPhoto, removeExtraPhotos, LIBRARY_DIR, listFiles } from '../helpers/api.js';
import { OSAKA_NIGHT, BEACH } from '../helpers/photos.js';
import { gotoPage, photoTile, photoTiles, toolbarButton, modal, modalButton, toast, pressKey } from '../helpers/ui.js';

test.describe('Trash', () => {
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
  });

  test.afterEach(async ({ request }) => {
    await removeExtraPhotos(request);
  });

  test('an empty Trash says rejected photos land there', async ({ page }) => {
    await gotoPage(page, '/trash');

    await expect(page.getByText('No rejected photos', { exact: true })).toBeVisible();
    await expect(page.getByText('Rejected photos will appear here', { exact: true })).toBeVisible();
  });

  test('lists rejected photos only', async ({ page, request }) => {
    await reject(request, OSAKA_NIGHT);
    await reject(request, BEACH);

    await gotoPage(page, '/trash');

    await expect(photoTiles(page)).toHaveCount(2);
    await expect(photoTile(page, OSAKA_NIGHT)).toBeVisible();
    await expect(photoTile(page, BEACH)).toBeVisible();
  });

  test('P restores a rejected photo to the library', async ({ page, request }) => {
    await reject(request, OSAKA_NIGHT);
    await gotoPage(page, '/trash');
    await photoTile(page, OSAKA_NIGHT).click();

    await pressKey(page, 'p');

    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).isTrashed).toBe(false);
    expect((await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(true);
  });

  test('Trash offers no curation buttons, only Remove from Disk', async ({ page, request }) => {
    await reject(request, OSAKA_NIGHT);
    await gotoPage(page, '/trash');
    await photoTile(page, OSAKA_NIGHT).click();

    await expect(toolbarButton(page, 'Remove from Disk')).toBeVisible();
    await expect(toolbarButton(page, 'Pick')).toHaveCount(0);
    await expect(toolbarButton(page, 'Add to Album')).toHaveCount(0);
  });

  test('Remove from Disk deletes the file and the photo after confirming', async ({ page, request }) => {
    const { stamp } = await importNewPhoto(request);
    await reject(request, stamp);
    const photo = await findPhoto(request, stamp);
    await gotoPage(page, '/trash');
    await photoTile(page, stamp).click();

    await toolbarButton(page, 'Remove from Disk').click();
    await expect(modal(page)).toContainText('Permanently delete 1 photo?');
    await modalButton(page, 'Remove from Disk').click();

    await expect(toast(page, 'Permanently deleted 1 photo')).toBeVisible();
    await expect(photoTile(page, stamp)).toHaveCount(0);
    expect((await allPhotos(request)).some(p => p.filePath === photo.filePath)).toBe(false);
    expect(listFiles(LIBRARY_DIR).some(file => file.includes(stamp))).toBe(false);
  });

  test('cancelling Remove from Disk keeps the photo', async ({ page, request }) => {
    await reject(request, OSAKA_NIGHT);
    await gotoPage(page, '/trash');
    await photoTile(page, OSAKA_NIGHT).click();

    await toolbarButton(page, 'Remove from Disk').click();
    await modalButton(page, 'Cancel').click();

    await expect(modal(page)).toHaveCount(0);
    await expect(photoTile(page, OSAKA_NIGHT)).toBeVisible();
    expect(listFiles(LIBRARY_DIR).some(file => file.includes(OSAKA_NIGHT))).toBe(true);
  });
});
