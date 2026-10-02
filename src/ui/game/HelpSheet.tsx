import { useState } from 'react';
import { DRAGON_IDS, DRAGONS } from '@/content/dragons';
import { SET_ORDER, SET_TYPES, type SetKind } from '@/content/sets';
import { TileView } from '@/ui/art/Tile';
import { type HintLevel, updateSettings, useStore, useTheme } from '@/ui/state/store';
import { DragonGlyph } from './Cards';
import { Guide } from './GuideBubble';
import { Sheet } from './Sheet';

type Tab = 'intro' | 'sets' | 'dragons' | 'hints';

const EXAMPLES: Record<SetKind, string[]> = {
  single: ['p5'],
  pair: ['s7', 's7'],
  chow: ['m3', 'm4', 'm5'],
  pong: ['p9', 'p9', 'p9'],
  kong: ['s2', 's2', 's2', 's2'],
  winds: ['w1', 'w2', 'w3', 'w4'],
};

function Example({ kinds, base }: { kinds: string[]; base: number }) {
  const theme = useTheme();
  return (
    <span className="example">
      {kinds.map((k, i) => (
        <TileView key={i} tile={{ id: -base - i, kind: k }} theme={theme} />
      ))}
    </span>
  );
}

const HINTS: { id: HintLevel; name: string; text: string }[] = [
  { id: 'off', name: 'Off', text: 'No help on the tiles.' },
  { id: 'sets', name: 'Sets', text: 'Tiles in your hand that form a set glow.' },
  {
    id: 'full',
    name: 'Full',
    text: 'Also outlines the move the guide would make.',
  },
];

/**
 * Help: the introduction (replayable), the illustrated set book, every dragon's rule and the hint
 * level. It opens from the round, the teahouse and the title.
 */
export function HelpSheet({
  onClose,
  start = 'intro',
  levels = {},
  owned = [],
}: {
  onClose: () => void;
  start?: Tab;
  levels?: Partial<Record<SetKind, number>>;
  owned?: readonly string[];
}) {
  const [tab, setTab] = useState<Tab>(start);
  const hints = useStore((s) => s.settings.hints);
  const tabs: [Tab, string][] = [
    ['intro', 'How to play'],
    ['sets', 'Set book'],
    ['dragons', 'Dragons'],
    ['hints', 'Hints'],
  ];
  return (
    <Sheet title="Help" onClose={onClose} testId="sheet-help">
      <div className="tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`tab${tab === t ? ' on' : ''}`}
            data-testid={`help-tab-${t}`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'intro' && (
        <div className="help" data-testid="help-intro">
          <div className="help-guide">
            <Guide mood="point" size={64} />
            <p>
              I am the Red Dragon, your guide. Ask me any time: tap <b>Ask</b> and I will say what I
              would do.
            </p>
          </div>
          <section>
            <h4>Your hand</h4>
            <Example kinds={['m8', 'p3', 's5']} base={1} />
            <p>
              Your tiles are shuffled into a face-down pile and you are dealt a hand. Each time you
              play or discard, the hand refills from the pile. A round gives you a set number of
              plays and discards.
            </p>
          </section>
          <section>
            <h4>Sets</h4>
            <Example kinds={['s7', 's7', 'm3', 'm4', 'm5']} base={10} />
            <p>
              Pick tiles that make a set and tap <b>Play</b>. A chow is three in a row of one suit;
              a pair, pong or kong is two, three or four alike. Nothing to play? <b>Discard</b> up
              to 5 tiles to dig for better ones.
            </p>
          </section>
          <section>
            <h4>Scoring</h4>
            <p>
              When your plays run out, the whole table scores at once: chips × mult. Beat the target
              to win the round. Once you have beaten it you may <b>bank</b> the table early and keep
              your spare discards.
            </p>
          </section>
          <section>
            <h4>Kongs</h4>
            <Example kinds={['p9', 'p9', 'p9', 'p9']} base={20} />
            <p>
              Hold the fourth tile of a pong already on your table? Spend one play to <b>upgrade</b>{' '}
              it to a kong.
            </p>
          </section>
          <section>
            <h4>Dragons</h4>
            <p>
              Dragons are tiles with a power, like jokers. They sit in your dragon row and change
              the score. Buy them at the teahouse. The Set book and the Dragons tab list every rule.
            </p>
          </section>
        </div>
      )}

      {tab === 'sets' && (
        <ul className="sheet-list help-sets" data-testid="help-sets">
          {SET_ORDER.slice()
            .reverse()
            .map((k, i) => {
              const t = SET_TYPES[k];
              const lv = levels[k] ?? 0;
              return (
                <li key={k}>
                  <Example kinds={EXAMPLES[k]} base={100 + i * 10} />
                  <span>
                    <b>
                      {t.name}
                      {lv ? ` · level ${lv + 1}` : ''}
                    </b>
                    <span>
                      {t.blurb} {t.chips + t.levelChips * lv} chips, +{t.mult + t.levelMult * lv}{' '}
                      mult
                      {t.levelChips
                        ? `; a page adds ${t.levelChips} chips, ${t.levelMult} mult`
                        : ''}
                      .
                    </span>
                  </span>
                </li>
              );
            })}
          <li className="muted">
            A suited tile is worth its rank in chips; a wind is worth 10. Winds never go in a chow.
          </li>
        </ul>
      )}

      {tab === 'dragons' && (
        <ul className="sheet-list" data-testid="help-dragons">
          {DRAGON_IDS.map((id) => {
            const d = DRAGONS[id];
            if (!d) return null;
            return (
              <li key={id}>
                <DragonGlyph id={id} size={44} />
                <span>
                  <b>
                    {d.name}
                    {owned.includes(id) ? ' · yours' : ''}
                  </b>
                  <span>{d.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'hints' && (
        <div className="help" data-testid="help-hints">
          <p className="muted">How much help the tiles give. It is saved.</p>
          <div className="tabs" role="radiogroup" aria-label="Hint level">
            {HINTS.map((h) => (
              <button
                key={h.id}
                type="button"
                role="radio"
                aria-checked={hints === h.id}
                className={`tab${hints === h.id ? ' on' : ''}`}
                data-testid={`hint-${h.id}`}
                onClick={() => updateSettings({ hints: h.id })}
              >
                {h.name}
              </button>
            ))}
          </div>
          <p>{HINTS.find((h) => h.id === hints)?.text}</p>
        </div>
      )}
    </Sheet>
  );
}
