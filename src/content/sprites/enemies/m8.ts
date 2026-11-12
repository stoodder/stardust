// M8's units in gallery order (T841; sprites/index.ts spreads these into SPRITES): the Unsung in
// every form (its growth, its split, its parts, its burrow, the Song, and laid to rest), the choir
// (the singers, Pebble leading them, Old Thrum), and the finale's unit effects (Thrum's echo, the
// song's gold rest motes and violet scatter motes, Ishael's mote, the Deep Bore's drill head).
import { CHOIR_ALLIES } from '../allies/choir.ts';
import { fxBoreHead } from '../fx/bore_head.ts';
import { fxEcho } from '../fx/echo.ts';
import { SONG_MOTES } from '../fx/song_motes.ts';
import { UNSUNG_SPRITES } from './unsung.ts';

export const M8_UNITS = [...UNSUNG_SPRITES] as const;

export const M8_ALLIES = [...CHOIR_ALLIES] as const;

export const M8_UNIT_FX = [fxEcho, ...SONG_MOTES, fxBoreHead] as const;
