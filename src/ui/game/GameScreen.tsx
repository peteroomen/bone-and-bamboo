import { useCallback, useEffect, useMemo, useState } from 'react';
import { advise, bestPlan, takeFits, takeOptions } from '@/engine/advice';
import type { RoundState } from '@/engine/round';
import { playEvents, setScene } from '@/ui/audio/audio';
import { dispatch, getState, onEvents, setState, useStore } from '@/ui/state/store';
import { DiceLayer } from '@/ui/three/DiceLayer';
import { RackLayer } from '@/ui/three/RackLayer';
import { Table } from '@/ui/three/Table';
import { Cashout, Gift, Shop, ToolSheet } from './Between';
import { EndView } from './EndView';
import { BottomBar, TopBar } from './RoundHud';
import { ScoreCount } from './ScoreCount';
import { CharmSheet, DieSheet, HandBook, HelpSheet, RackSheet, SettingsSheet } from './Sheets';

function useToast(): [string | null, (s: string) => void] {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);
  return [toast, setToast];
}

/** A die was tapped: hold it, or use it for the charm being played. */
function pickDie(round: RoundState, dieId: number, toast: (s: string) => void): void {
  const s = getState();
  if (s.busy > 0) return;
  const mode = s.charmMode;
  const run = (a: Parameters<typeof dispatch>[0]) => {
    const p = dispatch(a);
    if (p) toast(p);
  };
  if (mode) {
    const c = round.cup.find((x) => x.dieId === dieId);
    if (!c || c.face === null || c.spent) {
      toast('Pick a die showing a face.');
      return;
    }
    if (mode.kind === 'tip') setState({ charmMode: { kind: 'tip', dieId } });
    else if (mode.kind === 'flip') {
      setState({ charmMode: null });
      run({ type: 'round', action: { type: 'flip', dieId } });
    } else if (mode.kind === 'fan') {
      setState({ charmMode: null });
      run({ type: 'round', action: { type: 'fan', dieId } });
    } else if (mode.kind === 'mirror') {
      if (mode.dieId === undefined) setState({ charmMode: { kind: 'mirror', dieId } });
      else {
        setState({ charmMode: null });
        run({ type: 'round', action: { type: 'mirror', dieId: mode.dieId, fromDieId: dieId } });
      }
    }
    return;
  }
  run({ type: 'round', action: { type: 'hold', dieId } });
}

export function GameScreen() {
  const run = useStore((s) => s.run);
  const theme = useStore((s) => s.settings.colourway);
  const hints = useStore((s) => s.settings.hints);
  const target = useStore((s) => s.target);
  const sheet = useStore((s) => s.sheet);
  const mode = useStore((s) => s.charmMode);
  const [top, setTop] = useState(120);
  const [bottom, setBottom] = useState(170);
  const [toast, showToast] = useToast();

  useEffect(() => onEvents((events) => playEvents(events)), []);
  const phase = run?.phase;
  const wind = run?.current?.wind ?? 1;
  useEffect(() => {
    if (phase === 'round') setScene({ kind: 'round', wind: wind - 1 });
    else if (phase === 'shop' || phase === 'gift' || phase === 'cashout')
      setScene({ kind: 'shop' });
    else if (phase === 'won') setScene({ kind: 'won' });
    else if (phase === 'over') setScene({ kind: 'over' });
  }, [phase, wind]);

  const round = run?.current ?? null;
  const live = round && run?.phase === 'round' ? round : null;
  const plan = useMemo(() => (live ? bestPlan(live, target ?? undefined) : null), [live, target]);
  const advice = useMemo(
    () => (live && hints ? advise(live, target ? { target } : {}) : null),
    [live, hints, target],
  );
  const takes = useMemo(() => (live ? takeOptions(live) : []), [live]);
  const fits = useCallback(
    (t: Parameters<typeof takeFits>[2]) => (live && plan ? takeFits(live, plan, t) : true),
    [live, plan],
  );
  const hold =
    advice && (advice.action.type === 'hold' || advice.action.type === 'roll') ? advice.hold : [];
  const picks = useMemo(() => {
    if (!live || !mode) return [];
    return live.cup.filter((c) => c.face !== null && !c.spent).map((c) => c.dieId);
  }, [live, mode]);
  const onPick = useCallback(
    (id: number) => {
      const r = getState().run?.current;
      if (r && getState().run?.phase === 'round') pickDie(r, id, showToast);
    },
    [showToast],
  );
  const onLong = useCallback((id: number) => setState({ sheet: { kind: 'die', dieId: id } }), []);
  const onRack = useCallback((i: number) => {
    if (getState().run?.phase === 'round' && getState().busy === 0)
      setState({ sheet: { kind: 'rack', index: i } });
  }, []);

  if (!run) return null;
  // the rack shows what a chosen target still needs
  const ghosts = target ? (plan?.missing ?? []) : [];
  return (
    <div className={`game phase-${run.phase}`}>
      <Table
        theme={theme}
        top={run.phase === 'round' ? top : 40}
        bottom={run.phase === 'round' ? bottom : 40}
      >
        {round ? (
          <>
            <DiceLayer
              round={round}
              theme={theme}
              hint={hold}
              picks={picks}
              onPick={onPick}
              onLong={onLong}
            />
            <RackLayer round={round} theme={theme} ghosts={live ? ghosts : []} onRack={onRack} />
          </>
        ) : null}
      </Table>
      {live && run ? (
        <>
          <TopBar run={run} round={live} theme={theme} onHeight={setTop} />
          <button
            type="button"
            className="menu-btn"
            aria-label="Settings"
            onClick={() => setState({ sheet: { kind: 'settings' } })}
          >
            ☰
          </button>
          <BottomBar
            round={live}
            theme={theme}
            advice={advice}
            plan={plan}
            takes={takes}
            fits={fits}
            onHeight={setBottom}
            onToast={showToast}
          />
        </>
      ) : null}
      {run.phase === 'cashout' ? <Cashout run={run} /> : null}
      {run.phase === 'gift' ? <Gift run={run} theme={theme} /> : null}
      {run.phase === 'shop' ? <Shop run={run} theme={theme} onToast={showToast} /> : null}
      {run.phase === 'over' || run.phase === 'won' ? <EndView run={run} /> : null}
      <ScoreCount />
      {sheet?.kind === 'book' ? <HandBook run={run} round={live} theme={theme} /> : null}
      {sheet?.kind === 'die' ? (
        <DieSheet run={run} round={round} dieId={sheet.dieId} theme={theme} />
      ) : null}
      {sheet?.kind === 'charm' ? <CharmSheet id={sheet.id} theme={theme} run={run} /> : null}
      {sheet?.kind === 'rack' && live ? (
        <RackSheet round={live} index={sheet.index} theme={theme} />
      ) : null}
      {sheet?.kind === 'help' ? <HelpSheet round={live} /> : null}
      {sheet?.kind === 'settings' ? <SettingsSheet /> : null}
      {sheet?.kind === 'tool' ? (
        <ToolSheet run={run} slot={sheet.slot} theme={theme} onToast={showToast} />
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
