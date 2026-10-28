import assert from 'node:assert/strict';
import test from 'node:test';
import { __testables, getResultMediaAspectRatio, getResultReadModel } from './result-read.js';

function frameWork(model, id) {
  return model.frameWorks.find((category) => category.id === id);
}

test('returns the natural media aspect ratio only for positive finite dimensions', () => {
  assert.equal(getResultMediaAspectRatio(4032, 3024), 4 / 3);
  assert.equal(getResultMediaAspectRatio('1080', '1920'), 9 / 16);

  for (const [width, height] of [[0, 100], [100, 0], [-1, 100], [100, -1], [Infinity, 100], [100, NaN], ['invalid', 100], [100, null]]) {
    assert.equal(getResultMediaAspectRatio(width, height), null);
  }
});

test('contains portrait and landscape media without cropping either axis', () => {
  const portrait = __testables.getContainTransform(600, 520, 1080, 1920);
  assert.equal(portrait.height, 520);
  assert.ok(portrait.width < 600);
  assert.equal(portrait.top, 0);
  assert.ok(portrait.left > 0);
  assert.equal(portrait.width / portrait.height, 9 / 16);

  const landscape = __testables.getContainTransform(600, 520, 1920, 1080);
  assert.equal(landscape.width, 600);
  assert.ok(landscape.height < 520);
  assert.equal(landscape.left, 0);
  assert.ok(landscape.top > 0);
  assert.equal(landscape.width / landscape.height, 16 / 9);
});

test('uses canonical score, genre, and written read values', () => {
  const model = getResultReadModel({
    score_engine: { overall: 84.4 },
    context: { primary_genre: 'Street photography' },
    read: 'The reflected light gives the frame a calm, deliberate center.',
    aspects: { composition: { what_could_be_improved: 'Give the left edge a little more room to breathe.' } },
  });
  assert.equal(model.score, 84);
  assert.equal(model.genre, 'Street photography');
  assert.match(model.read.primary, /reflected light/);
  assert.match(model.read.supporting, /left edge/);
});

test('falls back to legacy result fields and clamps fallback score', () => {
  const model = getResultReadModel({
    overall_rating: 12,
    primary_genre: 'Portrait',
    first_impression: 'A direct, intimate portrait.',
    aspects: { focus: { what_works: 'The eye holds crisply.' } },
  });
  assert.equal(model.score, 100);
  assert.equal(model.genre, 'Portrait');
  assert.equal(model.read.primary, 'A direct, intimate portrait.');
  assert.equal(model.read.supporting, 'The eye holds crisply.');
});

test('normalizes base64 overlays and only exposes light when it is spatial', () => {
  const model = getResultReadModel({
    advanced_cv: { saliency_map_b64: 'abc', focus_map_b64: 'data:image/png;base64,def' },
    overlays: { light: { base64: 'ghi' } },
  });
  assert.equal(model.evidence.attention, 'data:image/jpeg;base64,abc');
  assert.equal(model.evidence.focus, 'data:image/png;base64,def');
  assert.equal(model.evidence.light, 'data:image/jpeg;base64,ghi');
  assert.equal(getResultReadModel({ image_statistics: { highlight_clipping: 4 } }).evidence.light, '');
});

test('accepts future array overlay records with data URL assets', () => {
  const model = getResultReadModel({
    overlays: [{ type: 'attention', data: 'data:image/webp;base64,abc' }],
  });
  assert.equal(model.evidence.attention, 'data:image/webp;base64,abc');
});

test('retains normalized future spatial overlay shapes', () => {
  const model = getResultReadModel({
    overlays: { composition: [{ type: 'bbox', x: 0.2, y: 0.3, width: 0.4, height: 0.3 }] },
  });
  assert.deepEqual(model.evidence.shapes.composition, [{ kind: 'bbox', x: 0.2, y: 0.3, width: 0.4, height: 0.3 }]);
});

test('splits a long read into two grounded paragraphs', () => {
  const model = getResultReadModel({
    first_impression: 'The low afternoon light carries the frame, holding the cyclist apart from the dense background while the diagonal pavement keeps the image moving toward the open corner.',
  });
  assert.match(model.read.primary, /The low afternoon light/);
  assert.ok(model.read.supporting.length > 0);
  assert.ok(model.read.primary.split(/\s+/).length < 27);
  assert.match(__testables.splitRead('First sentence. Second sentence.').remainder, /Second sentence/);
});

test('normalizes only real composition geometry', () => {
  const model = getResultReadModel({
    advanced_cv: {
      horizon: { line: [[0, 0.4], [1, 0.42]] },
      subject_centering: { centroid: [0.62, 0.51] },
      composition: { leading_lines: { lines: [{ start: [0.1, 0.9], end: [0.6, 0.5] }] } },
    },
  });
  assert.equal(model.evidence.geometry.leadingLines.length, 1);
  assert.deepEqual(model.evidence.geometry.horizon, { start: { x: 0, y: 0.4 }, end: { x: 1, y: 0.42 } });
  assert.deepEqual(model.evidence.geometry.centroid, { x: 0.62, y: 0.51 });
  assert.equal(__testables.assetUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
});

test('surfaces only normalized backend-provided rule-of-thirds geometry', () => {
  const model = getResultReadModel({
    advanced_cv: {
      composition: {
        rule_of_thirds: {
          grid_lines: { horizontal: [0.333, 0.667], vertical: [0.333, 0.667] },
          intersections: [{ x: 0.333, y: 0.333 }, [0.667, 0.667]],
        },
      },
    },
  });

  assert.deepEqual(model.evidence.geometry.ruleOfThirds, {
    horizontal: [0.333, 0.667],
    vertical: [0.333, 0.667],
    intersections: [{ x: 0.333, y: 0.333 }, { x: 0.667, y: 0.667 }],
  });
  assert.equal(frameWork(model, 'composition').hasSpatialEvidence, true);
  assert.deepEqual(getResultReadModel({}).evidence.geometry.ruleOfThirds, { horizontal: [], vertical: [], intersections: [] });
});

test('rejects malformed or non-normalized rule-of-thirds geometry without defaults', () => {
  const model = getResultReadModel({
    advanced_cv: {
      composition: {
        rule_of_thirds: {
          grid_lines: { horizontal: [-0.1, 0.333, 1.1, false, ' '], vertical: 'invalid' },
          intersections: [{ x: -0.1, y: 0.333 }, { x: 0.333, y: 1.1 }, { x: 0.667, y: 0.667 }, { x: false, y: 0.333 }],
        },
      },
    },
  });

  assert.deepEqual(model.evidence.geometry.ruleOfThirds, {
    horizontal: [0.333],
    vertical: [],
    intersections: [{ x: 0.667, y: 0.667 }],
  });
});

test('resolves canonical category evidence IDs without selecting overlays by prose or layer fallback', () => {
  const model = getResultReadModel({
    frame_work: { composition: { evidenceIds: ['only-this'], interpretation: 'Canonical composition read.' } },
    overlays: [
      { id: 'only-this', layer: 'unrelated', type: 'bbox', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      { id: 'other', layer: 'composition', type: 'point', x: 0.8, y: 0.5 },
    ],
  });
  const composition = frameWork(model, 'composition');
  assert.equal(composition.evidence.shapes.length, 1);
  assert.deepEqual(composition.evidence.shapes[0], { kind: 'bbox', x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
  assert.equal(composition.interpretation, 'Canonical composition read.');
});

test('keeps canonical composition evidence separate from unrelated global geometry', () => {
  const model = getResultReadModel({
    frame_work: { composition: { evidenceIds: ['crop-boundary'] } },
    overlays: [{ id: 'crop-boundary', type: 'bbox', x: 0.1, y: 0.1, width: 0.7, height: 0.7 }],
    advanced_cv: {
      horizon: { line: [[0, 0.4], [1, 0.4]] },
      subject_centering: { centroid: [0.8, 0.2] },
      composition: { leading_lines: { lines: [{ start: [0, 1], end: [1, 0] }] } },
    },
  });
  const composition = frameWork(model, 'composition');
  assert.equal(composition.evidence.shapes.length, 1);
  assert.deepEqual(composition.evidence.geometry, { leadingLines: [], horizon: null, centroid: null, ruleOfThirds: { horizontal: [], vertical: [], intersections: [] } });
  assert.equal(composition.hasSpatialEvidence, true);
  assert.equal(composition.evidenceMode, 'spatial');
});

test('uses current structural category fallbacks where canonical evidence IDs are absent', () => {
  const model = getResultReadModel({
    aspects: { composition: { what_works: 'The crop holds together.' }, details: { what_works: 'Fine detail remains visible.' } },
    overlays: [{ layer: 'composition', type: 'point', x: 0.4, y: 0.4 }],
    advanced_cv: { focus_map_b64: 'focus-data' },
  });
  assert.equal(frameWork(model, 'composition').evidence.shapes.length, 1);
  assert.equal(frameWork(model, 'composition').interpretation, 'The crop holds together.');
  assert.equal(frameWork(model, 'focus').evidence.asset, 'data:image/jpeg;base64,focus-data');
});

test('does not invent visual hierarchy score or prose without explicit category data', () => {
  const model = getResultReadModel({
    score_engine: { categories: { composition: 92 } },
    aspects: { composition: { what_works: 'The frame has a clear anchor.' } },
  });
  const hierarchy = frameWork(model, 'visualHierarchy');
  assert.equal(hierarchy.score, null);
  assert.equal(hierarchy.scoreLabel, '');
  assert.equal(hierarchy.interpretation, 'No visual-hierarchy reading was returned for this photograph.');
});

test('normalizes supplied hex palette values only', () => {
  const model = getResultReadModel({ frame_work: { color: { paletteLabels: ['Cool field', 'Warm edge'] } }, advanced_cv: { color_palette: ['#abc', '#123456', 'warm orange', '#bad-value'] } });
  assert.deepEqual(frameWork(model, 'color').palette, ['#abc', '#123456']);
  assert.deepEqual(frameWork(model, 'color').paletteLabels, ['Cool field', 'Warm edge']);
  assert.deepEqual(frameWork(model, 'composition').palette, []);
  assert.deepEqual(__testables.normalizePalette({ colors: [{ hex: '#FEDCBA' }, { color: 'blue' }] }), ['#FEDCBA']);
});

test('treats palette color and global post-processing reads as non-spatial evidence', () => {
  const model = getResultReadModel({
    frame_work: {
      color: { interpretation: 'The palette stays restrained.' },
      post_processing: { interpretation: 'Contrast is applied globally.' },
    },
    overlays: [{ layer: 'color', type: 'bbox', x: 0.1, y: 0.1, width: 0.3, height: 0.3 }],
    advanced_cv: { color_palette: ['#123456', '#abcdef'] },
  });
  const color = frameWork(model, 'color');
  const technical = frameWork(model, 'technical');
  assert.equal(color.hasSpatialEvidence, false);
  assert.equal(color.evidenceMode, 'palette');
  assert.equal(color.descriptor, 'Extracted palette');
  assert.equal(technical.hasSpatialEvidence, false);
  assert.equal(technical.evidenceMode, 'global');
  assert.equal(technical.descriptor, 'Global observation');
});

test('uses the brief category order and six-part numbering for the complete Visual Breakdown', () => {
  const model = getResultReadModel({});
  assert.deepEqual(model.frameWorks.map((category) => category.id), ['composition', 'light', 'focus', 'color', 'visualHierarchy', 'technical']);
  assert.deepEqual(model.frameWorks.map((category) => category.label), ['Composition', 'Lighting', 'Focus', 'Color', 'Subject', 'Final technical']);
  assert.deepEqual(model.frameWorks.map((category) => category.sequence), ['01/06', '02/06', '03/06', '04/06', '05/06', '06/06']);
});

test('supports documented bbox left-top-right-bottom and legacy width-height forms', () => {
  assert.deepEqual(__testables.normalizedShape({ type: 'bbox', bbox: { left: 0.2, top: 0.1, right: 0.8, bottom: 0.5 } }), { kind: 'bbox', x: 0.2, y: 0.1, width: 0.6, height: 0.4 });
  assert.deepEqual(__testables.normalizedShape({ type: 'bbox', x: 0.2, y: 0.1, width: 0.6, height: 0.4 }), { kind: 'bbox', x: 0.2, y: 0.1, width: 0.6, height: 0.4 });
});

test('rejects malformed geometry instead of fabricating origin evidence', () => {
  assert.equal(__testables.normalizedShape({ type: 'point', x: null, y: null }), null);
  assert.equal(__testables.normalizedShape({ type: 'point', x: ' ', y: 0.2 }), null);
  assert.equal(__testables.normalizedShape({ type: 'bbox', x: false, y: 0.1, width: 0.3, height: 0.4 }), null);
  assert.equal(__testables.line([[null, 0.2], [0.8, 0.2]]), null);

  const model = getResultReadModel({
    frame_work: {
      composition: { evidenceIds: ['bad-point'], interpretation: 'A supplied read.' },
      visual_hierarchy: { evidenceIds: ['bad-bbox'], interpretation: 'A supplied hierarchy read.' },
    },
    overlays: [
      { id: 'bad-point', layer: 'composition', type: 'point', x: '', y: 0.3 },
      { id: 'bad-bbox', layer: 'attention', type: 'bbox', x: false, y: 0.1, width: 0.3, height: 0.4 },
    ],
  });

  assert.equal(frameWork(model, 'composition').hasSpatialEvidence, false);
  assert.equal(frameWork(model, 'visualHierarchy').hasSpatialEvidence, false);
});

test('keeps light evidence unavailable when no structural light layer exists', () => {
  const model = getResultReadModel({ image_statistics: { highlight_clipping: 4 } });
  assert.equal(frameWork(model, 'light').evidence.asset, '');
  assert.equal(frameWork(model, 'light').evidence.shapes.length, 0);
});

test('treats an intentional not-applicable category as neutral absence', () => {
  const model = getResultReadModel({ frameWorks: { focus: { status: 'not_applicable', reason: 'No focus assessment was requested.' } }, score_engine: { categories: { focus: 99 } } });
  const focus = frameWork(model, 'focus');
  assert.equal(focus.score, null);
  assert.equal(focus.interpretation, 'Not applicable to this photograph.');
  assert.equal(focus.supporting, 'No focus assessment was requested.');
});

test('respects an intentional-absence focus treatment without scoring it as a fault', () => {
  const model = getResultReadModel({ frame_work: { focus: { status: 'intentional_absence', reason: 'The soft focus is part of the image intent.' } }, score_engine: { categories: { focus: 24 } } });
  const focus = frameWork(model, 'focus');
  assert.equal(focus.score, null);
  assert.equal(focus.scoreLabel, '');
  assert.equal(focus.interpretation, 'This treatment is intentional for the photograph.');
  assert.equal(focus.supporting, 'The soft focus is part of the image intent.');
});

test('drops a category supporting line that repeats its interpretation', () => {
  const model = getResultReadModel({ frameWorks: { composition: { interpretation: 'Centering works.', supporting: 'Centering works. ' } } });
  assert.equal(frameWork(model, 'composition').interpretation, 'Centering works.');
  assert.equal(frameWork(model, 'composition').supporting, '');
});

test('reads horizon, subject offset, symmetry and negative space into geometry facts', () => {
  const model = getResultReadModel({ advanced_cv: {
    horizon: { detected: true, angle: -2.34 },
    subject_centering: { offset_x: -0.18, offset_y: 0.04 },
    composition: { symmetry_patterns: { horizontal_symmetry_score: 61.6, vertical_symmetry_score: 40 }, negative_space: { percentage: 45.2 } },
  } });
  assert.deepEqual(model.measuredEvidence.geometry.map((item) => [item.label, item.value]), [
    ['Horizon tilt', '2.3°'],
    ['Subject offset', '18% left, 4% down'],
    ['Left-right symmetry', '62/100'],
    ['Top-bottom symmetry', '40/100'],
    ['Negative space', '45.2%'],
  ]);
  const noHorizon = getResultReadModel({ advanced_cv: { horizon: { detected: false, angle: null } } });
  assert.deepEqual(noHorizon.measuredEvidence.geometry, []);
});

test('keeps absent and null scores unavailable instead of coercing them to zero', () => {
  for (const value of [undefined, null, '', '   ', false]) {
    const model = getResultReadModel({ score_engine: { overall: value, categories: { visual_hierarchy: value } } });
    assert.equal(model.score, null);
    assert.equal(frameWork(model, 'visualHierarchy').score, null);
    assert.equal(frameWork(model, 'visualHierarchy').scoreLabel, '');
  }
  assert.equal(getResultReadModel({ score_engine: { overall: 0 } }).score, 0);
});

test('selects the strongest category in the center reading zone', () => {
  const entry = (category, intersectionRatio, isIntersecting = true) => ({ isIntersecting, intersectionRatio, target: { dataset: { category } } });
  assert.equal(__testables.centeredCategory([entry('composition', 0.2), entry('light', 0.7), entry('color', 1, false)]), 'light');
  assert.equal(__testables.centeredCategory([entry('composition', 0, false)]), null);
  assert.equal(__testables.readingZoneCategory([{ category: 'composition', top: 90, bottom: 500 }, { category: 'light', top: 610, bottom: 990 }], 320), 'composition');
  assert.equal(__testables.readingZoneCategory([{ category: 'composition', top: -400, bottom: -20 }, { category: 'light', top: 90, bottom: 500 }], 320), 'light');
});

test('keyboard evidence navigation skips unavailable tabs and wraps', () => {
  const tabs = ['image', 'attention', 'light', 'focus', 'composition'];
  const available = { image: true, attention: false, light: true, focus: false, composition: true };
  assert.equal(__testables.nextAvailableTab(tabs, available, 'image', 'ArrowLeft'), 'composition');
  assert.equal(__testables.nextAvailableTab(tabs, available, 'image', 'ArrowRight'), 'light');
  assert.equal(__testables.nextAvailableTab(tabs, available, 'light', 'End'), 'composition');
  assert.equal(__testables.nextAvailableTab(tabs, available, 'composition', 'Home'), 'image');
  assert.equal(__testables.nextAvailableTab(tabs, available, 'image', 'Enter'), null);
});

test('normalizes the complete measured-evidence payload without converting measurements into scores', () => {
  const histogram = Array.from({ length: 24 }, (_, index) => index * 4);
  const model = getResultReadModel({
    image_statistics: {
      dimensions: '4032x6048',
      brightness: { value: 0.47 },
      sharpness: { value: 286.4, level: 'Medium' },
      luminance_histogram: histogram,
      shadow_clipping_percent: 0.6,
      highlight_clipping_percent: 1.4,
    },
    advanced_cv: {
      focus_map_b64: 'focus-map',
      color_palette: [{ hex: '#123456', percentage: 61.5 }, { hex: '#abcdef', percentage: 38.5 }],
    },
    exif_analysis: { camera_settings: { focal_length: '35 mm', aperture: 'f/2.8', shutter_speed: '1/250 s', iso: 400, camera: 'Test Camera', color_profile: 'Display P3' } },
    measured_evidence: { focus: { primary_area: 'Central texture' } },
  });
  assert.deepEqual(model.measuredEvidence.tonal.histogram, histogram);
  assert.deepEqual(model.measuredEvidence.tonal.metrics, [
    { label: 'Mean luminance', value: '0.47' },
    { label: 'Shadow clipping', value: '0.6%' },
    { label: 'Highlight clipping', value: '1.4%' },
  ]);
  assert.equal(model.measuredEvidence.focus.map, 'data:image/jpeg;base64,focus-map');
  assert.deepEqual(model.measuredEvidence.focus.metrics, [
    { label: 'Sharpness index', value: '286.4' },
    { label: 'Detail level', value: 'Medium' },
    { label: 'Primary area', value: 'Central texture' },
  ]);
  assert.deepEqual(model.measuredEvidence.palette, [{ hex: '#123456', percentage: 61.5 }, { hex: '#abcdef', percentage: 38.5 }]);
  assert.equal(model.measuredEvidence.capture.hasSettings, true);
  assert.deepEqual(model.measuredEvidence.capture.settings.map((item) => item.value), ['35 mm', 'f/2.8', '1/250 s', 'ISO 400']);
  assert.deepEqual(model.measuredEvidence.capture.supplemental, [
    { label: 'Camera', value: 'Test Camera' },
    { label: 'Color profile', value: 'Display P3' },
    { label: 'Dimensions', value: '4032x6048' },
  ]);
});

test('preserves measured zero values and supports legacy clipping aliases', () => {
  const zeroModel = getResultReadModel({ image_statistics: { brightness: { value: 0 }, shadow_clipping_percent: 0, highlight_clipping_percent: 0 } });
  assert.deepEqual(zeroModel.measuredEvidence.tonal.metrics, [
    { label: 'Mean luminance', value: '0.00' },
    { label: 'Shadow clipping', value: '0%' },
    { label: 'Highlight clipping', value: '0%' },
  ]);
  const legacyModel = getResultReadModel({ image_statistics: { shadow_clipping: 2.5, highlight_clipping: 3 } });
  assert.deepEqual(legacyModel.measuredEvidence.tonal.metrics, [
    { label: 'Shadow clipping', value: '2.5%' },
    { label: 'Highlight clipping', value: '3%' },
  ]);
});

test('keeps malformed measured data unavailable and renders intentional capture absence', () => {
  const model = getResultReadModel({
    image_statistics: { dimensions: '1600x900', luminance_histogram: [1, 2, 3], sharpness: { value: 'not-a-number' } },
    advanced_cv: { color_palette: [{ hex: 'orange', percentage: 50 }, { hex: '#abc', percentage: 'not-a-number' }] },
    exif_analysis: null,
  });
  assert.deepEqual(model.measuredEvidence.tonal.histogram, []);
  assert.deepEqual(model.measuredEvidence.focus.metrics, []);
  assert.deepEqual(model.measuredEvidence.palette, [{ hex: '#abc', percentage: null }]);
  assert.equal(model.measuredEvidence.capture.hasSettings, false);
  assert.deepEqual(model.measuredEvidence.capture.supplemental, [{ label: 'Dimensions', value: '1600x900' }]);
});

test('describes flat tonal data without inventing a dominant region', () => {
  const model = getResultReadModel({ image_statistics: { luminance_histogram: Array(24).fill(50) } });
  assert.equal(model.measuredEvidence.tonal.interpretation, 'Tonal weight is distributed across shadows, midtones, and highlights; clipping is listed separately.');
});

test('rejects invalid CSS hex lengths in measured palettes', () => {
  assert.deepEqual(__testables.normalizeMeasuredPalette(['#abc', '#abcd', '#abcde', '#abcdef', '#abcdefg', '#abcdef12']), [
    { hex: '#abc', percentage: null },
    { hex: '#abcd', percentage: null },
    { hex: '#abcdef', percentage: null },
    { hex: '#abcdef12', percentage: null },
  ]);
});

test('keeps legacy overview action strings compatible while leaving structured fields empty', () => {
  const model = getResultReadModel({
    overview: {
      keep: [{ label: 'Color restraint', text: 'The palette stays controlled.' }, 'Tonal separation'],
      change_one_thing: 'Give the illuminated edge more room.',
      try_this_next: 'Make three variations using the same light.',
    },
  });
  assert.deepEqual(model.overviewActions, {
    keep: [{ label: 'Color restraint', text: 'The palette stays controlled.' }, { label: 'Tonal separation', text: '' }],
    change: { action: 'Give the illuminated edge more room.', category: 'General', observation: '', consequence: '' },
      tryThisNext: { status: 'unavailable', title: 'Practice Session', instruction: 'Make three variations using the same light.', supporting: '', variations: [], closing: '' },
  });
  assert.deepEqual(getResultReadModel({}).overviewActions, {
    keep: [], change: { category: 'General', action: '', observation: '', consequence: '' }, tryThisNext: { status: 'unavailable', title: 'Practice Session', instruction: '', supporting: '', variations: [], closing: '' },
  });
});

test('normalizes structured overview actions into the presentation contract', () => {
  const model = getResultReadModel({
    overview: {
      keep: [{ label: 'Color restraint', text: 'The palette stays controlled.' }, { label: 'Tonal structure', text: 'Light remains contained.' }, { label: 'Ignored', text: 'A third strength.' }],
      change_one_thing: { text: 'Give the illuminated edge more room.', detail: 'The current crop creates useful tension.', why: 'More space keeps the asymmetry intentional.' },
      try_this_next: {
        kicker: '02 / FRAMING',
        title: 'CONTROL THE EDGE',
        text: 'Make three versions of the same photograph.',
        supporting: 'Change only the relationship between the bright edge and the frame.',
        steps: [{ label: 'TIGHT', text: 'Crop closer to the edge.' }, 'Keep the current tension.', { label: 'OPEN', description: 'Give the light more room.' }, { label: 'IGNORED', text: 'A fourth step.' }],
        closing: 'Compare which version creates the strongest visual tension.',
      },
    },
  });
  assert.deepEqual(model.overviewActions, {
    keep: [{ label: 'Color restraint', text: 'The palette stays controlled.' }, { label: 'Tonal structure', text: 'Light remains contained.' }],
    change: { category: 'General', action: 'Give the illuminated edge more room.', observation: 'The current crop creates useful tension.', consequence: 'More space keeps the asymmetry intentional.' },
      tryThisNext: { status: 'ready', title: 'CONTROL THE EDGE', instruction: 'Make three versions of the same photograph.', supporting: 'Change only the relationship between the bright edge and the frame.', variations: [{ label: 'TIGHT', instruction: 'Crop closer to the edge.' }, { label: '', instruction: 'Keep the current tension.' }, { label: 'OPEN', instruction: 'Give the light more room.' }], closing: 'Compare which version creates the strongest visual tension.' },
  });
});

test('ignores malformed structured overview fields without inventing action content', () => {
  const model = getResultReadModel({
    overview: {
      keep: [{ label: '', text: 'No visible label.' }, null],
      change_one_thing: { detail: 42, why: false },
      try_this_next: { kicker: {}, title: 2, text: [], supporting: null, steps: [{ label: 'Missing text' }, 42, '   '], closing: [] },
    },
  });
  assert.deepEqual(model.overviewActions, {
    keep: [{ label: '', text: 'No visible label.' }],
    change: { category: 'General', action: '', observation: '', consequence: '' },
    tryThisNext: { status: 'unavailable', title: 'Practice Session', instruction: '', supporting: '', variations: [], closing: '' },
  });
});

test('grounds overview fallbacks in aspect strengths and distinct suggested edits', () => {
  const model = getResultReadModel({
    aspects: {
      colour: { what_works: 'The palette is cohesive.' },
      composition: { what_works: 'The edge balance holds.' },
      focus: { what_works: 'Detail remains visible.' },
    },
    suggested_edits: [{ text: 'Move the bright edge inward.' }, { text: 'Try a lower viewpoint.' }],
  });
  assert.deepEqual(model.overviewActions.keep, [
    { label: 'Color', text: 'The palette is cohesive.' },
    { label: 'Composition', text: 'The edge balance holds.' },
  ]);
  assert.equal(model.overviewActions.change.action, 'Move the bright edge inward.');
  assert.equal(model.overviewActions.tryThisNext.instruction, 'Try a lower viewpoint.');
});

test('makes canonical contract fields first-class while preserving tutorial metadata', () => {
  const model = getResultReadModel({
    metadata: { width: 4000, height: 3000 },
    overview: { summary: 'A canonical overview summary.' },
    analysis: {
      overall_score: 78,
      categories: {
        composition: { score: 65, summary: 'The subject is close to the edge.', metrics: [{ id: 'rule_of_thirds', label: 'Rule of thirds', score: 65 }] },
        lighting: { score: 81, summary: 'The light remains controlled.' },
        subject: { score: 75, summary: 'The subject is clearly separated.' },
      },
    },
    visual_breakdown: { evidence: [{ id: 'subject-box', category: 'subject', type: 'region', x: 0.2, y: 0.1, width: 0.4, height: 0.5, source: 'local_cv', confidence: 0.91 }] },
    learning_next: [],
    tutorials: [{ id: 'thirds-1', title: 'Rule of Thirds', url: 'https://youtube.com/watch?v=abc', video_id: 'abc', thumbnail_url: 'https://img.example/abc.jpg', thumbnail_fallback_url: 'https://img.example/abc-fallback.jpg', channel: 'Photo Lab', topic: 'Composition', matched_metric_ids: ['rule_of_thirds'], priority: 1 }],
    diagnostics: {},
    overall_rating: 1,
  });
  assert.equal(model.score, 78);
  assert.equal(model.read.primary, 'A canonical overview summary.');
  assert.equal(frameWork(model, 'light').score, 81);
  assert.equal(frameWork(model, 'visualHierarchy').evidence.annotations[0].source, 'local_cv');
  assert.equal(model.evidence.layers.attention.shapes.length, 1);
  assert.deepEqual(model.measuredEvidence.whatToLearnNext[0], {
    id: 'thirds-1', title: 'Rule of Thirds', creator: 'Photo Lab', duration: '', thumbnail: 'https://img.example/abc.jpg', thumbnailFallback: 'https://img.example/abc-fallback.jpg', url: 'https://youtube.com/watch?v=abc', category: 'Composition', reason: '', learning_goal: 'Rule of Thirds', priority: 1, priority_label: 'START HERE', helps_with: ['rule_of_thirds'],
  });
});

test('maps compatibility tutorial paths, YouTube links, tiers, and duplicate protection', () => {
  const model = getResultReadModel({
    tutorial_recommendations: [
      { id: 'a', title: 'Start here', youtube_link: 'https://youtube.com/watch?v=a', priority: 1 },
      { id: 'a-repeat', title: 'Repeated URL', url: 'https://youtube.com/watch?v=a', priority: 2 },
      { id: 'b', title: 'Explore', url: 'https://youtube.com/watch?v=b', priority: 2 },
      { id: 'c', title: 'Deeper', url: 'https://youtube.com/watch?v=c', priority: 3 },
      { id: 'd', title: 'Final', url: 'https://youtube.com/watch?v=d', priority: 4 },
      { id: 'e', title: 'Too many', url: 'https://youtube.com/watch?v=e', priority: 5 },
    ],
  });
  assert.equal(model.measuredEvidence.whatToLearnNext.length, 4);
  assert.deepEqual(model.measuredEvidence.whatToLearnNext.map((item) => item.title), ['Start here', 'Explore', 'Deeper', 'Final']);
  assert.deepEqual(model.measuredEvidence.whatToLearnNext.map((item) => item.priority_label), ['START HERE', 'THEN EXPLORE', 'OPTIONAL DEEPER DIVE', 'OPTIONAL DEEPER DIVE']);
});

test('adapts array categories and canonical mask and region evidence from the backend', () => {
  const model = getResultReadModel({
    metadata: {},
    overview: {
      summary: 'Canonical result.',
      change_one_thing: { label: 'Rule of Thirds' },
      try_this_next: ['Place the subject nearer an intersection.'],
    },
    analysis: {
      overall_score: 64,
      categories: [
        { id: 'composition', label: 'Composition', score: 61, evidence_ids: ['grid'] },
        { id: 'focus', label: 'Focus', score: 44, evidence_ids: ['focus-mask'] },
        { id: 'subject', label: 'Subject', score: 70, evidence_ids: ['face'] },
      ],
    },
    visual_breakdown: { evidence: [
      { id: 'grid', category: 'composition', type: 'grid', source: 'derived', horizontal: [1 / 3, 2 / 3], vertical: [1 / 3, 2 / 3] },
      { id: 'focus-mask', category: 'focus', type: 'mask', source: 'local_cv', data_url: 'data:image/jpeg;base64,abc' },
      { id: 'face', category: 'subject', type: 'region', source: 'local_cv', region: [0.2, 0.1, 0.4, 0.5] },
      { id: 'palette', category: 'color', type: 'palette', source: 'local_cv', palette: [{ hex: '#123456', percentage: 60 }, { hex: '#abcdef', percentage: 40 }] },
      { id: 'histogram', category: 'lighting', type: 'histogram', source: 'local_cv', values: Array(24).fill(25) },
    ] },
    learning_next: [], tutorials: [], diagnostics: {},
  });

  assert.equal(frameWork(model, 'composition').score, 61);
  assert.equal(frameWork(model, 'focus').score, 44);
  assert.equal(frameWork(model, 'focus').evidence.asset, 'data:image/jpeg;base64,abc');
  assert.equal(model.measuredEvidence.focus.map, 'data:image/jpeg;base64,abc');
  assert.deepEqual(frameWork(model, 'color').palette, ['#123456', '#abcdef']);
  assert.deepEqual(model.measuredEvidence.palette, [{ hex: '#123456', percentage: 60 }, { hex: '#abcdef', percentage: 40 }]);
  assert.deepEqual(model.measuredEvidence.tonal.histogram, Array(24).fill(25));
  assert.deepEqual(frameWork(model, 'visualHierarchy').evidence.shapes, [{ kind: 'bbox', x: 0.2, y: 0.1, width: 0.4, height: 0.5 }]);
  assert.equal(model.overviewActions.change.action, 'Rule of Thirds');
  assert.equal(model.overviewActions.tryThisNext.instruction, 'Place the subject nearer an intersection.');
});

test('enforces that a metric maps its observation over legacy detail', () => {
  const model = getResultReadModel({
    analysis: {
      categories: [
        {
          id: 'composition',
          metrics: [
            {
              label: 'Subject centered',
              value: 'Yes',
              observation: 'New explicit observation',
              detail: 'Legacy detail'
            }
          ]
        }
      ]
    }
  });
  const comp = frameWork(model, 'composition');
  assert.equal(comp.metrics[0].observation, 'New explicit observation');
});

test('asserts that tryThisNext yields either an array of 3 variations or unavailable', () => {
  const modelUnready = getResultReadModel({
    overview: {
      try_this_next: {
        variations: [{ label: '1', instruction: 'a' }, { label: '2', instruction: 'b' }]
      }
    }
  });
  assert.equal(modelUnready.overviewActions.tryThisNext.status, 'unavailable');

  const modelReady = getResultReadModel({
    overview: {
      try_this_next: {
        variations: [{ label: '1', instruction: 'a' }, { label: '2', instruction: 'b' }, { label: '3', instruction: 'c' }]
      }
    }
  });
  assert.equal(modelReady.overviewActions.tryThisNext.status, 'ready');
});

test('normalizes explicit diagnostic modes', () => {
  const model = getResultReadModel({
    visual_breakdown: {
      diagnostic_modes: [
        { id: '1', category: 'focus', supported: true, available: true, representation: 'asset', fallback_representations: ['geometry'] },
        { id: '2', category: 'color', supported: true, available: false, unavailable_reason: 'No color' }
      ]
    }
  });
  assert.equal(model.diagnosticModes.length, 2);
  assert.equal(model.diagnosticModes[0].loadState, 'idle');
  assert.deepEqual(model.diagnosticModes[0].fallbackRepresentations, ['geometry']);
  assert.equal(model.diagnosticModes[1].loadState, 'unavailable');
  assert.equal(model.diagnosticModes[1].unavailableReason, 'No color');
});

test('ignores out-of-range evidence and maps contained image coordinates without letterboxing drift', () => {
  const model = getResultReadModel({
    metadata: {}, overview: {}, analysis: { overall_score: 50, categories: {} }, learning_next: [], tutorials: [], diagnostics: {},
    visual_breakdown: { evidence: [
      { category: 'focus', type: 'region', x: 0.8, y: 0.2, width: 0.3, height: 0.2 },
      { category: 'focus', type: 'point', x: 0.7, y: 0.4, source: 'gemini' },
    ] },
  });
  assert.deepEqual(frameWork(model, 'focus').evidence.shapes, [{ kind: 'point', x: 0.7, y: 0.4 }]);
  assert.equal(frameWork(model, 'focus').evidence.annotations[0].source, 'gemini');
  assert.deepEqual(__testables.getContainTransform(1200, 600, 600, 1200), { left: 450, top: 0, width: 300, height: 600, scale: 0.5 });
  assert.deepEqual(__testables.getContainTransform(600, 1200, 1200, 600), { left: 0, top: 450, width: 600, height: 300, scale: 0.5 });
});

test('youtubeThumbnail derives the public thumbnail from any YouTube URL shape', () => {
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  assert.equal(__testables.youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'), thumb('dQw4w9WgXcQ'));
  assert.equal(__testables.youtubeThumbnail('https://youtu.be/dQw4w9WgXcQ?si=abc'), thumb('dQw4w9WgXcQ'));
  assert.equal(__testables.youtubeThumbnail('https://www.youtube.com/embed/dQw4w9WgXcQ'), thumb('dQw4w9WgXcQ'));
  assert.equal(__testables.youtubeThumbnail('https://youtube.com/shorts/dQw4w9WgXcQ'), thumb('dQw4w9WgXcQ'));
  assert.equal(__testables.youtubeThumbnail('https://www.youtube.com/results?search_query=focus'), '');
  assert.equal(__testables.youtubeThumbnail('https://vimeo.com/123456'), '');
  assert.equal(__testables.youtubeThumbnail(''), '');
});

test('lessons without a supplied thumbnail fall back to the YouTube one', () => {
  const [lesson] = __testables.normalizeLearningPath([{ title: 'Exposure basics', url: 'https://youtu.be/dQw4w9WgXcQ' }]);
  assert.equal(lesson.thumbnailFallback, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
});

test('a response shaped like backend/prompt.txt fills every result-page section', async () => {
  const { deriveMistakes } = await import('./mistake-guidance.js');
  const response = {
    overall_rating: 7.4,
    score_engine: { overall: 74, categories: { composition: 70, lighting: 81, color: 77, focus: 72 } },
    read: 'The frame splits shadow and light with confidence. The bright edge on the right anchors the darker field.',
    context: { primary_genre: 'Street photography' },
    overview: {
      keep: [{ label: 'Color restraint', text: 'The palette stays quiet.' }, { label: 'Tonal separation', text: 'Two clear shapes.' }],
      change_one_thing: { category: 'Composition', action: 'Level the horizon.', observation: 'The shoreline drops right.', consequence: 'A tilt reads as accidental.' },
      try_this_next: { title: 'Control the edge', instruction: 'Make three versions.', variations: [{ label: 'Tight', instruction: 'a' }, { label: 'Balanced', instruction: 'b' }, { label: 'Open', instruction: 'c' }] },
    },
    frame_work: {
      composition: { interpretation: 'The edge holds the frame.', supporting: 'The diagonal moves the eye.', metrics: [{ label: 'Horizon', assessment: 'Crooked horizon', saw: 'The shoreline drops right.', matters: 'It feels accidental.', improve: 'Rotate two degrees.', try: 'Use the level.' }] },
      lighting: { interpretation: 'Soft contained light.', metrics: [{ label: 'Highlight clipping', assessment: 'Clean', saw: 'The brightest edge keeps texture.' }] },
      visual_hierarchy: { status: 'intentional_absence', interpretation: 'No single subject, by design.' },
    },
  };

  const model = getResultReadModel(response);
  const byId = Object.fromEntries(model.frameWorks.map((category) => [category.id, category]));

  assert.equal(model.genre, 'Street photography');
  assert.match(model.read.primary, /splits shadow and light/);
  assert.equal(model.overviewActions.keep.length, 2);
  assert.equal(model.overviewActions.change.action, 'Level the horizon.');
  assert.equal(model.overviewActions.tryThisNext.variations.length, 3);
  assert.equal(byId.composition.interpretation, 'The edge holds the frame.');
  assert.equal(byId.composition.score, 70, 'category scores come from score_engine');
  assert.equal(byId.light.metrics[0].saw, 'The brightest edge keeps texture.', 'lighting maps onto the light category');
  assert.equal(byId.visualHierarchy.score, null, 'intentional absence is not scored');

  const mistakes = deriveMistakes(model.frameWorks);
  assert.equal(mistakes.length, 1, 'only the problem assessment becomes a fix');
  assert.equal(mistakes[0].metricLabel, 'Horizon');
  assert.equal(mistakes[0].postTip, 'Rotate two degrees.');
});

test('categories say whether they have a real reading or only placeholder text', () => {
  const model = getResultReadModel({
    score_engine: { overall: 70, categories: { composition: 70 } },
    frame_work: { composition: { interpretation: 'The edge holds the frame.' } },
  });
  const byId = Object.fromEntries(model.frameWorks.map((category) => [category.id, category]));
  assert.equal(byId.composition.hasReading, true);
  assert.equal(byId.technical.hasReading, false, 'no technical reading was supplied');
  assert.equal(byId.visualHierarchy.hasReading, false);
});

test('assetUrl wraps raw base64 JPEGs even though they start with a slash', () => {
  // Base64 JPEG data always begins "/9j/", which used to be mistaken for a site path,
  // so focus and attention maps from the backend rendered as broken images.
  const jpeg = `/9j/4AAQSkZJRgABAQ${'A'.repeat(200)}==`;
  assert.equal(__testables.assetUrl(jpeg), `data:image/jpeg;base64,${jpeg}`);
  assert.equal(__testables.assetUrl('/background.jpg'), '/background.jpg');
  assert.equal(__testables.assetUrl('/images/read/read-photo.jpg'), '/images/read/read-photo.jpg');
  assert.equal(__testables.assetUrl('https://example.com/a.png'), 'https://example.com/a.png');
});

test('tonal evidence carries the RGB histogram and the clipping levels the percentages use', () => {
  const bins = (peakAt) => Array.from({ length: 64 }, (_, index) => (index === peakAt ? 100 : 5));
  const model = getResultReadModel({
    image_statistics: {
      rgb_histogram: { r: bins(60), g: bins(30), b: bins(3) },
      clipping_levels: { shadow: 25, highlight: 230 },
      shadow_clipping_percent: 0.6,
      highlight_clipping_percent: 12.5,
    },
  });
  const tonal = model.measuredEvidence.tonal;
  assert.deepEqual(tonal.rgb.r, bins(60));
  assert.equal(tonal.rgb.b.length, 64);
  assert.deepEqual(tonal.clipLevels, { shadow: 25, highlight: 230 });
  assert.equal(tonal.highlightClipping, 12.5);

  // Older responses have no RGB data and no levels: no RGB curves, and the backend's defaults.
  const legacy = getResultReadModel({ image_statistics: { rgb_histogram: { r: [1, 2], g: [1], b: 'x' } } }).measuredEvidence.tonal;
  assert.equal(legacy.rgb, null);
  assert.deepEqual(legacy.clipLevels, { shadow: 25, highlight: 230 });
});
