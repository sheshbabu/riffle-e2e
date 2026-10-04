import { expect } from '@playwright/test';
import { waitForIdle } from './api.js';

// Many riffle controls are divs or icon buttons with no accessible name, so these use riffle's CSS classes.
// Keeping every class here means a rename in riffle is fixed in one place.
const SIDEBAR = '.sidebar-container';
const MAIN = '.main-content';
const BUTTON = '.button, .ghost-button';
const PAGE_TOOLBAR = '.page-toolbar';
const GALLERY_ITEM = '.gallery-item';
const SELECTED = '.is-selected';
const FADING = '.is-fading';
const BURST_STACK = '.burst-stack';
const BURST_BADGE = '.burst-badge';
const BURST_INDICATOR = '.burst-indicator';
const VIDEO_INDICATOR = '.video-indicator';
const GROUP = '.group-container';
const GROUP_HEADER = '.group-header';
const GROUP_DATE = '.group-date';
const GROUP_COUNT = '.group-count';
const GROUP_SELECT_ALL = '.group-select-all-button';
const UNDO_OVERLAY = '.undo-overlay';
const SELECTION_COUNT = '.selection-count-text';
const SELECTION_CLEAR = '.selection-count-close';
const LIGHTBOX = '.lightbox';
const LIGHTBOX_IMAGE = '.lightbox-image.is-zoomable';
const LIGHTBOX_BUTTON = '.lightbox-button';
const LIGHTBOX_METADATA = '.lightbox-metadata';
const METADATA_ITEM = '.metadata-item';
const METADATA_LABEL = '.metadata-label';
const METADATA_VALUE = '.metadata-value';
const COMPARE_IMAGE = '.compare-image';
const COMPARE_LABEL = '.compare-label';
const COMPARE_BUTTON = '.compare-button';
const FILTER_BUTTON = '[title="Filters"]';
const FILTER_BADGE = '.filter-badge';
const FILTER_PANEL = '.filter-panel';
const FILTER_CLOSE = '.filter-close-button';
const ACCORDION_ITEM = '.accordion-item';
const ALBUM_CARD = '.albums-page-card';
const ALBUM_PICKER_ITEM = '.add-to-album-modal-album-item';
const TAG_INPUT = 'Add tags...';
const TAG_SUGGESTION = '.tag-suggestion-item';
const TAG_CHIP = '.tag-badge';
const TAG_CHIP_REMOVE = '.tag-badge-remove';
const SIDEBAR_TAG = '.sidebar-tag-item';
const SIDEBAR_TAG_COUNT = '.sidebar-tag-count';
const SIDEBAR_TAG_EDIT = '.sidebar-tag-edit';
const TOAST = '.toast-message';
const MODAL_BACKDROP = '.modal-backdrop-container';
const MODAL = '.modal-content-container';
const MODAL_FOOTER = '.modal-footer-container';
const MODAL_CLOSE = '.modal-close-button';
const FORM_SECTION = '.form-section';
const SEGMENT = '.segment';
const TABLE_ROW = '.table tbody tr';
const DESCRIPTION_ITEM = '.description-item';

// Riffle builds photo and thumbnail URLs with btoa(), which reads the path one byte per character.
export function photoUrl(filePath) {
  return `/api/photo/?path=${Buffer.from(filePath, 'latin1').toString('base64')}`;
}

export async function gotoPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export function sidebarLink(page, name) {
  return page.locator(SIDEBAR).getByRole('link', { name: name, exact: true });
}

// The toolbar's icon buttons take their name from their label, or from their title when they only hold an icon.
export function toolbarButton(page, name) {
  return page.locator(PAGE_TOOLBAR).getByRole('button', { name: name, exact: true });
}

// Icon buttons outside the toolbar, like the empty state's "New Album".
export function pageButton(page, name) {
  return page.locator(MAIN).getByRole('button', { name: name, exact: true });
}

// Riffle's Button component renders a div with no role, so match its class and text. Headings and sidebar links often share the name.
export function textButton(page, name) {
  return page.locator(MAIN).locator(BUTTON).filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) }).filter({ visible: true });
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function modal(page) {
  return page.locator(MODAL).last();
}

// Some modals have no close button, so they close on a click outside them.
export async function clickOutsideModal(page) {
  await page.locator(MODAL_BACKDROP).last().click({ position: { x: 5, y: 5 } });
}

export function modalCloseButton(page) {
  return modal(page).locator(MODAL_CLOSE);
}

// Footer buttons can repeat the modal's title, like "Remove from Disk".
export function modalButton(page, name) {
  return modal(page).locator(MODAL_FOOTER).getByText(name, { exact: true });
}

// Each tile's image is labelled with the photo's library path, which holds its date stamp.
export function photoTile(page, stamp) {
  return page.locator(GALLERY_ITEM).filter({ has: page.locator(`img[alt*="${stamp}"]`) });
}

export function photoTiles(page) {
  return page.locator(GALLERY_ITEM);
}

export function selectedTiles(page) {
  return page.locator(GALLERY_ITEM + SELECTED);
}

export function fadingTile(page, stamp) {
  return page.locator(GALLERY_ITEM + FADING).filter({ has: page.locator(`img[alt*="${stamp}"]`) });
}

export function undoOverlay(page, stamp) {
  return photoTile(page, stamp).locator(UNDO_OVERLAY);
}

export function burstStacks(page) {
  return page.locator(BURST_STACK);
}

// A collapsed burst shows its first photo.
export function burstStack(page, stamp) {
  return page.locator(BURST_STACK).filter({ has: page.locator(`img[alt*="${stamp}"]`) });
}

export function burstBadge(page, stamp) {
  return burstStack(page, stamp).locator(BURST_BADGE);
}

export function burstIndicator(page, stamp) {
  return photoTile(page, stamp).locator(BURST_INDICATOR);
}

export function videoIndicator(page, stamp) {
  return photoTile(page, stamp).locator(VIDEO_INDICATOR);
}

export function group(page, date) {
  return page.locator(GROUP).filter({ has: page.locator(GROUP_DATE, { hasText: date }) });
}

export function groupDates(page) {
  return page.locator(GROUP_DATE);
}

export function groupCount(page, date) {
  return group(page, date).locator(GROUP_COUNT);
}

export function groupSelectAll(page, date) {
  return group(page, date).locator(GROUP_SELECT_ALL);
}

// The button only takes clicks while its day's header is hovered.
export async function clickGroupSelectAll(page, date) {
  await group(page, date).locator(GROUP_HEADER).hover();
  await groupSelectAll(page, date).click();
}

export function selectionCount(page) {
  return page.locator(SELECTION_COUNT);
}

export function clearSelectionButton(page) {
  return page.locator(SELECTION_CLEAR);
}

export function lightbox(page) {
  return page.locator(LIGHTBOX);
}

export function lightboxImage(page) {
  return page.locator(LIGHTBOX_IMAGE);
}

export function lightboxButton(page, title) {
  return page.locator(`${LIGHTBOX_BUTTON}[title="${title}"]`);
}

export function lightboxMetadata(page) {
  return page.locator(LIGHTBOX_METADATA);
}

export function metadataValue(page, label) {
  return page.locator(METADATA_ITEM).filter({ has: page.locator(METADATA_LABEL, { hasText: label }) }).locator(METADATA_VALUE);
}

// The reference photo is on the left and the candidate on the right.
export function compareImages(page) {
  return page.locator(COMPARE_IMAGE);
}

export function compareLabels(page) {
  return page.locator(COMPARE_LABEL);
}

export function compareButton(page, title) {
  return page.locator(`${COMPARE_BUTTON}[title^="${title}"]`);
}

export function filterButton(page) {
  return page.locator(FILTER_BUTTON);
}

export function filterBadge(page) {
  return page.locator(FILTER_BADGE);
}

export function filterPanel(page) {
  return page.locator(FILTER_PANEL);
}

export async function openFilters(page) {
  await filterButton(page).click();
  await expect(filterPanel(page)).toBeVisible();
}

export async function closeFilters(page) {
  await page.locator(FILTER_CLOSE).click();
  await expect(filterPanel(page)).toHaveCount(0);
}

// Rating and media type start open; the other sections open on a click of their title.
export async function openFilterSection(page, title) {
  const section = filterPanel(page).locator(ACCORDION_ITEM).filter({ hasText: title });
  await section.getByText(title, { exact: true }).click();
}

export function filterOption(page, label) {
  return filterPanel(page).getByText(label, { exact: true });
}

export function albumCard(page, name) {
  return page.locator(ALBUM_CARD).filter({ hasText: name });
}

export function albumPickerItem(page, name) {
  return page.locator(ALBUM_PICKER_ITEM).filter({ hasText: name });
}

export function tagInput(page) {
  return page.getByPlaceholder(TAG_INPUT);
}

export function tagSuggestions(page) {
  return page.locator(TAG_SUGGESTION);
}

export function selectedTagSuggestion(page) {
  return page.locator(TAG_SUGGESTION + SELECTED);
}

export function tagChip(page, name) {
  return page.locator(TAG_CHIP).filter({ hasText: name });
}

export function tagChips(page) {
  return page.locator(TAG_CHIP);
}

export function tagChipRemove(page, name) {
  return tagChip(page, name).locator(TAG_CHIP_REMOVE);
}

export async function addTag(page, name) {
  await tagInput(page).fill(name);
  await expect(tagSuggestions(page).last()).toBeVisible();
  await tagInput(page).press('Enter');
  await expect(tagChip(page, name)).toBeVisible();
}

export function sidebarTag(page, name) {
  return page.locator(SIDEBAR_TAG).filter({ hasText: name });
}

export function sidebarTagCount(page, name) {
  return sidebarTag(page, name).locator(SIDEBAR_TAG_COUNT);
}

// The edit button sits inside the tag's link and only shows on hover.
export async function openTagEditor(page, name) {
  await sidebarTag(page, name).hover();
  await sidebarTag(page, name).locator(SIDEBAR_TAG_EDIT).click();
  await expect(page.getByPlaceholder('Tag Name')).toBeVisible();
}

export function toast(page, message) {
  return page.locator(TOAST, { hasText: message });
}

export function formSection(page, title) {
  return page.locator(FORM_SECTION).filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

export function segment(page, sectionTitle, label) {
  return formSection(page, sectionTitle).locator(SEGMENT, { hasText: label });
}

export function selectedSegment(page, sectionTitle) {
  return formSection(page, sectionTitle).locator(SEGMENT + SELECTED);
}

export function tableRows(page) {
  return page.locator(TABLE_ROW);
}

export function descriptionValue(page, label) {
  return modal(page).locator(DESCRIPTION_ITEM).filter({ hasText: label });
}

// Clicks a control that starts a long-running operation, and waits for the server to finish it.
// Waiting for the POST first keeps the idle check from passing before the operation has started.
export async function runOperation(page, request, control, apiPath) {
  const started = page.waitForResponse(response => response.url().endsWith(apiPath) && response.request().method() === 'POST');
  await control.click();
  expect((await started).ok()).toBeTruthy();
  await waitForIdle(request);
}

// A frame for React to flush a pending render and re-register its key handlers, so the next key sees the new state.
export async function waitForRender(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

// The photo pages ignore keys while a text field has focus, so keys go to the page body.
export async function pressKey(page, key) {
  await page.locator('body').press(key);
}
