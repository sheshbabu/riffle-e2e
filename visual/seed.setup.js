import { test as setup } from '@playwright/test';
import { pick, reject, findPhoto, createAlbum, addToAlbum, createTag, tagPhotos, updateSetting, waitForIdle } from '../helpers/api.js';
import { OSAKA_NIGHT, CLIP, KYOTO_GARDEN, KYOTO_TEMPLE, BIRTHDAY, BEACH, HIKE, SCREENSHOT } from '../helpers/photos.js';

// Gives the imported library a fixed curation state, so every screenshot has something in each list.
// The burst frames and Osaka stay in Curate.
setup('seed the curation state', async ({ request }) => {
  await pick(request, KYOTO_TEMPLE, 5);
  await pick(request, KYOTO_GARDEN, 4);
  await pick(request, BEACH, 3);
  await pick(request, BIRTHDAY);
  await pick(request, CLIP);
  await reject(request, HIKE);
  await reject(request, SCREENSHOT);

  const album = await createAlbum(request, 'Japan 2024', 'Spring trip');
  const japan = [await findPhoto(request, KYOTO_TEMPLE), await findPhoto(request, KYOTO_GARDEN)];
  await addToAlbum(request, album.id, japan.map(photo => photo.filePath));
  await createAlbum(request, 'Empty album');

  const temples = await createTag(request, 'temples');
  await tagPhotos(request, temples.id, [japan[0].filePath]);
  const family = await createTag(request, 'family');
  await tagPhotos(request, family.id, [(await findPhoto(request, BIRTHDAY)).filePath]);

  await updateSetting(request, 'burst_detection_enabled', 'true');
  await request.post('/api/burst/rebuild/');
  await waitForIdle(request);

  await request.post('/api/export/sessions/');
  await waitForIdle(request);

  // Osaka stays in Curate so the lightbox and compare screenshots start from it.
  await findPhoto(request, OSAKA_NIGHT);
});
