const MAX_SCORE = 100;
const CATEGORY_ORDER = ['composition', 'light', 'focus', 'color', 'visualHierarchy', 'postProcessing'];
const CATEGORY_CONFIG = {
  composition: { label: 'Composition', scoreKeys: ['composition'], overlayNames: ['composition'], aspectKeys: ['composition', 'crop'], unavailable: 'No composition reading was returned for this photograph.' },
  light: { label: 'Lighting', scoreKeys: ['lighting', 'light'], overlayNames: ['light', 'lighting', 'exposure'], aspectKeys: ['lighting', 'light', 'brightness', 'highlights', 'shadows', 'ambiance'], unavailable: 'No light reading was returned for this photograph.' },
  color: { label: 'Color', scoreKeys: ['color', 'colour'], overlayNames: ['color', 'colour'], aspectKeys: ['colour', 'color', 'saturation', 'warmth'], unavailable: 'No color reading was returned for this photograph.' },
  focus: { label: 'Focus', scoreKeys: ['focus'], overlayNames: ['focus', 'sharpness'], aspectKeys: ['details', 'focus'], unavailable: 'No focus reading was returned for this photograph.' },
  visualHierarchy: { label: 'Subject', scoreKeys: ['visual_hierarchy', 'visualHierarchy', 'hierarchy'], overlayNames: ['visual_hierarchy', 'visualhierarchy', 'hierarchy', 'attention', 'saliency', 'subject'], aspectKeys: [], unavailable: 'No visual-hierarchy reading was returned for this photograph.' },
  postProcessing: { label: 'Post-Processing', scoreKeys: ['post_processing', 'postProcessing'], overlayNames: [], aspectKeys: [], unavailable: 'No post-processing reading was returned.' },
};

function textValue(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return [value.text, value.summary, value.content, value.read, value.interpretation, value.description].find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || '';
}
function firstText(...values) { return values.map(textValue).find(Boolean) || ''; }
function clamp(value, min = 0, max = 1) {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : null;
}
function point(value) { const x = Array.isArray(value) ? value[0] : value?.x; const y = Array.isArray(value) ? value[1] : value?.y; const normalizedX = normalizedCoordinate(x); const normalizedY = normalizedCoordinate(y); return normalizedX === null || normalizedY === null ? null : { x: normalizedX, y: normalizedY }; }
function line(value) { if (Array.isArray(value) && value.length >= 4 && !Array.isArray(value[0])) { const start = point([value[0], value[1]]); const end = point([value[2], value[3]]); return start && end ? { start, end } : null; } const start = point(value?.start || value?.from || value?.[0]); const end = point(value?.end || value?.to || value?.[1]); return start && end ? { start, end } : null; }
function assetUrl(value) { const candidate = typeof value === 'string' ? value.trim() : firstText(value?.src, value?.url, value?.data, value?.data_url, value?.base64, value?.asset, value?.mask, value?.mask_url, value?.image, value?.image_url); if (!candidate) return ''; return /^(?:data:|blob:|https?:\/\/|\/)/i.test(candidate) ? candidate : `data:image/jpeg;base64,${candidate}`; }

function flattenOverlays(overlays) {
  if (Array.isArray(overlays)) return overlays;
  if (!overlays || typeof overlays !== 'object') return [];
  return Object.entries(overlays).flatMap(([key, item]) => (Array.isArray(item) ? item : [item]).filter(Boolean).map((value) => (value && typeof value === 'object' ? { ...value, __overlayKey: key } : value)));
}
function overlayName(item) { return String(item?.layer || item?.name || item?.category || item?.target || item?.label || item?.__overlayKey || item?.type || '').toLowerCase(); }
function overlayEntries(overlays, names) { const wanted = new Set(names.map((name) => name.toLowerCase())); return flattenOverlays(overlays).filter((item) => wanted.has(overlayName(item))); }
function overlayEntriesByIds(overlays, ids) { const wanted = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id))); return wanted.size ? flattenOverlays(overlays).filter((item) => wanted.has(String(item?.id ?? item?.evidenceId ?? item?.overlayId ?? ''))) : []; }
function overlayAssetFromEntries(entries) { for (const item of entries) { const asset = assetUrl(item); if (asset) return asset; } return ''; }

function normalizedShape(value) {
  if (!value || typeof value !== 'object') return null;
  const kind = String(value.type || value.kind || value.shape || '').toLowerCase();
  if (kind === 'bbox' || kind === 'region' || value.bbox || (value.width !== undefined && value.height !== undefined)) {
    const source = value.bbox || value.region || value; const x = clamp(source.x ?? source.left ?? source[0]); const y = clamp(source.y ?? source.top ?? source[1]);
    const isArrayLTRB = Array.isArray(source) && source.length >= 4 && !Array.isArray(source[0]) && !Array.isArray(value.region);
    const right = source.right ?? (isArrayLTRB ? source[2] : null); const bottom = source.bottom ?? (isArrayLTRB ? source[3] : null); const isLTRB = right !== null && right !== undefined && bottom !== null && bottom !== undefined;
    const width = clamp(isLTRB ? Number(right) - Number(x) : source.width ?? source.w ?? source[2]); const height = clamp(isLTRB ? Number(bottom) - Number(y) : source.height ?? source.h ?? source[3]);
    if ([x, y, width, height].some((part) => part === null) || x + width > 1 || y + height > 1 || width <= 0 || height <= 0) return null;
    return { kind: 'bbox', x, y, width: Math.round(width * 1e6) / 1e6, height: Math.round(height * 1e6) / 1e6 };
  }
  if (kind === 'point' || value.point) { const coordinate = point(value.point || value); return coordinate ? { kind: 'point', ...coordinate } : null; }
  if (kind === 'line') { const geometry = line(value); return geometry ? { kind: 'line', ...geometry } : null; }
  if (kind === 'grid') {
    const gridLines = value.grid_lines || value;
    const horizontal = normalizedGridAxis(gridLines.horizontal);
    const vertical = normalizedGridAxis(gridLines.vertical);
    return horizontal.length || vertical.length ? { kind: 'grid', horizontal, vertical } : null;
  }
  if (kind === 'polygon' || Array.isArray(value.points)) { const rawPoints = value.points || []; const points = rawPoints.map(point); return points.length >= 3 && points.every(Boolean) ? { kind: 'region', points } : null; }
  return null;
}
function normalizedCoordinate(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}
export function getContainTransform(containerWidth, containerHeight, imageWidth, imageHeight) {
  const values = [containerWidth, containerHeight, imageWidth, imageHeight].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  const [containerW, containerH, imageW, imageH] = values;
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
    scale,
  };
}
function normalizedGridAxis(value) { return Array.isArray(value) ? value.map(normalizedCoordinate).filter((coordinate) => coordinate !== null) : []; }
function normalizedRuleOfThirds(value) {
  const gridLines = value?.grid_lines;
  const intersections = Array.isArray(value?.intersections) ? value.intersections.map((intersection) => {
    const x = normalizedCoordinate(intersection?.x ?? intersection?.[0]);
    const y = normalizedCoordinate(intersection?.y ?? intersection?.[1]);
    return x === null || y === null ? null : { x, y };
  }).filter(Boolean) : [];
  return { horizontal: normalizedGridAxis(gridLines?.horizontal), vertical: normalizedGridAxis(gridLines?.vertical), intersections };
}
function emptyGeometry() { return { leadingLines: [], horizon: null, centroid: null, ruleOfThirds: { horizontal: [], vertical: [], intersections: [] } }; }
function normalizedGeometry(advancedCv) { const composition = advancedCv?.composition || {}; const leadingLines = Array.isArray(composition?.leading_lines?.lines) ? composition.leading_lines.lines.map(line).filter(Boolean) : []; return { leadingLines, horizon: line(advancedCv?.horizon?.line), centroid: point(advancedCv?.subject_centering?.centroid), ruleOfThirds: normalizedRuleOfThirds(composition?.rule_of_thirds) }; }
function aspectNotes(aspects) { return Array.isArray(aspects) ? aspects : aspects && typeof aspects === 'object' ? Object.values(aspects) : []; }
function supportingRead(aspects) { for (const note of aspectNotes(aspects)) { const improvement = textValue(note?.what_could_be_improved); if (improvement) return improvement; } for (const note of aspectNotes(aspects)) { const strength = textValue(note?.what_works); if (strength) return strength; } return ''; }
function splitRead(value) { const prose = textValue(value); if (!prose) return { statement: '', remainder: '' }; const sentences = prose.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [prose]; const firstSentence = sentences[0]; const firstWords = firstSentence.split(/\s+/); if (firstWords.length <= 26) return { statement: firstSentence, remainder: sentences.slice(1).join(' ').trim() }; return { statement: `${firstWords.slice(0, 26).join(' ')}…`, remainder: firstWords.slice(26).join(' ').concat(sentences.slice(1).length ? ` ${sentences.slice(1).join(' ')}` : '').trim() }; }

function categoryEntries(result) { const raw = result.frame_work || result.frameWorks || result.categories || {}; if (Array.isArray(raw)) return raw.reduce((entries, item) => ({ ...entries, [String(item?.id || item?.key || item?.category || '').replace(/[_\s-]/g, '').toLowerCase()]: item }), {}); if (!raw || typeof raw !== 'object') return {}; return Object.entries(raw).reduce((entries, [key, item]) => ({ ...entries, [key.replace(/[_\s-]/g, '').toLowerCase()]: item }), {}); }
const CATEGORY_ALIASES = { light: ['lighting'], visualHierarchy: ['visual_hierarchy', 'hierarchy', 'subject'], postProcessing: ['post_processing'] };
function canonicalCategory(entries, id) { return [id, ...(CATEGORY_ALIASES[id] || [])].map((key) => entries[key.replace(/[_\s-]/g, '').toLowerCase()]).find(Boolean) || null; }
function categoryProse(category, result, id) { const status = String(category?.status || '').toLowerCase(); if (category?.not_applicable === true || status === 'not_applicable' || status === 'intentional_absence') { const intentional = status === 'intentional_absence'; return { interpretation: firstText(category?.interpretation, category?.read, category?.summary) || (intentional ? 'This treatment is intentional for the photograph.' : 'Not applicable to this photograph.'), supporting: firstText(category?.reason, category?.supporting) }; } const interpretation = firstText(category?.interpretation, category?.read, category?.summary, category?.description); const supporting = firstText(category?.supporting, category?.detail, category?.evidence_read, category?.rationale); if (interpretation) return { interpretation, supporting }; if (id === 'visualHierarchy') return { interpretation: CATEGORY_CONFIG[id].unavailable, supporting: '' }; const note = CATEGORY_CONFIG[id].aspectKeys.map((key) => result?.aspects?.[key]).find(Boolean); const fallback = firstText(note?.what_works, note?.what_could_be_improved, note) || CATEGORY_CONFIG[id].unavailable; const secondary = firstText(note?.what_could_be_improved, note?.what_works); return { interpretation: fallback, supporting: secondary === fallback ? '' : secondary }; }
function numericValue(value) { if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function validScore(value) { const score = numericValue(value); return score === null ? null : Math.round(Math.min(MAX_SCORE, Math.max(0, score))); }
function categoryScore(category, scoreCategories, id) { const status = String(category?.status || '').toLowerCase(); if (category?.not_applicable === true || status === 'not_applicable' || status === 'intentional_absence') return null; const explicit = validScore(category?.score ?? category?.rating); if (explicit !== null) return explicit; return CATEGORY_CONFIG[id].scoreKeys.map((key) => validScore(scoreCategories?.[key])).find((score) => score !== null) ?? null; }
function metricValue(value) { if (typeof value === 'boolean') return value ? 'Yes' : 'No'; if (typeof value === 'number' && Number.isFinite(value)) return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); return typeof value === 'string' && value.trim() ? value.trim() : ''; }
function categoryMetrics(category, result, id) { const direct = Array.isArray(category?.metrics) ? category.metrics : []; const canonical = direct.map((metric) => ({ id: firstText(metric?.id), label: firstText(metric?.label, metric?.name), value: metricValue(metric?.value ?? metric?.level), assessment: firstText(metric?.assessment, metric?.rating, metric?.level), score: numericValue(metric?.score), saw: firstText(metric?.saw, metric?.what_snapgrade_saw, metric?.what_snapgrade_found, metric?.summary), matters: firstText(metric?.matters, metric?.why_it_matters, metric?.detail), try: firstText(metric?.try, metric?.try_this, metric?.recommendation), learn: metric?.learn ?? metric?.lesson, works: firstText(metric?.works, metric?.what_works), improve: firstText(metric?.improve, metric?.what_would_improve_it), observation: firstText(metric?.observation, metric?.detail), evidenceIds: Array.isArray(metric?.evidence_ids) ? metric.evidence_ids : [], source: metric?.source || '' })).filter((metric) => metric.label && (metric.value || metric.assessment || metric.score !== null || metric.saw || metric.matters || metric.try)); if (canonical.length) return canonical; const source = result?.image_statistics || result?.advanced_cv?.image_statistics || {}; const metricFields = { composition: [['Subject centered', result?.advanced_cv?.subject_centering?.is_centered ?? result?.advanced_cv?.subject_centering?.centered]], light: [['Highlight clipping', source.highlight_clipping], ['Shadow clipping', source.shadow_clipping], ['Brightness', source.brightness]], color: [['Saturation', source.saturation], ['Warmth', source.warmth]], focus: [['Detail level', result?.advanced_cv?.details?.level ?? result?.details?.level]], visualHierarchy: [], postProcessing: [] }; return metricFields[id].map(([label, value]) => ({ label, value: metricValue(value), assessment: metricValue(value), score: null })).filter((metric) => metric.value).slice(0, 3); }
function normalizePalette(value) { const colors = Array.isArray(value) ? value : value?.colors || value?.palette || []; return colors.map((color) => typeof color === 'string' ? color.trim() : firstText(color?.hex, color?.color)).filter((color) => /^#[0-9a-f]{3,8}$/i.test(color)).slice(0, 5); }
function annotationFromEntry(entry) {
  const shape = normalizedShape(entry);
  if (!shape) return null;
  const source = firstText(entry?.source);
  const confidence = numericValue(entry?.confidence);
  return { ...shape, source, confidence: confidence === null ? null : Math.min(1, Math.max(0, confidence)), id: firstText(entry?.id, entry?.evidence_id) };
}
function layerFromEntries(entries, geometry) {
  const annotations = entries.map(annotationFromEntry).filter(Boolean);
  const shapes = annotations.map((annotation) => {
    const shape = { ...annotation };
    delete shape.source;
    delete shape.confidence;
    delete shape.id;
    return shape;
  });
  return { asset: overlayAssetFromEntries(entries), shapes, annotations, geometry };
}
function hasLayerEvidence(layer) { const thirds = layer.geometry?.ruleOfThirds; return Boolean(layer.asset || layer.shapes.length || layer.geometry?.horizon || layer.geometry?.centroid || layer.geometry?.leadingLines?.length || thirds?.horizontal?.length || thirds?.vertical?.length || thirds?.intersections?.length); }
function centeredCategory(entries) { return entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]?.target?.dataset?.category || null; }
function readingZoneCategory(positions, readingY) { if (!positions.length) return null; const distance = (position) => readingY < position.top ? position.top - readingY : readingY > position.bottom ? readingY - position.bottom : 0; return [...positions].sort((a, b) => distance(a) - distance(b))[0]?.category || null; }
function nextAvailableTab(tabs, available, currentTab, key) { const enabled = tabs.filter((tab) => available[tab]); if (!enabled.length) return null; const currentIndex = Math.max(0, enabled.indexOf(currentTab)); if (key === 'Home') return enabled[0]; if (key === 'End') return enabled[enabled.length - 1]; if (key === 'ArrowLeft') return enabled[(currentIndex - 1 + enabled.length) % enabled.length]; if (key === 'ArrowRight') return enabled[(currentIndex + 1) % enabled.length]; return null; }

function firstNumeric(...values) { return values.map(numericValue).find((value) => value !== null) ?? null; }
function normalizeHistogram(value) {
  if (!Array.isArray(value) || value.length !== 24) return [];
  const bins = value.map(numericValue);
  if (bins.some((bin) => bin === null)) return [];
  return bins.map((bin) => Math.min(100, Math.max(0, bin)));
}
function normalizeMeasuredPalette(value) {
  const colors = Array.isArray(value) ? value : value?.colors || value?.palette || [];
  return colors.map((color) => {
    const hex = typeof color === 'string' ? color.trim() : firstText(color?.hex, color?.color);
    const percentage = typeof color === 'object' && color !== null ? numericValue(color.percentage ?? color.weight) : null;
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex) ? { hex, percentage } : null;
  }).filter(Boolean).slice(0, 5);
}
function formatDecimal(value) { return value === null ? '' : Number(value).toFixed(2); }
function formatPercent(value) { return value === null ? '' : `${Number(value).toFixed(1).replace(/\.0$/, '')}%`; }
function tonalInterpretation(histogram, supplied) {
  const canonical = textValue(supplied);
  if (canonical || histogram.length !== 24 || histogram.every((value) => value === 0)) return canonical;
  const regions = [
    { label: 'shadows', weight: histogram.slice(0, 8).reduce((sum, value) => sum + value, 0) },
    { label: 'midtones', weight: histogram.slice(8, 16).reduce((sum, value) => sum + value, 0) },
    { label: 'highlights', weight: histogram.slice(16).reduce((sum, value) => sum + value, 0) },
  ];
  const ranked = regions.sort((a, b) => b.weight - a.weight);
  const [dominant, runnerUp] = ranked;
  if (dominant.weight - runnerUp.weight <= Math.max(1, dominant.weight * 0.05)) return 'Tonal weight is distributed across shadows, midtones, and highlights; clipping is listed separately.';
  return `Most of the measured tonal weight sits in the ${dominant.label}; clipping is listed separately.`;
}
function formatIso(value) {
  const text = metricValue(value);
  if (!text) return '';
  return /^iso\b/i.test(text) ? text : `ISO ${text}`;
}
function measuredEvidence(result, advancedCv) {
  const canonical = result?.measured_evidence || result?.measuredEvidence || {};
  const statistics = result?.image_statistics || advancedCv?.image_statistics || {};
  const tonalCanonical = canonical?.tonal || {};
  const focusCanonical = canonical?.focus || {};
  const histogram = normalizeHistogram(tonalCanonical.histogram ?? statistics.luminance_histogram);
  const meanLuminance = firstNumeric(tonalCanonical.mean_luminance, statistics?.brightness?.value);
  const shadowClipping = firstNumeric(tonalCanonical.shadow_clipping, statistics.shadow_clipping_percent, statistics.shadow_clipping);
  const highlightClipping = firstNumeric(tonalCanonical.highlight_clipping, statistics.highlight_clipping_percent, statistics.highlight_clipping);
  const sharpnessIndex = firstNumeric(focusCanonical.sharpness_index, statistics?.sharpness?.value);
  const focusMap = assetUrl(focusCanonical.map || focusCanonical.focus_map || advancedCv?.focus_map_b64);
  const detailLevel = firstText(focusCanonical.detail_level, statistics?.sharpness?.level);
  const primaryArea = firstText(focusCanonical.primary_area);
  const palette = normalizeMeasuredPalette(canonical?.palette || canonical?.color_palette || advancedCv?.color_palette || result?.color_palette);
  const cameraSettings = result?.metadata?.camera_settings || result?.exif_analysis?.camera_settings || canonical?.capture?.camera_settings || {};
  const settings = [
    ['Focal length', cameraSettings.focal_length],
    ['Aperture', cameraSettings.aperture],
    ['Shutter', cameraSettings.shutter_speed],
    ['ISO', formatIso(cameraSettings.iso)],
  ].map(([label, value]) => ({ label, value: metricValue(value) })).filter((item) => item.value);
  const supplemental = [
    ['Camera', cameraSettings.camera],
    ['Lens', cameraSettings.lens],
    ['Color profile', cameraSettings.color_profile || canonical?.capture?.color_profile],
    ['Dimensions', canonical?.capture?.dimensions || statistics.dimensions || (result?.metadata?.width && result?.metadata?.height ? `${result.metadata.width}x${result.metadata.height}` : '')],
  ].map(([label, value]) => ({ label, value: metricValue(value) })).filter((item) => item.value);
  return {
    tonal: {
      histogram,
      metrics: [
        { label: 'Mean luminance', value: formatDecimal(meanLuminance) },
        { label: 'Shadow clipping', value: formatPercent(shadowClipping) },
        { label: 'Highlight clipping', value: formatPercent(highlightClipping) },
      ].filter((item) => item.value),
      interpretation: tonalInterpretation(histogram, tonalCanonical.interpretation),
    },
    focus: {
      map: focusMap,
      metrics: [
        { label: 'Sharpness index', value: metricValue(sharpnessIndex) },
        { label: 'Detail level', value: detailLevel },
        { label: 'Primary area', value: primaryArea },
      ].filter((item) => item.value),
    },
    palette,
    capture: { settings, supplemental, hasSettings: settings.length > 0 },
  };
}

function humanizeKey(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/^Colour\b/, 'Color');
}
function actionText(value) { return firstText(value?.text, value?.title, value?.label, value?.description, value?.suggestion, value); }
function normalizeKeep(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return entries.map((item) => {
    if (typeof item === 'string') return { label: item.trim(), text: '' };
    if (!item || typeof item !== 'object') return null;
    const label = firstText(item?.label, item?.title, item?.name);
    const text = firstText(item?.text, item?.description, item?.detail, item?.reason);
    return label || text ? { label, text: text === label ? '' : text } : null;
  }).filter((item) => item?.label || item?.text).slice(0, 2);
}
function suggestedEditTexts(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries.map(actionText).filter(Boolean);
}
function normalizeNextSteps(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries.map((item) => {
    if (typeof item === 'string') {
      const text = item.trim();
      return text ? { label: '', text } : null;
    }
    if (!item || typeof item !== 'object') return null;
    const label = firstText(item.label);
    const text = firstText(item.text, item.description, item.detail, item.instruction, item.title, item.name);
    return text ? { label, text } : null;
  }).filter(Boolean).slice(0, 3);
}
function overviewActions(result) {
  const overview = result?.overview || {};
  let keep = normalizeKeep(overview.keep || result?.keep);
  if (!keep.length && result?.aspects && typeof result.aspects === 'object') {
    const preferred = ['colour', 'color', 'composition', 'crop', 'brightness', 'contrast', 'details', 'focus', 'ambiance'];
    const ordered = [...preferred, ...Object.keys(result.aspects).filter((key) => !preferred.includes(key))];
    const seen = new Set();
    keep = ordered.map((key) => {
      if (seen.has(key)) return null;
      seen.add(key);
      const text = textValue(result.aspects[key]?.what_works);
      return text ? { label: humanizeKey(key), text } : null;
    }).filter(Boolean).slice(0, 2);
  }

  const edits = suggestedEditTexts(result?.suggested_edits);
  const cot = overview.change_one_thing || {};
  const changeObj = {
    category: firstText(cot.category, result?.change_one_thing?.category) || 'General',
    action: firstText(cot.action, cot.text, cot.label, cot, result?.change_one_thing?.text, result?.change_one_thing?.action, result?.change_one_thing, edits[0]),
    observation: firstText(cot.observation, cot.detail, result?.change_one_thing?.detail, result?.change_detail, result?.changeDetail),
    consequence: firstText(cot.consequence, cot.why, result?.change_one_thing?.why, result?.change_why, result?.changeWhy)
  };

  const ttn = overview.try_this_next || {};
  const rawVariations = Array.isArray(ttn) ? ttn : (Array.isArray(ttn.variations) ? ttn.variations : (Array.isArray(ttn.steps) ? ttn.steps : []));
  const normalizedVariations = rawVariations.map(v => ({
    label: firstText(v.label),
    instruction: firstText(v.instruction, v.text, v.description, v)
  })).filter(v => v.instruction).slice(0, 3);

  const fallbackNextInstruction = firstText(result?.try_this_next?.text, result?.try_this_next?.instruction, result?.try_this_next, edits.find((edit) => edit !== changeObj.action));

  const ttnInstruction = Array.isArray(ttn) ? ttn[0] : ttn;

  const tryThisNext = {
    status: firstText(ttn.status, result?.try_this_next?.status) || (normalizedVariations.length === 3 ? 'ready' : 'unavailable'),
    title: firstText(ttn.title, result?.try_this_next?.title) || 'Practice Session',
    instruction: firstText(ttnInstruction.instruction, ttnInstruction.text, ttnInstruction, fallbackNextInstruction),
    supporting: firstText(ttn.supporting, result?.try_this_next?.supporting),
    variations: normalizedVariations,
    closing: firstText(ttn.closing, result?.try_this_next?.closing)
  };

  return { keep, change: changeObj, tryThisNext };
}

const LESSON_TIER_LABELS = ['START HERE', 'THEN EXPLORE', 'OPTIONAL DEEPER DIVE', 'OPTIONAL DEEPER DIVE'];
function normalizeLearningPath(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((lesson) => {
    if (!lesson || typeof lesson !== 'object') return null;
    const video = lesson.video || lesson;
    const title = firstText(video.title, lesson.title);
    const url = firstText(video.url, video.youtube_url, video.youtube_link, lesson.url, lesson.youtube_url, lesson.youtube_link);
    const id = firstText(video.id, lesson.id, video.video_id, lesson.video_id);
    const key = url || id;
    if (!title || !url || (key && seen.has(key))) return null;
    if (key) seen.add(key);
    const matchedMetricIds = Array.isArray(lesson.matched_metric_ids) ? lesson.matched_metric_ids.map(textValue).filter(Boolean) : [];
    return {
      id,
      title,
      creator: firstText(video.channel, video.creator, lesson.channel, lesson.creator),
      duration: firstText(video.duration, lesson.duration),
      thumbnail: firstText(video.thumbnail_url, video.thumbnail, lesson.thumbnail_url, lesson.thumbnail),
      thumbnailFallback: firstText(video.thumbnail_fallback_url, lesson.thumbnail_fallback_url),
      url,
      category: firstText(lesson.topic, lesson.category, lesson.metric),
      reason: firstText(lesson.reason, lesson.description),
      learning_goal: firstText(lesson.learning_goal, title),
      priority: numericValue(lesson.priority),
      priority_label: firstText(lesson.priority_label),
      helps_with: matchedMetricIds.length ? matchedMetricIds : (Array.isArray(lesson.helps_with) ? lesson.helps_with.map(textValue).filter(Boolean) : [])
    };
  }).filter(Boolean).sort((left, right) => (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER)).slice(0, 4)
    .map((lesson, index) => ({ ...lesson, priority_label: lesson.priority_label || LESSON_TIER_LABELS[index] }));
}

function canonicalEvidence(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([category, item]) => {
    const entries = Array.isArray(item) ? item : [item];
    return entries.filter((entry) => entry && typeof entry === 'object').map((entry) => ({ ...entry, category: entry.category || category }));
  });
}

// This is the sole boundary between API shapes and the presentation model.
// Canonical fields win; the legacy paths intentionally remain for preview and
// rolling backend deployments.
export function adaptAnalysisResult(result = {}) {
  if (!result || typeof result !== 'object' || Array.isArray(result) || !result.analysis) return result || {};
  const analysis = result.analysis || {};
  const visual = result.visual_breakdown || {};
  const canonicalCategories = analysis.categories || {};
  const evidence = canonicalEvidence(visual.evidence);
  const paletteEvidence = evidence.find((item) => item?.type === 'palette' && Array.isArray(item?.palette));
  const histogramEvidence = evidence.find((item) => item?.type === 'histogram' && Array.isArray(item?.values));
  const imageStatistics = { ...(result.image_statistics || {}) };
  if (!Array.isArray(imageStatistics.luminance_histogram) && histogramEvidence) imageStatistics.luminance_histogram = histogramEvidence.values;
  const visualCategoryEvidence = canonicalEvidence(Object.fromEntries(Object.entries(visual).filter(([key]) => key !== 'evidence')));
  const categoryPairs = (Array.isArray(canonicalCategories)
    ? canonicalCategories.map((category) => [category?.id, category])
    : Object.entries(canonicalCategories)).filter(([key, category]) => key && category && typeof category === 'object');
  const categories = Object.fromEntries(categoryPairs.map(([key, category]) => [key, {
    ...(category && typeof category === 'object' ? category : {}),
    evidenceIds: Array.isArray(category?.evidence_ids) ? category.evidence_ids : category?.evidenceIds,
  }]));
  const scoreCategories = Object.fromEntries(categoryPairs.map(([key, category]) => [key, category?.score]));
  return {
    ...result,
    overview: result.overview || {},
    read: firstText(result.overview?.summary, result.overview?.read, result.read),
    score_engine: { ...(result.score_engine || {}), overall: analysis.overall_score, categories: scoreCategories },
    frame_work: categories,
    overlays: evidence.length ? evidence : visualCategoryEvidence,
    color_palette: result.color_palette || paletteEvidence?.palette,
    image_statistics: imageStatistics,
    learning_next: Array.isArray(result.learning_next) ? result.learning_next : [],
    tutorials: Array.isArray(result.tutorials) ? result.tutorials : [],
  };
}

export function getResultReadModel(result = {}) {
  result = adaptAnalysisResult(result);
  const advancedCv = result.advanced_cv || {};
  const apiDiagnosticModes = Array.isArray(result.visual_breakdown?.diagnostic_modes) ? result.visual_breakdown.diagnostic_modes : [];
  
  const diagnosticModes = apiDiagnosticModes.map((mode, index) => {
    return {
      id: String(mode.id || ''),
      label: String(mode.label || ''),
      category: String(mode.category || ''),
      supported: Boolean(mode.supported),
      available: Boolean(mode.available),
      selected: Boolean(mode.selected),
      representation: String(mode.representation || ''),
      fallbackRepresentations: Array.isArray(mode.fallback_representations) ? mode.fallback_representations.map(String) : (Array.isArray(mode.fallbackRepresentations) ? mode.fallbackRepresentations.map(String) : []),
      loadState: mode.available ? 'idle' : 'unavailable',
      unavailableReason: String(mode.unavailable_reason || mode.unavailableReason || '')
    };
  });

  const overlays = result.overlays || {}; const canonicalScore = validScore(result?.score_engine?.overall); const legacyRating = numericValue(result?.overall_rating); const score = canonicalScore ?? (legacyRating === null ? null : validScore(legacyRating * 10)); const genre = firstText(result?.context?.primary_genre, result?.primary_genre, result?.intent_profile?.genre) || 'Photograph'; const readParts = splitRead(firstText(result?.read, result?.read_summary, result?.first_impression)); const geometry = normalizedGeometry(advancedCv);
  const mainLayers = { attention: layerFromEntries(overlayEntries(overlays, ['attention', 'saliency', 'heatmap', 'subject']), emptyGeometry()), light: layerFromEntries(overlayEntries(overlays, CATEGORY_CONFIG.light.overlayNames), emptyGeometry()), focus: layerFromEntries(overlayEntries(overlays, CATEGORY_CONFIG.focus.overlayNames), emptyGeometry()), composition: layerFromEntries(overlayEntries(overlays, ['composition']), geometry) };
  if (!mainLayers.attention.asset) mainLayers.attention.asset = assetUrl(advancedCv.saliency_map_b64); if (!mainLayers.focus.asset) mainLayers.focus.asset = assetUrl(advancedCv.focus_map_b64);
  const entries = categoryEntries(result); const scoreCategories = result?.score_engine?.categories || {}; const palette = normalizePalette(advancedCv.color_palette || result?.color_palette);
  const noGeometry = emptyGeometry();
  const frameWorks = CATEGORY_ORDER.map((id, index) => {
    const category = canonicalCategory(entries, id);
    const evidenceIds = category?.evidenceIds || category?.evidence_ids;
    const hasCanonicalEvidenceIds = Array.isArray(evidenceIds) && evidenceIds.length > 0;
    const canonicalEvidence = overlayEntriesByIds(overlays, evidenceIds);
    const fallbackEvidence = id === 'color' ? [] : overlayEntries(overlays, CATEGORY_CONFIG[id].overlayNames);
    const evidenceEntries = hasCanonicalEvidenceIds ? canonicalEvidence : fallbackEvidence;
    const categoryGeometry = id === 'composition' && !hasCanonicalEvidenceIds ? geometry : noGeometry;
    const layer = layerFromEntries(evidenceEntries, categoryGeometry);

    if (id === 'focus' && !layer.asset && !hasCanonicalEvidenceIds) layer.asset = assetUrl(advancedCv.focus_map_b64);
    if (id === 'visualHierarchy' && !layer.asset && !hasCanonicalEvidenceIds) layer.asset = assetUrl(advancedCv.saliency_map_b64);

    const prose = categoryProse(category, result, id);
    const categoryScoreValue = categoryScore(category, scoreCategories, id);
    const categoryPalette = normalizePalette(category?.palette || category?.color_palette);
    const visiblePalette = id === 'color' ? (categoryPalette.length ? categoryPalette : palette) : categoryPalette;
    const suppliedPaletteLabels = category?.paletteLabels || category?.palette_labels;
    const paletteLabels = Array.isArray(suppliedPaletteLabels) ? suppliedPaletteLabels.map(textValue).filter(Boolean).slice(0, 2) : [];
    const hasSpatialEvidence = hasLayerEvidence(layer);
    const evidenceMode = hasSpatialEvidence ? 'spatial' : visiblePalette.length ? 'palette' : id === 'postProcessing' ? 'global' : 'written';
    const defaultDescriptor = { spatial: 'Spatial evidence', palette: 'Extracted palette', global: 'Global observation', written: 'Written observation' }[evidenceMode];

    return {
      id,
      label: CATEGORY_CONFIG[id].label,
      sequence: `${String(index + 1).padStart(2, '0')}/${String(CATEGORY_ORDER.length).padStart(2, '0')}`,
      score: categoryScoreValue,
      scoreLabel: categoryScoreValue === null ? '' : String(categoryScoreValue),
      interpretation: prose.interpretation,
      supporting: prose.supporting,
      metrics: categoryMetrics(category, result, id),
      descriptor: firstText(category?.descriptor, category?.label, category?.evidence_label) || defaultDescriptor,
      palette: visiblePalette,
      paletteLabels,
      evidence: layer,
      evidenceMode,
      hasSpatialEvidence,
    };
  });
  
  const tutorialSources = [result?.tutorials, result?.tutorial_recommendations, result?.learning_next, result?.what_to_learn_next, result?.whatToLearnNext, result?.learner_path, result?.learning_path, result?.learningPath];
  let whatToLearnNext = [];
  for (const source of tutorialSources) {
    whatToLearnNext = normalizeLearningPath(source);
    if (whatToLearnNext.length) break;
  }
  if (!whatToLearnNext.length) {
    const allLessons = [];
    frameWorks.forEach(fw => {
      fw.metrics.forEach(m => {
        if (m.learn) {
          allLessons.push({
            title: m.learn.title,
            creator: m.learn.creator,
            duration: m.learn.duration,
            thumbnail: m.learn.thumbnail,
            url: m.learn.youtube_url || m.learn.url,
            category: fw.label,
            reason: m.learn.reason || m.improve || m.works,
            learning_goal: m.learn.learning_goal || m.learn.title,
            score: fw.score !== null ? fw.score : 100,
            helps_with: [fw.label]
          });
        }
      });
    });
    
    const sorted = allLessons.sort((a, b) => a.score - b.score).slice(0, 3);
    const labels = ["START HERE", "THEN EXPLORE", "OPTIONAL DEEPER DIVE"];
    whatToLearnNext = sorted.map((lesson, index) => ({
      ...lesson,
      priority_label: labels[index]
    }));
  }

  const measured = measuredEvidence(result, advancedCv);
  if (!measured.focus.map) measured.focus.map = frameWorks.find((item) => item.id === 'focus')?.evidence.asset || '';
  measured.whatToLearnNext = whatToLearnNext;

  return { score, genre, read: { primary: readParts.statement, supporting: readParts.remainder || supportingRead(result.aspects) }, evidence: { layers: mainLayers, geometry, attention: mainLayers.attention.asset, focus: mainLayers.focus.asset, light: mainLayers.light.asset, composition: mainLayers.composition.asset, shapes: Object.fromEntries(Object.entries(mainLayers).map(([key, layer]) => [key, layer.shapes])) }, diagnosticModes, frameWorks, measuredEvidence: measured, overviewActions: overviewActions(result) };
}
export const __testables = { assetUrl, line, point, supportingRead, normalizedShape, normalizedRuleOfThirds, splitRead, normalizePalette, normalizeHistogram, normalizeMeasuredPalette, measuredEvidence, overviewActions, overlayEntriesByIds, centeredCategory, readingZoneCategory, nextAvailableTab, validScore, normalizeNextSteps, normalizeLearningPath, canonicalEvidence, getContainTransform };
