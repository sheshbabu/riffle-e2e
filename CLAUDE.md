# riffle-e2e

## Writing tests

- Select by role, label, placeholder or visible text where riffle offers one. Many riffle controls are divs or icon buttons, so fall back to a CSS class, and keep it in `helpers/ui.js`, not the spec, so a rename in riffle is fixed in one place.
- Name photos by the date stamp riffle puts in their library file name, using the constants in `helpers/photos.js`.
- A known riffle bug gets a test that asserts the correct behaviour, marked `test.fail()` with a comment describing the bug. Remove the annotation when riffle fixes it.
- All specs share one library. Specs that curate start from `resetCuration()`, name albums and tags with `unique()`, and check the tags or albums they made rather than whole lists.
- A spec that deletes or moves photos imports its own with `importNewPhoto()`, so the shared fixtures stay intact.
- Create setup data through the API (`helpers/api.js`) and drive the UI only for the feature under test.
- Start long operations (import, export, rebuilds) with `runOperation()`, which waits for the POST before waiting for the server to go idle.

## Selector notes

riffle's `Button` renders a `div` with no role, so `textButton()` matches its class and text. `IconButton` is a real `button`, named by its label or, when it only holds an icon, its title, so `toolbarButton()` and `pageButton()` use roles. Modals render into `document.body`, outside `.main-content`.

## Updating topology.md

Derive features from the riffle code: `main.go` routes, `index.jsx` client routes, `ApiClient.js`, the keyboard handlers in `PhotoListPage.jsx`, `PhotoGallery.jsx`, `Lightbox.jsx` and `CompareMode.jsx`, and the modals. Then check them by exploring a running instance with `browser-skill` and by running the suite.
