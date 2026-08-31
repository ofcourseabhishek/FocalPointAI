# Read overlays atlas v1

Generated with the built-in ImageGen tool using `read-photo.jpg` as a reference image.

## Prompt

Create one square 3-column by 2-row atlas containing six editorial photographic-analysis overlays aligned to the same portrait storefront photograph. In reading order: composition guides and restrained brackets; light direction with translucent highlight and shadow shapes; color sampling marks; focus-plane brackets; a subject-attention path; and a quieter intent synthesis combining composition, light, and subject relationships. Use exact museum-catalog photography markup with warm-ivory hairlines, muted amber and cool slate accents, tiny dots, and understated brackets. Place the overlay artwork on a perfectly flat pure-black background for CSS `screen` blending. Include no text, labels, tile borders, logos, or watermark. Avoid neon HUD graphics, object-detection boxes, reticles, heatmaps, futuristic AI styling, and decorative noise.

## Production alignment

The original atlas is retained unchanged. `scripts/prepare-read-overlays.mjs` crops its six tiles, resizes and positions the existing artwork against the photograph's awning and doorway, and preserves the color swatches with a separate crop. The calibrated outputs live in `overlays/`; no replacement artwork is drawn or generated. Run the script from `apps/landing-page` with `node scripts/prepare-read-overlays.mjs` to reproduce the assets and a composite contact sheet in `.tmp/`.
