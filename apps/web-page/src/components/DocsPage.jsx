import { useEffect } from 'react';

import '../result-read.css';
import ScrollIndex from './kokonutui/scroll-index';
import SlideTextButton from './kokonutui/slide-text-button';

const REPO_URL = 'https://github.com/ofcourseabhishek/FocalPointAI';
const UPDATED = '28 October 2026';

// Same type scale and accents as the result page.
const EYEBROW = 'text-xs font-medium uppercase tracking-[0.14em] text-[#856324] dark:text-[#d2b16e]';
const H2 = 'result-read__display text-3xl font-medium tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100';
const H3 = 'text-base font-medium text-zinc-900 dark:text-zinc-100';
const BODY = 'text-base leading-relaxed text-zinc-600 dark:text-zinc-400';
const CARD = 'rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950';
const LINK = 'font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-700 dark:hover:decoration-zinc-100';

const SECTIONS = [
  ['what', 'What Snapgrade does'],
  ['pipeline', 'How a read works'],
  ['measures', 'What the pixels say'],
  ['decisions', 'Design decisions'],
  ['quality', 'Measuring quality'],
  ['roadmap', 'Where it is going'],
  ['stack', 'Stack and source'],
];

const PIPELINE = [
  ['Upload', 'A JPEG, PNG or WebP photograph up to 20 MB and 40 megapixels. It is decoded, turned upright from its EXIF orientation, and its camera settings are read.'],
  ['Measure', 'OpenCV extracts visual evidence from the pixels: tone, colour, sharpness, where the eye is drawn, and the geometry of the frame.'],
  ['Score', 'A deterministic score engine turns that evidence into the overall and category scores. The same photograph always gets the same numbers.'],
  ['Interpret', 'An intent profile decides which composition techniques actually apply to this photograph, so it is not marked down for ones it never tried to use.'],
  ['Explain', 'Gemini 3.5 Flash looks at the photograph together with the measured evidence and the fixed scores, and writes the critique in plain photography language.'],
  ['Learn', 'Lessons are matched from a curated YouTube catalog to the photograph’s weakest areas.'],
  ['Export', 'The whole read, with the photograph and its metadata, can be downloaded as a multi-page PDF.'],
];

const MEASURES = [
  ['Composition', 'Rule of thirds, golden ratio, leading lines from edge detection, symmetry, framing, negative space, subject placement and horizon level.'],
  ['Light and tone', 'Brightness, contrast, highlight and shadow clipping, a luminance histogram and a per-channel RGB histogram.'],
  ['Detail', 'Sharpness and blur from the Laplacian, plus a focus map showing where detail is held.'],
  ['Subject and scene', 'A colour-contrast saliency map for where the eye lands, face detection, sky segmentation and background clutter.'],
  ['Colour', 'A dominant palette from k-means clustering, saturation and warmth.'],
  ['Capture', 'Camera, lens, focal length, aperture, shutter speed, ISO and colour profile from EXIF, when the file carries them.'],
];

const DECISIONS = [
  {
    title: 'The application owns the scores, not the language model',
    body: 'Every score comes from local measurements. Gemini receives those scores as fixed facts and writes around them; anything it returns as a number is replaced with the measured value before the result leaves the server.',
    tradeoff: 'Scores are reproducible and every number can be traced to evidence. The cost is that heuristics can be wrong in ways a model might catch, so the measurements themselves have to keep improving.',
  },
  {
    title: 'The language model is optional',
    body: 'If Gemini is not configured, fails or times out, the read still completes with the locally generated critique, and the response says why the narrative is the local one.',
    tradeoff: 'The product never depends on one external service being up. The local fallback text is plainer than Gemini’s.',
  },
  {
    title: 'Reward the strongest structures, not every technique',
    body: 'A photograph does not need to use every composition technique. The composition score averages the three strongest structures it detects instead of penalising the absent ones.',
    tradeoff: 'Minimal or unconventional frames are not punished for what they leave out. A frame with one strong idea and nothing else can score higher than a cluttered one that ticks more boxes.',
  },
  {
    title: 'Stateless by design',
    body: 'There are no accounts, no database and no saved history. The photograph is analysed and the result is returned; the browser keeps the last result only for the current tab. When Gemini is enabled, the photograph is sent to Google’s Gemini API to write the explanation.',
    tradeoff: 'Nothing to leak and nothing to migrate. The price is no progress tracking across sessions yet.',
  },
  {
    title: 'Lessons only when they can play',
    body: 'Lessons come from a hand-curated catalog rather than live search. A check against YouTube marks videos that are private or cannot be embedded, and the recommender skips them.',
    tradeoff: 'Every recommendation is one a person has vetted, at the cost of a smaller library that has to be maintained.',
  },
];

const ROADMAP = [
  { status: 'Shipped', items: ['Measured, deterministic scores from local computer vision', 'Gemini-written critique with a local fallback', 'Matched lessons and a playable lesson deck', 'PDF export', 'A layout that works on phones'] },
  { status: 'Planned', items: ['Snapgrade’s own vision model for reading photographs', 'An evaluation benchmark built on how photographers rate images', 'Snapgrade’s own language model for writing the feedback', 'Removing the dependency on an external model once Snapgrade’s own models match it on that benchmark'] },
];

const STACK = [
  ['Interface', 'React 19, Vite and Tailwind CSS, with Motion for animation. Several components are adapted from Kokonut UI.'],
  ['API', 'Python and FastAPI, with OpenCV and NumPy for vision, Pillow for decoding and EXIF, and ReportLab for the PDF.'],
  ['Language model', 'Gemini 3.5 Flash, used only to write the explanation.'],
  ['Hosting', 'The interface on Vercel and the API on Render.'],
];

function Section({ id, eyebrow, title, children }) {
  return <section className="scroll-mt-24 border-t border-zinc-200 py-14 sm:py-16 dark:border-zinc-800" id={id} aria-labelledby={`${id}-title`}>
    <p className={EYEBROW}>{eyebrow}</p>
    <h2 className={`${H2} mt-2`} id={`${id}-title`}>{title}</h2>
    <div className="mt-6">{children}</div>
  </section>;
}

export default function DocsPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'How Snapgrade works';
    return () => { document.title = previous; };
  }, []);

  return <main className="result-read relative">
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6 sm:px-10">
      <a className="font-['Neue_Haas_Grotesk_Display',Geist,Inter,sans-serif] font-semibold text-xl tracking-tight text-zinc-900 dark:text-zinc-100" href="/">snapgrade</a>
      {/* Pill-shaped and text-sm to match the site's other buttons; lg:mr-40 clears the lamp. */}
      <SlideTextButton className="h-10 rounded-full px-5 text-sm tracking-tight md:min-w-0 lg:mr-40" href="/" text="Analyze a photograph" variant="ghost" />
    </header>

    {/* lg:pr-44 keeps the article clear of the fixed scroll index on the right. */}
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 pt-16 pb-24 sm:px-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:pt-24 lg:pr-44">
      {/* Desktop: a sticky contents list. Phones get the inline one under the intro. */}
      <nav className="hidden lg:block" aria-label="On this page">
        <ul className="sticky top-24 grid gap-2 text-sm">
          {SECTIONS.map(([id, label]) => <li key={id}><a className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" href={`#${id}`}>{label}</a></li>)}
        </ul>
      </nav>

      <article className="max-w-3xl">
        {/* Desktop: a tick per section heading, fixed under the lamp like the result page. */}
        <ScrollIndex
          className="block max-lg:[&>nav]:hidden lg:[&>nav]:fixed lg:[&>nav]:top-[210px] lg:[&>nav]:right-[100px]"
          scroller="window"
          selector="h2"
        >
        <p className={EYEBROW}>Documentation</p>
        <h1 className="result-read__display mt-3 text-4xl font-medium tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">How Snapgrade reads a photograph</h1>
        <p className={`${BODY} mt-5 text-lg`}>Most photo critiques stop at taste: the composition feels weak, the light could be better. Snapgrade connects that feedback to measurable evidence and a useful next step. This page explains how it works today, the decisions behind it, and where it is heading.</p>
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">By Abhishek Rai · Updated {UPDATED} · <a className={LINK} href={REPO_URL} rel="noreferrer" target="_blank">Open source under MIT</a></p>

        <nav className="mt-10 lg:hidden" aria-label="On this page">
          <p className={EYEBROW}>On this page</p>
          <ol className="mt-3 grid gap-2 text-sm">
            {SECTIONS.map(([id, label], index) => <li key={id}><a className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" href={`#${id}`}><span className="mr-2 tabular-nums text-zinc-400">{String(index + 1).padStart(2, '0')}</span>{label}</a></li>)}
          </ol>
        </nav>

        <Section id="what" eyebrow="Overview" title="What Snapgrade does">
          <p className={BODY}>You add one photograph. Snapgrade measures it, scores it, explains what is working and what is holding it back, says what to change first, and recommends lessons for the areas with the most room to grow. There is nothing to sign up for.</p>
        </Section>

        <Section id="pipeline" eyebrow="Pipeline" title="How a read works">
          <p className={BODY}>One request to the API runs these steps in order. Measurement and scoring happen on the server before any language model is involved.</p>
          <ol className="mt-8 grid gap-0">
            {PIPELINE.map(([step, text], index) => <li className="relative flex gap-5 pb-8 last:pb-0" key={step}>
              {index < PIPELINE.length - 1 && <span className="absolute top-9 bottom-0 left-[1.0625rem] w-px bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />}
              <span className="result-read__display grid size-9 shrink-0 place-items-center rounded-full border border-[#b8924a]/60 text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{index + 1}</span>
              <div className="pt-1.5">
                <h3 className={H3}>{step}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</p>
              </div>
            </li>)}
          </ol>
        </Section>

        <Section id="measures" eyebrow="Computer vision" title="What the pixels say">
          <p className={BODY}>All of this is measured with OpenCV on the server, with no model calls. It is the evidence every score and every sentence in the critique has to point back to.</p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {MEASURES.map(([name, text]) => <div className={CARD} key={name}>
              <dt className={EYEBROW}>{name}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</dd>
            </div>)}
          </dl>
        </Section>

        <Section id="decisions" eyebrow="Engineering" title="Design decisions">
          <div className="grid gap-6">
            {DECISIONS.map((decision) => <article className={CARD} key={decision.title}>
              <h3 className="result-read__display text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">{decision.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{decision.body}</p>
              <p className="mt-3 border-l-2 border-[#b8924a]/60 pl-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"><span className="font-medium text-[#856324] dark:text-[#d2b16e]">Trade-off:</span> {decision.tradeoff}</p>
            </article>)}
          </div>
        </Section>

        <Section id="quality" eyebrow="Evaluation" title="Measuring quality">
          <p className={BODY}>Today, quality is guarded by automated tests: the API’s scoring, histograms, orientation handling, metadata, intent profile, upload limits, PDF export and lesson matching, and the interface’s result model and guidance. A separate real-image matrix runs photographs through exposure, focus, colour and orientation changes so the response of every measurement can be inspected side by side.</p>
          <p className={`${BODY} mt-4`}>Tests prove the system behaves consistently. They do not prove its judgement is right. The next step is to measure how closely Snapgrade’s scores agree with how photographers rate the same images, and to track that agreement as the models change.</p>
        </Section>

        <Section id="roadmap" eyebrow="Roadmap" title="Where it is going">
          <p className={BODY}>Today Snapgrade measures with classical computer vision and uses Gemini to put the critique into words. The direction is to replace both with Snapgrade’s own models, and to prove each step against human judgement rather than against another model.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {ROADMAP.map(({ status, items }) => <div className={CARD} key={status}>
              <h3 className={EYEBROW}>{status}</h3>
              <ul className="mt-4 grid gap-3">
                {items.map((item) => <li className="flex gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" key={item}>
                  <span className={`mt-2 size-1.5 shrink-0 rounded-full ${status === 'Shipped' ? 'bg-[#b8924a]' : 'border border-zinc-400 dark:border-zinc-500'}`} aria-hidden="true" />
                  {item}
                </li>)}
              </ul>
            </div>)}
          </div>
        </Section>

        <Section id="stack" eyebrow="Build" title="Stack and source">
          <dl className="grid gap-4">
            {STACK.map(([name, text]) => <div className="grid gap-1 border-b border-zinc-100 pb-4 last:border-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6 dark:border-zinc-900" key={name}>
              <dt className={H3}>{name}</dt>
              <dd className="m-0 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</dd>
            </div>)}
          </dl>
          <p className={`${BODY} mt-8`}>The code is open source under the MIT licence. Read it, run it, or open an issue on <a className={LINK} href={REPO_URL} rel="noreferrer" target="_blank">GitHub</a>.</p>
        </Section>
        </ScrollIndex>
      </article>
    </div>
  </main>;
}
