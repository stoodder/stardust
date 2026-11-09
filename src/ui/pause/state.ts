// The pause menu's view model (T316): open or not. app/pause.ts opens and closes it; the router
// closes it whenever a battle stops.
import { signal } from '@preact/signals';

/** The pause menu is open over the battle (the sim is frozen and the HUD inert behind it). */
export const pauseMenu = signal(false);
