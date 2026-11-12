// The star map (T301b; design/core-loop.md § 1.1, art-direction.md § 10, architecture.md § UI):
// the campaign screen once A1M5 is won, titled "Sector map". The chart is a still picture from a
// pure generator (starMapChart.ts) painted into a <canvas>; the nodes, plates, panel, and focus
// are DOM over it in the #ui box's 640×360 game px. Only won maps and the frontier are in the
// page. The nodes are one tab stop (a roving tabindex): the arrows walk them in campaign order,
// Home and End reach the first and the frontier, Enter or a click focuses the panel's button, and
// Esc in the panel returns to its node. On arrival the frontier is selected and its Start is
// focused. The first visit reveals the chart with a survey sweep and a one-time notice.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { openSettings, playMap, toBase, toTitle } from '../../app/navigation.ts';
import {
  STAR_MAP_ACCESS_NOTICE,
  STAR_MAP_CHART_LABEL,
  markStarMapOpened,
  starMapView,
  starStateText,
  type StarMapView,
  type StarNodeView,
} from '../../app/starMap.ts';
import { activeSave } from '../../app/save.ts';
import {
  NODE_BOX,
  NODE_CLEAR_BOX,
  STAR_MAP_NODES,
  STAR_MAP_RESERVED,
} from '../../content/starMap.ts';
import { drawImageAt } from '../../render/sprites/canvas.ts';
import type { RgbaImage } from '../../render/sprites/rasterize.ts';
import { Icon, baked } from '../hud/Icon.tsx';
import { placePanel } from '../hud/layout.ts';
import { prefersReducedMotion } from '../motion.ts';
import { silkText } from '../silk.ts';
import { Banks } from './Banks.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { MenuNotice } from './MenuNotice.tsx';
import { campaign, lastStarMapMarker, rememberStarMapMarker } from './state.ts';
import { starMapChart } from './starMapChart.ts';
import './screens.css';
import './starMap.css';
import '../hud/veteranPicker.css'; // T860: the veteran pip

/** The node panel's width (art-direction § 10). */
const PANEL_W = 176;
/**
 * What the node panel covering the corner chrome (the header, the banks, the footer's Title and
 * Settings) costs a placement, against 1 per node it covers (T631): a tall Act III panel would
 * rather lie over a neighbour's glyph than over a button the player can't reach under it.
 */
const CHROME_COST = 6;
/** The marker's walk to a newly won node (art-direction § 10). */
const WALK_MS = 600;
/** The first-visit notice shows this long, after the sweep. */
const NOTICE_MS = 4000;
const SWEEP_MS = 1200;

/** The act accent's frame suffix on `ui.star_node` (`next_act3`, `ping_act3_0`; Act II's none). */
const NODE_ACCENT: Readonly<Record<StarMapView['act'], string>> = {
  '2': '',
  '3': '_act3',
  finale: '_finale',
};

/**
 * The chart's pixels for the last phase, legs, and changes drawn (it repaints only when those
 * change).
 */
let chartCache: { readonly key: string; readonly image: RgbaImage } | null = null;
function chartImage(view: StarMapView): RgbaImage {
  const key = `${view.phase}|${JSON.stringify(view.legs)}|${view.changes.join(',')}`;
  if (chartCache?.key !== key) {
    chartCache = { key, image: starMapChart(view.phase, view.legs, view.changes) };
  }
  return chartCache.image;
}

/** The chart, painted 1:1 into its <canvas>. */
function Chart({ view }: { view: StarMapView }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useLayoutEffect(() => {
    if (canvas.current !== null) drawImageAt(canvas.current, chartImage(view), 0, 0);
  }, [view.phase, view.legs, view.changes]);
  return <canvas class="sd-starmap-canvas" width={640} height={360} ref={canvas} />;
}

/** A sprite frame as a 1:1 <img>, centred on (0, 0) of its positioned parent. */
function Glyph({ id, frame, class: cls }: { id: string; frame: string; class?: string }) {
  const b = baked(id, frame);
  if (b === null) return null;
  return (
    <img
      class={`sd-star-glyph ${cls ?? ''}`}
      src={b.url}
      width={b.w}
      height={b.h}
      alt=""
      aria-hidden="true"
    />
  );
}

/** A node's glyph frame by state, the next one in the act's accent. */
function nodeFrame(n: StarNodeView, accent: string): string {
  return n.state === 'won' ? 'cleared' : n.state === 'open' ? `next${accent}` : 'soon';
}

/** One node: its glyph (and ping, pips, focus brackets) inside its button, and its name plate. */
function Node({
  node,
  view,
  selected,
  frontier,
  current,
  onSelect,
  onKey,
  buttonRef,
}: {
  node: StarNodeView;
  view: StarMapView;
  selected: boolean;
  frontier: boolean;
  current: boolean;
  onSelect: () => void;
  onKey: (e: KeyboardEvent) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const accent = NODE_ACCENT[view.act];
  const plate = selected || frontier;
  return (
    <li
      class={`sd-star-node sd-star-${node.state}${selected ? ' sd-star-selected' : ''}`}
      style={{ left: `${node.x}px`, top: `${node.y}px` }}
      data-node={node.id}
    >
      <button
        type="button"
        class="sd-star-button"
        aria-label={node.label}
        aria-current={current ? 'location' : undefined}
        aria-controls={selected ? 'sd-star-panel' : undefined}
        tabIndex={selected ? 0 : -1}
        ref={buttonRef}
        onClick={onSelect}
        onKeyDown={onKey}
      >
        <Glyph id="ui.star_node" frame={nodeFrame(node, accent)} />
        {node.state === 'open' &&
          [0, 1, 2, 3].map((i) => (
            <Glyph
              key={i}
              id="ui.star_node"
              frame={`ping${accent}_${i}`}
              class={`sd-star-ping sd-star-ping-${i}`}
            />
          ))}
        {selected && <Glyph id="ui.star_node" frame="focus" class="sd-star-focus" />}
      </button>
      {node.state === 'won' && (
        <Glyph id="ui.star_pips" frame={String(Math.min(3, node.medals))} class="sd-star-pips" />
      )}
      {/* T860: the Veteran medal's pip, beside the medal pips (the label says it too). */}
      {node.state === 'won' && node.veteran && (
        <span class="sd-star-veteran" aria-hidden="true" data-testid="star-veteran" />
      )}
      <span
        class={`sd-star-plate${plate ? ' sd-star-plate-on' : ''}${node.state === 'won' ? ' sd-star-plate-low' : ''}`}
        aria-hidden="true"
      >
        {node.name}
      </span>
    </li>
  );
}

/** The selected node's panel (art-direction § 10 *The panel and the chrome*). */
function Panel({
  node,
  pos,
  panelRef,
  focusButton,
}: {
  node: StarNodeView;
  pos: { left: number; top: number } | null;
  panelRef: (el: HTMLElement | null) => void;
  focusButton: boolean;
}) {
  const brief = node.brief;
  const playable = node.state !== 'coming_soon';
  // Arrival focuses the button once the panel is placed (a hidden button can't take focus).
  const button = useRef<HTMLButtonElement | null>(null);
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (!focusButton || pos === null || focused.current) return;
    focused.current = true;
    button.current?.focus();
  }, [focusButton, pos]);
  const verb = node.state === 'open' ? 'Start' : 'Replay';
  return (
    <section
      id="sd-star-panel"
      class={`sd-star-panel sd-star-panel-${node.state}`}
      role="region"
      aria-labelledby="sd-star-panel-name"
      ref={panelRef}
      style={
        pos === null
          ? { visibility: 'hidden', left: '0px', top: '0px' }
          : { left: `${pos.left}px`, top: `${pos.top}px` }
      }
      data-testid="star-panel"
    >
      <p class="sd-star-kicker">
        Shift {node.index} · {node.place}
      </p>
      <h2 id="sd-star-panel-name" class="sd-star-name">
        {node.name}
      </h2>
      <p class="sd-star-state">
        {node.state === 'coming_soon' && <span class="sd-lock" aria-hidden="true" />}
        {starStateText(node.state)}
      </p>
      <p class="sd-star-tagline">{node.tagline}</p>
      {brief !== null && (
        <>
          <hr class="sd-star-rule" />
          <ul class="sd-star-threats" aria-label="Threat intel">
            {brief.threats.map((t) => (
              <li key={t.id} title={t.tip ?? undefined}>
                {t.glyph !== null && <Icon id={t.glyph} />}
                <span>{t.label}</span>
                {t.tip !== null && <span class="sd-visually-hidden"> ({t.tip})</span>}
              </li>
            ))}
          </ul>
          {brief.required.map((r) => (
            <p key={r} class="sd-star-required">
              Required: {r}
            </p>
          ))}
          <ul class="sd-star-medals" aria-label="Medals">
            {brief.medals.map((m) => (
              <li key={m.id} class={m.earned ? 'sd-star-earned' : ''}>
                <span class="sd-star-diamond" aria-hidden="true" />
                <span class="sd-star-medal-name">{m.name}</span>
                {m.earned && <span class="sd-star-onfile">On file</span>}
              </li>
            ))}
          </ul>
          {brief.objectives.length > 0 && (
            <ul class="sd-star-objectives" aria-label="Objectives">
              {brief.objectives.map((o) => (
                <li key={o.id} class={o.done ? 'sd-star-done' : ''}>
                  <span class="sd-star-square" aria-hidden="true" />
                  <span>{o.name}</span>
                  {o.done && <span class="sd-visually-hidden"> (done)</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {playable && (
        <div class="sd-star-actions">
          <button
            type="button"
            class={`sd-button sd-button-small${node.state === 'open' ? ' sd-button-primary' : ''}`}
            aria-label={`${verb} ${node.name}`}
            ref={button}
            onClick={() => playMap(node.id)}
          >
            {verb}
          </button>
        </div>
      )}
    </section>
  );
}

/** The node the screen opens on: the frontier, else (after the finale) the last one. */
function arrivalIndex(view: StarMapView): number {
  const i = view.nodes.findIndex((n) => n.id === view.frontier);
  return i >= 0 ? i : view.nodes.length - 1;
}

/** The star map for the save in play. */
export function StarMap() {
  const camp = campaign.value;
  // Rebuilt whenever the save in play changes (campaign is refreshed on every write).
  const view = useMemo(() => {
    const save = activeSave();
    return save === null ? null : starMapView(save);
  }, [camp]);
  const [selected, setSelected] = useState(() => (view === null ? 0 : arrivalIndex(view)));
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  // The region labels the placed panel would sit over: hidden while it's there (T512).
  const [covered, setCovered] = useState<ReadonlySet<string>>(() => new Set());
  const regions = useRef<HTMLDivElement | null>(null);
  const [first] = useState(() => view?.firstVisit === true);
  const [noticeOn, setNoticeOn] = useState(first);
  const still = prefersReducedMotion();
  const [sweeping, setSweeping] = useState(first && !still);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Arrival focuses the frontier's Start once it is placed; any selection before that cancels it.
  const arrival = useRef(true);
  const panel = useRef<HTMLElement | null>(null);
  // The marker's walk from the node it last stood on this session (none under reduced motion).
  const [walk] = useState(() => {
    const from = lastStarMapMarker();
    const to = view?.marker ?? null;
    return from !== null && to !== null && from !== to && !still ? { from, to } : null;
  });
  const [walkT, setWalkT] = useState(walk === null ? 1 : 0);

  // The first visit is filed once it has shown; the notice holds for NOTICE_MS after the sweep.
  useEffect(() => {
    if (!first) return undefined;
    markStarMapOpened();
    const sweep = still ? 0 : SWEEP_MS;
    const a = setTimeout(() => setSweeping(false), sweep);
    const b = setTimeout(() => setNoticeOn(false), sweep + NOTICE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    rememberStarMapMarker(view?.marker ?? null);
    if (walk === null) return undefined;
    let raf = 0;
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / WALK_MS);
      setWalkT(t);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const node = view?.nodes[selected] ?? null;
  // Place the panel beside its node once its height is known (before paint).
  useLayoutEffect(() => {
    if (view === null || node === null || panel.current === null) return;
    const h = panel.current.offsetHeight;
    const others = view.nodes.filter((n) => n.id !== node.id).map((n) => ({ x: n.x, y: n.y }));
    setPanelPos(
      placePanel(
        node.x,
        node.y,
        PANEL_W,
        h,
        others,
        STAR_MAP_RESERVED,
        NODE_CLEAR_BOX,
        NODE_BOX,
        CHROME_COST,
      ),
    );
  }, [view, selected]);

  // A region label the panel covers hides (the panel's plate would show it through, half read).
  useLayoutEffect(() => {
    if (panelPos === null || panel.current === null || regions.current === null) return;
    const p = panel.current.getBoundingClientRect();
    const under = new Set<string>();
    for (const el of regions.current.querySelectorAll<HTMLElement>('[data-region]')) {
      const r = el.getBoundingClientRect();
      if (r.left < p.right && p.left < r.right && r.top < p.bottom && p.top < r.bottom) {
        under.add(el.dataset['region'] ?? '');
      }
    }
    setCovered((prev) =>
      prev.size === under.size && [...under].every((id) => prev.has(id)) ? prev : under,
    );
  }, [panelPos, selected]);

  // Esc in the panel returns to its node; on a node it does nothing (falls through).
  useEscape(() => {
    const active = document.activeElement;
    if (panel.current === null || active === null || !panel.current.contains(active)) return false;
    buttons.current[selected]?.focus();
    return true;
  });

  if (camp === null || view === null || node === null) return null;
  const frontierOpen = view.nodes.find((n) => n.id === view.frontier)?.state === 'open';
  const arrivalAt = arrivalIndex(view);

  const select = (i: number, focus: 'node' | 'panel'): void => {
    const n = view.nodes[i];
    if (n === undefined) return;
    arrival.current = false;
    setSelected(i);
    // The node takes the focus now (it's already in the page), so a key pressed next reaches it;
    // the panel's button once the panel has rendered (a teaser has none: stay on the node).
    buttons.current[i]?.focus();
    if (focus === 'panel') {
      requestAnimationFrame(() => panel.current?.querySelector('button')?.focus());
    }
  };
  const onKey = (i: number) => (e: KeyboardEvent) => {
    let to: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = Math.max(0, i - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      to = Math.min(view.nodes.length - 1, i + 1);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = arrivalAt;
    if (to === null) return;
    e.preventDefault();
    select(to, 'node');
  };

  const markerNode = view.nodes.find((n) => n.id === view.marker) ?? null;
  let markerAt = markerNode === null ? null : { x: markerNode.x, y: markerNode.y };
  if (walk !== null && markerAt !== null && walkT < 1) {
    const from = STAR_MAP_NODES[walk.from];
    const e = walkT < 0.5 ? 2 * walkT * walkT : 1 - (-2 * walkT + 2) ** 2 / 2;
    markerAt = {
      x: Math.round(from.x + (markerAt.x - from.x) * e),
      y: Math.round(from.y + (markerAt.y - from.y) * e),
    };
  }

  return (
    <main
      class={`sd-screen sd-starmap${still ? ' sd-still' : ''}`}
      data-act={view.act}
      data-phase={view.phase}
      aria-labelledby="sd-starmap-heading"
      data-testid="star-map"
    >
      <div class="sd-starmap-chart" role="img" aria-label={STAR_MAP_CHART_LABEL}>
        <Chart view={view} />
        <span class="sd-starmap-scan" aria-hidden="true" />
        {sweeping && <span class="sd-starmap-sweep" aria-hidden="true" data-testid="star-sweep" />}
      </div>
      <div class="sd-starmap-regions" aria-hidden="true" ref={regions}>
        {view.regions.map((r) => (
          <span
            key={r.id}
            data-region={r.id}
            class={`sd-star-region sd-star-region-${r.id}${covered.has(r.id) ? ' sd-star-region-covered' : ''}`}
            style={{ left: `${r.x}px`, top: `${r.y}px` }}
          >
            {r.struck !== null && <s class="sd-star-region-old">{r.struck}</s>}
            {r.text}
          </span>
        ))}
      </div>
      <header class="sd-starmap-header sd-star-chrome">
        <p class="sd-kicker">
          Everglow · Perimeter Ops
          {camp.slot === null ? ' · Dev save' : ` · Slot ${camp.slot}`}
        </p>
        <h1 id="sd-starmap-heading" class="sd-menu-heading">
          Sector map
        </h1>
        {camp.profile !== null && (
          <p class="sd-kicker sd-campaign-tech" data-testid="technician">
            JPT-1 {silkText(camp.profile.name)} · #ED-447
          </p>
        )}
      </header>
      <div class="sd-starmap-banks sd-star-chrome">
        <Banks view={camp} />
      </div>
      {/* Under the header, clear of the region labels and the node panel (D134 U9). */}
      <div class="sd-starmap-notices">
        <MenuNotice />
        {noticeOn && (
          <p class="sd-star-notice" role="status" data-testid="star-notice">
            {STAR_MAP_ACCESS_NOTICE}
          </p>
        )}
      </div>
      <ol class="sd-star-nodes" aria-label="Shifts">
        {view.nodes.map((n, i) => (
          <Node
            key={n.id}
            node={n}
            view={view}
            selected={i === selected}
            frontier={n.id === view.frontier}
            current={n.id === view.marker}
            onSelect={() => select(i, 'panel')}
            onKey={onKey(i)}
            buttonRef={(el) => {
              buttons.current[i] = el;
              // A teaser frontier (no Start) takes the arrival focus itself.
              if (arrival.current && i === arrivalAt && !frontierOpen && view.frontier !== null) {
                focusOnce(el);
              }
            }}
          />
        ))}
      </ol>
      {markerAt !== null && (
        <span
          class="sd-star-marker"
          style={{ left: `${markerAt.x}px`, top: `${markerAt.y}px` }}
          aria-hidden="true"
          data-testid="star-marker"
        >
          <Glyph id="ui.star_marker" frame="idle_0" />
        </span>
      )}
      <Panel
        key={node.id}
        node={node}
        pos={panelPos}
        panelRef={(el) => {
          panel.current = el;
        }}
        focusButton={arrival.current && selected === arrivalAt && node.state !== 'coming_soon'}
      />
      <footer class="sd-starmap-footer">
        <button type="button" class="sd-button" onClick={toTitle}>
          Title
        </button>
        <button type="button" class="sd-button" onClick={openSettings}>
          Settings
        </button>
        <button type="button" class="sd-button" onClick={toBase}>
          Base
        </button>
      </footer>
    </main>
  );
}
