import { test as setup, expect } from '@playwright/test';
import { listImportSessions } from '../helpers/api.js';
import { gotoPage, runOperation, textButton, tableRows } from '../helpers/ui.js';

// The server starts on an empty library, so the first visit imports the fixtures. Every other spec works on that library.
setup('import the fixture photos', async ({ page, request }) => {
  await gotoPage(page, '/import');
  await expect(page.getByText('No imports yet', { exact: false })).toBeVisible();

  await runOperation(page, request, textButton(page, 'Import'), '/api/import/sessions/');

  // The page misses the end of an import (see import.spec.js), so reload to see the finished session.
  await gotoPage(page, '/import');
  await expect(tableRows(page)).toHaveCount(1);

  const [session] = await listImportSessions(request);
  expect(session.status).toBe('completed');
  expect(session.totalScanned).toBe(11);
  expect(session.duplicateGroups).toBe(1);
  expect(session.duplicatesRemoved).toBe(1);
  expect(session.movedToLibrary).toBe(10);
  expect(session.errorCount).toBe(0);
});
