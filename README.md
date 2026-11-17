# GoldKey Select

The current UI follows the owner's friendly Letterbox reference: larger Manrope text, navy copy, mint controls and a lavender preview button. `static/friendly.css` supplies this design layer; `static/map-workspace.css` supplies the contained map with floating venue panel. The current design concept is `docs/friendly-concept.png`. City pills show fixture counts and independently include/exclude London, Birmingham and Manchester, fading excluded cities and gently reframing the map. Counts are derived from the fixture (currently 3 per city), not real inventory claims. See `docs/verification.md` for browser and visual checks.

The entire journey is now one continuous page: map and venues, the interactive stand/artwork section, then the order preview. `static/one-page.css` supplies the inline layout. Header, placement and summary buttons scroll between sections; neither stand nor order is a modal.

A local, single-page campaign planner for premium in-venue leaflet placements. Flask renders the page; vanilla JavaScript handles matching, Leaflet maps, placement selection and browser-only artwork. **No booking, payment or live availability.** All nine venue records and all rates, audience tags and footfall figures are illustrative.

## Run locally

Requires Python 3.10+.

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Open http://127.0.0.1:5000. On macOS/Linux, use `python3` and `.venv/bin/python` equivalents. The server binds only to loopback. Restart after changing Python or templates. No Node build is required. Manrope, Leaflet and OS branding assets are bundled locally; map tiles need internet access.

## Ordnance Survey map setup

Create an OS Data Hub project with OS Maps API access. Set `OS_MAPS_API_KEY` in the process environment, or copy `config.example.json` to **`config.local.json`** and enter your key locally. Environment values take precedence. Local configuration and `.env` are ignored by Git; `.env` is not automatically loaded. Never commit a real key. The key is delivered to the browser to request tiles, so apply the provider's available origin restrictions and usage limits before any public use.

The app uses Leaflet 1.9.4 with EPSG:3857 and:

`https://api.os.uk/maps/raster/v1/zxy/Light_3857/{z}/{x}/{y}.png?key=…`

OS layer zooms are constrained to 7–19. The official OS branding helper includes the full-colour logo, current-year Crown copyright/database-rights statement, terms and error-reporting links. Source: [OS ZXY specification](https://docs.os.uk/os-apis/accessing-os-apis/os-maps-api/technical-specification/zxy), [layers and styles](https://docs.os.uk/os-apis/accessing-os-apis/os-maps-api/layers-and-styles), [branding requirements](https://docs.os.uk/os-apis/core-concepts/os-api-branding) and [official branding helper](https://github.com/OrdnanceSurvey/os-api-branding), inspected 16 November 2026.

Without a key, the map explicitly labels OpenStreetMap as a **preview basemap** and credits its contributors. If OS requests fail, it switches to that preview. If preview tiles also fail, the coordinate grid, markers, map interaction, results and basket remain available with an explicit unavailable message. Actual OS tiles have **not** been verified: no OS key was supplied. Provider integration is implemented, but key access and tile coverage must be verified with your account.

## Replace demo inventory

Edit `data/venues.json`; the same fixture is exposed at `GET /api/venues`. Keep stable venue IDs and stand IDs, coordinates in WGS84, city/area/type, audience tags, optional descriptor tags, provenance, footfall source/date, stand model and offered facings. Rates are integer **pence per week**. Each facing has an ID, shelf (`top`, `middle`, `bottom`), side (`left`, `right`, `centre`), display label and rate. `totem-dual` uses two positions per shelf; `totem-single` uses one. All fixture positions are offered; remove unavailable positions from `facings`.

Use `null` for unknown audiences, descriptors or footfall. Missing data in a requested audience group fails matching and is explained. Replace synthetic tags only with evidence-backed categories; never infer demographics from postcodes. Venue footfall is separate from stand impressions and pickups, which this app does not report. Replace synthetic footfall provenance and dates with measured sources before production. A future rack database adapter should supply the same record shape; no frontend rewrite is needed.

## Matching and budget behaviour

Every filled group must pass: city/searched bounds, at least one selected audience, requested descriptor, and cheapest offered facing × weeks within the total campaign budget. Empty groups restrict nothing. Matching is deterministic, with no invented score. Dimmed markers remain clickable. National map markers group by city and expose match counts; zooming shows individual venues. Map bounds apply only after **Search this map area**. Switching cities clears those saved bounds.

A venue match checks that venue individually. Adding a facing separately checks the basket total. Duplicate venue + stand + facing lines are blocked. Over-budget additions report the exact shortfall. A later budget/duration change retains placements and flags the overage. Filters and map bounds never remove selections. All pricing uses integer pence; no print, other charges or VAT treatment have been invented.

## Artwork and stand model

One JPG/PNG/WebP up to 10 MB is decoded locally using an object URL; there is no upload endpoint. Updating/removing it updates all previews. Refreshing the page clears artwork and the plan. No campaign data is saved or transmitted by the app. Third-party tile requests receive ordinary network information.

Choose **Stand preview** in the header, or **Open 3D preview** on a placement, to scroll to the inline stand section. The real WebGL model is interpreted from the owner's reference photograph: an open silver frame, portrait screen, three clear sloping shelves and six positions per shelf: A4 + A4 + A5 + A5 + A4 + A4. Drag left/right with a limited upright vertical tilt, scroll/pinch to zoom, use front/angled/side presets, enable an explicit 360-degree spin or use the keyboard rotation slider. Silver/graphite and wireframe are visual exploration controls, not bookable product options. The animation loop runs only while the canvas is on screen and the tab is visible; automatic spin starts off.

The owner-supplied **Lidl Bromley Cross — Leaflet — Oct 2026.pdf** is an imposed two-page print PDF. Its front cover is the right-hand half of the first page's TrimBox. That panel was rendered without crop marks to `static/artwork/lidl-bromley-cross-front.png` (1,053 × 1,489 px) and visually checked. PyMuPDF was used because Poppler was not installed. The original PDF was read only and has not been copied into the repository or changed. This cover is an optional sample available through Use sample artwork. The six central A5 pockets start empty. A single artwork moves between them; the 12 A4 magazine positions stay fixed. Source date and sample status are labelled in the UI; this is artwork demonstration, not a current offer or confirmed venue campaign.

Upload artwork in the stand or order section. One shared browser-local image updates both. The print surface preserves aspect ratio and fits it without cropping on a 1,000-pixel-wide A5 preview sheet, with transparency composited on white paper. The original file stays unchanged in the browser. The 2026 magazine source images and provenance are in static/stand-layout.mjs. The original 12-second screen advert uses static/video/goldkey-advert-loop.mp4; leaflet estimates do not include screen airtime.

`static/stand-3d.mjs` builds the model with locally bundled Three.js 0.187.0, OrbitControls, physical materials, studio lighting and shadows. `static/stand-studio.mjs` handles its UI. Geometry is configurable in `static/stand-models.json`, in metres. Placement/detail/order images are cached renders of that same model; a lightweight CSS CAD schematic remains as a fallback if WebGL cannot load. Order rendering uses a serial queue and version checks to avoid stale artwork replacing current previews.

The nominal envelope is 1,150 mm wide × 2,291 mm high with a 480 mm base depth, from the brief. **Steve Easton's drawing was not supplied**: screen size, shelf heights/tilt, materials and the photo's four-holder layout remain provisional. These are shared stand visualisations, not venue interiors or measured manufacturing CAD. Demo inventory's left/right/centre booking labels have not been changed into twelve new live slots. For the reference visual, left maps to holder 1, right to holder 4 and centre to holder 2. Studio shelf/holder controls explore the visual only and do not amend the basket. Replace that mapping and configuration with confirmed rack/facing IDs and the actual CAD drawing before production.

## Branding and design

The initial browser connection failed (`browser access host is unavailable`). The official public HTML and stylesheet were subsequently retrieved directly with a browser user agent; this verified the logo reference and navigation. The official site navigation includes Venue Services, Publisher Services, Digital Platform, About Us, News and Contact. The planner uses a much smaller task-specific navigation.

Palette source: [official GKM theme stylesheet](https://www.gkml.co.uk/wp-content/themes/gold-key-media/style.css?ver=4.27.6), retrieved 16 November 2026:

- `#b5be34`: `.green-button` background, links and underlined emphasis.
- `#4a4a4a`: `.green-button` text and heading/body rules.
- `#ffffff`: hero copy and boxed-content background.
- `#2e2e2e`: venue content and boxed-content text.

These are CSS variables in `static/style.css`. The additional dark green `#17653c` is a planner-specific match status; neutral borders and error colours are UI tokens, not claimed official brand values. Manrope is applied throughout the interface; the supplied wordmark retains its original typography.

The owner supplied a GoldKey logo and requested a premium service name replacing “media”. **Select** describes curated venue placements. `static/goldkey-select.png` is a transparent image-tool edit preserving the supplied GoldKey mark and replacing the lower word with “select”. It is a prototype adaptation, not a vector master. The built-in image tool prompt was: preserve the exact GoldKey lettering and lime key/chevron, replace only “media” with lowercase “select” in the same thin style, transparent background, no effects. Swap in an approved vector master when available.

`docs/design-concept.png` records the initial built-in image concept. The owner then explicitly requested a simpler UI and their supplied logo. Intentional changes: fewer visible controls; proposed date and descriptors under **More options**; one city selector via map tabs; scrollable venue rail; supplied logo adaptation. Required brief copy and clear prototype notices take precedence over generated copy. Generated booking controls were intentionally omitted because this phase ends at preview.

## Verification

`node --test tests/core.test.mjs` checks AND/OR match rules, unknown data, area restrictions, integer arithmetic, duplicate prevention and exact/insufficient budgets. Node is needed only for these optional tests.

Browser QA uses local Playwright + installed Chrome because the Browser plugin is absent and CUA browser access failed. Desktop 1440 px and mobile 390 px are checked. Detailed completed checks and visual comparison are recorded in `docs/verification.md`. OS tile verification remains pending a real API key. No real venue dataset or Totem drawing was available.

To repeat browser checks, run the app, install optional dev dependencies with `npm install`, then run `npm run test:browser` (requires installed Google Chrome). `npm test` runs the standalone pricing/matching tests.

`npm run test:stand` verifies real 3D output, shared artwork, order-facing mapping, rotation, spin controls, inline upload validation and the unavailable-3D fallback, using installed Chrome and the running Flask app.

Bundled dependencies: Leaflet (BSD-2-Clause, licence in `static/vendor`), Manrope (SIL OFL, licence in `static/vendor`), Three.js 0.187.0 (MIT, licence in `static/vendor/three/LICENSE`), official OS API branding helper (Open Government Licence 3.0, source linked above). Three.js module/controls/material APIs were checked against the [official docs](https://threejs.org/docs/) and official package sources. No files were zipped, pushed or deployed.


## Luxury editorial presentation

The homepage introduces premium A5 leaflet placement before presenting the planning tools. Manrope is retained, with warm ivory, espresso and bronze styling in `static/luxury.css`. The Clients section uses twelve local publisher-sourced magazine logos (`static/client-logos.mjs`, `static/client-logos.css`). Asset provenance is recorded in `static/magazine-logos/sources.json`. The original covers remain on the stand; generated hero imagery illustrates the setting and is not a verified venue photograph or publisher endorsement.

`static/environments/goldkey-airport-hero-editorial.webp` is an image-tool refinement of the original hero, using source magazine covers to restore readable mastheads. The edit prompt preserved the existing lounge composition and stand, and requested only clearer cover fidelity and sharpness. The stand renderer, dimensions and A4/A5 layout files were compared before and after this presentation change and were byte-for-byte unchanged.

The map retains 150 example points with generated, explicitly labelled profiles, alongside the nine illustrative planning venues. `node tests/map-explorer.cjs` checks accessible point activation, city exclusions, profile disclosure, known venue stats and placement selection. The homepage is a prototype and does not confirm inventory or accept bookings.


## Guided slot selection

The simplified homepage presents the stand and editorial setting, then a brief with campaign type, editable audience suggestions, city controls, budget and duration. `static/recommendations.mjs` ranks matching planning venues by declared campaign setting and audience overlap, then proposes up to three cheapest offered positions while respecting the remaining combined budget. Recommendations are a starting plan, not a predicted return or a live availability claim. Nothing is added until the visitor chooses Add these slots.

All 150 generated points remain illustrative and unbookable. They can illustrate audience/setting fit when there is no budget; once a budget is supplied their unknown pricing is not presented as a budget match. Only the nine priced planning fixtures can enter a suggested plan. The actual stand design is unchanged; its media URLs now point to the original luxury-hospitality creative (`goldkey-advert-luxury.mp4` and poster). The film is exactly 288 frames at 24fps and was tested through two natural complete loops. The hero photograph was edited only to replace the on-screen advert, preserving the stand.

Validation: `npm run test:recommendations`, `npm run test:map`, `npm run test:browser`, and `npm run test:video`.


## Clear first-time flow

The primary Find my locations button focuses the campaign-type question. Audience, spend, duration and city options appear after a type is chosen (including an unsure option). Show my suggested locations explicitly reveals step 2; Leaflet is initialised only then. At least one city is required. Step 3 appears after slots are selected, with an editable plan and budget breakdown. The stand is an optional disclosure that opens from the header or preview links; its physical design is unchanged. Client logos and FAQs sit below the journey rather than blocking the starting question.

`npm run test:flow` exercises the first-time progression, budget-fitting slot selection, return navigation, optional original stand and responsive widths. Retained campaign and map tests now submit the explicit initial brief before exercising their controls.


### Current planner budget and map behaviour

The entered budget guides automatic suggestions. Manual additions may exceed it; duplicate positions remain blocked. The floating campaign basket and review show the exact amount over budget. Leaflet and its venue panels stay within the planner stacking context beneath the fixed header. Planning venues use stable numbers 1?9; generated examples use 10?159, shown on small pins at street-level zoom and in profiles. City overview markers remain aggregate counts.

Representative location photographs are locally hosted WebP stock images, mapped by setting type and explicitly labelled as representative rather than actual venue photography. Credits/source links are recorded in static/venue-photos/sources.json. Demo airport/library profiles are illustrative and do not add bookable inventory. The floating basket remains available on review; this prototype still does not take payments or reserve placements.


### Cached scroll animation and on-demand 3D

The homepage uses high-resolution prerendered frames from the editable Three.js stand. Normal scrolling no longer initializes WebGL. Slot selection and artwork uploads switch to the original live worker at a matching camera position. The advert is painted into the same surface as the stand so it stays attached during rapid scrolling.

Run `npm run build:showcase` after model, texture, lighting or camera edits. The local Flask server must be running at port 5001. Run `npm run test:sequence` and `npm run benchmark:showcase` to verify. Use `/?live=1` for a direct comparison with live rendering. See [the rendering guide](docs/showcase-sequence.md) for the rebuild process, cache budget, progressive-loading behaviour, testing and limitations.

### Branded entry

The showcase home now opens with the white GoldKey | Edition entry. It uses an approximately two-second first-visit reveal with reduced-motion support, then opens onto the cached stand. Returning to the page in the same tab skips the entry. The divider is retained in the permanent header/footer logo. Default A5 artwork is empty again (numbered 1?6); uploads remain optional. Entry files: templates/entry-screen.html, static/entry-screen.css and static/entry-screen.mjs.


### Refined digital advert

Current hero creative is static/video/goldkey-advert-cinematic.mp4: 18 seconds, 540 frames, 30 fps, 720x1280 H.264 with BT.709 colour metadata and fast-start. It retains the original warm hospitality photograph and palette, with continuous restrained camera drift, longer reading holds, softer message transitions and a matched loop boundary. Source drawing code is advert-cinematic.mjs; the original 12-second video and creative remain available.

native-screen-video.mjs supplies decoded advert frames to the active renderer. The frame player composites them into the stand canvas using the captured screen projection; live mode applies them as a texture to the actual screen mesh. Video remains muted/inline, starts after hero readiness, continues during the opening camera scroll and pauses offscreen or once the display leaves the close-up. Reduced motion keeps the static poster. Test with BASE_URL set using npm run test:video.


The current homepage is an editorial introduction with the unchanged stand showcase, client logos and service story. Campaign requests live at `/plan`. Requests are saved privately for team confirmation; no payment or automatic email notification is configured. See `docs/editorial-booking.md` for the review queue, image-generation prompts, visual comparison and tests. The previous page remains at `/?view=original`.
