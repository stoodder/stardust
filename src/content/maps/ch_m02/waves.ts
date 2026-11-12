// CH_M02 waves (Lights Out; T862): A2M6's own waves by reference (Sundown's Motes, Fractures, and
// Rift Moths down the two roads and over the wall), every unit cloaked by the map's rule. An edit
// to A2M6's waves flows here. A2M6's teach marks are dropped: nothing here is new to the campaign.
import { defineWaves } from '../../define.ts';
import { waves as a2m06 } from '../a2_m06/waves.ts';

export const waves = defineWaves(a2m06.map(({ teach: _teach, ...w }) => w));
