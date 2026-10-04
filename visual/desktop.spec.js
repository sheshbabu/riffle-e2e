import { test, expect } from '@playwright/test';
import { curate, findPhoto } from '../helpers/api.js';
import { gotoPage, photoTile, undoOverlay, pressKey, openFilters, openFilterSection, toolbarButton, lightboxImage, lightboxMetadata, metadataValue, compareImages, tableRows, albumCard, openTagEditor, burstStack, clickGroupSelectAll } from '../helpers/ui.js';
import { OSAKA_NIGHT, KYOTO_TEMPLE, BURST_SECOND } from '../helpers/photos.js';

// Waits for the masonry layout and every image, so a screenshot never catches a half-loaded grid.
async function waitForPhotos(page) {
  await expect(page.locator('.masonry-grid').first()).toHaveClass(/is-laid-out/);
  await page.waitForFunction(() => Array.from(document.images).every(image => image.complete));
}

// Dates the server stamps at run time, and paths that depend on the machine.
function runTimeCells(page) {
  return [page.locator('.table tbody td:first-child')];
}

test.describe('Visual', () => {
  test('curate', async ({ page }) => {
    await gotoPage(page, '/curate');
    await waitForPhotos(page);
    await expect(burstStack(page, BURST_SECOND)).toBeVisible();
    await expect(page).toHaveScreenshot('curate.png');
  });

  test('curate after a pick', async ({ page, request }) => {
    await gotoPage(page, '/curate');
    await waitForPhotos(page);
    await pressKey(page, 'p');
    await expect(undoOverlay(page, OSAKA_NIGHT)).toBeVisible();
    await expect(page).toHaveScreenshot('curate-picked.png');

    // Put Osaka back in Curate for the screenshots after this one.
    await curate(request, (await findPhoto(request, OSAKA_NIGHT)).filePath);
  });

  test('library', async ({ page }) => {
    await gotoPage(page, '/library');
    await waitForPhotos(page);
    await expect(page).toHaveScreenshot('library.png');
  });

  test('library with a selection', async ({ page }) => {
    await gotoPage(page, '/library');
    await waitForPhotos(page);
    await clickGroupSelectAll(page, 'April 2, 2024');
    await page.mouse.move(0, 0);
    await expect(toolbarButton(page, 'Add to Album')).toBeVisible();
    await expect(page).toHaveScreenshot('library-selected.png');
  });

  test('filters', async ({ page }) => {
    await gotoPage(page, '/library?countries=Japan');
    await waitForPhotos(page);
    await openFilters(page);
    await openFilterSection(page, 'Location');
    await expect(page).toHaveScreenshot('filters.png');
  });

  test('lightbox', async ({ page }) => {
    await gotoPage(page, '/library');
    await waitForPhotos(page);
    await photoTile(page, KYOTO_TEMPLE).dblclick();
    await expect(lightboxImage(page)).toHaveClass(/is-loaded/);
    await expect(page).toHaveScreenshot('lightbox.png');
  });

  test('lightbox with details', async ({ page }) => {
    await gotoPage(page, '/library');
    await waitForPhotos(page);
    await photoTile(page, KYOTO_TEMPLE).dblclick();
    await expect(lightboxImage(page)).toHaveClass(/is-loaded/);
    await pressKey(page, 'i');
    await expect(lightboxMetadata(page)).toContainText('temples');
    await expect(page).toHaveScreenshot('lightbox-details.png', {
      mask: [metadataValue(page, 'File Created'), metadataValue(page, 'File Modified'), metadataValue(page, 'Original Path')],
    });
  });

  test('compare', async ({ page }) => {
    await gotoPage(page, '/curate');
    await waitForPhotos(page);
    await pressKey(page, 'c');
    await expect(compareImages(page)).toHaveCount(2);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.compare-image')).every(image => image.complete));
    // The labels and controls only show while the pointer is over the view.
    await page.mouse.move(720, 450);
    await expect(page).toHaveScreenshot('compare.png');
  });

  test('trash', async ({ page }) => {
    await gotoPage(page, '/trash');
    await waitForPhotos(page);
    await expect(page).toHaveScreenshot('trash.png');
  });

  test('albums', async ({ page }) => {
    await gotoPage(page, '/albums');
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete));
    await expect(page).toHaveScreenshot('albums.png');
  });

  test('an album', async ({ page }) => {
    await gotoPage(page, '/albums');
    await albumCard(page, 'Japan 2024').click();
    await waitForPhotos(page);
    await expect(page).toHaveScreenshot('album.png');
  });

  test('manage tags', async ({ page }) => {
    await gotoPage(page, '/library');
    await waitForPhotos(page);
    await photoTile(page, KYOTO_TEMPLE).click();
    await toolbarButton(page, 'Tags').click();
    await expect(page.locator('.tag-badge')).toHaveText('temples');
    await expect(page).toHaveScreenshot('manage-tags.png');
  });

  test('edit a tag', async ({ page }) => {
    await gotoPage(page, '/library');
    await openTagEditor(page, 'temples');
    await expect(page).toHaveScreenshot('edit-tag.png');
  });

  test('calendar', async ({ page }) => {
    await gotoPage(page, '/calendar');
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete));
    await expect(page).toHaveScreenshot('calendar.png');
  });

  test('stats', async ({ page }) => {
    await gotoPage(page, '/stats');
    await expect(page).toHaveScreenshot('stats.png');
  });

  test('import history', async ({ page }) => {
    await gotoPage(page, '/import');
    await expect(tableRows(page)).toHaveCount(1);
    await expect(page).toHaveScreenshot('import.png', { mask: runTimeCells(page) });
  });

  test('import details', async ({ page }) => {
    await gotoPage(page, '/import');
    await tableRows(page).first().click();
    await expect(page.locator('.modal-content-container')).toBeVisible();
    await expect(page).toHaveScreenshot('import-details.png', {
      mask: [...runTimeCells(page), page.locator('.description-item').filter({ hasText: /Date|Source Folder/ }).locator('.description-item-value')],
    });
  });

  test('export history', async ({ page }) => {
    await gotoPage(page, '/export');
    await expect(tableRows(page)).toHaveCount(1);
    await expect(page).toHaveScreenshot('export.png', { mask: runTimeCells(page) });
  });

  for (const pane of ['import', 'library', 'burst', 'export']) {
    test(`settings ${pane}`, async ({ page }) => {
      await gotoPage(page, `/settings/${pane}`);
      await expect(page.locator('.settings-tab.is-active')).toBeVisible();
      await expect(page).toHaveScreenshot(`settings-${pane}.png`);
    });
  }
});
