/**
 * Moving your progress between browsers, or from Safari into the home-screen app (on iPhone the
 * two keep separate storage). A save is the settings, the profile and the current run, written as
 * a code you can copy (`BB1.` + base64 of the JSON) or as a JSON file.
 */
import { migrateProfile } from '@/engine/profile';
import type { RunState } from '@/engine/runTypes';
import { DEFAULT_SETTINGS, type Profile, type Settings } from './store';

export interface SaveData {
  settings: Settings;
  profile: Profile;
  run: RunState | null;
}

const APP = 'bone-and-bamboo';
const PREFIX = 'BB1.';
const NOT_A_SAVE = "That isn't a Bone & Bamboo save code.";

interface SaveFile {
  app: typeof APP;
  v: 1;
  settings: Partial<Settings>;
  profile: Partial<Profile>;
  run: RunState | null;
}

export function saveFileJson(data: SaveData): string {
  const file: SaveFile = { app: APP, v: 1, ...data };
  return JSON.stringify(file);
}

export function encodeSave(data: SaveData): string {
  const bytes = new TextEncoder().encode(saveFileJson(data));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return PREFIX + btoa(bin);
}

export type DecodeResult =
  { ok: true; save: SaveData; droppedRun: boolean } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads a save code or the contents of a save file. */
export function decodeSave(text: string): DecodeResult {
  const trimmed = text.trim();
  let json: string;
  if (trimmed.startsWith('{')) {
    json = trimmed;
  } else {
    const body = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
    try {
      const bin = atob(body.replace(/\s+/g, ''));
      json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch {
      return { ok: false, error: NOT_A_SAVE };
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: NOT_A_SAVE };
  }
  if (!isObject(parsed) || parsed.app !== APP || !isObject(parsed.profile))
    return { ok: false, error: NOT_A_SAVE };
  if (parsed.v !== 1) return { ok: false, error: 'That save is from a newer version of the game.' };

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(isObject(parsed.settings) ? (parsed.settings as Partial<Settings>) : {}),
  };
  const profile = migrateProfile(parsed.profile as Partial<Profile>);
  const raw = parsed.run;
  const usable = isObject(raw) && raw.version === 1 && raw.phase !== 'over' && raw.phase !== 'won';
  const run = usable ? (raw as unknown as RunState) : null;
  return { ok: true, save: { settings, profile, run }, droppedRun: raw != null && !usable };
}
