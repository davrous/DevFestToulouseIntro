import { afterEach, describe, expect, it, vi } from "vitest";
import { StrudelEventTransport, type SyncChannel } from "./StrudelEventTransport";
import type { SyncMessage } from "./avProtocol";
import { MusicEventBus } from "./MusicEventBus";

class LocalChannel implements SyncChannel {
  onmessage: SyncChannel["onmessage"] = null;
  onmessageerror: SyncChannel["onmessageerror"] = null;
  private closed = false;
  constructor(private readonly channels: Set<LocalChannel>) { channels.add(this); }
  postMessage(data: SyncMessage): void {
    if (this.closed) return;
    for (const channel of this.channels) if (channel !== this) channel.onmessage?.(new MessageEvent("message", { data }));
  }
  close(): void { this.closed = true; this.channels.delete(this); }
}
afterEach(() => vi.useRealTimers());

describe("same-origin event transport health", () => {
  it("confirms both roles, carries scheduled events, cancels on stop and reconnects after closing", () => {
    vi.useFakeTimers();
    const channels = new Set<LocalChannel>();
    const factory = () => new LocalChannel(channels);
    const receive = vi.fn();
    const lost = vi.fn();
    const show = new StrudelEventTransport("babylon", receive, vi.fn(), lost, () => 1000, factory);
    const music = new StrudelEventTransport("strudel", vi.fn(), vi.fn(), vi.fn(), () => 1000, factory);
    show.connect();
    expect(show.getStatus()).toBe("DISCONNECTED");
    music.connect();
    expect(show.getStatus()).toBe("CONNECTED");
    expect(music.getStatus()).toBe("CONNECTED");
    music.setPlayback(true);
    expect(music.playbackSession).toBe(1);
    music.setPlayback(true);
    expect(music.playbackSession).toBe(1);
    music.setTiming(4, .625);
    music.send({ event: "kick", id: "one", velocity: .8, scheduledTime: 1100, cycle: 4, cps: .625 });
    expect(receive).toHaveBeenCalledWith(expect.objectContaining({ event: "kick", source: "strudel", scheduledTime: 1100 }));
    music.setPlayback(false);
    expect(lost).toHaveBeenCalledWith(music.senderId);
    music.disconnect();
    expect(show.getStatus()).toBe("DISCONNECTED");
    music.connect();
    expect(show.getStatus()).toBe("CONNECTED");
    music.setPlayback(true);
    expect(music.playbackSession).toBe(2);
    show.disconnect();
    music.disconnect();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("expires an unresponsive peer without depending on music timers", () => {
    vi.useFakeTimers();
    let now = 1000;
    const channels = new Set<LocalChannel>();
    const factory = () => new LocalChannel(channels);
    const lost = vi.fn();
    const show = new StrudelEventTransport("babylon", vi.fn(), vi.fn(), lost, () => now, factory);
    const music = new StrudelEventTransport("strudel", vi.fn(), vi.fn(), vi.fn(), () => now, factory);
    show.connect(); music.connect();
    const musicChannel = [...channels][1];
    musicChannel.close();
    now += 3501;
    vi.advanceTimersByTime(1000);
    expect(show.getStatus()).toBe("DISCONNECTED");
    expect(lost).toHaveBeenCalledWith(music.senderId);
    show.disconnect(); music.disconnect();
  });

  it("reports missing BroadcastChannel as an optional failure", () => {
    const notify = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const transport = new StrudelEventTransport("babylon", vi.fn(), notify, vi.fn(), () => 1000,
      () => { throw new Error("Unsupported"); });
    transport.connect();
    expect(transport.getStatus()).toBe("UNAVAILABLE");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("continues independently"));
    warn.mockRestore();
  });

  it("preserves the first scheduled hap when onToggle confirms the pre-start session", () => {
    vi.useFakeTimers();
    const channels = new Set<LocalChannel>();
    const factory = () => new LocalChannel(channels);
    const bus = new MusicEventBus(() => 1000);
    const show = new StrudelEventTransport("babylon", (event) => bus.receive(event), vi.fn(),
      (sender) => bus.cancelSource(sender), () => 1000, factory);
    const music = new StrudelEventTransport("strudel", vi.fn(), vi.fn(), vi.fn(), () => 1000, factory);
    show.connect(); music.connect();
    music.setPlayback(true);
    music.send({ event: "cinema-cut", id: "first", velocity: 1, scheduledTime: 1100 });
    music.setPlayback(true);
    bus.flush(1100);
    expect(bus.records[0].outcome).toBe("applied");
    show.disconnect(); music.disconnect();
  });
});
