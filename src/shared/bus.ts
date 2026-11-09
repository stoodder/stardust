// The typed event bus (architecture.md § Events): a tiny on/off/emit emitter keyed by an event's
// `type`. The host dispatches drained sim events through one; render views, UI view models, and
// (later) story and audio subscribe by type. Pure: no module state, one bus per owner.

/** An event with a string discriminant. */
export interface Typed {
  readonly type: string;
}

/** A handler for the events of one type. */
export type Handler<E extends Typed, T extends E['type']> = (
  event: Extract<E, { type: T }>,
) => void;

export interface Bus<E extends Typed> {
  /** Subscribes to one event type. Returns the matching `off`. */
  on<T extends E['type']>(type: T, handler: Handler<E, T>): () => void;
  off<T extends E['type']>(type: T, handler: Handler<E, T>): void;
  /** Calls every handler for the event's type, in subscription order. */
  emit(event: E): void;
  /** Removes every handler (scene shutdown). */
  clear(): void;
}

/** Creates an empty bus. */
export function createBus<E extends Typed>(): Bus<E> {
  // Handlers are stored as (event: E) => void; `on` is the only way in and pairs each with its type.
  const handlers = new Map<string, ((event: E) => void)[]>();
  const bus: Bus<E> = {
    on(type, handler) {
      let list = handlers.get(type);
      if (list === undefined) {
        list = [];
        handlers.set(type, list);
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- emit() only calls it with events whose type is `type`
      list.push(handler as (event: E) => void);
      return () => {
        bus.off(type, handler);
      };
    },
    off(type, handler) {
      const list = handlers.get(type);
      if (list === undefined) return;
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the same function `on` stored
      const i = list.indexOf(handler as (event: E) => void);
      if (i >= 0) list.splice(i, 1);
    },
    emit(event) {
      const list = handlers.get(event.type);
      if (list === undefined) return;
      for (let i = 0; i < list.length; i++) list[i]!(event); // i < length
    },
    clear() {
      handlers.clear();
    },
  };
  return bus;
}
