import { type RefObject, useLayoutEffect, useRef } from 'react';
import { speedFactor } from '@/ui/state/store';
import { useStage } from './stageSize';

/**
 * Animates every [data-flip] element from where it was on the last render to where it is now, so a
 * tile that moves from the hand to the table visibly flies there. The
 * elements may be in different parents; they are matched by their data-flip id.
 */
export function useFlip(root: RefObject<HTMLElement | null>): void {
  const prev = useRef(new Map<string, DOMRect>());
  const { scale } = useStage();
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const f = speedFactor();
    const next = new Map<string, DOMRect>();
    const items = el.querySelectorAll<HTMLElement>('[data-flip]');
    items.forEach((node) => {
      const id = node.dataset.flip as string;
      const r = node.getBoundingClientRect();
      next.set(id, r);
      const p = prev.current.get(id);
      if (!p || f === 0 || r.width === 0) return;
      const dx = (p.left - r.left) / scale;
      const dy = (p.top - r.top) / scale;
      const sx = p.width / r.width;
      const sy = p.height / r.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.02) return;
      node.style.zIndex = '20';
      const a = node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: '0 0' },
          { transform: 'none', transformOrigin: '0 0' },
        ],
        { duration: 300 * f, easing: 'cubic-bezier(.2,.7,.3,1)' },
      );
      const done = () => {
        node.style.zIndex = '';
      };
      a.onfinish = done;
      a.oncancel = done;
    });
    prev.current = next;
  });
}
