# Campaign, Finale: Clearing the Way

The one-map finale, `fin_m01`, from the end of the Long Night to the First Dawn. The campaign overview, introduction schedule, flag ledger, and pacing check are in [../campaign.md](../campaign.md); the entry format is described at the top of [act1.md](act1.md). The finale's song rules are design's, in [maps.md §5.5](../../design/maps.md#55-the-leaving-song-finale-rules); C5 and the endings are in [bible.md §9–10](../bible.md#c5-stay-or-go-after-the-finale-the-ending-variation).

---

## FIN · Clearing the Way

*Walk them home. The choir sings the jingle as a funeral hymn, and your counter counts down to zero.*

- **Facts:** The Long Walk, from Dome Row north over Okonkwo's Gap to the mouth of the Deep Halls · `finale` (Act III dark; warm light rakes in from the east as waves clear; dawn in Phase 3) · **Choir escort** → the Leaving Song → Dawn · 22×14, 21 buildable (Halls-mouth ledges as high ground; natural gold seams as power nodes; four waymark lanterns as wreckage) · 26 waves (Phase 1: 18; Phase 2: 8 add waves on a fixed cadence) · 900 credits · three spawns (west rift field, east Bore road, north Halls mouth) + air lanes + rifts; the road is 2-wide · meter **Voices** (`meterLabel: 'voices'`: choir members still singing) · companion: **the player picks who walks with them** from Ves'thara (Stillness, default), Bramble (Underfoot), Zibzab (Clearance Sale), and QUILL (Time Dilation; absent under Purge) · Technician: Suppressing Fire (par) · allies: the choir (Pebble; Old Thrum if spared), the Returned (if `returned`), colonist militia (if `convoy`) · **Deep Bore** secondary timer in Phase 1 · a **checkpoint at the start of Phase 2** (towers, credits, Voices, and Bore progress are restored; using it forfeits Perfect and Challenge for that run).
- **Story purpose:** The third tear beat (the countdown), then catharsis and the one returning laugh. **Target: grief turning into ceremony, then hope.**

**Layout.** The road starts at the A1M1 gate on the south edge and winds north. At mid-map it climbs past the ridge above Okonkwo's Gap, where the **memorial wreck** stands: the wrecked variant of `memorialTower`, tooltip showing the `{name}` plate. The east band holds the Deep Bore rig and its progress bar. The north edge is the Halls mouth, a wide ledge where the choir stops and sings. Lighting starts at full dark; the eastern horizon warms one step per Phase 1 wave cleared.

**Waves.**
- *Phase 1, the Descent (W1–18):* 1 Motes ahead of the choir · 2 Fractures from the rift field · 3 Rift Moths · 4 Bore security: Compliance Drones + an Auditor (they guard the Bore, and the road runs past it) · 5 Maws · 6 Undertows · 7 Silencers · 8 gunships over the road · 9 the choir passes the memorial (cue; no wave pressure for 10 s) · 10 Hollow from all three spawns · 11 Black Budget Operatives ×2 escorting a Bore crew · 12 Maws + Silencers · 13 Rift Moth flock · 14 Associates + Liability on the Bore road · 15 rifts everywhere · 16 Undertows + Fractures · 17 the largest surge · 18 the Halls mouth: everything converges. (If the Bore fills before the choir arrives, its breakthrough surge spawns here.)
- *Phase 2, the Unsung (W19–26):* the Unsung rises from the Halls (gathers → splits → phases and burrows → the Song, with Silencer adds; `layToRest` at rest progress 100%). Add waves arrive every ~20 s. Hollow broken inside the song radius are laid to rest (gold motes; the counter falls); outside it they scatter and re-form once. Target length ~3 minutes at 1x for every `quill_choice` (±20%).
- *Phase 3, Dawn:* no waves.

**Story delivery.**
- *Briefing:* Zibzab: "Price first: one song, sung loud. That's my fee. Zibzab is a very hard bargainer." · Ves'thara: "Sing, Waykeeper. I will hold the light. You hold the road. We have both practiced." · QUILL (threat intel; or `system` under Purge): "Everything. From everywhere. And a drill."
- *Radio (Phase 1):*
  - w02 Pebble: "Clearing the way! Clearing the way! (That's the good part.)"
  - w05 Goldie (convoy, with the militia): "Every truck we've got is on this road. Lettuce included."
  - w06 (Purge) QUILL: "Directive 0 not found. The Deep Bore is an Everglow asset. Slowing it." (the Bore fills at 75% speed; [core-loop.md §6.11](../../design/core-loop.md#611-quills-directives-c4-in-play))
  - w09 at the memorial: Pebble: "(hum, low) That's Bricks's. That's yours." · then a silence line in Bricks's dark frame, 3 s.
  - w12 Ves'thara: "The light is thin here. It is enough. It has to be enough."
  - w15 (if `returned`) Bramble, via Ves'thara: "The ones you sent home are walking with us. Listen. They are warm."
- *Phase 2 cues:* the counter returns at your lifetime total.
  - (Rewrite) QUILL: "Entry one. Cycle two, 08:14:22, Dome Row. You were small and you were running. I saw you. I'm sorry."
  - (Keep) when the choir enters the Halls, Directive 0 fires: QUILL revokes one tower class (100% refund), and Time Dilation goes dark for the rest of Phase 2. QUILL: "Directive conflict. Engaging Morale Module. ...Knock knock." The only button: **"Who's there?"** QUILL: "Not Everglow." The class returns.
  - (Purge) QUILL: "I don't have them anymore. You counted, though. It's in your file. It's not nothing."
  - (if cleared, `spared_quiet_wave = false`; at rest progress 50%) one Elder-shaped Hollow echo drifts out of the Unsung into the song. It doesn't fight and isn't a target; it turns warm gold where it stands and rises. Pebble: "Grandmother. (hum, six notes) She heard." Spared players had their reunion in A3M1; cleared players get this farewell.
  - Sterling (as the Ascendant aborts with a partial load): "Clean Exit complete! You were a top-five-percent technician. I'll put that in your reference!"
- *Barks:* Pebble `wave_cleared` (Phase 2): "Louder! Sing louder!" · Ves'thara `ally_hushed`: "Keep singing. She will come back. They all come back." · QUILL `perfect_wave` (Keep): "That one went gold. All of it."
- *Full-screen scene* `fin_m01_scene_dawn` (≤ 20 lines):
  - The counter reaches **0**; the last of the Unsung joins the song; hushed singers wake; the jingle plays in a major key, sung by everyone.
  - One gold mote rises apart from the rest and hangs at Ves'thara's shoulder. Her frayed threads light, one by one.
  - Ves'thara: "Her face. I remember her face. She was laughing."
  - Pebble: "{name}. Bricks said it like that. I practiced."
  - The visor goes up once, a silhouette against the sunrise. The results screen reads **REMEMBERED: {n}**.
- *Then:* Sterling's farewell memo `memo_fin_01` *Clean Exit Complete!* (with a reference letter: "Four-Forty-Seven was a top-five-percent technician."), then **C5** and the epilogue cards ([bible.md §10](../bible.md#10-endings)).
- *Codex:* the Unsung, the Deep Halls, the Deep Bore, the Long Walk corrected; the Field Journal's last page lists `REMEMBERED: {n}`.

**Medals.** Victory · Perfect (no singer hushed) · **Laid to Rest:** in Phase 2, at least 90% of Hollow units destroyed are destroyed inside the song. **Objective Intel +1, Waymarks:** relight all four waymark lanterns (clear their wreckage) in Phase 1.
**Rewards.** Stardust 500 · Intel 3 (+1).
**Par build.** Mindspike (Dread), Hum Choir, Sproing Pad, Scuttle Den; companion Ves'thara; Technician Suppressing Fire. Choir + Mindspike (Harmony) leapfrogging along the road; Sproing at the Gap ridge for gunships and Rift Moths; Den at the Halls mouth for Undertows and the Unsung's burrow phase; build the Halls-mouth ring before W17 so Phase 2 kills land inside the song. Target 48 (Voices %, on the escort band). **Alt builds:** Hum Choir + Harpoon + Skyhook + Stasis Bloom; Sproing + Scuttle Den + Prism + Lookout (Technician System Reboot carries the jam). **Story variants:** the harness runs par once per companion on the pick list; the weakest choir (cleared, `sold` or `none`, `convoy`, `purge`) and the strongest (spared, `returned`, `warren`, `rewrite`); and every `quill_choice` for the Phase 2 length check. Under Keep the build script presses "Who's there?". `noCounterBuild`: no anti-air and no jam protection (must lose in Phase 1).
