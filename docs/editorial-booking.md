# Editorial homepage and campaign requests

The main homepage now runs: existing showcase, client-logo marquee, Gold Key Media introduction, A5 service explanation, then a campaign CTA. The 3D showcase, adaptive video and two-second entry treatment are retained. `/plan` (also `/booking`) contains the new three-step campaign request flow. `/?view=original` retains the previous page.

The booking journey is **Your campaign → Your locations → Review & request**. It supports six A5 positions per location, photos, numbered brown map pins with city grouping, optional artwork, editable selections, over-budget messaging, a fixed review bar, a saved reference and a printable receipt. Refreshing the receipt does not submit another request. Campaign drafts use session storage; contact details are not stored in the browser draft.

Requests are stored privately in `instance/booking-requests.sqlite3`, including optional artwork. The server calculates the quote from inventory rather than trusting a submitted price, checks placements and files, and prevents duplicate submissions using a request key. This is a request queue for human confirmation, not a reservation or payment system. Current venues/rates remain illustrative and are labelled in the booking flow. No automatic email notification or payment integration is configured.

Review the queue with `python -m flask --app app booking-requests`. Inspect one request with `python -m flask --app app booking-requests --reference GKE-...`. Set `GKM_BOOKING_DB` to use another private database and `GKM_SECRET_KEY` to keep form signing stable between server restarts. Do not put the database or customer artwork in `static/`; `instance/` is git-ignored. Browser QA uses an isolated temporary database.

## Visual specification and comparison

Concept references: `docs/designs/edition-about.png`, `edition-service.png`, `edition-booking.png`. The built-in image generation tool created these concepts and the editorial photography. The existing brand mark was preserved as native SVG. Final assets are `static/editorial/hotel-editorial-{600,1100}.webp` and `a5-editorial-{600,1100}.webp`; all are lazy-loaded below the showcase. No generated screenshot is used as page UI.

Browser plugin not available; used Playwright with local Chrome. Compared the concept references and latest implementation screenshots using `view_image`. Checked 1440×1000 desktop plus 390×900, 768×900 and 1024×900 responsive layouts. The generated concept images are 1488×1056; the responsive CSS retains the existing site's gutters and header rather than copying a flattened screenshot.

Comparison ledger:

- **Copy and hierarchy:** about/service headings and their short copy match the selected concepts. Booking title, six campaign types and the three journey labels match. No invented statistics or testimonials were added. Company positioning was checked against [Gold Key Media's official about page](https://www.gkml.co.uk/about-us/).
- **Layout:** retained the asymmetric about section and reversed service composition; reduced the initial excessive photo/text gap and moved editorial headings higher to match the references. Client logos immediately follow the showcase.
- **Typography:** Manrope and the existing brand mark remain; new section headings and form legends use clearer 600-weight type. Primary UI text is 15–18px, with larger section headings. The concept's oversized raster text was translated to the site's existing readable type scale.
- **Palette:** pure white, dark brown-black, medium brown controls, thin beige rules, and the chocolate closing strip. No green selection/confirmation UI.
- **Imagery:** separately generated magazine/hospitality photographs reproduce the visual direction without cutting UI from a concept image. They are responsive WebP assets with reserved dimensions, lazy loading and natural material colour.
- **Controls and states:** brown circled checks identify selections; six physical A5 positions are available even where old fixtures only supplied three shelf rates. City grouping removes overlapping country-level map pins. Review/confirmation states have clear totals, optional artwork and no payment fields.
- **Spacing/responsiveness:** fixed the currency-prefix overlap, kept the progress row sticky, reset confirmation scroll to show its heading, and verified no horizontal overflow at tested widths. Mobile uses a stacked editorial layout and an on-demand map.

Intentional differences from the generated concepts: the established GoldKey logo and header remain exact; the initial campaign/budget/date are not preselected with invented customer values; final photos are separately generated assets in the same direction; typography follows the existing site scale. The implementation was visually checked against the selected concepts, with these intentional adaptations. No unresolved blocking layout or interaction mismatch was found.

## Verification

- Real browser request/receipt/refresh path passed against a temporary SQLite queue.
- Updated `tests/clear-flow.cjs`: homepage order, separate campaign page, missing-brief validation, six positions, over-budget selection, failed-request retry, receipt refresh and responsive widths.
- Updated `tests/hero-loading.cjs`: preserved stand upload/selection, new booking handoff, and return to the showcase; local maximum main-thread timer gap was 28ms in that run.
- `tests/booking_requests_test.py`: server pricing, over-budget requests, duplicate prevention/idempotency, invalid data, CSRF/origin checks, verified artwork and six-position inventory; six tests passed.
- Existing cache-delivery tests passed; legacy original route still returns successfully.

## Image generation prompts

Built-in tool, not API/CLI fallback. The three UI concepts requested the complete About, Service/CTA and Booking-step-one surfaces, using pure white, Manrope, `#302b27` text, `#75543e` controls, thin beige rules and the exact implemented headings. They explicitly prohibited green controls, invented metrics/testimonials and default card grids on the homepage.

Final hotel photograph prompt:

> Photorealistic luxury hospitality editorial photograph only, no website UI, no words, no logos. Portrait 4:5 composition for a GoldKey Edition website. A tranquil premium hotel reception with warm travertine, walnut, ivory boucle chairs and soft afternoon sunlight. Foreground right a perfectly crafted walnut console with a restrained brass lamp, ceramic vase and a neat pair of high-end architecture/travel magazines laid flat, subtle realistic print detail but no recognizable titles. Strong beautiful real material textures, professional architectural photography, inviting quiet space, natural perspective, elegant lighting, no orange filter, no people, no stand. Composition balances reception depth at left with editorial magazine detail at lower right. Modern understated hospitality, not excessive opulence.

Final A5 photograph prompt:

> Photorealistic close-up editorial product photograph only, no website UI, no text, no logos. Portrait 4:5 composition for GoldKey Edition. A small neat stack of premium A5 portrait leaflets with an understated botanical photograph on the cover, resting in a very clear slim acrylic holder on a walnut reception console. Beside it a carefully aligned stack of glossy architecture and travel magazines with beautiful neutral landscape covers and unbranded spines. Brushed polished steel lamp detail on left, a simple glass vase with green leaves behind. Soft afternoon window shadows across the warm walnut. Tactile beautiful paper edges, completely clear acrylic, premium material realism, tasteful professional commercial photography, minimal composition, no invented magazine logos or readable words.

Final sign-off also checked the exact generated-concept viewport, 1488x1056, on the main preview at port 5001. About, service and booking screenshots were captured there and reviewed alongside the concept references. The final main-preview booking flow and delayed-worker intro checks passed; the latter completed in 2018ms. All ten Python booking/cache tests passed.
