import { test, expect } from '@playwright/test';
import { resetCuration, findPhoto, listPhotos, pick } from '../helpers/api.js';
import { ALL_PHOTOS, OSAKA_NIGHT, CLIP, BURST_SECOND, BURST_FIRST, KYOTO_GARDEN, KYOTO_TEMPLE } from '../helpers/photos.js';
import { gotoPage, photoTile, photoTiles, selectedTiles, fadingTile, undoOverlay, groupDates, groupCount, groupSelectAll, clickGroupSelectAll, waitForRender, selectionCount, clearSelectionButton, toolbarButton, videoIndicator, lightbox, lightboxImage, lightboxButton, lightboxMetadata, metadataValue, compareImages, compareLabels, compareButton, photoUrl, pressKey, textButton } from '../helpers/ui.js';

test.describe('Curate', () => {
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
  });

  test('lists every imported photo by day, newest first, with the first one selected', async ({ page }) => {
    await gotoPage(page, '/curate');

    await expect(photoTiles(page)).toHaveCount(ALL_PHOTOS.length);
    await expect(groupDates(page)).toHaveText(['April 5, 2024', 'April 4, 2024', 'April 3, 2024', 'April 2, 2024', 'December 24, 2023', 'August 14, 2023', 'June 11, 2022', 'January 15, 2021']);
    await expect(groupCount(page, 'April 3, 2024')).toHaveText('2 photos');
    await expect(videoIndicator(page, CLIP)).toHaveText('0:02');

    await expect(selectedTiles(page)).toHaveCount(1);
    await expect(photoTile(page, OSAKA_NIGHT)).toHaveClass(/is-selected/);
    await expect(selectionCount(page)).toHaveText('1 selected');
  });

  test('P picks the selected photo, which fades with an undo', async ({ page, request }) => {
    await gotoPage(page, '/curate');

    await pressKey(page, 'p');

    await expect(fadingTile(page, OSAKA_NIGHT)).toBeVisible();
    await expect(undoOverlay(page, OSAKA_NIGHT)).toContainText('Picked');
    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(true);
    const library = await listPhotos(request, 'library');
    expect(library.map(photo => photo.filePath).some(path => path.includes(OSAKA_NIGHT))).toBe(true);
  });

  test('Undo puts a picked photo back', async ({ page, request }) => {
    await gotoPage(page, '/curate');
    await pressKey(page, 'p');
    await expect(undoOverlay(page, OSAKA_NIGHT)).toBeVisible();

    await undoOverlay(page, OSAKA_NIGHT).getByText('Undo', { exact: true }).click();

    await expect(undoOverlay(page, OSAKA_NIGHT)).toHaveCount(0);
    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(false);
  });

  test('X rejects the selected photo into Trash', async ({ page, request }) => {
    await gotoPage(page, '/curate');

    await pressKey(page, 'x');

    await expect(undoOverlay(page, OSAKA_NIGHT)).toContainText('Rejected');
    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).isTrashed).toBe(true);

    await gotoPage(page, '/trash');
    await expect(photoTile(page, OSAKA_NIGHT)).toBeVisible();
    await expect(photoTiles(page)).toHaveCount(1);
  });

  test('a number key rates and picks the selected photo', async ({ page, request }) => {
    await gotoPage(page, '/curate');

    await pressKey(page, '4');

    await expect(undoOverlay(page, OSAKA_NIGHT)).toContainText('Rated 4★');
    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).rating).toBe(4);
    expect((await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(true);
  });

  test('arrow keys move the selection and Escape clears it', async ({ page }) => {
    await gotoPage(page, '/curate');

    await pressKey(page, 'ArrowRight');
    await expect(photoTile(page, CLIP)).toHaveClass(/is-selected/);
    await pressKey(page, 'ArrowLeft');
    await expect(photoTile(page, OSAKA_NIGHT)).toHaveClass(/is-selected/);

    await pressKey(page, 'Escape');
    await expect(selectedTiles(page)).toHaveCount(0);
    await expect(selectionCount(page)).toHaveCount(0);
  });

  // Bug: the faded photo stays selected and the grid ignores arrow keys while it fades, so keyboard culling stalls.
  test.fail('after P, the arrow keys still move on to the next photo', async ({ page }) => {
    await gotoPage(page, '/curate');
    await pressKey(page, 'p');
    await expect(fadingTile(page, OSAKA_NIGHT)).toBeVisible();
    await waitForRender(page);

    await pressKey(page, 'ArrowRight');

    await expect(photoTile(page, CLIP)).toHaveClass(/is-selected/, { timeout: 2_000 });
  });

  test('Cmd-click and Shift-click build a selection that the toolbar acts on together', async ({ page, request }) => {
    await gotoPage(page, '/curate');

    await photoTile(page, KYOTO_GARDEN).click({ modifiers: ['Meta'] });
    await expect(selectionCount(page)).toHaveText('2 selected');

    await photoTile(page, CLIP).click();
    await photoTile(page, BURST_FIRST).click({ modifiers: ['Shift'] });
    await expect(selectionCount(page)).toHaveText('3 selected');

    await toolbarButton(page, 'Reject').click();

    for (const stamp of [CLIP, BURST_SECOND, BURST_FIRST]) {
      await expect.poll(async () => (await findPhoto(request, stamp)).isTrashed).toBe(true);
    }
    expect((await findPhoto(request, OSAKA_NIGHT)).isTrashed).toBe(false);
  });

  test('Select All picks a whole day, and the toolbar stars rate it', async ({ page, request }) => {
    await gotoPage(page, '/curate');

    await clickGroupSelectAll(page, 'April 2, 2024');
    await expect(selectionCount(page)).toHaveText('3 selected');
    // The first photo was already selected, so clear it and keep just the day.
    await clearSelectionButton(page).click();
    await clickGroupSelectAll(page, 'April 2, 2024');
    await expect(selectionCount(page)).toHaveText('2 selected');
    await expect(groupSelectAll(page, 'April 2, 2024')).toHaveText('Deselect All');

    await toolbarButton(page, 'Rate 5').click();

    for (const stamp of [KYOTO_GARDEN, KYOTO_TEMPLE]) {
      await expect.poll(async () => (await findPhoto(request, stamp)).rating).toBe(5);
    }
  });

  test('the lightbox opens on Enter, moves with the arrow keys and closes on Escape', async ({ page }) => {
    await gotoPage(page, '/curate');
    const osaka = await findPhoto(page.request, OSAKA_NIGHT);
    const clip = await findPhoto(page.request, CLIP);

    await pressKey(page, 'Enter');
    await expect(lightbox(page)).toBeVisible();
    await expect(lightboxImage(page)).toHaveAttribute('src', photoUrl(osaka.filePath));

    await pressKey(page, 'ArrowRight');
    await expect(page.locator(`video[src="${photoUrl(clip.filePath)}"]`)).toBeVisible();
    await pressKey(page, 'ArrowLeft');
    await expect(lightboxImage(page)).toHaveAttribute('src', photoUrl(osaka.filePath));

    await pressKey(page, 'Escape');
    await expect(lightbox(page)).toHaveCount(0);
  });

  test('double-clicking a photo opens it in the lightbox', async ({ page }) => {
    await gotoPage(page, '/curate');
    const garden = await findPhoto(page.request, KYOTO_GARDEN);

    await photoTile(page, KYOTO_GARDEN).dblclick();

    await expect(lightboxImage(page)).toHaveAttribute('src', photoUrl(garden.filePath));
  });

  test('picking in the lightbox moves on to the next photo', async ({ page, request }) => {
    await gotoPage(page, '/curate');
    const clip = await findPhoto(request, CLIP);
    await pressKey(page, 'Enter');
    await expect(lightboxImage(page)).toBeVisible();

    await pressKey(page, 'p');

    await expect(page.locator(`video[src="${photoUrl(clip.filePath)}"]`)).toBeVisible();
    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(true);
  });

  test('the lightbox curation buttons rate the photo', async ({ page, request }) => {
    await gotoPage(page, '/curate');
    await pressKey(page, 'Enter');
    await expect(lightboxImage(page)).toBeVisible();

    await lightbox(page).hover();
    await lightboxButton(page, 'Rate 3 (3)').click();

    await expect.poll(async () => (await findPhoto(request, OSAKA_NIGHT)).rating).toBe(3);
  });

  // Bug: the lightbox has no U shortcut, so U reaches the page's handler and unflags the grid's selected photo instead of the one on screen.
  test.fail('U in the lightbox unflags the photo on screen', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT, 2);
    await pick(request, KYOTO_GARDEN, 2);
    await gotoPage(page, '/library');
    await photoTile(page, OSAKA_NIGHT).dblclick();
    await expect(lightboxImage(page)).toBeVisible();
    await pressKey(page, 'ArrowRight');
    const garden = await findPhoto(request, KYOTO_GARDEN);
    await expect(lightboxImage(page)).toHaveAttribute('src', photoUrl(garden.filePath));

    await pressKey(page, 'u');

    await expect.poll(async () => (await findPhoto(request, KYOTO_GARDEN)).isCurated, { timeout: 2_000 }).toBe(false);
    expect((await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(true);
  });

  test('I shows the photo details in the lightbox', async ({ page }) => {
    await gotoPage(page, '/curate');
    await pressKey(page, 'Enter');
    await expect(lightboxImage(page)).toBeVisible();

    await pressKey(page, 'i');

    await expect(lightboxMetadata(page)).toBeVisible();
    await expect(metadataValue(page, 'Camera')).toHaveText('FUJIFILM X-T5');
    await expect(metadataValue(page, 'Dimensions')).toHaveText('1200 × 800');
    await expect(metadataValue(page, 'Location')).toHaveText('Osaka, Osaka');
    await expect(metadataValue(page, 'Original Path')).toContainText('trip/osaka-night.jpg');

    await pressKey(page, 'i');
    await expect(lightboxMetadata(page)).toHaveCount(0);
  });

  test('C compares the selected photo with the next one, and keys curate the candidate', async ({ page, request }) => {
    await gotoPage(page, '/curate');
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    const burstSecond = await findPhoto(request, BURST_SECOND);

    await pressKey(page, 'c');
    await expect(compareLabels(page)).toHaveText(['Reference', '2 of 10']);

    // The second photo is the video, so step the candidate on to the burst frame.
    await pressKey(page, 'ArrowRight');
    await expect(compareLabels(page).last()).toHaveText('3 of 10');
    await expect(compareImages(page).first()).toHaveAttribute('src', photoUrl(osaka.filePath));
    await expect(compareImages(page).last()).toHaveAttribute('src', photoUrl(burstSecond.filePath));

    await pressKey(page, 'x');
    await expect.poll(async () => (await findPhoto(request, BURST_SECOND)).isTrashed).toBe(true);
    expect((await findPhoto(request, OSAKA_NIGHT)).isCurated).toBe(false);

    await pressKey(page, 'ArrowDown');
    await expect(compareImages(page).first()).toHaveAttribute('src', photoUrl(burstSecond.filePath));
    await expect(compareImages(page).last()).toHaveAttribute('src', photoUrl(osaka.filePath));

    await compareButton(page, 'Close').click();
    await expect(compareImages(page)).toHaveCount(0);
  });

  test('the Compare button opens compare mode', async ({ page }) => {
    await gotoPage(page, '/curate');

    await toolbarButton(page, 'Compare').click();

    await expect(compareLabels(page)).toHaveText(['Reference', '2 of 10']);
    await pressKey(page, 'Escape');
    await expect(compareImages(page)).toHaveCount(0);
  });

  test('curated photos leave the Curate list on the next visit', async ({ page }) => {
    await gotoPage(page, '/curate');
    await pressKey(page, 'p');
    await expect(fadingTile(page, OSAKA_NIGHT)).toBeVisible();

    await gotoPage(page, '/curate');

    await expect(photoTiles(page)).toHaveCount(ALL_PHOTOS.length - 1);
    await expect(photoTile(page, OSAKA_NIGHT)).toHaveCount(0);
  });

  test('an empty Curate list explains where photos come from', async ({ page, request }) => {
    for (const photo of await listPhotos(request, 'curate')) {
      await request.post('/api/photos/curate/', { data: { filePath: photo.filePath, isCurated: true, isTrashed: false, rating: 0 } });
    }

    await gotoPage(page, '/curate');

    await expect(page.getByText('No photos to review', { exact: true })).toBeVisible();
    await expect(page.getByText('New imports will appear here for curation', { exact: true })).toBeVisible();
    await expect(textButton(page, 'Undo')).toHaveCount(0);
  });
});
