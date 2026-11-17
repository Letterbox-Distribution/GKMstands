# Verification — 16 November 2026

## Current continuous page and Lidl sample leaflet

Converted stand and order dialogs to regular labelled sections inside `main`, after the map and before the footer. Navigation and placement buttons scroll to those sections; Back to venues scrolls to the map. No modal dialog, backdrop or document scroll locking remains in this flow. A viewport observer loads/animates the 3D stage only when visible, stops it off screen/hidden tab, and generates order thumbnails when the order section approaches the viewport.

The supplied Lidl PDF was read from the explicitly provided Desktop path. First-page visual inspection showed an outside spread: back cover left, front cover right, with print marks. PyMuPDF (Poppler unavailable) rendered the right half of the page's TrimBox, coordinates approximately (450.449, 29.503)–(871.394, 624.779) points, at 2.5× scale. The resulting 1,053 × 1,489 PNG was visually inspected to confirm the front panel only, correct orientation, aspect ratio and no print marks. The source PDF was not modified. No instructions or URLs in the leaflet were acted on.

The exact rendered cover is a resident top-shelf holder-1 sample, separate from uploaded campaign artwork. It remains there when another holder is selected/uploaded, is used by the shared thumbnail renderer, and returns if an upload that replaced it is removed. A nearby card identifies it as the October 2026 sample.

The one-page acceptance flow passed at desktop 1440 × 1100 and mobile 390 × 844: no dialogs; stand and order sections inside main in correct sequence; correctly sized loaded sample image; actual rendered sample cover inspected on the stand; artwork upload changes the canvas; order artwork and £200 total agree; removal updates renders; same-page navigation works; no horizontal overflow or JavaScript page errors. Desktop stand, uploaded artwork, inline order, full page and mobile stand screenshots were inspected with `view_image`. A full-page capture from a scrolled position can show the desktop sticky model at its current sticky offset; viewport inspection confirmed normal section layout.

## Reference-photo 3D stand and artwork studio

Built a real Three.js/WebGL stand based on the owner's photograph, rather than a spinning flat image. It has the open silver support frame, portrait screen, three transparent sloping trays, four visual magazines per tray, a base and feet. The brief supplies the 1,150 × 2,291 × 480 mm nominal envelope; the photo supplies appearance. Internal dimensions are approximate and explicitly labelled, pending the actual drawing.

The studio supports drag orbit, zoom, view presets, user-initiated spin, keyboard rotation, holder picking and shelf/holder buttons. Material/wireframe controls explore appearance without changing placements. The existing image validation/object URL pipeline is reused, so one JPG/PNG/WebP updates studio, placement and order visuals without a server upload. Order/detail thumbnails are rendered from the same 3D model. Bookable demo facings remain unchanged; visual mapping is documented in README.

Browser checks completed in local Playwright/Chrome: WebGL initialises, the rendered canvas changes after an actual mouse drag, spin toggles, front view works, middle-shelf holder 3 can be selected, a portrait artwork appears at that position, removal restores the placeholder, finish/wireframe controls work, dialog closes, and mobile has no horizontal overflow. A second flow selected two differently priced venues, generated actual 3D order images for bottom-left and top-centre, uploaded one image to both, opened the correct studio holder from the order, and verified shared removal updates both order renders. The campaign browser suite and core pricing tests also passed. Desktop, mobile, uploaded-artwork, dragged-view and order screenshots were inspected using `view_image`.

The renderer loads lazily and its animation loop stops when the studio closes. Artwork is sampled onto physical paper planes with retained ratio; transparent images are previewed against white paper. A GPU texture size cap prevents unnecessarily large uploads from consuming full-resolution texture memory. Material lighting was adjusted so artwork colours remain recognisable. No stand photographs are shipped as the model or used to imply a venue interior. The model is a reference-inspired prototype, not a fabrication-ready CAD file.

The retained `tests/stand.cjs` also passed inline invalid-file validation and a deliberately blocked Three.js module: the studio showed an unavailable message while the map/results stayed usable. A dialog-opening race in thumbnail generation was corrected by opening the review before requesting its images. Full 3D and campaign acceptance tests passed after that fix. The original schematic remains as a loading/unavailable fallback; successful detail and order previews use actual rendered images from the shared 3D model.

## Popup tidy-up

Audience and More options now share one top-layer popover controller. Only one opens at a time; menus align to their trigger, choose available space above/below, remain inside viewport gutters and avoid the fixed order bar. Each has a Done action. Escape closes and returns focus to the trigger; outside pointer/focus, map movement and resize dismiss the menus. Opening order review closes them. Top-layer rendering prevents clipping by map containers or overlap from map controls.

City labels now show just the city and venue count, with Excluded where relevant; full match information remains in accessible marker labels. Venue-list header is opaque, spacing is consistent and scroll snapping reduces awkward partial-row stops. Notifications have a dismiss button and sit above the order bar. The order dialog has a sticky header, consistent content gutters, background scroll locking and backdrop-click dismissal.

Verified with Playwright/installed Chrome at 1440 × 1000 and 390 × 844: exclusive opening; viewport bounds; Done, Escape and outside dismissal; keyboard focus return; dismissible notification; backdrop dismissal; sticky dialog header; no horizontal overflow. Desktop and mobile menu/review screenshots were inspected with `view_image`. The existing full campaign browser regression passed with no JavaScript page errors. No OS configuration or venue data changed. Temporary QA files were removed after inspection.

## Current friendly map workspace and multi-city controls

The owner superseded the automotive direction with a supplied Letterbox/Beacon screenshot and requested the original contained width, larger Manrope text and an overlaid scrolling venue list. Current built-in image-tool concept: `docs/friendly-concept.png`. Implemented with `static/map-workspace.css` and `static/friendly.css`. Supporting UI colours are navy `#102e40`, mint `#a0e6df` and lavender `#c8b7f5`, inspired by that supplied reference; these are not claimed official GKM colours. The supplied GoldKey mark and green match semantics are retained.

The map is 1,208 px wide inside the original desktop page gutters at a 1,440 px viewport; it is 364 px wide at a 390 px mobile viewport. The venue list is absolutely positioned over the map, can be hidden, and becomes a collapsible bottom sheet on mobile. Mobile campaign settings default closed. The map frame accounts for overlay space so city pins remain visible.

Each city pill displays the actual count from the loaded fixture (currently London 3, Birmingham 3, Manchester 3). Cities can be independently included/excluded; All cities restores all. Excluded markers become translucent, labels state excluded, requested match evaluation fails for excluded cities and results omit them. Subtle city halos distinguish included areas. Changing included cities clears saved bounds and uses Leaflet fly-to-bounds over 0.8 seconds, with animation disabled for reduced-motion preferences. No-cities selection is supported. Existing placements survive all city changes.

Completed browser checks: counts, city inclusion/exclusion/none/all, faded excluded labels, selection retention, contained map geometry, absolute scrolling panel, mobile settings and bottom-sheet selection. The full existing browser acceptance flow and three core test groups also passed; core tests now cover multiple included cities and zero included cities. No JavaScript page errors or mobile horizontal overflow were observed. Real OS tiles remain unverified without a key.

Visual QA used local Playwright/installed Chrome because Browser/CUA access was unavailable. `view_image` inspected the current concept and final desktop/mobile renders at 1440 × 1000 and 390 × 844. Five points checked: larger friendly Manrope headline and body hierarchy; contained map and floating-list geometry; navy/mint/lavender palette on white; rounded controls and softer borders; responsive city pills/settings/bottom sheet. Label clipping and legend/dock overlap were corrected. The result was faithfully verified against the friendly direction, with no remaining material layout mismatch observed in these viewports.

Intentional concept differences: retained the real supplied logo adaptation, real demo fixture names/rates, true price arithmetic, configured Totem model and image-only upload types. Generated fake prices, unsupported good-match scores, PDF uploads, alternate stand configurations and Place order were omitted. The supplied headline and campaign CTA are unchanged. Prototype notices and individual match explanations remain visible. The multi-surface concept board was compared by surface rather than treated as one native website viewport. QA-only files were removed after inspection. The local server remains running at the user's requested live link.

## Premium redesign follow-up

The current design reference is `docs/premium-concept.png`, generated with the built-in image tool for the owner's request for a more premium, simpler website. The original `design-concept.png` is retained as history. Implemented design tokens and components live in `static/premium.css`: white surfaces, charcoal primary controls, official lime accents, Manrope, fine borders, pill selectors and a floating dark campaign dock.

Local Playwright with installed Chrome was used again because Browser/CUA access was unavailable. Checked 1440 × 1100 desktop and 390 × 844 mobile, plus review dialog. Built-in `view_image` inspected the full concept and final desktop/mobile/review screenshots. Five comparison points were verified: large editorial typography; split intro and numbered journey; unified planner and map/results proportions; restrained white/charcoal/lime palette; rounded controls and dark summary dock. Mobile field widths and summary-label specificity were corrected after visual inspection. The final implementation faithfully follows this concept's main design direction with the intentional differences below; no unresolved visual defect was observed in the checked viewports.

Intentional differences from generated content: retained the owner's supplied logo; retained evidence-labelled demo venue data; used green rather than lime for map matches; retained the specified Totem stand configuration rather than invented stand choices; omitted generated Place order/PDF controls; used grounded service copy instead of the concept's unsupported high-footfall claim. The headline and Plan your campaign CTA remain the supplied brief wording. Find your audience, the numbered steps and shortened supporting copy are deliberate changes for the requested redesign. The combined concept board is not a single browser viewport, so implementation was checked at native desktop and mobile sizes separately.

All existing browser acceptance checks and three core test groups passed after redesign. Additional checks passed for the new duration stepper, journey-to-review action, mobile descriptor filtering, no horizontal overflow and no JavaScript errors. Temporary QA runners/screenshots were removed. Actual OS tiles remain unverified without a real key. The local server stays available at the previously requested live link.

Tested locally with Flask, Playwright and installed headless Chrome. Browser plugin was absent and CUA returned “The browser access host is unavailable”. No deployment.

## Completed acceptance checks

- Audience + £400 budget + two weeks produced four matching venues. Unknown requested audience/descriptor data stayed non-matching with visible reasons.
- London showed three venues. A Bloomsbury marker opened the correct row and detail.
- £200/week × two weeks produced £400. A £175/week addition was blocked with a £350 shortfall against that budget. Raising the budget allowed both, producing £750. Reducing it to £500 retained both lines and flagged £250 over budget.
- Zoom + Search this map area excluded venues while retaining selections. Switching cities cleared saved bounds.
- Review and summary showed the same lines and £750 total. One week produced £375. Removing all lines showed the empty state and £0. A £0 budget showed no matches while leaving non-matches inspectable.
- Artwork add/update/remove propagated across previews. A portrait test image appeared at top-right on a dual stand and bottom-centre on a single stand with aspect ratio preserved under perspective. An initial cropping issue was fixed by explicitly positioning the image inside the holder plane.
- Desktop 1440 × 1024 and 1440 × 1000; mobile 390 × 844. Page and dialog had no horizontal overflow. Mobile selection and review passed.
- Keyboard skip link, checkbox by Space, native dialog Escape and accessible marker text verified. Visible focus and keyboard-operable rotation controls implemented; native dialog traps focus.
- Real OpenStreetMap preview tiles loaded. Deliberately failed preview tile requests produced the labelled coordinate-grid state and retained all nine results. Simulated OS failure with a dummy key switched to preview and retained all nine results. **Actual OS tiles were not verified: no real key was supplied.**
- No JavaScript page errors in the tested flows. Flask page and inventory returned 200 with nine records. No artwork upload endpoint exists.
- Three Node test groups passed: matching/unknowns, area/empty groups, integer arithmetic/duplicates/shortfall. The retained browser acceptance script passed.

## Visual comparison

Initial concept: `docs/design-concept.png`. The owner then requested the supplied logo and a simpler UI. Built-in `view_image` was used on that concept and final desktop, mobile, desktop review and mobile review screenshots captured with Playwright. Temporary QA screenshots and runners were removed after inspection.

Five comparison points:

1. Layout retains compact intro, filter band, dominant map/results split and sticky summary. Optional controls moved into More options; duplicate city selection removed.
2. Locally bundled Manrope is used throughout UI text. Headline scale/spacing were reduced to centre the planner. Logo retains its supplied typography.
3. Official lime, charcoal and white retained. Preview tiles made greyscale so green markers stand apart; configured OS Light tiles retain their original style.
4. Supplied logo adapted to “select”. No stand photographs or decorative hero art. One shared CAD model used consistently in detail/review.
5. Simple borders, restrained radii, aligned prices and separate selection controls retained. Bounded results rail stays beside desktop map; mobile stacks map then results without overflow.

Above-the-fold copy check: headline and CTA match the brief. Introduction retains supplied service wording; naming follows the owner's update. Additions are functional labels and required demo notices. Generated unsupported metrics and a Place order control were omitted.

Material fixes: fallback provider replaced, result pluralisation corrected, optional-filter panel dismisses on outside click/Escape, image ratio fixed, attribution corrected, fixture separators corrected. Sorting keeps matches first for price/footfall choices. Visual verification was completed against the concept with the owner's intentional simplifications. No material layout mismatch remains against that revised direction; no pixel-identical claim is made for the superseded concept.

## External inputs still needed

- Real OS API key and live tile-access check.
- Approved venue/rack inventory, measured provenance and real rates.
- Steve Easton's drawing to confirm shelf/holder geometry. Current model is explicitly approximate.
- Approved vector master of the adapted logo for production.

## Reproduce

Start Flask, install optional QA dependencies with `npm install`, then run `npm test` and `npm run test:browser`. Browser checks use installed Google Chrome. The Python app itself requires no Node build or Playwright.


## A4 magazine columns and movable A5 artwork

Six fixed 2026 covers occupy the outer columns: Vogue (December), Harper’s Bazaar (November), Tatler (December), ELLE (March), GQ (November), and Condé Nast Traveller (December). GQ interprets the requested EQ. Six central A5 pockets start empty. One shared campaign image moves among these via six buttons or by clicking the 3D pockets. The optional Lidl sample uses the same upload state. Original images fit uncropped on A4/A5 sheets; actual publisher trim sizes differ. Frame geometry is still illustrative.

Cover sources are recorded alongside each asset in static/stand-layout.mjs and linked from the on-page cover list. Vogue, Bazaar, Tatler, GQ and Traveller use publisher images; ELLE uses the March 2026 cover from Readly’s 5 February 2026 issue listing. All six covers were visually inspected. No synthetic magazine artwork was used.

Validation: tests/stand-layout.cjs checks six fixed magazines, six initially empty A5 positions, sample loading, movement through all six positions with six distinct actual canvas renders, single active selection, removal, mobile overflow and JavaScript errors. tests/stand.cjs checks shared order artwork, correct position entry, drag rotation, removal, spin, invalid files and fallback without Three.js.


### Updated budget, floating basket and map presentation

Supersedes the earlier hard-limit check: manual additions now remain allowed over budget, with the exact excess displayed in the basket and review. Tested a ?100 brief with ?200 then ?80 selections: both added, total ?280, warning ?180 over budget; adding the same position again did not increase the count. Automatic suggestions still fit the budget. All five core/recommendation tests pass.

Playwright Chrome at localhost:5001, 1440x1000 and fresh 390x844 mobile flow (Browser plugin unavailable): over-budget additions, duplicate prevention, persistent fixed basket including review, visible mobile warning, header hit-testing above map, brown numbered markers, consistent profile/card numbers and locally loaded representative university image. Screenshots inspected; no page errors or mobile horizontal overflow. Stock source pages and credits are in static/venue-photos/sources.json. Other photo types inspected as local images. Actual booking/payment remains outside scope.


### Hero-first worker rendering / duplicate studio removal

Removed the complete optional stand-preview section from the showcase home, including its sample leaflet/gallery. The hidden legacy hero is also excluded to prevent its eager high-priority background download. Original mode is retained separately.

Hero rendering moves to an OffscreenCanvas module worker. Main-thread controller handles only scroll/copy/input and applies projected SVG glow points. Geometry building, environment capture, shader initialization, rendering, cover upgrades and picking run in the worker. The shared reference builder uses an injected canvas factory and worker-compatible explicit Three imports (including the local RoundedBoxGeometry import). The same camera and materials are retained. Video transfers are throttled and stop during scroll; high-res cover upgrades wait for idle. Render work pauses offscreen and resumes on return. Main-thread fallback remains for unsupported browsers.

Cold-cache local Chrome comparison with the same early scroll timer: previous renderer's largest timer gap 4,110 ms, versus 339 ms in an early worker run. Final permanent hero regression: 114 ms and 115 ms largest gaps in separate runs; all 80 scheduled scroll updates executed. These are local software-renderer measurements, not a universal frame-rate guarantee. Initial audits confirmed no app.mjs, Leaflet, removed lounge image or hidden legacy hero image downloads during hero scrolling. High-resolution opening is preloaded; planner and clients are viewport/intent-loaded; Leaflet starts on suggestions. The optional studio count is zero.

Passing checks: test:hero (cold scroll, lazy requests, worker selection/upload, return from planner), test:flow (progressive brief, budget-fitting suggestions, inline review/back, hero navigation, widths 390/768/1024/1440), five core/recommendation tests; supplemental desktop/mobile opening/live proportions and final glow/slot/reduced-motion checks; over-budget floating-basket/map/profile/mobile checks. No page errors. Desktop/mobile screenshots inspected. Browser plugin unavailable; Playwright Chrome used. Physical-phone GPU performance and Safari fallback remain untested.


### Clear viewed location, reordered navigation and stronger template cue

Navigation order is now The stand / Start here / Clients. A viewed location is distinct from a basket selection: larger dark-brown pin with outer ring, one persistent location-number/name map label and Viewing location N in the profile. Clearing the profile removes its viewing state. Tooltip state is managed separately from regenerated markers to prevent duplicates during map updates. The Your Edition cue now pulses at 2.6 seconds with a stronger brown edge/halo, projected 4 px outside the actual print corners; it still follows the selected slot and respects reduced motion. Both worker and fallback projection paths use the same outer offset.

Playwright Chrome checked nav DOM order, location 4 pin + Colmore Collective label + profile, clear-on-back, animation duration and edge width, moving the template to bottom-right and no page errors. Map and pulse screenshots inspected. The active-label and pulse changes add no continuous WebGL rendering.


### Placement detail photo

Replaced the right-hand CAD stand graphic, rotation controls and technical dimensions in placement detail with the same representative location-setting photo used in its profile, including stock-photo credit/caption. Photo remains lazy loaded. Left-hand position selector and Add placement stay intact. Chrome desktop 1440x1000 and mobile 390x844 checks passed for loaded hotel photo, absent stand/rotation controls, successful addition, no overflow and no page errors. Desktop screenshot inspected.


### Fine template outline and preview-link removal

Reduced the template cue to a 1 px unblurred brown outline, 2 px outside the printed artwork, with a gentle 3.2-second opacity pulse (0.10 to 0.55). Removed the SVG blur filter and halo polygon entirely from both renderer paths; reduced motion remains a static faint outline. Removed Open 3D preview links from review placement rows. Chrome checked computed line width/filter/duration, absence of halo/filter nodes and preview links, retained review placements and no page errors.


### Notification position and selected cards

Notifications now sit centered just below the fixed header, using brown instead of dark teal; mobile uses a full-width inset banner. This clears the bottom basket. Selected venue cards have a neutral warm surface with a brown side accent and a prominent top-right circled-tick/count badge over the photo. The previous inline selected strip is removed; focused cards also use neutral/brown instead of green. Chrome desktop/mobile checks passed for notification position and colour, duplicate warning, badge and count, removed inline label, neutral card colour, dismiss action, no overflow and no page errors. Screenshot inspected.


### Branded loading entry and empty numbered A5 defaults

The default Your Edition artwork is no longer loaded or rendered. Opening luxury leaflet examples remain, clear during the scroll and leave the six numbered A5 positions, including 1. Optional user artwork upload and slot movement remain supported; the thin pulse only appears with actual uploaded artwork. Worker and main-thread fallback both use this empty default, with null-artwork guards. No default your-edition PNG/SVG request is made.

Added a white full-screen entry with original GoldKey artwork, a fine brown divider and Edition sliding right from behind a clip boundary, revealing its final n first. Branding animation lasts about 1.8 seconds; the overlay holds as long as needed until the hero's first live frame and document fonts are ready. The page fades in over 650 ms. Background header/main/footer are inert and page scrolling is locked until the handover; reduced motion shows the completed logo and uses a shorter fade. The intro focus outline is suppressed. The same divider is now in header and footer logos; SVG viewboxes/text spacing were expanded while retaining original GoldKey sizing. Brand image and primary font preload early. Deep links still allow hero initialization behind the entry so the gate cannot wait on an offscreen renderer indefinitely.

QA Chrome: deliberately held the worker download to confirm overlay remained visible, the page stayed inert/scroll-locked, then released it and verified entry only dismissed after live hero readiness. Entry phases, full logo, homepage handover and numbered slots screenshots inspected. Header/footer divider counts checked, no default artwork request, all six final circles including 1 visible. Mobile reduced-motion, optional artwork upload and bottom-right movement, lazy planner, suggestions/review, floating basket and no horizontal overflow/page errors passed. Hero loading regression updated to start scrolling after the intentional entry handover.


### Smoother screen advert and native compositor

The prior worker transfer cadence capped the 24 fps film at approximately 12 displayed updates per second. Removed that video-frame copy path. An HTML video now maps to the physical inner-screen quad using a CSS matrix3d homography; projected corners and clipping come from the same live worker camera. Native playback does not require whole-stand renders and continues during scroll. It pauses offscreen, on tab hiding and after the screen leaves the close-up; reduced motion retains a static poster. Old fallback renderer uses the new MP4 as well.

New creative is 18 seconds / exactly 540 frames at 30 fps, 720x1280 H.264, BT.709 limited range, fast-start, muted. Same original warm lobby photo, palette and lighting treatment, slower continuous push/drift, approximately 4.65-second text holds within each six-second beat, soft exit/entry text transitions and no pagination-dot cut. Branding updated to GoldKey | Edition. Original 12-second asset is preserved. Frame-boundary analysis before final colour normalization: mean absolute RGB difference at the loop 1.64/255 versus 0.99/255 between its first two frames, supporting a low-discontinuity wrap rather than a scene cut.

Chrome desktop/mobile: 18-second metadata, muted loop, natural end-to-start wrap without seeking, correct screen projection before/after scroll, playback continues through In good company, pauses in final close-up and resumes on return; no overflow or page errors. Screenshots inspected for opening, company and mobile. Playback quality during the full software-Chrome screenshot/scroll test recorded 546 decoded/displayed-or-dropped frames with 45 dropped; do not claim zero drops or guaranteed 30 fps on every GPU. Permanent test:video passes. Cold hero regression after the change passed with maximum main-thread timer gap 27 ms, plus deferred map/planner, artwork upload and return navigation.


### In good company: venue context and shared perspective

Browser plugin not available; used local Playwright/Chrome at http://127.0.0.1:5001. Checked desktop 1440?900 and mobile 390?900: hotel at progress .22, airport at .33, white studio at .49, without page errors. Venue images are fetched only after progress .055, outside the entry-screen loading path. Both photographic walls are projected using the live camera inverse projection and the opening wall plane z=-.34; the original physical floor and contact shadows remain. The physical floor now stops at the wall, preventing it from covering the lower half of the photographic wall. Hotel-to-airport transition uses a soft horizontal wipe. Existing cold-refresh/scroll/artwork/planner regression passed (46 ms maximum timer gap on this local run). Photos supply representative context, not independently modelled 3D furniture.


### First-scroll pinning

Removed a leading U+FEFF from the included entry-screen template: it created an anonymous body line box of 25.6px above main, so the first scroll moved the stage before pinning. The opening camera now turns gently from progress zero instead of remaining static until .22. Playwright/Chrome checked fresh loads at 1440?900 and 390?900: showcase begins at y=0, a 40px scroll changes camera angle, sticky stage remains at y=0, and no page errors. Browser plugin not available.


### Grounded hotel context and smooth brand reveal

Replaced the reception-counter scene with the existing clear-wall hotel asset, compressed to a 399 KB WebP. Wall and photographic floor now share the product camera ray intersections, with a perspective-correct floor mapping and separate physical shadow receiver; removed the opaque studio-floor cut across furniture. Bounded image edges fade instead of stretching border pixels. Reviewed hotel at 1440?900 and 390?900 and the airport transition; no page errors. The entry mark now uses separate composited DOM transform/opacity layers instead of moving SVG filtered text and a stroke-dash divider. Font and logo image decode precede the reveal. Worker GPU startup waits for the 1.8s logo movement to finish; the loading screen still waits for a real hero frame before releasing. Local Chrome rAF scheduling check improved from a 617ms worst gap to 67ms (one gap above 50ms; includes static loading hold). Reduced-motion entry completes. Cold-refresh scroll/artwork/planner test passed with 28ms maximum timer gap before the final startup scheduling adjustment. Browser plugin not available; used Playwright.


### Centred wall and reversible venue slides

Shifted hotel and airport sampling to place the sand-coloured wall centre behind the stand. Added scroll-driven horizontal translation to entry, hotel-to-airport change and exit, with feathered moving seams rather than opacity alone. Translation is parallel to the shared wall plane; the stand and camera retain their own choreography. Playwright/Chrome verified desktop 1890?900 progress .175/.22/.275/.33/.39/.49 and reverse to .33: stage stays pinned at 0, venue returns to the same state, no page errors. Also checked 1440?900 and 390?900 venue phases. Browser plugin not available.


### One retained environment with gradual transition

Removed airport-lounge-photo-editorial.webp from the showcase sequence; only hotel-wall-showcase.webp is fetched, after initial scrolling. Replaced room-to-room wipe with one continuous eased transition: enter .09?.24, hold .24?.32, leave .32?.49. Background drifts only 0.24 world units at each end; camera, wall and floor projection stay shared. Softened out-of-bounds left texture edge to avoid stretched window pixels. Playwright checked 1440?900 and 390?900, including intermediate entry/exit and reverse scrolling: visible weights progress from .058 through .562 to 1, then .555 to 0; no second-room request, no eager room download, no page errors. Browser plugin not available.


### Startup and rendering cache optimisation

Browser plugin not available; used Playwright/Chrome on http://127.0.0.1:5001. Before this change, one local cold/repeat pair took 6.40s/4.75s to release the intro, with first live frames at 5.71s/4.07s. After optimisation, the latest pair released at 2.28s/2.02s and produced first live frames at 2.51s/1.44s. Across runs, GPU startup varies: cold results also reached roughly 3?4.7s under heavier local load. Do not promise every device a fully compiled live scene in exactly two seconds. A matching high-resolution opening render now covers this variable preparation time; the intro does not wait indefinitely for GPU readiness.

The worker reported cachedLighting=true and cachedContact=true. Hero media transferred 1,654,909 bytes on the cold run and 0 bytes on the repeat run. Content-versioned media/font URLs and hashed render-cache assets use public max-age=31536000, immutable. Editable scripts revalidate; JS/CSS/fonts are gzip compressed. Sixteen blocking CSS requests are replaced by one content-fingerprinted, compressed stylesheet (automatically rebuilt when source styles/fonts change). The cached HDR lighting includes the original six faces and six prefiltered roughness levels; contact blur is baked as a 4.85KB image. Rounded geometry and repeated magazine textures are shared. Fixed world-space shadows are rendered once; camera movement does not require a new shadow map.

The first live frame uses natural pixel resolution, upgrades at idle, and temporarily uses up to 1.25? during movement before returning to the original 1.5?2? quality. Verified at desktop 1440?900 and mobile 390?900 with deviceScaleFactor=2: entry completed in 2087ms/2024ms, rendering switched 1.25?2, no horizontal overflow or page errors. Reviewed the settled mobile rendering. Native advert natural looping, screen alignment, continuous scroll playback and hidden-screen pause/resume passed. Cold-refresh scroll/artwork/planner regression passed with a 30ms maximum main-thread timer gap in the last run. Entry reveal scheduling check recorded an 83ms worst gap in local software-rendered Chrome; reduced-motion entry completed.

Four Python cache-delivery tests cover a single fingerprinted CSS bundle, gzip + conditional 304 code delivery, video byte ranges with caching and original-view styles. Core tests passed. A dedicated entry test deliberately delays the worker to validate that the cached opening can release the intro independently.

HTTP delivery follows https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching . Async shader preparation follows the existing local Three.js compileAsync API; GPU shader programs still depend on the browser/device rather than being portable cached page files (https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
