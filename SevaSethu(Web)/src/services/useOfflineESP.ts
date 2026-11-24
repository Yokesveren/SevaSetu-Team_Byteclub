/**
 * useOfflineESP — Web Serial API hook for the SevaSetu receiver node.
 *
 * The receiver (receiver_node_v2.ino) emits newline-delimited JSON on
 * Serial @ 115200 baud.  Three packet types are relevant:
 *
 *   {"type":"vitals","seq":N,"hr":N,"spo2":N,"temp":N,"finger":0|1,
 *    "hrOk":0|1,"spo2Ok":0|1,"tempOk":0|1}
 *
 *   {"type":"image_start","id":N,"size":N,"crc":N}
 *   {"type":"image_data","id":N,"i":N,"d":"<base64chunk>"}
 *   {"type":"image_end","id":N,"size":N,"crc":N}
 *
 * Usage:
 *   const { vitals, image, status, connect, disconnect } = useOfflineESP();
 */

import { useState, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ESPVitals {
  seq: number;
  hr: number;
  spo2: number;
  temp: number;
  finger: boolean;
  hrOk: boolean;
  spo2Ok: boolean;
  tempOk: boolean;
  receivedAt: string; // ISO timestamp
}

export type ESPStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "unsupported";

// ── CRC32 (matches ESP firmware) ─────────────────────────────────────────────

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return (~c) >>> 0;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineESP() {
  const [status, setStatus]   = useState<ESPStatus>("idle");
  const [vitals, setVitals]   = useState<ESPVitals | null>(null);
  const [image,  setImage]    = useState<string | null>(null); // data-URL
  const [imageProgress, setImageProgress] = useState<number>(0); // 0-100 %

  const portRef    = useRef<any>(null); // SerialPort — typed as any (Web Serial API not in TS lib)
  const readerRef  = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const runningRef = useRef(false);

  // ── Image assembly ───────────────────────────────────────────────────────
  const imgChunksRef  = useRef<Record<number, Uint8Array>>({});
  const imgMetaRef    = useRef<{ id: number; size: number; crc: number } | null>(null);

  const finaliseImage = useCallback((id: number, size: number, crc: number) => {
    const meta = imgMetaRef.current;
    if (!meta || meta.id !== id) return;

    // Assemble chunks in order
    const full = new Uint8Array(size);
    let offset = 0;
    const keys = Object.keys(imgChunksRef.current)
      .map(Number)
      .sort((a, b) => a - b);
    for (const k of keys) {
      const chunk = imgChunksRef.current[k];
      full.set(chunk, offset);
      offset += chunk.length;
    }

    if (crc32(full) !== (crc >>> 0)) {
      console.warn("[ESP] Image CRC mismatch — discarding");
      imgChunksRef.current = {};
      imgMetaRef.current   = null;
      setImageProgress(0);
      return;
    }

    // Convert to data-URL (try JPEG first, fall back to PNG)
    const blob    = new Blob([full], { type: "image/jpeg" });
    const dataUrl = URL.createObjectURL(blob);
    setImage(dataUrl);
    setImageProgress(100);
    imgChunksRef.current = {};
    imgMetaRef.current   = null;
  }, []);

  // ── Line parser ──────────────────────────────────────────────────────────
  const handleLine = useCallback((line: string) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return; // comments from firmware
    let pkt: any;
    try { pkt = JSON.parse(line); } catch { return; }

    switch (pkt.type) {
      case "vitals":
        setVitals({
          seq:    pkt.seq    ?? 0,
          hr:     pkt.hr     ?? 0,
          spo2:   pkt.spo2   ?? 0,
          temp:   pkt.temp   ?? 0,
          finger: pkt.finger === 1,
          hrOk:   pkt.hrOk   === 1,
          spo2Ok: pkt.spo2Ok === 1,
          tempOk: pkt.tempOk === 1,
          receivedAt: new Date().toISOString(),
        });
        break;

      case "image_start":
        imgChunksRef.current = {};
        imgMetaRef.current   = { id: pkt.id, size: pkt.size, crc: pkt.crc };
        setImageProgress(1);
        setImage(null);
        break;

      case "image_data": {
        if (!imgMetaRef.current || imgMetaRef.current.id !== pkt.id) break;
        try {
          const raw   = atob(pkt.d as string);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          imgChunksRef.current[pkt.i] = bytes;
          // Progress: rough estimate based on accumulated bytes vs total
          const received = Object.values(imgChunksRef.current)
            .reduce((s, c) => s + c.length, 0);
          const pct = Math.min(99, Math.round(received / imgMetaRef.current.size * 100));
          setImageProgress(pct);
        } catch {/* ignore bad base64 */}
        break;
      }

      case "image_end":
        finaliseImage(pkt.id, pkt.size, pkt.crc);
        break;

      default:
        break;
    }
  }, [finaliseImage]);

  // ── Serial read loop ─────────────────────────────────────────────────────
  const readLoop = useCallback(async (
    reader: ReadableStreamDefaultReader<string>
  ) => {
    let buf = "";
    try {
      while (runningRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) handleLine(l);
      }
    } catch (err) {
      if (runningRef.current) {
        console.warn("[ESP] Read error:", err);
        setStatus("error");
      }
    }
  }, [handleLine]);

  // ── Public API ───────────────────────────────────────────────────────────

  const isSupported = "serial" in navigator;

  const connect = useCallback(async () => {
    if (!isSupported) { setStatus("unsupported"); return; }
    if (portRef.current) return; // already connected

    try {
      setStatus("connecting");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;

      const decoder   = new TextDecoderStream();
      void port.readable!.pipeTo(decoder.writable);
      const reader    = decoder.readable.getReader();
      readerRef.current = reader;
      runningRef.current = true;

      setStatus("connected");
      void readLoop(reader);
    } catch (err: any) {
      console.warn("[ESP] Connect error:", err);
      setStatus(err?.name === "NotFoundError" ? "idle" : "error");
      portRef.current = null;
    }
  }, [isSupported, readLoop]);

  const disconnect = useCallback(async () => {
    runningRef.current = false;
    try { readerRef.current?.cancel(); } catch {}
    try { await portRef.current?.close(); } catch {}
    portRef.current   = null;
    readerRef.current = null;
    setStatus("idle");
    setVitals(null);
    setImage(null);
    setImageProgress(0);
    imgChunksRef.current = {};
    imgMetaRef.current   = null;
  }, []);

  return {
    isSupported,
    status,
    vitals,
    image,
    imageProgress,
    connect,
    disconnect,
  };
}
