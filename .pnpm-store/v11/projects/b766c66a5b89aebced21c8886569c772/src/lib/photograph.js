export const MAX_PHOTOGRAPH_SIZE_BYTES = 20 * 1024 * 1024;

export const SUPPORTED_PHOTOGRAPH_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function validatePhotograph(file) {
  if (!file || typeof file !== 'object') {
    return 'Choose one photograph to continue.';
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'The selected file is empty. Choose a photograph with image data.';
  }

  if (!SUPPORTED_PHOTOGRAPH_TYPES.has(String(file.type || '').toLowerCase())) {
    return 'Use a JPEG, PNG, or WebP image.';
  }

  if (file.size > MAX_PHOTOGRAPH_SIZE_BYTES) {
    return 'Images must be 20 MB or smaller.';
  }

  return '';
}

export function isAnalysisPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  // The package response is the production contract. Keep the prototype shape
  // below only while deployed backends are being upgraded independently.
  const canonicalSections = ['metadata', 'overview', 'analysis', 'visual_breakdown', 'learning_next', 'tutorials', 'diagnostics'];
  if (canonicalSections.every((section) => Object.hasOwn(value, section))) {
    const analysis = value.analysis;
    return Boolean(
      value.metadata && typeof value.metadata === 'object' && !Array.isArray(value.metadata)
      && value.overview && typeof value.overview === 'object' && !Array.isArray(value.overview)
      && analysis
      && typeof analysis === 'object'
      && !Array.isArray(analysis)
      && Number.isFinite(Number(analysis.overall_score))
      && Number(analysis.overall_score) >= 0
      && Number(analysis.overall_score) <= 100
      && analysis.categories
      && typeof analysis.categories === 'object'
      && value.visual_breakdown && typeof value.visual_breakdown === 'object' && !Array.isArray(value.visual_breakdown)
      && Array.isArray(value.learning_next)
      && Array.isArray(value.tutorials)
      && value.diagnostics && typeof value.diagnostics === 'object' && !Array.isArray(value.diagnostics),
    );
  }

  const rating = value.overall_rating;
  if (rating === null || rating === '' || typeof rating === 'boolean') return false;

  const numericRating = Number(rating);
  return Number.isFinite(numericRating) && numericRating >= 0 && numericRating <= 10;
}

export function getResponseErrorMessage(body, fallback) {
  if (typeof body === 'string' && body.trim()) {
    const message = body.trim();
    return message.length <= 500 && !/<\/?[a-z][\s\S]*>/i.test(message) ? message : fallback;
  }

  if (!body || typeof body !== 'object') return fallback;

  const candidates = [body.detail, body.message, body.error, body.errors, body.title];
  for (const candidate of candidates) {
    const message = getStructuredMessage(candidate);
    if (message) return message;
  }

  return fallback;
}

function getStructuredMessage(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();

  if (Array.isArray(value)) {
    return value.map(getStructuredMessage).filter(Boolean).join('; ');
  }

  if (value && typeof value === 'object') {
    return getStructuredMessage(value.msg)
      || getStructuredMessage(value.message)
      || getStructuredMessage(value.detail);
  }

  return '';
}
