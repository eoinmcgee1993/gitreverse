import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual component, with deterministic browser/hook substitutes. These
// tests cover lifecycle behavior without adding a browser or DOM test dependency.
const compile = (path: string) => ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  fileName: path,
}).outputText;
const componentCode = compile("components/founder-card.tsx");
const helpersCode = compile("lib/founder-experiment.ts");
const start = Date.parse("2026-10-16T18:00:00.000Z");
const end = start + 10 * 60 * 60 * 1000;
type Element = { type: unknown; props: Record<string, unknown> };
type Hook = { value?: unknown; deps?: readonly unknown[]; cleanup?: () => void };
type StatusMode = "active" | "inactive" | "error" | "pending" | "invalid";
type Tracked = { name: string; data: Record<string, unknown> };

function harness(initialNow = start + 1000, query = "") {
  let elapsed = 0;
  let wall = initialNow;
  let cursor = 0;
  let queued = false;
  let mounted = true;
  let statusMode: StatusMode = "active";
  let fetches = 0;
  let nextTimer = 0;
  let output: Element;
  const fallback: Element = { type: "fallback", props: {} };
  const hooks: Hook[] = [];
  const effects: (() => void)[] = [];
  const timers = new Map<number, { at: number; fn: () => void }>();
  const events: Tracked[] = [];
  const observers = new Set<FakeObserver>();
  const refs = new Set<{ current: unknown }>();
  const listeners = { document: new Map<string, Set<() => void>>(), window: new Map<string, Set<() => void>>() };
  const listenersFor = (target: "document" | "window") => ({
    addEventListener(name: string, fn: () => void) {
      if (!listeners[target].has(name)) listeners[target].set(name, new Set());
      listeners[target].get(name)!.add(fn);
    },
    removeEventListener(name: string, fn: () => void) { listeners[target].get(name)?.delete(fn); },
  });
  const document = { visibilityState: "visible", ...listenersFor("document") };
  const window = { location: { search: query }, ...listenersFor("window") };
  const sameDeps = (a?: readonly unknown[], b?: readonly unknown[]) =>
    !!a && !!b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const nextHook = () => hooks[cursor++] ?? (hooks[cursor - 1] = {});
  const scheduleRender = () => {
    if (!queued && mounted) {
      queued = true;
      queueMicrotask(() => { queued = false; if (mounted) render(); });
    }
  };
  const react = {
    useState<T>(initial: T) {
      const hook = nextHook();
      if (!("value" in hook)) hook.value = initial;
      return [hook.value, (value: T) => {
        if (!Object.is(value, hook.value)) { hook.value = value; scheduleRender(); }
      }];
    },
    useRef<T>(initial: T) {
      const hook = nextHook();
      if (!("value" in hook)) hook.value = { current: initial };
      return hook.value;
    },
    useCallback<T>(fn: T, deps: readonly unknown[]) {
      const hook = nextHook();
      if (!sameDeps(hook.deps, deps)) { hook.value = fn; hook.deps = deps; }
      return hook.value;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const hook = nextHook();
      if (!sameDeps(hook.deps, deps)) {
        hook.deps = deps;
        effects.push(() => { hook.cleanup?.(); hook.cleanup = effect() || undefined; });
      }
    },
  };
  class FakeObserver {
    constructor(readonly callback: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) {}
    observe() { observers.add(this); }
    disconnect() { observers.delete(this); }
  }
  class FakeDate extends Date { static now() { return wall; } }
  const sandbox = {
    Date: FakeDate, URLSearchParams, AbortController, console,
    performance: { now: () => elapsed }, document, window,
    IntersectionObserver: FakeObserver,
    setTimeout(fn: () => void, delay: number) {
      const id = ++nextTimer;
      timers.set(id, { at: elapsed + Math.max(0, delay), fn });
      return id;
    },
    clearTimeout(id: number | undefined) { if (id !== undefined) timers.delete(id); },
    async fetch(_url: string, options: { cache: string; signal: AbortSignal }) {
      fetches++;
      assert.equal(options.cache, "no-store");
      if (statusMode === "pending") return new Promise<never>(() => {});
      if (statusMode === "error") throw new Error("Offline");
      const now = initialNow + elapsed;
      return { ok: true, json: async () => ({
        id: statusMode === "invalid" ? "wrong-experiment" : "founder-socials-2026-10-16",
        startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), serverNow: now,
        active: statusMode === "active" && now >= start && now < end,
      }) };
    },
  };
  const load = <T,>(code: string, dependencies: Record<string, unknown>): T => {
    const exports = {};
    const context = vm.createContext({ ...sandbox, exports, module: { exports }, require(name: string) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    } });
    vm.runInContext(code, context);
    return exports as T;
  };
  const helpers = load<typeof import("../lib/founder-experiment")>(helpersCode, {});
  // Configure only this VM's copy, leaving the production launch settings alone.
  Object.assign(helpers.FOUNDER_EXPERIMENT, { id: "founder-socials-2026-10-16", startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const component = load<{ FounderExperimentSlot: (props: { fallback: Element }) => Element }>(componentCode, {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/lib/founder-experiment": helpers,
    "@vercel/analytics": { track(name: string, data: Record<string, unknown>) {
      events.push({ name, data: JSON.parse(JSON.stringify(data)) });
    } },
  });
  function walk(node: unknown, visit: (element: Element) => void) {
    if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return; }
    if (node && typeof node === "object" && "props" in node) {
      const element = node as Element;
      visit(element);
      walk(element.props.children, visit);
    }
  }
  function render() {
    cursor = 0;
    refs.forEach((ref) => { ref.current = null; });
    output = component.FounderExperimentSlot({ fallback });
    walk(output, (element) => {
      const ref = element.props.ref as { current: unknown } | undefined;
      if (ref) { refs.add(ref); ref.current = element; }
    });
    effects.splice(0).forEach((effect) => effect());
  }
  async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
  render();
  return {
    events,
    flush,
    get active() { return output !== fallback; },
    get fetches() { return fetches; },
    get timerCount() { return timers.size; },
    get listenerCount() { return [...listeners.document.values(), ...listeners.window.values()].reduce((n, set) => n + set.size, 0); },
    setStatus(mode: StatusMode) { statusMode = mode; },
    visibility(state: "visible" | "hidden") { document.visibilityState = state; this.emit("document", "visibilitychange"); },
    emit(target: "document" | "window", event: string) { [...(listeners[target].get(event) ?? [])].forEach((fn) => fn()); },
    intersect(ratio: number) { [...observers].forEach((observer) => observer.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio }])); },
    async advance(ms: number) {
      const target = elapsed + ms;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        wall += next[1].at - elapsed;
        elapsed = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
        await flush();
      }
      wall += target - elapsed;
      elapsed = target;
      await flush();
    },
    // Simulate suspension: clocks advance, but queued callbacks have not run yet.
    suspend(ms: number) { elapsed += ms; wall += ms; },
    click(platform: string, button = 0) {
      let anchor: Element | undefined;
      walk(output, (element) => {
        if (element.type === "a" && String(element.props["aria-label"]).toLowerCase().includes(platform)) anchor = element;
      });
      assert.ok(anchor, `Missing ${platform} link`);
      let prevented = false;
      (anchor.props[button === 0 ? "onClick" : "onAuxClick"] as (event: { button: number; preventDefault: () => void }) => void)({ button, preventDefault() { prevented = true; } });
      return prevented;
    },
    unmount() { mounted = false; hooks.forEach((hook) => hook.cleanup?.()); },
  };
}

test("founder card expires in an already-open tab at the exclusive deadline", async () => {
  const h = harness(end - 1500);
  await h.flush();
  assert.equal(h.active, true);
  await h.advance(1499);
  assert.equal(h.active, true);
  await h.advance(1);
  assert.equal(h.active, false);
  const count = h.fetches;
  await h.advance(60_000);
  assert.equal(h.fetches, count, "Successful expiry must stop polling");
  h.unmount();
});

test("focus, visible-tab return, and bfcache return hide stale content until status is refreshed", async () => {
  for (const event of ["focus", "visibilitychange", "pageshow"]) {
    const h = harness();
    await h.flush();
    assert.equal(h.active, true);
    h.setStatus("pending");
    h.emit(event === "visibilitychange" ? "document" : "window", event);
    await h.flush();
    assert.equal(h.active, false, `${event} must hide content during the fresh request`);
    h.setStatus("active");
    h.emit("window", "focus");
    await h.flush();
    assert.equal(h.active, true);
    h.unmount();
  }
});

test("failed or malformed status fails closed, can recover, and cannot retry beyond expiry", async () => {
  for (const mode of ["error", "invalid", "inactive"] as const) {
    const h = harness();
    await h.flush();
    h.setStatus(mode);
    h.emit("window", "focus");
    await h.flush();
    assert.equal(h.active, false, mode);
    h.setStatus("active");
    h.emit("window", "focus");
    await h.flush();
    assert.equal(h.active, true);
    h.unmount();
  }
  const h = harness(end - 1000);
  await h.flush();
  h.setStatus("error");
  await h.advance(1000);
  const count = h.fetches;
  await h.advance(90_000);
  assert.equal(h.fetches, count, "Errors at/after the known deadline must not keep polling");
  assert.equal(h.active, false);
  h.unmount();
});

test("impressions need at least 50% visibility for one uninterrupted second and fire only once", async () => {
  const h = harness();
  await h.flush();
  h.intersect(0.49);
  await h.advance(2000);
  assert.equal(h.events.length, 0);
  h.intersect(0.5);
  await h.advance(999);
  assert.equal(h.events.length, 0);
  h.intersect(0.49);
  await h.advance(1);
  assert.equal(h.events.length, 0, "Leaving the viewport must cancel pending dwell");
  h.intersect(0.5);
  await h.advance(1000);
  assert.deepEqual(h.events.map((event) => event.name), ["Founder Card Impression"]);
  h.intersect(0);
  h.intersect(1);
  await h.advance(2000);
  h.emit("window", "focus");
  await h.flush();
  h.intersect(1);
  await h.advance(1000);
  assert.equal(h.events.length, 1, "Refocusing must not duplicate the impression");
  h.unmount();
});

test("hidden tabs cancel impression dwell and require a fresh visible interval", async () => {
  const h = harness();
  await h.flush();
  h.intersect(1);
  await h.advance(500);
  h.visibility("hidden");
  await h.advance(2000);
  assert.equal(h.events.length, 0);
  h.visibility("visible");
  await h.flush();
  h.intersect(1);
  await h.advance(999);
  assert.equal(h.events.length, 0);
  await h.advance(1);
  assert.equal(h.events.length, 1);
  h.unmount();
});

test("social clicks identify all three platforms, label QA, and block clicks after suspended expiry", async () => {
  const h = harness(end - 5000, "?founder_qa=1");
  await h.flush();
  for (const platform of ["beehiiv", "telegram", "whatsapp"]) assert.equal(h.click(platform), false);
  assert.deepEqual(h.events.map(({ name, data }) => ({ name, ...data })), ["beehiiv", "telegram", "whatsapp"].map((platform) => ({
    name: "Founder Social Click", experiment: "founder-socials-2026-10-16", placement: "repo-card", qa: true, platform,
  })));
  h.suspend(5000);
  assert.equal(h.click("telegram"), true, "The click guard must work before delayed timers run");
  await h.flush();
  assert.equal(h.active, false);
  assert.equal(h.events.length, 3);
  h.unmount();
});

test("unmount removes observers, timers, listeners, and pending callbacks", async () => {
  const h = harness();
  await h.flush();
  h.intersect(1);
  h.unmount();
  assert.equal(h.timerCount, 0);
  assert.equal(h.listenerCount, 0);
  await h.advance(120_000);
  assert.equal(h.events.length, 0);
});


test("middle-button social opens are tracked while other auxiliary clicks are ignored", async () => {
  const h = harness(end - 1000);
  await h.flush();
  assert.equal(h.click("telegram", 1), false);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].data.platform, "telegram");
  assert.equal(h.events[0].data.qa, false);
  h.click("telegram", 2);
  assert.equal(h.events.length, 1);
  h.suspend(1000);
  assert.equal(h.click("telegram", 1), true);
  await h.flush();
  assert.equal(h.active, false);
  assert.equal(h.events.length, 1);
  h.unmount();
});
