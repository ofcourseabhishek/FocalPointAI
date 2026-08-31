import { ArrowUpRight } from "lucide-react";

export function CallToAction() {
  // The upload application is deployed separately; README.md records this URL.
  const analyzerUrl =
    process.env.NEXT_PUBLIC_ANALYZER_URL || "https://focalpoint-ai.vercel.app";

  return (
    <section
      id="try-snapgrade"
      aria-labelledby="try-snapgrade-heading"
      className="relative w-full bg-[#F5F4F0] px-6 pb-28 font-sans text-[#171714] selection:bg-[#171714] selection:text-[#F5F4F0] md:px-[clamp(24px,5vw,80px)] md:pb-40 lg:px-[var(--page-inset)] lg:pb-36"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col items-center border-t border-[#171714]/20 pt-24 text-center md:pt-32 lg:max-w-none lg:items-start lg:border-0 lg:pt-0 lg:text-left">
        <h2
          id="try-snapgrade-heading"
          className="max-w-[1000px] text-[clamp(2.75rem,6.7vw,6rem)] font-normal leading-[1.02] tracking-[-0.035em] text-balance lg:max-w-[34rem] lg:text-[clamp(1.5rem,2.25vw,2.25rem)] lg:leading-[1.2] lg:tracking-[-0.025em]"
        >
          <span className="lg:hidden">See what your photograph is telling you.</span>
          <span className="hidden lg:block">
            <span className="text-[#171714]/65">Snapgrade doesn’t just grade the frame.</span>
            <br />
            It helps you make the next one better.
          </span>
        </h2>
        <a
          href={analyzerUrl}
          className="group mt-10 inline-flex min-h-14 items-center gap-8 border border-[#171714] bg-[#171714] px-6 py-4 text-base text-[#F5F4F0] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#33332e] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171714] motion-reduce:transition-none motion-reduce:active:scale-100 md:mt-12 lg:mt-24"
        >
          Analyze a photo
          <ArrowUpRight aria-hidden="true" className="size-[18px]" strokeWidth={1.5} />
        </a>
      </div>
    </section>
  );
}
