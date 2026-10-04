import { test, expect } from '@playwright/test';
import { unique, resetCuration, pick, createAlbum, addToAlbum, getAlbum, findPhoto } from '../helpers/api.js';
import { OSAKA_NIGHT, KYOTO_GARDEN, KYOTO_TEMPLE } from '../helpers/photos.js';
import { gotoPage, photoTile, photoTiles, toolbarButton, pageButton, modal, modalButton, albumCard, albumPickerItem, toast } from '../helpers/ui.js';

test.describe('Albums', () => {
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
    for (const stamp of [OSAKA_NIGHT, KYOTO_GARDEN, KYOTO_TEMPLE]) {
      await pick(request, stamp);
    }
  });

  test('create an album from the Albums page', async ({ page, request }) => {
    const name = unique('Japan');
    await gotoPage(page, '/albums');

    await pageButton(page, 'New Album').click();
    await page.getByPlaceholder('Name').fill(name);
    await page.getByPlaceholder('Description').fill('Spring trip');
    await modalButton(page, 'Create Album').click();

    await expect(toast(page, 'Album created')).toBeVisible();
    await expect(albumCard(page, name)).toContainText('0 photos');
  });

  test('an album needs a name', async ({ page }) => {
    await gotoPage(page, '/albums');

    await pageButton(page, 'New Album').click();
    await modalButton(page, 'Create Album').click();

    await expect(toast(page, 'Enter an album name')).toBeVisible();
    await expect(modal(page)).toBeVisible();
  });

  test('add selected library photos to an album', async ({ page, request }) => {
    const album = await createAlbum(request, unique('Kyoto'));
    await gotoPage(page, '/library');
    await photoTile(page, KYOTO_GARDEN).click();
    await photoTile(page, KYOTO_TEMPLE).click({ modifiers: ['Meta'] });

    await toolbarButton(page, 'Add to Album').click();
    await albumPickerItem(page, album.name).locator('.add-to-album-modal-album-name').click();
    await modalButton(page, 'Add to album').click();

    await expect(toast(page, 'Added 2 photos to 1 album')).toBeVisible();
    expect((await getAlbum(request, album.id)).photoCount).toBe(2);
  });

  // Bug: the row and its checkbox both toggle the album, so clicking the checkbox selects and deselects it at once.
  test.fail('ticking an album\'s checkbox selects it', async ({ page, request }) => {
    const album = await createAlbum(request, unique('Checkbox'));
    await gotoPage(page, '/library');
    await photoTile(page, OSAKA_NIGHT).click();
    await toolbarButton(page, 'Add to Album').click();

    await albumPickerItem(page, album.name).locator('.checkbox').click();

    await expect(albumPickerItem(page, album.name)).toHaveClass(/is-selected/, { timeout: 2_000 });
  });

  test('an album page lists its photos, and Remove from Album takes them out', async ({ page, request }) => {
    const album = await createAlbum(request, unique('Trip'));
    const garden = await findPhoto(request, KYOTO_GARDEN);
    const temple = await findPhoto(request, KYOTO_TEMPLE);
    await addToAlbum(request, album.id, [garden.filePath, temple.filePath]);

    await gotoPage(page, '/albums');
    await albumCard(page, album.name).click();
    await expect(page).toHaveURL(new RegExp(`/albums/${album.id}$`));
    await expect(page.getByRole('heading', { name: album.name })).toBeVisible();
    await expect(page.getByText('2 photos', { exact: true })).toBeVisible();
    await expect(photoTiles(page)).toHaveCount(2);

    await photoTile(page, KYOTO_GARDEN).click();
    await toolbarButton(page, 'Remove from Album').click();

    await expect(toast(page, 'Removed 1 photo')).toBeVisible();
    await expect(page.getByText('1 photo', { exact: true })).toBeVisible();
    await expect(photoTiles(page)).toHaveCount(1);
    expect((await getAlbum(request, album.id)).photoCount).toBe(1);
  });

  test('the album card shows its photo count and a cover', async ({ page, request }) => {
    const album = await createAlbum(request, unique('Cover'));
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await addToAlbum(request, album.id, [osaka.filePath]);

    await gotoPage(page, '/albums');

    await expect(albumCard(page, album.name)).toContainText('1 photo');
    await expect(albumCard(page, album.name).locator('img')).toBeVisible();
  });

  test('New Album inside Add to Album creates an album to add to', async ({ page, request }) => {
    const name = unique('Fresh');
    await gotoPage(page, '/library');
    await photoTile(page, OSAKA_NIGHT).click();
    await toolbarButton(page, 'Add to Album').click();

    await modal(page).getByText('New Album', { exact: true }).click();
    await page.getByPlaceholder('Name').fill(name);
    await modalButton(page, 'Create Album').click();

    await expect(albumPickerItem(page, name)).toBeVisible();
  });
});
