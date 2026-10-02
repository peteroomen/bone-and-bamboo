/**
 * Settings panels for playing offline: installing the game as an app, and moving your progress to
 * another browser or into the home-screen app.
 */
import { useRef, useState } from 'react';
import { ConfirmSheet } from '@/ui/game/ConfirmSheet';
import { promptInstall, pwaState, usePwa } from '@/ui/state/pwa';
import { getState, replaceSave } from '@/ui/state/store';
import { decodeSave, encodeSave, saveFileJson } from '@/ui/state/transfer';

export function InstallPanel() {
  const pwa = usePwa();
  return (
    <section className="panel" data-testid="install-panel">
      <h3>Play offline</h3>
      <p className="offline-status" data-testid="offline-status" data-status={pwa.offline}>
        {pwa.offline === 'ready'
          ? '✓ The whole game is on this device and plays without a connection.'
          : pwa.offline === 'preparing'
            ? 'Getting ready for offline play…'
            : 'Offline play starts once the game has loaded online.'}
      </p>
      {pwa.installed ? (
        <p data-testid="install-done">Installed as an app. Your saves stay on this device.</p>
      ) : pwa.canPrompt ? (
        <>
          <p>Install it as an app: its own icon and window, no browser bar.</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => void promptInstall()}
            data-testid="btn-install"
          >
            Install app
          </button>
        </>
      ) : pwa.ios ? (
        <div data-testid="install-ios">
          <p>
            To install it, open this page in Safari, tap <b>Share</b> (the square with an arrow),
            then <b>Add to Home Screen</b>.
          </p>
          <p>
            The home-screen app keeps its own saves, apart from Safari&apos;s. To bring this run
            with you, copy a save code below and load it in the app.
          </p>
        </div>
      ) : (
        <p data-testid="install-menu">
          To install it, look for Install app or Add to Home screen in your browser’s menu. Not
          every browser offers it; the game still plays offline in a tab.
        </p>
      )}
    </section>
  );
}

function download(text: string): void {
  const day = new Date().toISOString().slice(0, 10);
  const name = `bone-and-bamboo-${day}.json`;
  const blob = new Blob([text], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (pwaState().ios && navigator.canShare?.({ files: [file] })) {
    void navigator.share({ files: [file], title: 'Bone & Bamboo save' }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TransferPanel() {
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  /** A decoded save waiting on the player's yes. */
  const [pending, setPending] = useState<{
    save: Parameters<typeof replaceSave>[0];
    msg: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = () => {
    const { settings, profile, run } = getState();
    return { settings, profile, run };
  };

  const copy = async () => {
    const c = encodeSave(current());
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setNote('Copied. Paste it into Load save on the other device.');
    } catch {
      setNote('Copy this code and paste it into Load save on the other device.');
    }
  };

  const load = (text: string) => {
    const res = decodeSave(text);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const { profile, run } = res.save;
    const what = run ? `a run in round ${run.roundIndex + 1}` : 'no run in progress';
    const msg =
      `It has ${profile.runsPlayed} runs played and ${what}.` +
      (res.droppedRun ? ' Its finished run is left out.' : '') +
      ' Your progress here will be replaced.';
    setPending({ save: res.save, msg });
  };

  return (
    <section className="panel" data-testid="transfer-panel">
      <h3>Move your progress</h3>
      <p>
        Saves live in this browser. To carry your unlocks and the current run to another browser or
        device, copy a save code or save a file, then load it there.
      </p>
      <div className="transfer-row">
        <button
          type="button"
          className="btn"
          onClick={() => void copy()}
          data-testid="btn-copy-save"
        >
          Copy code
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => download(saveFileJson(current()))}
          data-testid="btn-save-file"
        >
          Save file
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setLoading((v) => !v);
            setError('');
          }}
          data-testid="btn-load-save"
        >
          Load save
        </button>
      </div>
      {code !== null && (
        <>
          <textarea
            className="save-code"
            readOnly
            value={code}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            data-testid="save-code"
          />
          <p className="muted">{note}</p>
        </>
      )}
      {loading && (
        <>
          <textarea
            className="save-code"
            value={paste}
            rows={3}
            placeholder="Paste a save code here"
            onChange={(e) => {
              setPaste(e.target.value);
              setError('');
            }}
            data-testid="load-code"
          />
          {error && (
            <p className="picker-error" role="alert" data-testid="load-error">
              {error}
            </p>
          )}
          <div className="transfer-row">
            <button
              type="button"
              className="btn primary"
              disabled={!paste.trim()}
              onClick={() => load(paste)}
              data-testid="btn-load-code"
            >
              Load code
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Open file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json,text/plain"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void f.text().then(load);
              }}
              data-testid="load-file"
            />
          </div>
        </>
      )}
      {pending && (
        <ConfirmSheet
          title="Load this save?"
          body={pending.msg}
          action="Load"
          onConfirm={() => {
            setPending(null);
            replaceSave(pending.save);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
