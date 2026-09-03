import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getResponseErrorMessage,
  isAnalysisPayload,
  MAX_PHOTOGRAPH_SIZE_BYTES,
  validatePhotograph,
} from './photograph.js';

describe('validatePhotograph', () => {
  it('accepts a non-empty supported image within the size limit', () => {
    assert.equal(validatePhotograph({ type: 'image/jpeg', size: 1024 }), '');
  });

  it('rejects empty files before decoding', () => {
    assert.match(validatePhotograph({ type: 'image/png', size: 0 }), /empty/i);
  });

  it('rejects unsupported media types', () => {
    assert.match(validatePhotograph({ type: 'image/gif', size: 1024 }), /JPEG, PNG, or WebP/);
  });

  it('enforces the 20 MB boundary', () => {
    assert.equal(validatePhotograph({ type: 'image/webp', size: MAX_PHOTOGRAPH_SIZE_BYTES }), '');
    assert.match(
      validatePhotograph({ type: 'image/webp', size: MAX_PHOTOGRAPH_SIZE_BYTES + 1 }),
      /20 MB/,
    );
  });
});

describe('analysis response helpers', () => {
  it('accepts the complete canonical response contract', () => {
    assert.equal(isAnalysisPayload({
      metadata: {}, overview: {}, analysis: { overall_score: 82, categories: {} },
      visual_breakdown: {}, learning_next: [], tutorials: [], diagnostics: {},
    }), true);
  });

  it('accepts the backend canonical category array', () => {
    assert.equal(isAnalysisPayload({
      metadata: {}, overview: {}, analysis: {
        overall_score: 82,
        categories: [{ id: 'composition', label: 'Composition', score: 81, metrics: [] }],
      },
      visual_breakdown: {}, learning_next: [], tutorials: [], diagnostics: {},
    }), true);
  });

  it('rejects incomplete or malformed canonical responses', () => {
    assert.equal(isAnalysisPayload({ metadata: {}, overview: {}, analysis: { overall_score: 82, categories: {} } }), false);
    assert.equal(isAnalysisPayload({
      metadata: {}, overview: {}, analysis: { overall_score: 'not-a-score', categories: {} },
      visual_breakdown: {}, learning_next: [], tutorials: [], diagnostics: {},
    }), false);
    assert.equal(isAnalysisPayload({
      metadata: {}, overview: {}, analysis: { overall_score: 82, categories: [] },
      visual_breakdown: {}, learning_next: null, tutorials: [], diagnostics: {},
    }), false);
  });

  it('requires a numeric overall rating for a successful analysis payload', () => {
    assert.equal(isAnalysisPayload({ overall_rating: 7.4 }), true);
    assert.equal(isAnalysisPayload({}), false);
    assert.equal(isAnalysisPayload({ overall_rating: null }), false);
    assert.equal(isAnalysisPayload({ overall_rating: '' }), false);
    assert.equal(isAnalysisPayload([]), false);
  });

  it('extracts useful messages from structured API errors', () => {
    assert.equal(
      getResponseErrorMessage({ detail: [{ msg: 'Image is corrupted' }] }, 'Request failed.'),
      'Image is corrupted',
    );
    assert.equal(getResponseErrorMessage(null, 'Request failed.'), 'Request failed.');
    assert.equal(
      getResponseErrorMessage('<html><body>Gateway error</body></html>', 'Request failed.'),
      'Request failed.',
    );
  });
});
