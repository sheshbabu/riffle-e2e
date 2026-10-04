# Riffle feature topology

The source of truth for what the suite covers.

Each action is marked with the test that covers it, **gap** when nothing does yet, or **out of scope**. `test.fail` marks a test that asserts the correct behaviour of a known riffle bug.

## Pages

| Route | Page |
|---|---|
| `/`, `/import` | Import: Import button, import history table, session details |
| `/curate` | Uncurated photos by day, first photo selected |
| `/library` | Picked photos by day. Query params filter it: `ratings`, `mediaType`, `orientation`, `years`, `cameraMakes`, `cameraModels`, `countries`, `states`, `cities`, `fileFormats`, `tagId`, `offset` |
| `/trash` | Rejected photos |
| `/albums`, `/albums/:albumId` | Album cards; one album's photos |
| `/calendar` | A tile per month, grouped by year |
| `/stats` | Totals and a bar chart per decade |
| `/export` | Export button, export history table, session details |
| `/settings`, `/settings/{import,library,burst,export}` | Settings tabs |

## Import

| Action | Coverage |
|---|---|
| First import from the Import page: 11 files scanned, 1 duplicate skipped, 10 imported | `import.setup.js` |
| Import again skips everything already imported | `import.spec.js` › importing again |
| The page shows a finished import without a reload | `import.spec.js` › `test.fail` (the poll ignores the cleared operation name) |
| Session details list what was found | `import.spec.js` › the first import's details |
| Escape closes the session details | `import.spec.js` › `test.fail` (no Escape handler) |
| Copy leaves originals; library organised by year and month | `import.spec.js` › Copy leaves the originals |
| Move takes originals out of the import folder | `import.spec.js` › Move takes the originals out |
| Move with Duplicate Handling "Delete" deletes the leftover duplicates | `import.spec.js` › `test.fail` (the setting is never read) |
| Duplicate Handling only shows for Move | `import.spec.js` › Duplicate Handling only shows for Move |
| Import progress steps while running | gap (imports of the fixtures finish before the first 5s poll) |
| HEIC, WebP and other formats; EXIF-less videos | gap |
| Import errors, such as a missing folder | gap |

## Curate

Keys: P pick, X reject, U unflag, 1-5 rate, arrows move, Enter/Space open the lightbox, C compare, Escape clears the selection, J/K page.

| Action | Coverage |
|---|---|
| Lists every photo by day, newest first, first one selected; video shows its length | `curate.spec.js` › lists every imported photo |
| P picks with a fade and Undo | `curate.spec.js` › P picks |
| Undo puts the photo back | `curate.spec.js` › Undo |
| X rejects into Trash | `curate.spec.js` › X rejects |
| 1-5 rate and pick | `curate.spec.js` › a number key rates |
| Arrow keys move the selection, Escape clears it | `curate.spec.js` › arrow keys move |
| Arrow keys still work after P | `curate.spec.js` › `test.fail` (the faded photo stays selected and blocks the arrows) |
| Cmd-click and Shift-click selections; toolbar Reject acts on all | `curate.spec.js` › Cmd-click and Shift-click |
| Select All for a day; toolbar stars rate the selection | `curate.spec.js` › Select All |
| Curated photos leave the list on the next visit | `curate.spec.js` › curated photos leave |
| Empty state | `curate.spec.js` › an empty Curate list |
| U unflags from the grid | gap |
| J/K and the pagination arrows (100 photos per page) | gap (the fixtures fit on one page) |
| Burst stacks collapse and expand | `settings.spec.js` › turning on burst detection |

## Lightbox

| Action | Coverage |
|---|---|
| Enter opens, arrows move (video included), Escape closes | `curate.spec.js` › the lightbox opens on Enter |
| Double-click opens | `curate.spec.js` › double-clicking a photo |
| P picks and moves on | `curate.spec.js` › picking in the lightbox |
| Curation buttons in the top bar | `curate.spec.js` › the lightbox curation buttons |
| U unflags the photo on screen | `curate.spec.js` › `test.fail` (U reaches the page handler and unflags the grid's selection) |
| I shows camera, dimensions, location and original path | `curate.spec.js` › I shows the photo details |
| Click to zoom | gap |
| Tags in the details panel | `tags.spec.js` |

## Compare

| Action | Coverage |
|---|---|
| C opens with the selection and the next photo; arrows move the candidate; keys curate the candidate; Down swaps; Close | `curate.spec.js` › C compares |
| The toolbar Compare button | `curate.spec.js` › the Compare button |
| Up promotes the candidate; I toggles details | gap |

## Library and filters

| Action | Coverage |
|---|---|
| Shows picked photos only | `library.spec.js` › shows picked photos only |
| Filter by camera make, with the badge | `library.spec.js` › filter by camera make |
| Filter by country | `library.spec.js` › filter by country |
| Filter by rating | `library.spec.js` › filter by rating |
| Media type and orientation | `library.spec.js` › filter to videos, and to portrait |
| Year and file format together | `library.spec.js` › filter by year and file format |
| No matches, and Clear all | `library.spec.js` › filters that match nothing |
| Clicking outside closes the panel | `library.spec.js` › clicking outside |
| Curating from the library | `library.spec.js` › Library pages can be curated too |
| Camera model, state and city filters | gap |

## Trash

| Action | Coverage |
|---|---|
| Empty state | `trash.spec.js` › an empty Trash |
| Lists rejected photos only | `trash.spec.js` › lists rejected photos only |
| P restores a photo | `trash.spec.js` › P restores |
| Only Remove from Disk in the toolbar | `trash.spec.js` › Trash offers no curation buttons |
| Remove from Disk deletes the file and the record | `trash.spec.js` › Remove from Disk deletes |
| Cancel keeps the photo | `trash.spec.js` › cancelling Remove from Disk |

## Albums

| Action | Coverage |
|---|---|
| Create from the Albums page | `albums.spec.js` › create an album |
| A name is required | `albums.spec.js` › an album needs a name |
| Add library photos with Add to Album | `albums.spec.js` › add selected library photos |
| Ticking the album's checkbox selects it | `albums.spec.js` › `test.fail` (row and checkbox both toggle) |
| An album lists its photos; Remove from Album | `albums.spec.js` › an album page lists its photos |
| Card count and cover | `albums.spec.js` › the album card |
| New Album inside Add to Album | `albums.spec.js` › New Album inside Add to Album |
| Delete an album | gap (no UI; `DELETE /api/albums/{id}/` exists) |

## Tags

| Action | Coverage |
|---|---|
| Add a new tag from the lightbox | `tags.spec.js` › add a new tag |
| The new tag appears in the sidebar | `tags.spec.js` › `test.fail` (the sidebar loads once) |
| Suggestions, arrow keys and Enter | `tags.spec.js` › typing part of an existing tag |
| Escape closes suggestions | `tags.spec.js` › Escape closes the suggestions |
| Remove a tag | `tags.spec.js` › remove a tag |
| Manage Tags adds to every selected photo | `tags.spec.js` › Manage Tags adds a tag |
| Manage Tags lists every selected photo's tags | `tags.spec.js` › `test.fail` (only the first photo's tags load) |
| A sidebar tag filters the library | `tags.spec.js` › a sidebar tag filters |
| A sidebar tag shows the photos it counts, including uncurated ones | `tags.spec.js` › `test.fail` (the link opens the Library, which hides them) |
| Rename and delete from the sidebar | `tags.spec.js` › rename a tag, delete a tag |

## Export

| Action | Coverage |
|---|---|
| Picked photos into year and month folders | `export.spec.js` › exports picked photos |
| History row and details | `export.spec.js` › a finished export shows in the history |
| The page shows a finished export without a reload | `export.spec.js` › `test.fail` (same as import) |
| Minimum rating | `export.spec.js` › the minimum rating |
| Curation status "All" leaves rejected photos out | `export.spec.js` › `test.fail` (no `is_trashed` check) |
| Flat organization, set in Settings | `export.spec.js` › Flat organization |
| Skip Duplicates | `export.spec.js` › Skip Duplicates |
| Clear Folder confirm, Cancel and Continue | `export.spec.js` › Clear Folder asks first, Clear Folder empties |
| The settings pane shows saved choices | `export.spec.js` › the Export settings show |

## Settings, Stats, Calendar

| Action | Coverage |
|---|---|
| Each tab opens its pane | `settings.spec.js` › the settings tabs |
| A changed setting is saved | `settings.spec.js` › a changed setting is saved |
| Burst detection and Rebuild Burst Data | `settings.spec.js` › turning on burst detection |
| Burst time and dHash thresholds | gap |
| Rebuild Thumbnails | `settings.spec.js` › Rebuild Thumbnails |
| Sidebar marks the current page | `settings.spec.js` › the sidebar marks the current page |
| Stats totals | `overview.spec.js` › the stats totals |
| Calendar tiles by year | `overview.spec.js` › the calendar has a tile per month |
| A month tile opens the library | `overview.spec.js` › a month tile opens that year (it opens the whole year, a known bug) |
