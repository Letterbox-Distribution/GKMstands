# Scroll animation rendering

The editable Three.js stand remains the source. Normal scrolling uses an independently seekable H.264 motion cache, generated from the approved 2x renders. It does not initialize the 3D worker. The cached opening appears immediately; the lightweight native decoder prepares during the first-visit entry. When the entry is skipped, it uses the first decoded frame directly rather than forcing a pre-roll delay.

Scroll progress chooses the pose; the movie does not play through independently. Input is eased over 55 ms, and pending seeks are coalesced to the newest target. Each decoded frame is pinned with a VideoFrame where supported and painted with its matching screen projection into one canvas. The digital advert pauses during active scrolling and resumes after 180 ms of rest, keeping its last frame attached to the moving stand.

Slot selection or artwork upload initializes the live worker behind the cached pose and swaps only after it matches that exact position. Queued artwork actions then apply. Steel, glass, magazine covers, framing and six A5 spaces retain the same editable source. The live camera moves around a stationary stand so its 2048-pixel shadows can be reused.

`/?live=1` forces direct live startup. `/?frames=1&images=1` exercises the legacy WebP player without automatic live warmup. `/?renderer=main` retains the compatibility renderer. Missing or unsupported motion media falls back to the WebP player and live renderer. System reduced-motion preferences remain supported.

## Rebuild after model, lighting or camera changes

Start Flask at `http://127.0.0.1:5001`, install the Python and Node dependencies, and provide FFmpeg on PATH or set `FFMPEG_PATH`. Then run:

```
npm run build:showcase
```

Set `BASE_URL` for another server address and `PYTHON` for another Python executable. Chrome is required for capture. The script captures 181 deterministic poses from the actual worker at 2x resolution: 2880 x 1820 desktop and 780 x 1824 mobile. Cover textures remain up to 2048 pixels. Every WebP is checked for dimensions and nonblank content.

The encoder produces native-size H.264 with every frame independently decodable, plus native-size compressed WebP fallback frames. It pipes one source frame at a time to bound encoding memory. The manifest publishes atomically after both variants succeed. Motion URLs include a content hash; HTTP caching and range requests support repeated visits and seeking without rebuilding the stand on each page load.

Text, controls, booking logic, uploaded artwork and advert content remain editable without rebuilding the stand. Model or camera changes require the capture command; encoding an existing capture alone uses `python scripts/showcase_motion_encode.py static/showcase-sequence/<revision>`.

## Loading, resolution and memory

Motion and settled frames retain the same 2x dimensions; motion never substitutes a thumbnail. A high-quality WebP replaces a settled video pose. The motion files are approximately 23.2 MiB desktop and 7.7 MiB mobile. The browser can progressively buffer the movie and may preload the remaining data; first display does not require the entire file. The reverse direction uses the same seekable movie.

Normal scrolling no longer fetches and decodes a series of individual WebPs. One pinned motion frame is retained at a time and closed when replaced. Native video buffering is browser managed. The separate decoded WebP fallback cache remains bounded at 72 MiB, with an 8 MiB compressed prefetch cache. Those limits exclude browser media buffers, the drawing canvas and GPU allocations.

Navigation closes pinned frames, disposes the decoder and terminates any live worker. Hidden pages pause decoding. The first-visit entry remains approximately two seconds and is independent of graphics compilation; same-tab returns skip it.

## Verification

```
node tests/showcase-wheel.cjs
npm run test:sequence
npm run test:hero
npm run test:entry
```

The wheel regression starts measuring on the very first gesture, with a cold HTTP cache. It covers desktop and phone widths, both first entry and skipped entry, forward/reverse input and fast movement. It asserts visible pose updates and that the 3D worker is not requested. It does not wait for a renderer warmup before measuring.

The latest immediate-scroll run measured longest moving holds of 100/117 ms at 1440 px (first/skipped entry), and 50/67 ms at 390 px. These are local headless Chrome results, not guarantees for every device or connection. The earlier warmed-renderer result alone was insufficient evidence for initial scrolling. The Browser plugin was unavailable, so checks use installed Playwright with Chrome. Physical phones and Safari have not been tested.

Image fallback, native resolution, matching live handover, artwork uploads, resizing, navigation and the two-second entry have separate regressions. `npm run benchmark:showcase` compares direct live rendering, legacy images and native motion; page rAF alone does not establish visible stand smoothness.

## Original image-player measurements, 17 November 2026

These historical page-rAF measurements did not prove that the visible stand changed every frame. Actual wheel recordings subsequently exposed image-delivery holds of up to 917 ms. An intermediate live-renderer trial reduced holds after takeover to about 33 ms, but its graphics startup still competed with initial scrolling. The native motion cache described above supersedes that trial and is tested from the first gesture, including when the entry is skipped.

The earlier measurements follow for reference:

Raw results: [showcase-benchmark-2026-11-17.json](showcase-benchmark-2026-11-17.json). These are one local run before the subsequent native-resolution motion-frame refinement, not physical-phone or production guarantees.

- Desktop browser frame rate: 31.1 to 54.1 FPS. Mean frame time: 32.17 to 18.49 ms, a 42.5% reduction. The 95th percentile fell from 66.7 to 33.4 ms; delayed frames over 25 ms fell from 108/240 to 25/240.
- Mobile viewport browser frame rate: 28.0 to 59.7 FPS. Mean frame time: 35.68 to 16.75 ms, a 53.1% reduction. The 95th percentile fell from 83.3 to 16.9 ms; delayed frames fell from 118/240 to 2/240.
- Sequence visual readiness: 473 ms desktop and 359 ms mobile, before the approximately two-second first-visit brand reveal. Live readiness in this run was 3983 ms and 1978 ms respectively.
- Frame-player 95th-percentile response latency was 4.1 ms, with 234 desktop and 228 mobile samples. Live response samples were sparse (five/six), so their approximately 65 ms values are indicative rather than a robust percentile comparison.
- The decoded frame cache stayed below 72 MiB. JS heap was approximately 4.2 MB desktop and 3.8 MB mobile; these numbers exclude the image cache and GPU allocations.
- Recorded sequence transfers across the whole test were 11.5 MB desktop and 10.3 MB mobile, including video and page resources. Those are not entry-only downloads. Full high-resolution assets on disk total approximately 50 MiB desktop and 22 MiB mobile; each visitor loads a subset.

The Browser plugin was unavailable; verification used installed Playwright with Chrome. Core arithmetic/recommendation tests (five cases), Python booking/cache tests (ten), hero loading, separate campaign flow, branded entry and hybrid-interaction regressions passed. Cold hero scroll timer gaps were at most 31 ms in the regression run.

Eight settled viewport comparisons (four progress positions on each viewport) had mean absolute channel differences of 0.68 to 2.05 on the 0-255 scale. See `showcase-visual-check-2026-11-17.json`. Full-quality frame indices were checked before capture; the visible stand geometry, framing and artwork matched.

Follow-up: location cards now centre and highlight their venue on the booking map, including a deferred map opened on mobile. `node tests/booking-map-focus.cjs` verifies two locations on both layouts. Native-resolution scrolling is asserted in `test:sequence`; thumbnails are rejected by the player.


## Continuous camera path

`static/showcase-motion.mjs` is the shared camera choreography for both the worker and compatibility renderer. The viewing angle advances continuously across the full scroll range, including the final A5 view. Zoom approaches the existing maximum with zero terminal velocity rather than being abruptly clamped mid-movement. Scroll input uses a short 55 ms easing response; it does not autoplay when the visitor stops scrolling. The cached frames are captured from the same path. `node tests/showcase-motion.test.mjs` checks uninterrupted angular movement, a non-reversing zoom and the original final size/angle.
