// UI view models (signals). The host updates them; components read them.
import { signal } from '@preact/signals';
import type { ScreenId, Speed } from '../app/testHookTypes.ts';

/** The screen the overlay shows. `null` while booting. */
export const screen = signal<ScreenId | null>(null);

/** Game speed. The host loop reads it from T112. */
export const speed = signal<Speed>(1);
