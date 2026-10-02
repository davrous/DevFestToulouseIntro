import { WebSocket, WebSocketServer } from "ws";

const port = Number(process.env.STRUDEL_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("STRUDEL_PORT must be between 1024 and 65535.");

const server = new WebSocketServer({
  host: "127.0.0.1",
  port,
  maxPayload: 4096,
  verifyClient: ({ origin }) => {
    if (!origin) return true;
    try {
      const url = new URL(origin);
      return ["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch {
      console.warn("Rejected bridge connection with an invalid Origin.");
      return false;
    }
  },
});

server.on("listening", () => console.log(`Strudel bridge ready at ws://127.0.0.1:${port} (local clients only)`));
server.on("error", (error) => { console.error("Strudel bridge failed:", error.message); process.exitCode = 1; });
server.on("connection", (client) => {
  let windowStart = Date.now();
  let messages = 0;
  client.on("error", (error) => console.warn("Bridge client error:", error.message));
  client.on("message", (data, binary) => {
    if (Date.now() - windowStart >= 1000) { windowStart = Date.now(); messages = 0; }
    if (binary || ++messages > 240) {
      console.warn("Closing bridge client: binary data or event rate above 240 messages/second.");
      client.close(1008, "Text events only; maximum 240 messages/second.");
      return;
    }
    for (const peer of server.clients) {
      if (peer !== client && peer.readyState === WebSocket.OPEN) peer.send(data.toString());
    }
  });
});

process.on("SIGINT", () => {
  for (const client of server.clients) client.close(1001, "Bridge shutting down.");
  server.close();
});
