import { useState } from 'react';
import { COLOURWAYS } from '@/content/colourways';
import { unlockedColourways } from '@/engine/profile';
import { ConfirmSheet } from '@/ui/game/ConfirmSheet';
import {
  type HintLevel,
  type Speed,
  allUnlocked,
  resetProgress,
  updateSettings,
  useStore,
  useTheme,
} from '@/ui/state/store';
import { InstallPanel, TransferPanel } from './OfflineSettings';
import { ScreenFrame } from './ScreenFrame';

function Radios<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  testId: string;
}) {
  return (
    <div className="setting">
      <span className="setting-label">{label}</span>
      <div className="tabs" role="radiogroup" aria-label={label}>
        {options.map(([v, name]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            className={`tab${value === v ? ' on' : ''}`}
            data-testid={`${testId}-${v}`}
            onClick={() => onChange(v)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testId: string;
}) {
  return (
    <label className="setting">
      <span className="setting-label">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);
  const theme = useTheme();
  const [erase, setErase] = useState(false);
  const open = unlockedColourways(profile, allUnlocked());
  return (
    <ScreenFrame title="Settings" testId="settings">
      <section className="panel">
        <Radios<Speed>
          label="Speed"
          testId="speed"
          value={settings.speed}
          options={[
            ['normal', 'Normal'],
            ['fast', 'Fast'],
            ['instant', 'Instant'],
          ]}
          onChange={(speed) => updateSettings({ speed })}
        />
        <Radios<HintLevel>
          label="Hints"
          testId="hints"
          value={settings.hints}
          options={[
            ['off', 'Off'],
            ['sets', 'Sets'],
            ['full', 'Full'],
          ]}
          onChange={(hints) => updateSettings({ hints })}
        />
        <Radios
          label="Colourway"
          testId="colourway"
          value={theme}
          options={COLOURWAYS.filter((c) => open.includes(c.id)).map(
            (c) => [c.id, c.name] as const,
          )}
          onChange={(colourway) => updateSettings({ colourway })}
        />
        {open.length < COLOURWAYS.length && (
          <p className="muted">More colourways unlock as you play. See the Collection.</p>
        )}
      </section>
      <section className="panel">
        <Slider
          label="Sound effects"
          testId="sfx"
          value={settings.sfx}
          onChange={(sfx) => updateSettings({ sfx })}
        />
        <Slider
          label="Music"
          testId="music"
          value={settings.music}
          onChange={(music) => updateSettings({ music })}
        />
        <Slider
          label="Ambience"
          testId="ambience"
          value={settings.ambience}
          onChange={(ambience) => updateSettings({ ambience })}
        />
        <Radios<'on' | 'off'>
          label="Haptics"
          testId="haptics"
          value={settings.haptics ? 'on' : 'off'}
          options={[
            ['on', 'On'],
            ['off', 'Off'],
          ]}
          onChange={(v) => updateSettings({ haptics: v === 'on' })}
        />
      </section>
      <InstallPanel />
      <TransferPanel />
      <section className="panel" data-testid="credits">
        <h3>Credits</h3>
        <p>
          <b>Bone &amp; Bamboo</b> is a roguelike made with mahjong tiles. The tiles, the guide and
          the dragons’ frames are drawn in code; the tile faces and dragon pictures are traced from
          art made for the game. Every sound is synthesised in your browser.
        </p>
        <p>
          Characters are set in Noto Serif SC (SIL Open Font License) where the device has no CJK
          serif.
        </p>
      </section>
      <button
        type="button"
        className="btn ghost danger"
        data-testid="btn-reset"
        onClick={() => setErase(true)}
      >
        Reset all progress
      </button>
      {erase && (
        <ConfirmSheet
          title="Reset all progress?"
          body="This erases every unlock, record and the current run. It can't be undone."
          action="Erase"
          onConfirm={() => {
            setErase(false);
            resetProgress();
          }}
          onCancel={() => setErase(false)}
        />
      )}
    </ScreenFrame>
  );
}
