import { test, expect } from '@playwright/test';
import { unique, resetCuration, pick, findPhoto, createTag, tagPhotos, getPhotoTags, findTag } from '../helpers/api.js';
import { OSAKA_NIGHT, KYOTO_GARDEN, KYOTO_TEMPLE, BEACH } from '../helpers/photos.js';
import { gotoPage, photoTile, photoTiles, toolbarButton, modal, modalButton, lightboxImage, tagInput, tagSuggestions, selectedTagSuggestion, tagChip, tagChipRemove, addTag, sidebarTag, sidebarTagCount, openTagEditor, toast, pressKey } from '../helpers/ui.js';

test.describe('Tags', () => {
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
    for (const stamp of [OSAKA_NIGHT, KYOTO_GARDEN, KYOTO_TEMPLE, BEACH]) {
      await pick(request, stamp);
    }
  });

  async function openInfoPanel(page, stamp) {
    await gotoPage(page, '/library');
    await photoTile(page, stamp).dblclick();
    await expect(lightboxImage(page)).toBeVisible();
    await pressKey(page, 'i');
    await expect(tagInput(page)).toBeVisible();
  }

  test('add a new tag to a photo from the lightbox', async ({ page, request }) => {
    const tag = unique('sunset');
    await openInfoPanel(page, OSAKA_NIGHT);

    await addTag(page, tag);

    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await expect.poll(() => getPhotoTags(request, osaka.filePath)).toContain(tag);
  });

  // Bug: the sidebar loads its tags once, so a tag created elsewhere only shows after a reload.
  test.fail('a tag created in the lightbox appears in the sidebar', async ({ page }) => {
    const tag = unique('fresh');
    await openInfoPanel(page, OSAKA_NIGHT);

    await addTag(page, tag);

    await expect(sidebarTag(page, tag)).toBeVisible({ timeout: 2_000 });
  });

  test('typing part of an existing tag suggests it, and arrow keys and Enter pick it', async ({ page, request }) => {
    const prefix = unique('travel');
    const first = await createTag(request, `${prefix} one`);
    const second = await createTag(request, `${prefix} two`);
    const beach = await findPhoto(request, BEACH);
    await tagPhotos(request, first.id, [beach.filePath]);
    await tagPhotos(request, second.id, [beach.filePath]);
    await openInfoPanel(page, OSAKA_NIGHT);

    await tagInput(page).fill(prefix);
    // Both tags and the "Add" option.
    await expect(tagSuggestions(page)).toHaveCount(3);
    await tagInput(page).press('ArrowDown');
    await tagInput(page).press('ArrowDown');
    await expect(selectedTagSuggestion(page)).toHaveText(second.name);
    await tagInput(page).press('Enter');

    await expect(tagChip(page, second.name)).toBeVisible();
    await expect(tagInput(page)).toHaveValue('');
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await expect.poll(() => getPhotoTags(request, osaka.filePath)).toContain(second.name);
    expect(await getPhotoTags(request, osaka.filePath)).not.toContain(first.name);
  });

  test('Escape closes the suggestions and clears the input', async ({ page }) => {
    await openInfoPanel(page, OSAKA_NIGHT);

    await tagInput(page).fill('anything');
    await expect(tagSuggestions(page)).not.toHaveCount(0);
    await tagInput(page).press('Escape');

    await expect(tagSuggestions(page)).toHaveCount(0);
    await expect(tagInput(page)).toHaveValue('');
  });

  test('remove a tag from a photo', async ({ page, request }) => {
    const tag = await createTag(request, unique('temporary'));
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await tagPhotos(request, tag.id, [osaka.filePath]);
    await openInfoPanel(page, OSAKA_NIGHT);
    await expect(tagChip(page, tag.name)).toBeVisible();

    await tagChipRemove(page, tag.name).click();

    await expect(tagChip(page, tag.name)).toHaveCount(0);
    await expect.poll(() => getPhotoTags(request, osaka.filePath)).not.toContain(tag.name);
  });

  test('Manage Tags adds a tag to every selected photo', async ({ page, request }) => {
    const tag = unique('kyoto');
    await gotoPage(page, '/library');
    await photoTile(page, KYOTO_GARDEN).click();
    await photoTile(page, KYOTO_TEMPLE).click({ modifiers: ['Meta'] });

    await toolbarButton(page, 'Tags').click();
    await expect(modal(page)).toContainText('Managing tags for 2 selected photos');
    await addTag(page, tag);

    await expect(toast(page, 'Tag added to 2 photos')).toBeVisible();
    for (const stamp of [KYOTO_GARDEN, KYOTO_TEMPLE]) {
      const photo = await findPhoto(request, stamp);
      expect(await getPhotoTags(request, photo.filePath)).toContain(tag);
    }
    await modalButton(page, 'Close').click();
    await expect(modal(page)).toHaveCount(0);
  });

  // Bug: Manage Tags only loads the first selected photo's tags, so a tag on another selected photo isn't listed.
  test.fail('Manage Tags lists the tags of every selected photo', async ({ page, request }) => {
    const tag = await createTag(request, unique('second only'));
    const temple = await findPhoto(request, KYOTO_TEMPLE);
    await tagPhotos(request, tag.id, [temple.filePath]);
    await gotoPage(page, '/library');
    await photoTile(page, KYOTO_GARDEN).click();
    await photoTile(page, KYOTO_TEMPLE).click({ modifiers: ['Meta'] });

    await toolbarButton(page, 'Tags').click();

    await expect(tagChip(page, tag.name)).toBeVisible({ timeout: 2_000 });
  });

  test('a sidebar tag filters the library to its photos', async ({ page, request }) => {
    const tag = await createTag(request, unique('beach'));
    const beach = await findPhoto(request, BEACH);
    await tagPhotos(request, tag.id, [beach.filePath]);
    await gotoPage(page, '/library');
    await expect(sidebarTagCount(page, tag.name)).toHaveText('1');

    await sidebarTag(page, tag.name).click();

    await expect(page).toHaveURL(new RegExp(`tagId=${tag.id}`));
    await expect(photoTiles(page)).toHaveCount(1);
    await expect(photoTile(page, BEACH)).toBeVisible();
  });

  // Bug: the count includes photos still in Curate, but the link opens the Library, which only lists picked photos.
  test.fail('a sidebar tag shows the photos it counts, even ones still in Curate', async ({ page, request }) => {
    const tag = await createTag(request, unique('uncurated'));
    const beach = await findPhoto(request, BEACH);
    await request.post('/api/photos/curate/', { data: { filePath: beach.filePath, isCurated: false, isTrashed: false, rating: 0 } });
    await tagPhotos(request, tag.id, [beach.filePath]);
    await gotoPage(page, '/library');
    await expect(sidebarTagCount(page, tag.name)).toHaveText('1');

    await sidebarTag(page, tag.name).click();

    await expect(photoTile(page, BEACH)).toBeVisible({ timeout: 2_000 });
  });

  test('rename a tag from the sidebar', async ({ page, request }) => {
    const tag = await createTag(request, unique('draft'));
    const renamed = unique('final');
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await tagPhotos(request, tag.id, [osaka.filePath]);
    await gotoPage(page, '/library');

    await openTagEditor(page, tag.name);
    await page.getByPlaceholder('Tag Name').fill(renamed);
    await modalButton(page, 'Update').click();

    await expect(toast(page, 'Tag updated successfully')).toBeVisible();
    await expect(sidebarTag(page, renamed)).toBeVisible();
    await expect(sidebarTag(page, tag.name)).toHaveCount(0);
    const tags = await getPhotoTags(request, osaka.filePath);
    expect(tags).toContain(renamed);
    expect(tags).not.toContain(tag.name);
  });

  test('delete a tag from the sidebar removes it from its photos', async ({ page, request }) => {
    const tag = await createTag(request, unique('doomed'));
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await tagPhotos(request, tag.id, [osaka.filePath]);
    await gotoPage(page, '/library');

    await openTagEditor(page, tag.name);
    await modalButton(page, 'Delete Tag').click();

    await expect(toast(page, 'Tag deleted successfully')).toBeVisible();
    await expect(sidebarTag(page, tag.name)).toHaveCount(0);
    expect(await getPhotoTags(request, osaka.filePath)).not.toContain(tag.name);
    expect(await findTag(request, tag.name)).toBeNull();
  });
});
