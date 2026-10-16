import { useEffect, useRef, useState } from 'react';
import type { TileKind } from '@/content/tiles';
import type { ScoreStep } from '@/engine/scoring';
import type { RackSet } from '@/engine/sets';
import { TileView } from '@/ui/art/Tile';
import { haptics, sfx } from '@/ui/audio/audio';
import { busyEnd, busyStart, onEvents, speedFactor, useTheme } from '@/ui/state/store';

interface Count {
  rack: readonly RackSet[];
  shelf: readonly TileKind[];
  steps: readonly ScoreStep[];
  total: number;
  roundScore: number;
}

const fmt = (n: number) => n.toLocaleString('en-GB');

/**
 * Mahjong! The finished hand is counted step by step, Balatro-style: each set, the hand, the
 * flowers and seasons, every pattern, then the charms; chips on the left, mult on the right.
 */
export function ScoreCount() {
  const theme = useTheme();
  const [count, setCount] = useState<Count | null>(null);
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(
    () =>
      onEvents((events) => {
        for (const ev of events) {
          if (ev.type === 'round' && ev.event.type === 'mahjong') {
            const e = ev.event;
            busyStart();
            setShown(0);
            setCount({
              rack: e.rack,
              shelf: e.shelf,
              steps: e.score.steps,
              total: e.score.total,
              roundScore: e.roundScore,
            });
          }
        }
      }),
    [],
  );

  const finish = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setCount(null);
    window.dispatchEvent(new Event('bb:counted'));
    busyEnd();
  };

  useEffect(() => {
    if (!count) return;
    const speed = speedFactor();
    const n = count.steps.length;
    if (speed === 0) {
      setShown(n + 1);
      timer.current = window.setTimeout(finish, 30);
      return;
    }
    if (shown <= n) {
      timer.current = window.setTimeout(
        () => {
          if (shown < n) {
            const step = count.steps[shown];
            if (step?.xmult) sfx.kong();
            else sfx.tick(shown);
          } else {
            sfx.win();
            haptics.win();
          }
          setShown(shown + 1);
        },
        (shown === 0 ? 650 : 300) * speed,
      );
    } else {
      timer.current = window.setTimeout(finish, 1500 * speed);
    }
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
    // finish is stable enough: it only touches refs and setters
  }, [count, shown]);

  if (!count) return null;
  const done = count.steps.slice(0, shown);
  let chips = 0;
  let mult = 0;
  let xmult = 1;
  for (const s of done) {
    chips += s.chips ?? 0;
    mult += s.mult ?? 0;
    xmult *= s.xmult ?? 1;
  }
  const current = done[done.length - 1];
  const finished = shown > count.steps.length;
  return (
    <div className="count-overlay" role="dialog" aria-label="Mahjong" onClick={finish}>
      <div className="count-panel">
        <div className="count-title">Mahjong!</div>
        <div className="count-hand">
          {count.rack.map((s, i) => (
            <span className="count-set" key={i}>
              {s.tiles.map((t, j) => (
                <TileView key={j} kind={t.kind} enh={t.enh} theme={theme} />
              ))}
            </span>
          ))}
          {count.shelf.length ? (
            <span className="count-set bonus">
              {count.shelf.map((k, j) => (
                <TileView key={j} kind={k} theme={theme} />
              ))}
            </span>
          ) : null}
        </div>
        <div className="count-step" key={shown}>
          {current ? (
            <>
              <b>{current.label}</b>
              {current.chips ? <span className="chips">+{current.chips}</span> : null}
              {current.mult ? <span className="mult">+{current.mult}</span> : null}
              {current.xmult ? <span className="xmult">×{current.xmult}</span> : null}
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
        <div className="count-sum">
          <span className="chips box">{fmt(chips)}</span>
          <span className="times">×</span>
          <span className="mult box">{fmt(mult)}</span>
          {xmult !== 1 ? (
            <>
              <span className="times">×</span>
              <span className="xmult box">{Math.round(xmult * 100) / 100}</span>
            </>
          ) : null}
        </div>
        <div className={`count-total ${finished ? 'show' : ''}`}>
          {finished ? fmt(count.total) : ' '}
        </div>
        <div className="count-hint">
          {finished ? `Round score ${fmt(count.roundScore)}` : 'Tap to skip'}
        </div>
      </div>
    </div>
  );
}
