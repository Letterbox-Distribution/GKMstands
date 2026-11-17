# Reversible scroll showcase

The new introduction is enabled by default. The planner and original hero remain in the same template.

- New version: `http://127.0.0.1:5000/`
- Original presentation: `http://127.0.0.1:5000/?view=original`
- Make the original the default: set environment variable `GKM_HOME_VIEW=original` before starting Flask. Use `?view=showcase` to preview the experiment.
- Exact pre-change copies of `app.py` and `templates/index.html` are in `docs/rollback-before-showcase/`. Copy them back to their original paths for a source rollback. The three new showcase files can then remain unused or be removed.

The experiment is isolated in `templates/showcase.html`, `static/showcase.css`, and `static/showcase.mjs`. No model geometry, rates, inventory, campaign matching, or planner logic was changed. It uses the existing stand, magazine covers, sample leaflet, airport and hotel assets. Slot selection is a visual preview only.

Motion uses native scrolling, a sticky stage, a passive listener and a single demand-driven animation frame. Rendering pauses off screen and when the tab is hidden. Reduced motion provides chapter buttons in place of a pinned scroll journey. No new runtime dependencies. WebGL failure retains the photographic fallback.

Design reference: `docs/showcase-concept.png`, generated with the built-in image tool. Prompt: clean white/navy/lime editorial GoldKey Select sticky showcase; left headline and CTA, right lounge stand; successive settings, magazine and six-pocket states. Implementation deliberately retains the actual existing screen and six-column stand geometry instead of the generated stand approximation, the supplied logo, and existing campaign planner. No generated visual is used as a fake interactive stand.

Validation: Playwright with installed Chrome (Browser plugin unavailable), 1440 × 1000 and 390 × 844. Compared concept and rendered screenshots with view_image: typography hierarchy, whitespace, white/navy/lime palette, left copy/right media composition, CTA treatment and progress navigation. Opening copy matches concept. Intentional differences: original supplied logo and navigation, existing real stand geometry and photographic backgrounds; no claim of an exact generated-scene match. Fixed early blank magazine backs, opening navigation position and mobile CTA overlap. Verified six-pocket selection, local artwork upload, hotel switch, planner focus, original view, reduced-motion navigation, no mobile horizontal overflow and zero page errors. Existing clear-flow browser suite and three core tests pass. Hardware frame-rate profiling and real phone testing have not been performed.

Preview server for this session: http://127.0.0.1:5001/ (the earlier server on 5000 must be restarted to load the new Python route).


Revision: Replaced threshold-triggered copy and instant backgrounds with continuous scroll interpolation. Both room textures blend in one WebGL shader, then dissolve into a studio setting. The camera approaches, orbits and returns to the front; magazine and leaflet meshes translate into their pockets. Copy opacity and position follow scroll progress directly. Removed the mobile chapter-dependent media jump. Explicit Enable scroll animation / Reduce motion control allows intentional opt-in when the OS requests reduced motion. Verified nine intermediate scroll positions, pinned stage position, six-slot selection, mobile overflow, reduced-motion opt-in and absence of JavaScript/shader errors using Chrome Playwright. Latest screenshot reviewed with view_image. Original-version switch remains unchanged.

## Realism and motion polish — 17 November 2026

The photographic room phase now uses a fixed perspective. The camera arc starts only after the room has dissolved into the studio, avoiding impossible motion against a flat photograph. Base projection is aligned to a consistent floor position across viewport sizes. The stand starts larger. A soft contact shadow replaces the long directional shadow. Showcase-only metal roughness, reflections, acrylic opacity and lighting were tuned; the shared stand studio is unchanged. Magazine and leaflet entrances now use a short settle and opacity envelope rather than hovering out in front of the shelves. Text transitions no longer overlap. Scroll smoothing is frame-rate independent, uses a quintic easing envelope and settles after input stops. DOM measurements and progress elements are cached outside the frame loop.

QA used local Playwright and installed Chrome because the Browser plugin is unavailable. Inspected ten desktop scroll positions at 1440 × 1000 and three mobile positions at 390 × 844 using screenshots and view_image. Verified six-slot choice, local artwork upload, planner focus, no mobile horizontal overflow, reduced-motion chapter navigation and the original view. No page or shader errors. A continuous 120-frame sweep measured median 16.7 ms and p95 17 ms rAF intervals on this machine; this is a local browser result, not a real-device performance guarantee. Five core/matching/recommendation tests pass; Python and module syntax checks pass. Latest screenshots: docs/showcase-desktop.png, docs/showcase-final.png, docs/showcase-mobile.png. Physical phone testing was not performed. The supplied stand model remains an illustrative interpretation, not measured manufacturing CAD or a photoreal film render.

## Wall placement, full stocking and video

Opening showcase now starts stocked with all 12 outer magazine facings and six central luxury leaflet examples; stock remains in place throughout scrolling. Six new fictional luxury leaflets are supplied by static/artwork/luxury-leaflet-atlas.png. Existing upload replaces the chosen central example. The shared stand renderer accepts optional leaflet textures, leaving the original stand studio behaviour intact. Airport and hotel scenes align the rear base with the photographed wall/floor junction, accounting for viewport crop. The hotel background is replaced in this showcase only by static/environments/hotel-wall-showcase.png, a clear travertine wall with no reception desk. Assets were generated with the built-in image tool: six fictional premium editorial leaflet fronts in a 3×2 atlas; and a straight-on luxury hotel wall with unobstructed centre and floor junction. Existing luxury MP4 is mapped as a live video texture on the digital screen, muted and looping. Explicit pause/play, reduced-motion behaviour, offscreen and hidden-tab pausing are supported. Original view remains available.

QA: Chrome Playwright verified advancing video time, pause/play, offscreen pause, selected-pocket upload, no console/shader errors, and mobile overflow. Desktop airport/hotel and mobile opening screenshots inspected with view_image. Five core and recommendation tests pass. Leaflet graphics are illustrative, not claimed actual advertisers or availability. Video is the existing goldkey-advert-luxury.mp4, not newly filmed footage.

## Overlaid navigation and spin sequence

The showcase frame is now a slightly darker silver-grey, applied only to showcase materials. The room image fills the opening viewport behind the logo and navigation, with a translucent white gradient supporting contrast. Header positioning is absolute for the showcase only, removing the initial header-height scroll gap. Clearance starts with the first scroll input. The stand remains aligned with the photographed wall while the setting fades into the studio; a continuous 360-degree camera orbit then shows the empty frame. Outer magazines return first. The six central A5 spaces receive a muted lime tint and numbered labels before the luxury leaflet examples return. Copy and stock use the same continuous scroll progress. Mobile uses a lower, smaller stand to keep the digital screen clear of controls. Room selectors return to the initial wall-backed view.

Validation: Playwright Chrome (Browser plugin unavailable), nine desktop scroll states at 1440×1000 plus mobile 390×844. Asserted initial showcase begins at page top, overlaid header position, first-scroll stock change, empty stock before rotation, full 360-degree turn, magazines present with central leaflet spaces empty, complete final stock, six-slot selection, planner focus, no horizontal overflow and no runtime/shader errors. Original presentation remains static with its original header; reduced-motion chapter controls pass. Five core/recommendation tests pass. Inspected opening, empty spin, numbered pockets and final mobile screenshots with view_image. This is browser validation, not a claim of physical-phone testing.

Opening-photo correction: The approved angled airport-lounge image (goldkey-airport-hero-luxury.webp) remains the opening even after WebGL finishes loading. Canvas is initially hidden. Only actual scroll progress fades the photo through a brief clean handoff into the existing animated scene; returning to the top restores the photo. Verified persistence after initial load and reload, scroll handoff and return to top with Playwright Chrome. Screenshot inspected with view_image. No runtime errors.

## Match the circled stand concept

The unchanged approved opening photograph remains visible until scroll. Sequence now fades to pure white with the stand still stocked, then clears magazines and sample leaflets, retains the turn, and ends with the six central A5 pockets numbered and highlighted. Removed automatic stock repopulation, so the explanatory final state stays clear. Uploaded artwork appears in the selected A5 pocket. The showcase-only model uses a narrower screen, slightly wider rack presentation, warmer silver finish, larger desktop scale and a modest angled view to approximate the supplied design concept. This is an interpreted live 3D model rather than an exact reconstruction of the photographic image. Removed the room switch controls from the white-stage explanation.

Verified with Playwright Chrome at 1440×1000 and 390×844: opening image persistence, stocked white stage, removal, rotation, empty final state and all-six highlight, chosen-pocket upload, no mobile overflow, and no page/shader errors. Inspected white stage, final highlights and mobile screenshots with view_image. Five core/recommendation tests pass. Original rollback remains available.

## One premium model throughout

Following the user's choice to retain the full spin, both the initial lounge and white studio now use the exact same live model, camera, projection, pose and lighting. There is no longer a photographic-stand-to-CAD handoff. Only the background fades to white on the first scroll; stock clears afterwards. The original baked-in stand was removed from the room using the built-in image tool to create static/environments/lounge-clean-plate.png. Prompt: remove only stand, screen, magazines and base; preserve lounge architecture, camera, plants, furniture and lighting; reconstruct bare wall and floor. Loading posters at desktop and mobile sizes were captured directly from this renderer, replacing the unrelated photographic stand during startup.

The model is a dedicated replacement, static/stand-reference.mjs: 1,340 mm width, 1,860 mm height, 380 mm base depth, 480×750 mm screen and shelves at 870/550/230 mm. These are inferred concept dimensions, not confirmed manufacturing measurements. A4/A5 paper sizes remain unscaled. Supporting drawing: docs/stand-reference-v2.svg and machine-readable concept dimensions: docs/stand-reference-v2.json. Added 18 individual acrylic holders with full-height backs, folded lips, side walls and fine polished rims; bevelled silver frame, layered shallow base, fixings, physically based metal/acrylic finishes and an environment containing daylight, warm panels and photographic reflections. Materials are held consistent through the room/studio change.

QA: Playwright Chrome fallback (Browser plugin unavailable), desktop 1440×1000, mobile 390×844. Asserted same canvas identity and camera angle at zero, tiny first-scroll, partial and completed background fade; no canvas opacity handoff, 18 holders, selected-pocket artwork, screen pause, reduced-motion A5 reveal, mobile loading poster and no overflow, original version and no page/shader errors. Continuous scroll cadence: median 16.7 ms, p95 16.8 ms locally. Five core/recommendation tests and module syntax checks pass. Inspected room, white, empty holders, mobile and dimension drawing screenshots with view_image. Physical phones and other browser engines remain untested. The live stand is a reference reconstruction; it is now identical to itself across the transition, rather than claimed pixel-identical to the old generated photographic stand.

## Framing correction

Reduced the live desktop stand's visual scale by approximately 24 percent (camera distance 4.65 rather than 3.55), with a consistent camera radius through the room-to-white transition. Narrow desktop/tablet layouts increase distance to avoid crowding the text. Moved the desktop base anchor from 92 to 86 percent of the media height; mobile uses a slightly smaller scale and 92 percent anchor. Loading posters now scale by height and the same responsive camera framing, rather than object-fit cover enlarging the model on wide screens. Regenerated both loading posters from the current renderer. The poster wrapper is fully hidden when WebGL is ready, including its background.

Chrome Playwright checks: 1440×1000, 1920×1080, 1366×768, 820×1180 and 390×844. Reviewed room/white screenshots and loading/live comparisons with view_image. Camera angle remains unchanged across environment transition; no horizontal overflow or page/shader errors. Five core/recommendation tests pass. Physical devices remain untested.

## Stable refresh and floor contact

Normal startup no longer displays a separate stand poster. It shows a brief preparation state, then presents only the fully framed live render. Posters are reserved for WebGL failure. The first presented animation frame uses current target progress directly. Root refreshes without a hash disable native scroll restoration and start at the hero, avoiding a restored mid-sequence animation. Corrected the room's vertical crop so its floor is behind, rather than below, the stand feet. Feet now meet y=0, with individual foot shadows and a tightly fitted rectangular contact texture under the shallow base. The broad detached shadow was replaced.

Validated a delayed cold load, initial pose stability over 1.5 seconds, reload from the final chapter resetting to scroll position zero and progress zero without a camera change, desktop and mobile floor contact and no page/shader errors using Playwright Chrome. Screenshots inspected with view_image. Five core/recommendation tests and syntax checks pass. Original presentation remains separate.

## Edition identity, A5 focus and material refinement

The final shot now stays angled and smoothly zooms toward the six central A5 pockets. A native SVG Your Edition template is present by default and moves between all six positions using either the labelled buttons or direct raycast clicks on the 3D pockets. Upload replaces it. Final framing crops the screen away so the rack close-up stays clear of text and mobile controls. Renamed zoom state to avoid a collision with the planner's data-focus click handler.

GoldKey Edition is now one line. The logo composes the original GoldKey artwork and key motif, carefully masking only the former select line while retaining the descending y; Edition uses lighter companion lettering. The key and UI accents use walnut brown. Header and navigation are fixed at the top with translucent backing. The original view keeps its previous identity and layout. The leaflet template also uses the corrected Edition name.

Polished steel now uses lower roughness, neutral cooler metal, anisotropy and refined environment reflections. Holders use optically clear transmission (1.0), zero roughness, no tint/absorption, 1.5 mm reference thickness and subtle rims. Background is rendered in the same scene so it participates in the transmission pass. Clear material bypasses the mismatched tone mapping that previously greyed the white background. Lens changed to 25 degrees with matching camera distance to reduce perspective exaggeration, and alignment follows the wall more closely. Removed coincident base faces, corrected tiny bevel limits and separated rim depth to address the reported base flashing.

Verified with Playwright Chrome: all six buttons move default template; direct 3D top-right pocket click moves it; uploaded artwork moves; no global click-handler errors; fixed header, cleaned logo, original view and mobile width pass. Inspected logo, room, white, close-up and mobile screenshots. Latest clear-material scroll sweep: median 16.7 ms, p95 33.4 ms locally (some frames take longer than one refresh; no physical phone test). Five core/recommendation tests and module syntax checks pass. Material properties checked against the official Three.js MeshPhysicalMaterial docs. Source image remains a generated photograph, so wall alignment is visually calibrated rather than surveyed camera geometry.

## Realism, in-place dissolve, bar artifacts and final-only template

Four magazine sources (Vogue, Bazaar, GQ and Traveller) now use 2,000-pixel publisher assets, with provenance in static/magazines/hires/sources.json. Desktop paper textures are 2,048 pixels wide; mobile uses 1,024 to limit memory. Tatler's available original remains 970 pixels; ELLE remains 432 pixels because the alternative publisher file was only 400 pixels. No artificial upscale is presented as new source detail. Render sampling is at least 1.5 device pixels per CSS pixel, capped at 2, with maximum supported anisotropic filtering.

Steel roughness and anisotropy were reduced, reflection cards refined and static steel edges bevelled. Repeated static geometry is batched by material to reduce draw calls. Shader variants are warmed before first presentation. Magazine and leaflet contents now remain fixed in their holders and dissolve in place, as requested; there is no upward translation.

The white patches on uprights were isolated by comparing an identical angle with the clear panels disabled. Screen-space refraction was re-sampling thin steel edges incorrectly. The final thin-sheet glass uses direct cube-environment Fresnel reflections blended over the actual scene instead of screen-space refraction; this retains clear reflections without breaking up the bars. Colour processing is consistent across the backdrop, steel and glass. This is a thin-sheet reflection approximation, not volumetric refraction. Closely inspected angled bar screenshots show continuous metal instead of the white fragments.

Your Edition is hidden in the opening and intermediate shots. A luxury example occupies its opening slot; the template appears only during the final A5 close-up, still movable among all six positions. Verified opening, stocked white state, empty intermediate state and final template using Playwright Chrome and view_image. Six-position movement, mobile layout and no runtime errors passed in browser; five core/recommendation tests and module syntax checks passed. Frame timing varied with the local browser load, so no universal 60 fps claim is made for this revision. The latest camera-led alternative transition is a recommendation only; the implemented removal remains the user's in-place dissolve until changed.


## Camera-led reveal and continuous client row

The camera-led reveal now replaces the magazine dissolve: outer titles remain fixed in their holders while the lounge fades to white and a restrained camera arc moves toward the six A5 positions. Only the centre leaflet examples clear before the final template appears. Zoom stops at progress .78, when Your Edition begins appearing, and stays fixed to the end; this makes the final framing approximately 10% smaller than the previous full close-up. Bottom-right caption and video text control are hidden as requested. The fixed header and six-position template interaction remain.

Client logos now occupy one automatically scrolling row moving left to right, with edge fades and equal-width duplicate groups for an uninterrupted loop. Hover or keyboard focus pauses the row; reduced-motion preference provides a static, manually scrollable single group. Offscreen animation pauses.

Verified using Playwright Chrome (Browser plugin unavailable) at 1440x1000 and 390x844: scroll sequence, unchanged zoom from .78 to .99, all six template buttons, continuous rightward logo motion, hidden bottom-right overlays, no page overflow and no runtime/console errors. Screenshots inspected for desktop final, mobile final and Clients row. Original fallback route remains available. Physical phone/GPU testing remains outstanding.


## Architectural opening

Replaced the photographic lounge backdrop with camera-correct 3D limestone wall, matte stone floor, fine panel joints and a restrained walnut reveal. Procedural micrograin avoids loading another background photograph. Wall and floor share the stand camera; steel and screen cast directional shadows onto them, with the existing foot contact shadow retained. Lighting uses a soft warm key and neutral studio reflection cards rather than the former lounge photograph. The wall and floor gradually wash to white during the opening scroll, then disappear once fully white. Final camera framing, template controls and client marquee remain unchanged.

Lounge rollback: restore static/showcase.mjs from docs/rollback-before-showcase/showcase-before-architectural.mjs. Original route also remains available.


## Content margins restored

The animated showcase and fixed masthead now share the Clients section container: maximum 1,208 px, desktop side gutters 56 px, tablet 30 px and mobile 18 px. The surrounding page is white. Hero copy and bottom navigation align with this container, with small additional mobile control padding. The sticky scroll timeline, camera framing and interactive template remain in place. Playwright Chrome desktop/mobile sequence and six-slot interaction checks rerun; screenshots inspected for opening and mobile layout.


Moved the walnut reveal inward to retain the earlier composition inside the narrower content column. A 52 px right-edge mask (20 px on mobile) blends the scene into the white gutter instead of ending at a hard rectangle. Opening screenshot inspected; desktop/mobile scroll and template checks rerun.


## Full-bleed setting with aligned content

Supersedes the constrained scene and edge mask above: the architecture now extends to both viewport edges again. Removed the right-edge fade that visually boxed in the room and restored the walnut reveal to its earlier position. Header, chapter copy and chapter navigation retain the Clients column alignment using responsive gutters (maximum 1,208 px content width). The scene itself remains uninterrupted.


## Campaign planner polish

The showcase is considered complete for now. New planner refinements are isolated in planner-polish.css and planner-polish.mjs, loaded only for the showcase home. Six visible campaign choices replace the opening dropdown in that view; they dispatch the existing selection event and retain the underlying form value. Selected state and keyboard focus follow the choices. Existing audience, budget, duration, city and pricing logic remains.

Improved hierarchy, readable form labels, open white layout, warm brown map controls and suggestion/review surfaces. Review hides the duplicate sticky review CTA; Back to my locations now closes the review section. Review shows readable position labels instead of internal stand IDs. Once the suggested plan is selected, the empty-suggestion message acknowledges the saved selection rather than telling the user to adjust a successful brief. Mobile review heading and back control stack.

QA: Playwright Chrome at localhost:5001 (Browser plugin unavailable), full campaign -> ?500 / 2 weeks -> ?420 suggested selection -> review -> back, fresh mobile flow, focus on start, progressive fields, hidden review state, 150 example dots and no page overflow at 390/768/1024/1440 widths. No page errors. Screenshots inspected for start, selected brief, map/suggestions, desktop and mobile review. Five core/recommendation tests pass; module syntax checks pass. Real booking/payment/live inventory remain outside this prototype. Screenshot evidence saved in the system temporary folder as planner-*.png.


## Refresh, environment chapter, margins and text

The architectural environment now stays visible through In good company (progress .26) and eases completely to white from .30 to .48, rather than disappearing before that chapter. Same live stand/camera, no scene swap. This is the architectural wall/floor setting, not a furnished photographic lounge.

All primary content gutters are halved, including the extra whitespace at large viewports: at 1440 px, 58 px each side instead of 116 px. The showcase remains full bleed. Map profile width is 380 px desktop with larger, darker body text and clearer statistics. Try your artwork is now a 46 px / 15 px text button (44 px / 14 px mobile); supporting text, pocket buttons and small labels are larger. Mobile chapter/footer navigation separates the auxiliary links to avoid crowding.

Refresh work: optimized WebP derivatives retain original source dimensions; poster reduced from 1.36 MB to 67 KB, leaflet atlas from 2.71 MB to 318 KB. Showcase uses optimized covers directly instead of loading originals then replacements. Removed redundant default model/environment build, second reference build and blocking shader-variant warm-up. Added performance marks for assets/environment/build/first frame. Raw cold WebGL initialization remains variable and was not reliably improved in software Chrome (about 7-10 seconds in later runs, compared with 3.8-5.9 seconds in earlier runs with a narrower scene); do not claim first-visit speedup. Instead, a session-scoped exact opening-frame snapshot provides a matching visible preview on same-size refresh while live WebGL initializes. No mismatched photograph or camera pose. Snapshot is only captured at opening progress, checks viewport dimensions/version, and is removed with the first live frame. Last measured refresh preview: 982 ms. First visit, changed viewport and disabled session storage still wait for live initialization.

Verified Chrome desktop/mobile scroll sequence and all six pockets, no runtime errors; environment .26 fully present / .55 white; half margins at 1440; artwork button 15 px; refresh preview shown then removed at live frame. Larger mobile artwork controls screenshot inspected. Planner flow with wider margins passed at 390/768/1024/1440. Asset sources and original full-quality files preserved.


## First-visit immediate opening

Replaced the session-only snapshot with eager, high-priority responsive WebP opening renders captured from the actual scene: desktop 104 KB, wide 127 KB, mobile 34 KB. They are server-delivered HTML images, visible without waiting for Three.js, WebGL, video, session storage or magazine textures. Preloads are placed before stylesheets. The matching live canvas crossfades over 200 ms once its first frame exists; poster and live positions were compared at 1440x1000 and 390x844. The old session snapshot script is removed.

Startup uses 1000-pixel cover previews, then replaces maps in place with high-resolution textures after presentation; no geometry rebuild or camera change. Steel uses the standard PBR metal shader with the same metalness, roughness and environment reflection settings, avoiding unused physical-coating machinery. Glass remains the custom thin-sheet reflection shader. Removed transparent shader switches from opaque magazine stock. Video begins after first live presentation. A one-time parallel compiler experiment did not improve timings and was removed.

Cold-cache Chrome test: image visible in 853 ms desktop, 561 ms mobile. Live WebGL first frame still took about 10.3 s desktop and 5.3 s mobile in this software-rendered environment; do not describe interactive 3D itself as instant. The image avoids the blank startup on first visits as well as refreshes. Checked image-to-live handover, final pocket selection on both viewports, no overflow and no page errors. Screenshots compared visually. Preview captures must be refreshed if opening geometry/camera/setting changes. Other viewport aspect ratios use nearest responsive image and can differ slightly until handover.


## Camera-aligned preload and selected-leaflet pulse

Fixed the stretched opening-image handover: replaced viewport-shaped previews with panoramic renders captured from the same live scene. Preserve their intrinsic aspect ratio, anchor at 71% desktop / 50% mobile, and scale height using the same camera framing radius and foot anchor. Most landscape desktop and mobile camera radii are constant, so this maps directly; narrower tablet aspect ratios use the radius compensation, with a small residual perspective difference possible because camera pitch also varies. Do not claim pixel-identical rendering at every viewport. Compared opening/live screenshots at 1887x900 and 390x844: stand dimensions and position match visually. Preload both responsive source images and Three module dependencies. Browser-side WebGL initialization remains separate from network preloading.

Added a quiet 3.6-second brown breathing halo around the selected Your Edition print in the final reveal. A non-interactive SVG projects the actual four leaflet corners from the current camera; CSS handles the pulse without adding a WebGL render loop. It moves with the chosen pocket and uploaded artwork, stays hidden before the template reveal and uses a static faint outline under reduced-motion preference or the page motion control. Desktop/mobile checks passed for final-only visibility, polygon movement to bottom-right, retained template placement and reduced motion; no page errors. Screenshots in system temp: matched-opening-*, matched-live-* and edition-pulse-*.


The In good company chapter briefly introduces hotel and airport photographic context via showcase-venues.mjs. Images load on approach rather than during entry. Wall sampling uses the same camera and wall plane as the opening architecture; the physical floor stays continuous. A soft left-to-right reveal moves between venues, then returns to white before the A5 reveal. Stand geometry, camera framing and native screen-video overlay remain shared throughout.


Current venue treatment: a single hotel-wall-showcase.webp setting is retained. The airport setting and room-to-room wipe have been removed. A longer eased blend introduces the hotel from progress .09?.24, holds briefly and returns to white over .32?.49, with subtle lateral drift and reversible scroll control.


### Cached preparation and two-second entry target

The intro targets approximately two seconds including its exit fade. Graphics, media fetch/decode and video buffering start in parallel with the composited logo reveal. Entry releases to the existing matching high-resolution opening even if GPU compilation is still pending, then hands over to the same live stand. The design and camera dimensions remain shared; reduced-motion handling remains available.

`cached-lighting.mjs` loads the baked HDR reflection faces/PMREM levels and the worker loads a baked contact shadow. Runtime procedural lighting/shadow generation remains as a fallback if cache assets cannot load. `scripts/bake-lighting.cjs` and `scripts/bake-contact-shadow.cjs` reproduce those assets using local Chrome; update loader filenames if a rebake produces new hashes. No new runtime packages were added.

Run `node scripts/build-asset-versions.cjs` after changing the covered magazine images, cinematic video/poster, leaflet atlas, hotel setting or fonts. It updates `static/asset-url.mjs` with content hashes so browser media caches refresh correctly. The stylesheet bundle is generated automatically by Flask from the ordered source CSS files and font fingerprints. Keep editable JS/CSS on revalidation; only content-versioned URLs should receive long immutable lifetimes. The original view remains at `/?view=original`.

Rendering keeps geometry/texture duplicates shared, reuses the fixed shadow map and changes framebuffer resolution only at movement/idle boundaries. Full quality returns after scrolling. The native advert continues to use browser video decoding/compositing and buffers during entry. Venue photography is warmed after the first hero frame at idle, rather than blocking entry or first scroll.

Validation: `npm run test:hero`, `npm run test:video`, `npm run test:entry`, `npm run test:cache`. Cold GPU compilation remains device dependent; browser asset caching and baked lighting remove repeat work but do not persist a live WebGL context through a full page refresh.
