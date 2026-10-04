import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Specs share one library, so every album and tag a spec creates carries a suffix to keep specs from seeing each other's data.
export function unique(prefix) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${prefix} ${suffix}`;
}

// Setup goes through the API so a spec only drives the UI for the feature it tests.
// This file is the only place that knows the API's paths and JSON field names, so renaming them is a change here alone.

const PHOTO_LISTS = {
  library: '/api/photos/',
  curate: '/api/photos/uncurated/',
  trash: '/api/photos/trashed/',
};

export async function listPhotos(request, list, query = '') {
  const response = await request.get(PHOTO_LISTS[list] + query);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.photos.map(toPhoto);
}

export async function allPhotos(request) {
  const lists = await Promise.all(Object.keys(PHOTO_LISTS).map(list => listPhotos(request, list)));
  return lists.flat();
}

// Finds a photo by the date stamp riffle puts in its file name, wherever it is.
export async function findPhoto(request, stamp) {
  const photos = await allPhotos(request);
  const photo = photos.find(p => p.filePath.includes(stamp));
  expect(photo, `photo ${stamp}`).toBeDefined();
  return photo;
}

function toPhoto(photo) {
  return {
    filePath: photo.filePath,
    isCurated: photo.isCurated,
    isTrashed: photo.isTrashed,
    rating: photo.rating,
    originalFilepath: photo.originalFilepath,
    city: photo.city,
    cameraModel: photo.cameraModel,
  };
}

export async function curate(request, filePath, { isCurated = false, isTrashed = false, rating = 0 } = {}) {
  const response = await request.post('/api/photos/curate/', {
    data: { filePath: filePath, isCurated: isCurated, isTrashed: isTrashed, rating: rating },
  });
  expect(response.ok()).toBeTruthy();
}

export async function pick(request, stamp, rating = 0) {
  const photo = await findPhoto(request, stamp);
  await curate(request, photo.filePath, { isCurated: true, rating: rating });
}

export async function reject(request, stamp) {
  const photo = await findPhoto(request, stamp);
  await curate(request, photo.filePath, { isCurated: true, isTrashed: true });
}

// Curation is the state most specs change, so they start from every photo waiting in Curate.
export async function resetCuration(request) {
  for (const photo of await allPhotos(request)) {
    await curate(request, photo.filePath);
  }
}

export async function getSettings(request) {
  const response = await request.get('/api/settings/');
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

export async function updateSetting(request, key, value) {
  const response = await request.post('/api/settings/', { data: { key: key, value: value } });
  expect(response.ok()).toBeTruthy();
}

export async function createAlbum(request, name, description = '') {
  const response = await request.post('/api/albums/', { data: { name: name, description: description } });
  expect(response.ok()).toBeTruthy();
  const album = await response.json();
  return { id: album.albumId, name: album.name };
}

export async function addToAlbum(request, albumId, filePaths) {
  const response = await request.put('/api/albums/photos/', { data: { albumIds: [albumId], filePaths: filePaths } });
  expect(response.ok()).toBeTruthy();
}

export async function getAlbum(request, albumId) {
  const response = await request.get(`/api/albums/${albumId}/`);
  expect(response.ok()).toBeTruthy();
  const album = await response.json();
  return { id: album.albumId, name: album.name, photoCount: album.photoCount };
}

export async function listAlbums(request) {
  const response = await request.get('/api/albums/');
  expect(response.ok()).toBeTruthy();
  const albums = await response.json();
  return albums.map(album => ({ id: album.albumId, name: album.name, photoCount: album.photoCount }));
}

export async function createTag(request, name) {
  const response = await request.post('/api/tags/', { data: { name: name } });
  expect(response.ok()).toBeTruthy();
  const tag = await response.json();
  return { id: tag.tagId, name: tag.name };
}

export async function tagPhotos(request, tagId, filePaths) {
  const response = await request.put('/api/photos/tags/', { data: { tagIds: [tagId], filePaths: filePaths } });
  expect(response.ok()).toBeTruthy();
}

export async function getPhotoTags(request, filePath) {
  const response = await request.get(`/api/photos/tags/?path=${encodeURIComponent(filePath)}`);
  expect(response.ok()).toBeTruthy();
  const tags = await response.json();
  return tags.map(tag => tag.name);
}

export async function findTag(request, name) {
  const response = await request.get(`/api/tags/?query=${encodeURIComponent(name)}`);
  expect(response.ok()).toBeTruthy();
  const tags = await response.json();
  const tag = tags.find(t => t.name === name);
  return tag === undefined ? null : { id: tag.tagId, name: tag.name, photoCount: tag.photoCount };
}

export async function listImportSessions(request) {
  const response = await request.get('/api/import/sessions/');
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

export async function listExportSessions(request) {
  const response = await request.get('/api/export/sessions/');
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

// Import, export and the rebuilds share one lock, so a spec waits for the last one to finish before starting another.
export async function waitForIdle(request) {
  await expect.poll(async () => {
    const response = await request.get('/api/operations/progress/');
    const progress = await response.json();
    return progress.operation === '' || progress.status === 'completed' || progress.status === 'error';
  }, { timeout: 60_000 }).toBe(true);
}

// The folders start.sh hands to riffle.
export const RUN_DIR = path.resolve(process.env.RIFFLE_RUN_DIR || '.riffle');
export const IMPORT_DIR = path.join(RUN_DIR, 'import');
export const LIBRARY_DIR = path.join(RUN_DIR, 'library');
export const EXPORT_DIR = path.join(RUN_DIR, 'export');

// Extra files a spec imports go here, apart from the fixtures.
export const EXTRA_DIR = path.join(IMPORT_DIR, 'extra');

// Deletes the photos imported from the extra folder and their source files, so the next spec sees only the fixtures.
export async function removeExtraPhotos(request) {
  const extras = (await allPhotos(request)).filter(photo => (photo.originalFilepath || '').startsWith(EXTRA_DIR));
  if (extras.length > 0) {
    const response = await request.delete('/api/photos/', { data: { filePaths: extras.map(photo => photo.filePath) } });
    expect(response.ok()).toBeTruthy();
  }
  fs.rmSync(EXTRA_DIR, { recursive: true, force: true });
}

// Imports a new copy of the EXIF-less screenshot dated by a unique modification time.
// Returns its date stamp and where it was copied from. Specs that delete or move photos import their own, so the shared fixtures stay intact.
export async function importNewPhoto(request) {
  const name = unique('extra').replace(' ', '-') + '.png';
  const target = path.join(EXTRA_DIR, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // Extra bytes after the PNG's end give it a hash of its own.
  fs.writeFileSync(target, Buffer.concat([fs.readFileSync('fixtures/photos/phone/screenshot.png'), Buffer.from(name)]));
  const date = new Date(Date.UTC(2019, 0, 1) + Math.floor(Math.random() * 365 * 24 * 3600) * 1000);
  fs.utimesSync(target, date, date);

  await waitForIdle(request);
  const response = await request.post('/api/import/sessions/');
  expect(response.ok()).toBeTruthy();
  await waitForIdle(request);

  return { stamp: date.toISOString().slice(0, 19).replace('T', '-').replace(/:/g, ''), sourcePath: target };
}

export function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { recursive: true }).filter(entry => fs.statSync(path.join(dir, entry)).isFile());
}
