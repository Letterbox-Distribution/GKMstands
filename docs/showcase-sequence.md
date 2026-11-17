# Scroll animation rendering

The editable Three.js stand remains the source. Normal scrolling now uses prerendered frames; the worker renderer starts only for slot selection, direct pocket clicks or artwork uploads. `/?live=1` forces live rendering for comparison. `/?renderer=main` retains the older compatibility path.

The approved studio, partial turn, materials, magazine covers and six A5 spaces are retained. The digital advert is decoded separately but painted into the same canvas as the stand, using the captured screen projection. It has no separately moving DOM overlay. Changing the advert does not require rebuilding the stand sequence.

## Rebuild after a model, lighting or camera change

Start Flask at `http://127.0.0.1:5001`, install the Python requirements and Node development dependencies, then run:

```
npm run build:showcase
```

Set `BASE_URL` if the server uses another address. Set `PYTHON` to a Python executable with Pillow if needed. Chrome must be installed. The script drives the actual OffscreenCanvas worker at 181 exact progress values, waits for each rendered frame and captures WebP at 2x resolution. Desktop logical size is 1440 x 910; mobile is 390 x 912. All six cover textures load before capture, at up to 2048 pixels. Shadows retain a 2048-pixel map.

The encoder validates every frame's dimensions and presence, creates individual seek previews plus a compact seek atlas, and atomically publishes `static/showcase-sequence/manifest.json`. A failed capture/validation does not replace the previous manifest. Revision directories and versioned frame URLs permit persistent browser caching. Commit the new revision and manifest together; remove obsolete revisions only after confirming no published manifest needs them.

Text, controls, layouts, booking logic, uploaded artwork and advert content remain editable without this rebuild. Renders take several minutes locally; actual duration depends on the GPU and encoder.

## Loading and memory

The first frame loads immediately. A small atlas provides a position-correct preview anywhere in the timeline; nearby seek images refine motion, and full-resolution images replace previews when scrolling settles. This is progressive refinement, not a lower-resolution master. The complete high-resolution sequence is not downloaded on entry. Current-frame requests take priority, obsolete requests are cancelled, and decoded images are evicted under a 72 MiB cache budget including the atlas. HTTP cache retains compressed assets independently.

Rapid movement can briefly show a softer preview while the exact high-resolution frame arrives. Slow connections still affect refinement. The atlas is an intentional small download covering the whole motion so arbitrary jumps never depend on having visited that position before.

Live interaction initializes behind the current frame and replaces it only after the matching camera position renders. The sequence cache is then released. Navigation terminates workers, closes bitmaps and removes listeners; bfcache returns reload the cached page without replaying the entry logo. Missing manifests use live rendering; missing exact/seek frames can activate the live fallback. Reduced-motion controls remain available.

## Verification

```
npm run test:sequence
npm run benchmark:showcase
```

The sequence regression covers phone/desktop, forward/reverse jumps, full-resolution settling, memory limits, artwork uploads, slot changes and missing-manifest fallback. Existing campaign and hero tests remain relevant. Benchmarks write their raw results to the operating system temporary directory, not the repository.

Benchmark measurements use headless Chrome, DPR 2, a cold HTTP cache, 240 animation-frame-driven scroll steps with forward/reverse movement and jumps. Reported frame rate measures browser animation-frame responsiveness, not physical GPU presentation FPS. JavaScript heap excludes external bitmap/GPU memory; decoded image memory is reported separately. Browser network counters do not include every worker request, so they must not be used as a complete live-renderer transfer comparison. Responsiveness latency samples may be sparse during continuous movement; do not overinterpret their percentiles. Physical iPhone/Android hardware and Safari have not been tested.

Visual comparisons use matching camera positions on desktop and mobile. Small differences arise from WebP compression, image resampling, scroll quantization and the independently timed advert. Source geometry, textures and lighting are shared rather than approximated in a second model.

## Local measurements, 17 November 2026

Raw results: [showcase-benchmark-2026-11-17.json](showcase-benchmark-2026-11-17.json). These are one local run, not physical-phone or production guarantees.

- Desktop browser frame rate: 31.1 to 54.1 FPS. Mean frame time: 32.17 to 18.49 ms, a 42.5% reduction. The 95th percentile fell from 66.7 to 33.4 ms; delayed frames over 25 ms fell from 108/240 to 25/240.
- Mobile viewport browser frame rate: 28.0 to 59.7 FPS. Mean frame time: 35.68 to 16.75 ms, a 53.1% reduction. The 95th percentile fell from 83.3 to 16.9 ms; delayed frames fell from 118/240 to 2/240.
- Sequence visual readiness: 473 ms desktop and 359 ms mobile, before the approximately two-second first-visit brand reveal. Live readiness in this run was 3983 ms and 1978 ms respectively.
- Frame-player 95th-percentile response latency was 4.1 ms, with 234 desktop and 228 mobile samples. Live response samples were sparse (five/six), so their approximately 65 ms values are indicative rather than a robust percentile comparison.
- The decoded frame cache stayed below 72 MiB. JS heap was approximately 4.2 MB desktop and 3.8 MB mobile; these numbers exclude the image cache and GPU allocations.
- Recorded sequence transfers across the whole test were 11.5 MB desktop and 10.3 MB mobile, including video and page resources. Those are not entry-only downloads. Full high-resolution assets on disk total approximately 50 MiB desktop and 22 MiB mobile; each visitor loads a subset.

The Browser plugin was unavailable; verification used installed Playwright with Chrome. Core arithmetic/recommendation tests (five cases), Python booking/cache tests (ten), hero loading, separate campaign flow, branded entry and hybrid-interaction regressions passed. Cold hero scroll timer gaps were at most 31 ms in the regression run.

Eight settled viewport comparisons (four progress positions on each viewport) had mean absolute channel differences of 0.68 to 2.05 on the 0-255 scale. See `showcase-visual-check-2026-11-17.json`. Full-quality frame indices were checked before capture; the visible stand geometry, framing and artwork matched.
