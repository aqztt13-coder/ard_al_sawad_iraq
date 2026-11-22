import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWikimediaSearchUrl,
  selectBestWikimediaImageUrl,
  selectWikimediaGalleryUrls,
  WikimediaPageCandidate,
} from './wikimedia';

test('buildWikimediaSearchUrl produces valid CORS-enabled Wikimedia Commons API URL', () => {
  const url = buildWikimediaSearchUrl('Ziggurat of Ur Iraq', 960);
  assert.ok(url.startsWith('https://commons.wikimedia.org/w/api.php?'));
  assert.ok(url.includes('origin=*'));
  assert.ok(url.includes('gsrnamespace=6'));
  assert.ok(url.includes('iiurlwidth=960'));
});

test('selectBestWikimediaImageUrl filters out SVG/maps/small icons and picks landscape high-res JPEG', () => {
  const pages: Record<string, WikimediaPageCandidate> = {
    '1': {
      title: 'File:Iraq_location_map.svg',
      index: 1,
      imageinfo: [
        {
          url: 'https://upload.wikimedia.org/map.svg',
          mime: 'image/svg+xml',
          width: 1200,
          height: 900,
        },
      ],
    },
    '2': {
      title: 'File:Babylon_map_plan.jpg',
      index: 2,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/plan.jpg',
          mime: 'image/jpeg',
          width: 1000,
          height: 800,
        },
      ],
    },
    '3': {
      title: 'File:Portrait_detail.jpg',
      index: 3,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/portrait.jpg',
          mime: 'image/jpeg',
          width: 600,
          height: 900,
        },
      ],
    },
    '4': {
      title: 'File:Ishtar_Gate_Babylon_Iraq.jpg',
      index: 4,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/ishtar_landscape.jpg',
          mime: 'image/jpeg',
          width: 1600,
          height: 1066,
        },
      ],
    },
  };

  assert.equal(
    selectBestWikimediaImageUrl(pages),
    'https://upload.wikimedia.org/ishtar_landscape.jpg'
  );
  assert.equal(selectBestWikimediaImageUrl(undefined), null);
});

test('selectWikimediaGalleryUrls returns multiple deduplicated landscape photos capped at maxCount', () => {
  const pages: Record<string, WikimediaPageCandidate> = {
    '1': {
      title: 'File:Ur_Ziggurat_1.jpg',
      index: 1,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/ur_1.jpg',
          mime: 'image/jpeg',
          width: 1600,
          height: 1000,
        },
      ],
    },
    '2': {
      title: 'File:Ur_Ziggurat_dup.jpg',
      index: 2,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/ur_1.jpg',
          mime: 'image/jpeg',
          width: 1600,
          height: 1000,
        },
      ],
    },
    '3': {
      title: 'File:Ur_Ziggurat_2.jpg',
      index: 3,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/ur_2.jpg',
          mime: 'image/jpeg',
          width: 1400,
          height: 900,
        },
      ],
    },
    '4': {
      title: 'File:Ur_Ziggurat_3.jpg',
      index: 4,
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/ur_3.jpg',
          mime: 'image/jpeg',
          width: 1500,
          height: 950,
        },
      ],
    },
    '5': {
      title: 'File:Ur_map_diagram.svg',
      index: 5,
      imageinfo: [
        {
          url: 'https://upload.wikimedia.org/ur_map.svg',
          mime: 'image/svg+xml',
          width: 1200,
          height: 900,
        },
      ],
    },
  };

  const gallery = selectWikimediaGalleryUrls(pages, 2);
  assert.deepEqual(gallery, [
    'https://upload.wikimedia.org/ur_1.jpg',
    'https://upload.wikimedia.org/ur_2.jpg',
  ]);
  assert.deepEqual(selectWikimediaGalleryUrls(undefined, 5), []);
});
