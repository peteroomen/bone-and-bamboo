import { COLOURWAYS } from '@/content/colourways';
import { DRAGON_IDS, DRAGONS } from '@/content/dragons';
import { HOSTS } from '@/content/hosts';
import { WIND_NAMES } from '@/content/rules';
import { LANTERNS } from '@/content/targets';
import { TILE_SETS } from '@/content/tilesets';
import {
  colourwayUnlocked,
  lanternReached,
  tileSetCondition,
  tileSetUnlocked,
} from '@/engine/profile';
import { DragonGlyph } from '@/ui/game/Cards';
import { allUnlocked, useStore, useTheme } from '@/ui/state/store';
import { ScreenFrame } from './ScreenFrame';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Tile sets and lanterns, every dragon, the hosts met, the colourways and your records. */
export function Collection() {
  const profile = useStore((s) => s.profile);
  const theme = useTheme();
  const all = allUnlocked();
  return (
    <ScreenFrame title="Collection" testId="collection">
      <section data-testid="col-sets">
        <h3>Tile sets and lanterns</h3>
        <ul className="rows">
          {TILE_SETS.map((t) => {
            const open = all || tileSetUnlocked(profile, t.id);
            const lit = all ? LANTERNS.length : lanternReached(profile, t.id);
            return (
              <li key={t.id} className={open ? '' : 'locked'} data-testid={`col-set-${t.id}`}>
                <span>
                  <b>{open ? t.name : '???'}</b>
                  <span>{open ? t.text : tileSetCondition(t.id)}</span>
                </span>
                <span className="pips" aria-label={`Lantern ${lit} of ${LANTERNS.length}`}>
                  {LANTERNS.map((l) => (
                    <i key={l.level} className={open && l.level <= lit ? 'lit' : ''} />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section data-testid="col-dragons">
        <h3>
          Dragons {profile.dragonsSeen.length}/{DRAGON_IDS.length}
        </h3>
        <ul className="dragon-grid">
          {DRAGON_IDS.map((id) => {
            const seen = all || profile.dragonsSeen.includes(id);
            const owned = profile.dragonsOwned.includes(id);
            return (
              <li
                key={id}
                data-testid={`col-dragon-${id}`}
                data-state={owned ? 'owned' : seen ? 'seen' : 'locked'}
                className={seen ? '' : 'locked'}
              >
                {seen ? (
                  <DragonGlyph id={id} size={52} />
                ) : (
                  <span className="silhouette" aria-hidden />
                )}
                <b>{seen ? DRAGONS[id]?.name : '???'}</b>
                {owned && <i>owned</i>}
              </li>
            );
          })}
        </ul>
      </section>

      <section data-testid="col-hosts">
        <h3>Winds met</h3>
        <ul className="rows">
          {HOSTS.map((h) => {
            const met = all || profile.hostsMet.includes(h.id);
            const beaten = profile.stormsBeaten.includes(h.id);
            return (
              <li key={h.id} className={met ? '' : 'locked'}>
                <span>
                  <b>
                    {WIND_NAMES[h.wind]} {h.storm ? 'storm' : 'calm'}
                  </b>
                  <span>{met ? `${h.title}: ${h.twistText}` : '???'}</span>
                </span>
                {h.storm && beaten && <i className="tag">calmed</i>}
              </li>
            );
          })}
        </ul>
      </section>

      <section data-testid="col-colourways">
        <h3>Colourways</h3>
        <ul className="rows">
          {COLOURWAYS.map((c) => {
            const open = all || colourwayUnlocked(profile, c.id);
            return (
              <li key={c.id} className={open ? '' : 'locked'} data-testid={`col-colourway-${c.id}`}>
                <span>
                  <b>{open ? c.name : '???'}</b>
                  <span>{open ? c.text : c.condition}</span>
                </span>
                {c.id === theme && <i className="tag">in use</i>}
              </li>
            );
          })}
        </ul>
      </section>

      <section data-testid="col-records">
        <h3>Records</h3>
        <ul className="rows">
          <li>
            <span>Runs won</span>
            <b>
              {profile.runsWon} of {profile.runsPlayed}
            </b>
          </li>
          <li>
            <span>Best round</span>
            <b>{fmt(profile.bestRound)}</b>
          </li>
          <li>
            <span>Best run (four rounds)</span>
            <b>{fmt(profile.bestRun)}</b>
          </li>
          <li>
            <span>Biggest single set</span>
            <b>{fmt(profile.bigSet)}</b>
          </li>
        </ul>
      </section>
    </ScreenFrame>
  );
}
