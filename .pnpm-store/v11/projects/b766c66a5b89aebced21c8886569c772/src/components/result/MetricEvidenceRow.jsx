import React from 'react';
import { MorphIcon } from "morphicons/react";
import { Plus, Minus, ArrowUpRight, Play } from "lucide";

export function MetricEvidenceRow({ metric, isExpanded, onToggle }) {
  const assessmentNorm = metric.assessment ? String(metric.assessment).toLowerCase().replace(/\s+/g, '-') : '';
  const isEligibleForLearn = assessmentNorm === 'needs-work' || assessmentNorm === 'developing';

  return (
    <div className={`group border-b border-zinc-200 dark:border-zinc-800 transition-colors ${isExpanded ? 'bg-zinc-50/50 dark:bg-zinc-900/50' : ''}`}>
      <button 
        type="button" 
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between py-5 px-4 md:px-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <div className="flex items-center gap-4">
          <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">
            {metric.label}
          </h3>
          {metric.assessment && (
            <span className={`px-2.5 py-1 text-xs font-medium uppercase tracking-wider rounded-full 
              ${assessmentNorm === 'excellent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                assessmentNorm === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                assessmentNorm === 'developing' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                assessmentNorm === 'needs-work' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
              {metric.assessment}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          {metric.score !== null && metric.score !== undefined && (
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {metric.score}
            </span>
          )}
          <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors flex items-center justify-center w-5 h-5">
            <MorphIcon icon={isExpanded ? Minus : Plus} spring="snappy" strokeWidth={2} size={20} color="currentColor" />
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 md:px-6 pb-8 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mt-4">
            
            {/* Left Column: Observation */}
            <div className="md:col-span-5 space-y-6">
              {metric.saw && (
                <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h4 className="text-[11px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                    What Snapgrade Saw
                  </h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {metric.saw}
                  </p>
                </div>
              )}
              
              {metric.matters && (
                <div>
                  <h4 className="text-[11px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                    Why It Matters
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {metric.matters}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Explanatory & Actionable */}
            <div className="md:col-span-7 space-y-8">
              {(metric.works || metric.improve || metric.try) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {metric.works && (
                    <div>
                      <h4 className="text-[11px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        What's Working
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {metric.works}
                      </p>
                    </div>
                  )}
                  
                  {metric.improve && (
                    <div>
                      <h4 className="text-[11px] font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Needs Improvement
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {metric.improve}
                      </p>
                    </div>
                  )}

                  {metric.try && (
                    <div className="sm:col-span-2 bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 mt-2">
                      <h4 className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase mb-2">
                        Try This Next
                      </h4>
                      <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
                        {metric.try}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Learning Section */}
              {metric.learn && (metric.learn.url || metric.learn.youtube_url || metric.learn.youtube_link) && isEligibleForLearn && (
                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-[11px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase mb-4">
                    Learn & Grow
                  </h4>
                  <a 
                    href={metric.learn.url || metric.learn.youtube_url || metric.learn.youtube_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="group/lesson flex flex-col sm:flex-row gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                  >
                    {metric.learn.thumbnail && (
                      <div className="relative w-full sm:w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                        <img 
                          src={metric.learn.thumbnail} 
                          alt="" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/lesson:scale-105" 
                          onError={(e) => { 
                            if (metric.learn.thumbnail_fallback_url && e.currentTarget.src !== metric.learn.thumbnail_fallback_url) {
                              e.currentTarget.src = metric.learn.thumbnail_fallback_url; 
                            }
                          }} 
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover/lesson:bg-black/10 transition-colors flex items-center justify-center">
                          <MorphIcon icon={Play} color="white" size={28} className="opacity-80 group-hover/lesson:opacity-100 group-hover/lesson:scale-110 transition-all" />
                        </div>
                        {metric.learn.duration && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded shadow-sm backdrop-blur-sm">
                            {metric.learn.duration}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <strong className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-1 group-hover/lesson:text-indigo-600 dark:group-hover/lesson:text-indigo-400 transition-colors">
                        {metric.learn.learning_goal || metric.learn.title}
                      </strong>
                      
                      {(metric.learn.creator || metric.learn.channel) && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                          {metric.learn.creator || metric.learn.channel}
                        </div>
                      )}
                      
                      {(metric.learn.reason || metric.improve || metric.works) && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
                          {metric.learn.reason || metric.improve || metric.works}
                        </p>
                      )}
                      
                      <div className="mt-auto flex items-center text-[11px] font-bold tracking-wider text-zinc-900 dark:text-white uppercase">
                        Watch on YouTube
                        <span className="ml-1 opacity-50 group-hover/lesson:opacity-100 group-hover/lesson:translate-x-0.5 group-hover/lesson:-translate-y-0.5 transition-all flex items-center justify-center">
                          <MorphIcon icon={ArrowUpRight} size={14} color="currentColor" />
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
