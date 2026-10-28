import { useEffect, useRef, useState } from 'react';
import { MorphIcon } from 'morphicons/react';
import SwitchButton from '../kokonutui/switch-button';

const menuPath = 'M4 7h16M4 12h16M4 17h16';
const closePath = 'M6 6l12 12M18 6 6 18';

/**
 * Below desktop width: one floating button that expands into the section list and the theme
 * switch. Closes on a pick, Escape, or a tap outside.
 */
export function SectionMenu({ sections, current, theme, onThemeChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // Top left, beside the logo; the panel drops down from the button. The wrapper lets taps
  // through, so the closed panel's empty box never blocks the page beneath it.
  return <div className="pointer-events-none fixed top-3.5 left-4 z-50 flex flex-col items-start gap-3 lg:hidden" ref={rootRef}>
    <button
      type="button"
      className="pointer-events-auto grid size-12 place-items-center rounded-full bg-zinc-900 text-white shadow-lg transition-colors duration-150 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="section-menu"
      onClick={() => setOpen((value) => !value)}
    >
      <MorphIcon icon={open ? closePath : menuPath} spring="snappy" strokeWidth={1.75} size={20} color="currentColor" />
    </button>
    <div
      className={`w-56 origin-top-left rounded-xl border border-zinc-200 bg-white p-2 shadow-lg transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-950 ${open ? 'pointer-events-auto scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      id="section-menu"
      inert={!open}
    >
      {sections.length > 0 && <nav aria-label="Jump to section">
        <ul>
          {sections.map(([id, name]) => <li key={id}>
            <a
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-900 ${current === id ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}
              href={`#${id}`}
              aria-current={current === id ? 'location' : undefined}
              onClick={() => setOpen(false)}
            >
              {name}
              {current === id && <span className="size-1.5 rounded-full bg-[#b8924a]" aria-hidden="true" />}
            </a>
          </li>)}
        </ul>
      </nav>}
      <div className={`flex items-center justify-between px-3 py-2 ${sections.length > 0 ? 'mt-1 border-t border-zinc-100 pt-3 dark:border-zinc-900' : ''}`}>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#856324] dark:text-[#d2b16e]">Theme</span>
        <SwitchButton size="sm" theme={theme} onThemeChange={onThemeChange} />
      </div>
    </div>
  </div>;
}
