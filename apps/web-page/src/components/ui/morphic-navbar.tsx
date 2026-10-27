import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

export type MorphicNavItem = {
  title: string;
  value: string;
};

type MorphicNavbarProps = {
  items: MorphicNavItem[];
  value: string;
  semanticValue?: string;
  onValueChange: (value: string, meta: { input: 'pointer' | 'keyboard' }) => void;
  containerClassName?: string;
  activeItemClassName?: string;
  itemClassName?: string;
  indicatorClassName?: string;
  ariaLabel?: string;
  itemId?: (value: string) => string;
  panelId?: (value: string) => string;
};

export function MorphicNavbar({
  items,
  value,
  semanticValue = value,
  onValueChange,
  containerClassName,
  activeItemClassName,
  itemClassName,
  indicatorClassName,
  ariaLabel = 'Navigation',
  itemId = (itemValue) => `nav-item-${itemValue}`,
  panelId = (itemValue) => `nav-panel-${itemValue}`,
}: MorphicNavbarProps) {
  const reduceMotion = useReducedMotion();
  const [inputMode, setInputMode] = useState<'pointer' | 'keyboard'>('pointer');
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (nextValue: string, input: 'pointer' | 'keyboard') => {
    setInputMode(input);
    onValueChange(nextValue, { input });
  };

  const onKeyDown = (event: ReactKeyboardEvent, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    const nextItem = items[nextIndex];
    select(nextItem.value, 'keyboard');
    itemRefs.current[nextItem.value]?.focus();
  };

  return (
    <div className={cn(containerClassName)} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const active = value === item.value;
        const selected = semanticValue === item.value;
        return (
          <button
            aria-controls={panelId(item.value)}
            aria-selected={selected}
            className={cn(itemClassName, active && activeItemClassName)}
            data-active={active}
            id={itemId(item.value)}
            key={item.value}
            onClick={(event) => select(item.value, event.detail === 0 ? 'keyboard' : 'pointer')}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPointerDown={() => setInputMode('pointer')}
            ref={(element) => { itemRefs.current[item.value] = element; }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {active ? (
              <motion.span
                aria-hidden="true"
                className={cn(indicatorClassName)}
                layoutId="snapgrade-morphic-nav-pill"
                transition={reduceMotion || inputMode === 'keyboard'
                  ? { duration: 0 }
                  : { duration: 0.24, ease: [0.77, 0, 0.175, 1] }}
              />
            ) : null}
            <span className="result-read__view-tab-label">{item.title}</span>
          </button>
        );
      })}
    </div>
  );
}
