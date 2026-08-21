"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ReadPerspectiveProps {
  stage: number;
}

const content = [
  {
    id: 0,
    top: "The Read",
    title: "One photograph.\nSix ways to understand it.",
    desc: "Snapgrade looks beyond a single score.\nIt examines the technical and visual decisions\nthat shape how a photograph feels."
  },
  {
    id: 1,
    title: "A photograph.",
    desc: ""
  },
  {
    id: 2,
    top: "01 / COMPOSITION",
    title: "How the frame guides attention.",
    desc: ""
  },
  {
    id: 3,
    top: "02 / LIGHT",
    title: "How contrast shapes emotion.",
    desc: ""
  },
  {
    id: 4,
    top: "03 / SUBJECT",
    title: "What the photograph chooses to show.",
    desc: ""
  },
  {
    id: 5,
    top: "04 / TECHNICAL",
    title: "The decisions behind exposure and focus.",
    desc: ""
  },
  {
    id: 6,
    top: "05 / FEELING",
    title: "Why the image stays with you.",
    desc: ""
  }
];

export function ReadPerspective({ stage }: ReadPerspectiveProps) {
  const current = content.find(c => c.id === stage) || content[0];

  return (
    <div className="relative w-full h-full flex flex-col justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-6"
        >
          {current.top && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {current.id === 0 ? (
                <h2 className="text-4xl md:text-5xl lg:text-[4.5rem] font-medium tracking-tight leading-[1.1]">
                  {current.top}
                </h2>
              ) : (
                <span className="text-xs font-mono tracking-[0.2em] text-white/50 uppercase">
                  {current.top}
                </span>
              )}
            </motion.div>
          )}
          
          <h3 className={`font-medium tracking-tight leading-tight whitespace-pre-line ${current.id === 0 ? 'text-2xl md:text-3xl opacity-90' : 'text-3xl md:text-4xl lg:text-5xl'}`}>
            {current.title}
          </h3>

          {current.desc && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-white/60 text-base md:text-lg max-w-md mt-4 whitespace-pre-line font-light leading-relaxed"
            >
              {current.desc}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
