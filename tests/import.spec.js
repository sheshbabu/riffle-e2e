import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { updateSetting, listImportSessions, importNewPhoto, removeExtraPhotos, findPhoto, unique, waitForIdle, IMPORT_DIR, EXTRA_DIR, LIBRARY_DIR, listFiles } from '../helpers/api.js';
import { gotoPage, runOperation, textButton, tableRows, descriptionValue, modal, clickOutsideModal, segment, formSection, toast } from '../helpers/ui.js';

test.describe('Import', () => {
  test.afterEach(async ({ request }) => {
    await updateSetting(request, 'import_mode', 'copy');
    await updateSetting(request, 'import_duplicate_handling', 'keep');
    await removeExtraPhotos(request);
  });

  test('importing again skips everything already in the library', async ({ page, request }) => {
    await gotoPage(page, '/import');

    await runOperation(page, request, textButton(page, 'Import'), '/api/import/sessions/');

    const [latest] = await listImportSessions(request);
    expect(latest.status).toBe('completed');
    expect(latest.movedToLibrary).toBe(0);
    expect(latest.alreadyImported).toBe(latest.totalScanned);
  });

  // Bug: the server clears the operation name when it finishes, and the page only reacts to "import", so it never sees the end.
  test.fail('the page shows a finished import without a reload', async ({ page, request }) => {
    const before = (await listImportSessions(request)).length;
    await gotoPage(page, '/import');

    await runOperation(page, request, textButton(page, 'Import'), '/api/import/sessions/');

    await expect(tableRows(page)).toHaveCount(before + 1);
  });

  test('the first import\'s details list what it found', async ({ page }) => {
    await gotoPage(page, '/import');

    // Newest first, so the setup's import is the last row.
    await tableRows(page).last().click();

    await expect(descriptionValue(page, 'Source Folder')).toContainText(IMPORT_DIR);
    await expect(descriptionValue(page, 'Import Mode')).toContainText('Copy');
    await expect(descriptionValue(page, 'Total Scanned')).toContainText('11');
    await expect(descriptionValue(page, 'Duplicates Removed')).toContainText('1');
    await expect(descriptionValue(page, 'Moved to Library')).toContainText('10');
    await clickOutsideModal(page);
    await expect(modal(page)).toHaveCount(0);
  });

  // Bug: Escape handling is per modal, and the import and export details and Remove from Disk don't have it.
  test.fail('Escape closes the import details', async ({ page }) => {
    await gotoPage(page, '/import');
    await tableRows(page).last().click();
    await expect(modal(page)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(modal(page)).toHaveCount(0, { timeout: 2_000 });
  });

  test('Copy leaves the originals in the import folder, organised by date in the library', async ({ request }) => {
    const { stamp, sourcePath } = await importNewPhoto(request);

    const photo = await findPhoto(request, stamp);
    expect(fs.existsSync(sourcePath)).toBe(true);
    const relative = path.relative(LIBRARY_DIR, photo.filePath);
    const [year, month] = relative.split(path.sep);
    expect(year).toBe(stamp.slice(0, 4));
    expect(month).toMatch(new RegExp(`^${stamp.slice(5, 7)} - `));
  });

  test('Move takes the originals out of the import folder', async ({ request }) => {
    await updateSetting(request, 'import_mode', 'move');

    const { stamp, sourcePath } = await importNewPhoto(request);

    expect(fs.existsSync(sourcePath)).toBe(false);
    const photo = await findPhoto(request, stamp);
    expect(fs.existsSync(photo.filePath)).toBe(true);
  });

  // Bug: "Duplicate Handling: Delete" is saved, but nothing reads import_duplicate_handling, so duplicates stay.
  test.fail('Move with Delete removes the duplicates it left behind', async ({ request }) => {
    await updateSetting(request, 'import_mode', 'move');
    await updateSetting(request, 'import_duplicate_handling', 'delete');
    const folder = path.join(EXTRA_DIR, unique('dupes').replace(' ', '-'));
    fs.mkdirSync(folder, { recursive: true });
    const bytes = Buffer.concat([fs.readFileSync('fixtures/photos/phone/hike.jpg'), Buffer.from(folder)]);
    fs.writeFileSync(path.join(folder, 'a.jpg'), bytes);
    fs.writeFileSync(path.join(folder, 'b.jpg'), bytes);

    await waitForIdle(request);
    await request.post('/api/import/sessions/');
    await waitForIdle(request);

    expect(listFiles(folder)).toEqual([]);
  });

  test('Duplicate Handling only shows for Move', async ({ page }) => {
    await gotoPage(page, '/settings/import');
    await expect(formSection(page, 'Duplicate Handling')).toHaveCount(0);

    await segment(page, 'File Transfer', 'Move').click();
    await expect(formSection(page, 'Duplicate Handling')).toBeVisible();

    await segment(page, 'File Transfer', 'Copy').click();
    await expect(formSection(page, 'Duplicate Handling')).toHaveCount(0);
  });
});
