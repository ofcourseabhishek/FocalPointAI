// A small curated knowledge base translating a detected photo problem into
// concrete, actionable guidance: can it be rescued in post-processing, and
// how would a photographer avoid it on the next shot. This is intentionally
// a frontend-side heuristic layered on top of whatever the analysis backend
// returns per metric (label / assessment / value / score) -- it does not
// replace photo-specific reasoning from the model, it structures it.

const POSITIVE_HINTS = [
  'proper', 'balanced', 'just right', 'good', 'strong', 'sharp', 'clean',
  'well-', 'excellent', 'ideal', 'ok', 'ordinary', 'ample', 'correct',
  'even', 'natural', 'pleasing', 'effective', 'solid', 'clear', 'confident',
];

// Ordered: more specific matches should come before generic ones.
const GUIDANCE_LIBRARY = [
  {
    id: 'blur',
    keywords: ['blur', 'soft focus', 'out of focus', 'motion blur', 'camera shake', 'shaky', 'not sharp', 'missed focus'],
    diagnosis: 'The subject isn\u2019t tack sharp \u2014 this usually comes from camera shake or a missed focus point rather than the lens itself.',
    canFixInPost: false,
    postTip: null,
    nextTimeTip: 'Raise your shutter speed so it\u2019s at least 1/(focal length) of a second to freeze handheld shake, or steady the camera on a tripod. If the ISO triangle is fighting you in low light, open the aperture first, then raise ISO before dropping shutter speed further.',
  },
  {
    id: 'noise',
    keywords: ['noise', 'grain', 'grainy'],
    diagnosis: 'There\u2019s visible noise/grain, most likely from a high ISO or a heavy shadow push.',
    canFixInPost: true,
    postTip: 'Run noise reduction in post, but go easy \u2014 it trades fine detail for smoothness, so apply it locally to shadows rather than over the whole frame.',
    nextTimeTip: 'Keep ISO as low as the light allows. Widen the aperture or add a tripod so you can drop ISO without underexposing, instead of leaning on a high ISO to keep shutter speed up.',
  },
  {
    id: 'overexposed',
    keywords: ['overexposed', 'blown', 'blown-out', 'blown out', 'clipped highlight', 'washed out'],
    diagnosis: 'Highlights are clipping \u2014 detail in the brightest part of the frame is gone for good, not just hidden.',
    canFixInPost: true,
    postTip: 'Pull down exposure and highlights, and use a graduated or local adjustment if only part of the frame (like a sky) is blown.',
    nextTimeTip: 'Dial in negative exposure compensation (try \u20131 stop) before you shoot, or meter for the highlights instead of the midtones. Check the histogram isn\u2019t clipped on the right before moving on.',
  },
  {
    id: 'underexposed',
    keywords: ['underexposed', 'too dark', 'crushed shadow', 'crushed', 'lacking shadow detail'],
    diagnosis: 'Shadows are crushed or the frame is underexposed overall, losing detail in the dark areas.',
    canFixInPost: true,
    postTip: 'Lift shadows and exposure in post \u2014 shoot in RAW if you can, since it recovers far more shadow detail than JPEG before noise takes over.',
    nextTimeTip: 'Add positive exposure compensation (try +1/3 to +1 stop), or open the aperture / slow the shutter a touch. Check the histogram isn\u2019t crushed to the left before you move on.',
  },
  {
    id: 'flat-contrast',
    keywords: ['flat', 'low contrast', 'lacks contrast', 'hazy'],
    diagnosis: 'The tonal range is flat, so the image reads a bit lifeless even where exposure is technically fine.',
    canFixInPost: true,
    postTip: 'Add a contrast or curves adjustment (an S-curve is a good starting point) to give the midtones more separation.',
    nextTimeTip: 'Shoot in more directional light \u2014 side light or golden hour \u2014 rather than flat midday overcast light, which naturally compresses contrast.',
  },
  {
    id: 'color-cast',
    keywords: ['color cast', 'colour cast', 'cast', 'tint', 'off-color', 'off-colour', 'unbalanced white', 'warm cast', 'cool cast'],
    diagnosis: 'There\u2019s a color cast pulling the white balance off \u2014 whites and neutral tones aren\u2019t reading neutral.',
    canFixInPost: true,
    postTip: 'Correct white balance in post using the eyedropper tool on a neutral gray or white area of the frame.',
    nextTimeTip: 'Set a custom white balance for the light you\u2019re in instead of relying on auto, or shoot RAW so white balance is fully adjustable after the fact.',
  },
  {
    id: 'busy-composition',
    keywords: ['competing', 'distract', 'busy background', 'cluttered', 'second anchor', 'pulls attention'],
    diagnosis: 'Something else in the frame is competing with the subject for attention.',
    canFixInPost: true,
    postTip: 'A tighter crop can remove the distracting element if it sits near the edge of the frame.',
    nextTimeTip: 'Recompose before you shoot \u2014 change your angle, take a step, or open the aperture to blur a busy background so the subject reads clearly first.',
  },
  {
    id: 'crooked-horizon',
    keywords: ['crooked', 'tilt', 'not level', 'skewed horizon', 'uneven horizon'],
    diagnosis: 'The horizon or a strong horizontal line isn\u2019t level, which reads as unintentional rather than stylistic.',
    canFixInPost: true,
    postTip: 'Straighten the horizon in post \u2014 most editors have a one-click level or straighten tool, though it costs a small crop at the edges.',
    nextTimeTip: 'Turn on your camera\u2019s electronic level or gridlines and check the horizon before pressing the shutter.',
  },
  {
    id: 'weak-separation',
    keywords: ['separation', 'blends with', 'merges with the background', 'lacks depth'],
    diagnosis: 'The subject doesn\u2019t separate cleanly from the background, so the eye has to work to find it.',
    canFixInPost: true,
    postTip: 'A subtle vignette or local dodge/burn around the subject can help pull the eye back to it.',
    nextTimeTip: 'Open your aperture (a lower f-number) to blur the background, or reposition the subject in front of a cleaner, more even backdrop.',
  },
  {
    id: 'awkward-crop',
    keywords: ['awkward crop', 'poor crop', 'tight crop', 'cuts off', 'cramped framing'],
    diagnosis: 'The crop is working against the subject \u2014 either too tight or cutting off something that mattered.',
    canFixInPost: true,
    postTip: 'Recrop in post if there\u2019s enough resolution to spare, giving the subject a bit more breathing room.',
    nextTimeTip: 'Zoom out slightly or step back before shooting \u2014 it\u2019s always easier to crop tighter later than to recover lost frame.',
  },
];

function textIncludesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

export function isLikelyPositive(text) {
  if (!text) return false;
  return textIncludesAny(text.toLowerCase(), POSITIVE_HINTS);
}

export function matchGuidance(text) {
  if (!text) return null;
  const normalized = text.toLowerCase();
  return GUIDANCE_LIBRARY.find((entry) => textIncludesAny(normalized, entry.keywords)) || null;
}

// Decide whether a single metric represents something worth flagging as a
// "mistake" to teach against, using whatever signal is available: a numeric
// score when present, otherwise the assessment/value text.
export function isMistakeMetric(metric) {
  if (!metric || !metric.label) return false;
  // Only judge the *finding* (assessment/value) for positivity, not the
  // metric's own name -- labels like "Sharpness" or "Contrast" would
  // otherwise false-match words like "sharp" and hide real problems.
  const findingText = [metric.assessment, metric.value].filter(Boolean).join(' ');
  if (isLikelyPositive(findingText)) return false;
  if (metric.score != null) return metric.score < 65;
  const text = [metric.label, metric.assessment, metric.value].filter(Boolean).join(' ');
  return Boolean(matchGuidance(text));
}

// Build the ranked list of teachable mistakes across every category.
export function deriveMistakes(frameWorks, limit = 6) {
  const mistakes = [];
  (frameWorks || []).forEach((category) => {
    (category.metrics || []).forEach((metric, index) => {
      if (!isMistakeMetric(metric)) return;
      const text = [metric.label, metric.assessment, metric.value].filter(Boolean).join(' ');
      const guidance = matchGuidance(text);
      const diagnosis = metric.saw || metric.matters || guidance?.diagnosis || `${metric.assessment || metric.value || 'This'} is holding the ${metric.label.toLowerCase()} back.`;
      const postTip = guidance ? (guidance.canFixInPost ? (metric.improve || guidance.postTip) : null) : (metric.improve || null);
      const nextTimeTip = guidance ? guidance.nextTimeTip : (metric.try || null);
      if (!postTip && !nextTimeTip) return;
      mistakes.push({
        id: metric.id || `${category.id}-${metric.label}-${index}`,
        categoryLabel: category.label,
        metricLabel: metric.label,
        descriptor: metric.assessment || metric.value,
        diagnosis,
        canFixInPost: Boolean(postTip),
        postTip,
        nextTimeTip,
        severity: metric.score != null ? metric.score : 40,
      });
    });
  });
  return mistakes.sort((a, b) => a.severity - b.severity).slice(0, limit);
}
