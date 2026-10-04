import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { resetCuration, pick, reject, findPhoto, updateSetting, listExportSessions, waitForIdle, EXPORT_DIR, listFiles } from '../helpers/api.js';
import { OSAKA_NIGHT, BEACH, HIKE } from '../helpers/photos.js';
import { gotoPage, runOperation, textButton, tableRows, modal, modalButton, toast, segment, selectedSegment, descriptionValue } from '../helpers/ui.js';

const DEFAULTS = {
  export_min_rating: '0',
  export_curation_status: 'pick',
  export_organization_mode: 'organized',
  export_deduplication_enabled: 'false',
  export_cleanup_enabled: 'false',
};

function exportedFiles() {
  return listFiles(EXPORT_DIR);
}

function fileName(filePath) {
  return path.basename(filePath);
}

test.describe('Export', () => {
  // Riffle skips photos it exported before, so turn that off and start from an empty folder unless a test is about it.
  test.beforeEach(async ({ request }) => {
    await resetCuration(request);
    for (const [key, value] of Object.entries(DEFAULTS)) {
      await updateSetting(request, key, value);
    }
    fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
    fs.mkdirSync(EXPORT_DIR);
  });

  test.afterAll(async ({ request }) => {
    await updateSetting(request, 'export_deduplication_enabled', 'true');
  });

  async function startExport(page, request) {
    await gotoPage(page, '/export');
    await runOperation(page, request, textButton(page, 'Export'), '/api/export/sessions/');
  }

  test('exports picked photos into year and month folders', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await pick(request, BEACH);
    await reject(request, HIKE);
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    const beach = await findPhoto(request, BEACH);

    await startExport(page, request);

    expect(exportedFiles().sort()).toEqual([
      path.join('2023', '08 - August', fileName(beach.filePath)),
      path.join('2024', '04 - April', fileName(osaka.filePath)),
    ]);
    const [session] = await listExportSessions(request);
    expect(session.status).toBe('completed');
    expect(session.exportedPhotos).toBe(2);
  });

  test('a finished export shows in the history and opens its details', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await startExport(page, request);

    // The page misses the end of an export (see below), so reload to see it.
    await gotoPage(page, '/export');
    await expect(tableRows(page).first()).toContainText('1/1');
    await tableRows(page).first().click();

    await expect(descriptionValue(page, 'Destination Folder')).toContainText(EXPORT_DIR);
    await expect(descriptionValue(page, 'Exported Photos')).toContainText('1/1');
    await expect(descriptionValue(page, 'Criteria')).toContainText('Picked only');
  });

  // Bug: the server clears the operation name when it finishes, and the page only reacts to "export", so it never sees the end.
  test.fail('the page shows a finished export without a reload', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    const before = (await listExportSessions(request)).length;

    await startExport(page, request);

    await expect(toast(page, 'Exported 1 photo')).toBeVisible();
    await expect(tableRows(page)).toHaveCount(before + 1);
  });

  test('the minimum rating leaves lower rated photos out', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT, 4);
    await pick(request, BEACH, 2);
    await updateSetting(request, 'export_min_rating', '3');
    const osaka = await findPhoto(request, OSAKA_NIGHT);

    await startExport(page, request);

    expect(exportedFiles().map(fileName)).toEqual([fileName(osaka.filePath)]);
  });

  // Bug: with Curation Status "All" the export query has no is_trashed check, so rejected photos are exported.
  test.fail('exporting all photos still leaves rejected ones out', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await reject(request, HIKE);
    await updateSetting(request, 'export_curation_status', 'all');
    const hike = await findPhoto(request, HIKE);

    await startExport(page, request);

    expect(exportedFiles().map(fileName)).not.toContain(fileName(hike.filePath));
  });

  test('Flat organization puts every photo in the export folder itself', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await pick(request, BEACH);
    await gotoPage(page, '/settings/export');
    await segment(page, 'Organization', 'Flat').click();
    await expect(toast(page, 'Setting updated')).toBeVisible();
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    const beach = await findPhoto(request, BEACH);

    await startExport(page, request);

    expect(exportedFiles().sort()).toEqual([fileName(beach.filePath), fileName(osaka.filePath)].sort());
  });

  test('Skip Duplicates leaves out photos exported before', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await updateSetting(request, 'export_deduplication_enabled', 'true');
    await startExport(page, request);
    fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
    fs.mkdirSync(EXPORT_DIR);

    await startExport(page, request);

    expect(exportedFiles()).toEqual([]);
    const [latest] = await listExportSessions(request);
    expect(latest.exportedPhotos).toBe(0);
  });

  test('Clear Folder asks first, and Cancel keeps the folder and skips the export', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await updateSetting(request, 'export_cleanup_enabled', 'true');
    fs.writeFileSync(path.join(EXPORT_DIR, 'keep-me.txt'), 'old export');
    const before = (await listExportSessions(request)).length;
    await gotoPage(page, '/export');

    await textButton(page, 'Export').click();
    await expect(modal(page)).toContainText('All existing files will be permanently deleted before export.');
    await modalButton(page, 'Cancel').click();

    await expect(modal(page)).toHaveCount(0);
    expect(exportedFiles()).toEqual(['keep-me.txt']);
    expect((await listExportSessions(request)).length).toBe(before);
  });

  test('Clear Folder empties the export folder before exporting', async ({ page, request }) => {
    await pick(request, OSAKA_NIGHT);
    await updateSetting(request, 'export_cleanup_enabled', 'true');
    fs.writeFileSync(path.join(EXPORT_DIR, 'old.txt'), 'old export');
    const osaka = await findPhoto(request, OSAKA_NIGHT);
    await gotoPage(page, '/export');

    await textButton(page, 'Export').click();
    await runOperation(page, request, modalButton(page, 'Continue'), '/api/export/sessions/');

    expect(exportedFiles()).toEqual([path.join('2024', '04 - April', fileName(osaka.filePath))]);
  });

  test('the Export settings show the saved choices', async ({ page, request }) => {
    await updateSetting(request, 'export_min_rating', '2');
    await updateSetting(request, 'export_curation_status', 'all');

    await gotoPage(page, '/settings/export');

    await expect(selectedSegment(page, 'Minimum Rating')).toHaveText('2');
    await expect(selectedSegment(page, 'Curation Status')).toHaveText('All');
    await expect(selectedSegment(page, 'Organization')).toHaveText('Organized');
  });
});
