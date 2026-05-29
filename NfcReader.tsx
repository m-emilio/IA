import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AppState = "idle" | "scanning" | "success" | "error" | "unsupported";

interface NdefRecord {
  recordType: string;
  mediaType?: string;
  data: string;
  encoding?: string;
  lang?: string;
}

interface TagRead {
  id: string;
  records: NdefRecord[];
  timestamp: Date;
  serialNumber?: string;
}

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "#000",
  surface:  "#111111",
  border:   "#1c1c1e",
  border2:  "#2c2c2e",
  muted:    "#48484a",
  dim:      "#636366",
  text:     "#e5e5ea",
  sub:      "#aeaeb2",
  purple:   "#bf5af2",
  blue:     "#0a84ff",
  green:    "#30d158",
  red:      "#ff3b30",
  orange:   "#ff9500",
  yellow:   "#ffd60a",
};

// ─── Record type decoder ──────────────────────────────────────────────────────
function decodeRecordType(r: NdefRecord): { icon: string; label: string; value: string } {
  switch (r.recordType) {
    case "url":        return { icon: "🔗", label: "URL", value: r.data };
    case "text":       return { icon: "📝", label: "Text", value: r.data };
    case "mime":       return { icon: "📦", label: `MIME: ${r.mediaType}`, value: r.data };
    case "smart-poster": return { icon: "🪧", label: "Smart Poster", value: r.data };
    case "absolute-url": return { icon: "🌐", label: "Absolute URL", value: r.data };
    case "empty":      return { icon: "◻", label: "Empty record", value: "(no data)" };
    default:           return { icon: "🔷", label: r.recordType, value: r.data };
  }
}

// ─── Pulse ring animation ─────────────────────────────────────────────────────
function PulseRings({ color }: { color: string }) {
  return (
    <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 120, height: 120,
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          animation: `nfcPulse 2s ease-out ${i * 0.6}s infinite`,
          opacity: 0,
        }} />
      ))}
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}22 0%, ${color}08 100%)`,
        border: `2px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 30,
      }}>
        📡
      </div>
    </div>
  );
}

// ─── Tag record card ──────────────────────────────────────────────────────────
function RecordCard({ record, index }: { record: NdefRecord; index: number }) {
  const [copied, setCopied] = useState(false);
  const { icon, label, value } = decodeRecordType(record);
  const isUrl = record.recordType === "url" || record.recordType === "absolute-url";

  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>record {index + 1}</span>
      </div>
      <div style={{ fontSize: 13, color: C.text, wordBreak: "break-all", lineHeight: 1.5, marginBottom: 10 }}>{value}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={copy} style={{ flex: 1, background: copied ? C.green + "22" : C.border, border: `1px solid ${copied ? C.green + "55" : C.border2}`, borderRadius: 8, color: copied ? C.green : C.sub, fontSize: 11, fontWeight: 700, padding: "8px 0", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", letterSpacing: "0.05em" }}>
          {copied ? "✓ COPIED" : "COPY"}
        </button>
        {isUrl && (
          <a href={value} target="_blank" rel="noreferrer" style={{ flex: 1, background: C.blue + "22", border: `1px solid ${C.blue}44`, borderRadius: 8, color: C.blue, fontSize: 11, fontWeight: 700, padding: "8px 0", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.05em" }}>
            OPEN
          </a>
        )}
      </div>
    </div>
  );
}

// ─── iOS instructions panel ───────────────────────────────────────────────────
function IosInstructions() {
  const [tab, setTab] = useState<"shortcuts"|"ndef">("shortcuts");
  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: "#1a0a00", border: `1px solid ${C.orange}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.orange, fontWeight: 700, marginBottom: 6 }}>iOS Safari blocks Web NFC</p>
        <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
          Apple restricts NFC hardware to native apps via Core NFC. No browser on iPhone can access NFC tags directly — this applies to Safari, Chrome, and Firefox on iOS equally.
        </p>
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 0, background: C.surface, borderRadius: 12, padding: 4, marginBottom: 18 }}>
        {([["shortcuts","Shortcuts App"],["ndef","NDEF Tools"]] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex: 1, background: tab===id?C.purple:"transparent", border:"none", borderRadius:9, color:tab===id?"#000":C.dim, fontSize:11, fontWeight:700, padding:"9px 0", cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em", transition:"all 0.2s" }}>{label.toUpperCase()}</button>
        ))}
      </div>

      {tab === "shortcuts" && (
        <div>
          <p style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em", marginBottom: 14 }}>NATIVE NFC READER VIA SHORTCUTS</p>
          {[
            { n:"1", icon:"⚙️", title:"Open Shortcuts app", body:"Pre-installed on iOS 13+. Search for it in Spotlight if needed." },
            { n:"2", icon:"➕", title:"New Shortcut → Add Action", body:'Search for "Read NFC Tag" — it\'s a built-in action.' },
            { n:"3", icon:"📡", title:"Add \"Get text from NFC tag\"", body:"Chain it with a Show Result or Copy to Clipboard action to see the tag data." },
            { n:"4", icon:"▶️", title:"Run the shortcut", body:"Hold your iPhone 13 near the NFC tag. The reader activates and data appears in the result." },
            { n:"5", icon:"🏠", title:"Add to Home Screen", body:"Tap ··· → Add to Home Screen for one-tap NFC reads without opening Shortcuts." },
          ].map(s=>(
            <div key={s.n} style={{ display:"flex", gap:12, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:C.purple+"22", border:`1px solid ${C.purple}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{s.title}</p>
                <p style={{ fontSize:12, color:C.sub, lineHeight:1.5 }}>{s.body}</p>
              </div>
            </div>
          ))}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginTop:4 }}>
            <p style={{ fontSize:10, color:C.dim, letterSpacing:"0.1em", marginBottom:8 }}>BONUS — AUTOMATE ON TAG SCAN</p>
            <p style={{ fontSize:12, color:C.sub, lineHeight:1.6 }}>Go to <span style={{color:C.text}}>Automations</span> → <span style={{color:C.text}}>NFC</span> → Scan Tag. This triggers any action automatically when you tap a specific tag — no button press needed.</p>
          </div>
        </div>
      )}

      {tab === "ndef" && (
        <div>
          <p style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em", marginBottom: 14 }}>RECOMMENDED NATIVE APPS</p>
          {[
            { name:"NFC Tools", dev:"wakdev", icon:"🔧", desc:"Read/write/format tags. Shows full NDEF record breakdown including type, payload, and language codes. Free on App Store.", tag:"Most popular" },
            { name:"NFC TagWriter by NXP", dev:"NXP Semiconductors", icon:"🏷", desc:"Industrial-grade reader/writer from the chip manufacturer. Excellent for Mifare, NTAG, and ICODE tags.", tag:"Pro" },
            { name:"ReadID NFC", dev:"Inverid", icon:"🛂", desc:"Specialist tool for reading NFC-enabled passports and ID documents (BAC/PACE protected chips).", tag:"Passports" },
            { name:"NFC.cool Tools", dev:"NFC.cool", icon:"❄️", desc:"Clean UI, supports NDEF, URL, vCard, WiFi credential writing. Also handles tag locking and password protection.", tag:"Writer" },
          ].map(a=>(
            <div key={a.name} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ fontSize:22 }}>{a.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{a.name}</span>
                    <span style={{ background:C.purple+"33", color:C.purple, fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>{a.tag}</span>
                  </div>
                  <span style={{ fontSize:10, color:C.muted }}>{a.dev}</span>
                </div>
              </div>
              <p style={{ fontSize:12, color:C.sub, lineHeight:1.5 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NfcReader() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [tags, setTags] = useState<TagRead[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"scan"|"history"|"ios">("scan");
  const abortRef = useRef<AbortController | null>(null);

  // Detect NFC support on mount
  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hasNfc = "NDEFReader" in window;
    if (isIos || !hasNfc) {
      setAppState("unsupported");
      setTab("ios");
    }
  }, []);

  const startScan = async () => {
    setError("");
    setAppState("scanning");
    try {
      // @ts-ignore — NDEFReader not in TS lib yet
      const reader = new (window as any).NDEFReader();
      abortRef.current = new AbortController();
      await reader.scan({ signal: abortRef.current.signal });

      reader.onreadingerror = () => {
        setError("Could not read tag — ensure it is NDEF formatted.");
        setAppState("error");
      };

      reader.onreading = (event: any) => {
        const records: NdefRecord[] = event.message.records.map((r: any) => {
          let data = "";
          try {
            if (r.recordType === "text") {
              const dec = new TextDecoder(r.encoding ?? "utf-8");
              data = dec.decode(r.data);
            } else if (r.recordType === "url" || r.recordType === "absolute-url") {
              const dec = new TextDecoder();
              data = dec.decode(r.data);
            } else {
              const arr = new Uint8Array(r.data.buffer ?? r.data);
              data = Array.from(arr).map(b => b.toString(16).padStart(2,"0").toUpperCase()).join(" ");
            }
          } catch { data = "(decode error)"; }
          return { recordType: r.recordType, mediaType: r.mediaType, data, encoding: r.encoding, lang: r.lang };
        });

        const tag: TagRead = {
          id: `tag-${Date.now()}`,
          serialNumber: event.serialNumber ?? undefined,
          records,
          timestamp: new Date(),
        };
        setTags(prev => [tag, ...prev]);
        setAppState("success");
        setTab("history");
      };
    } catch (err: any) {
      if (err?.name === "AbortError") { setAppState("idle"); return; }
      setError(err?.message ?? "NFC scan failed");
      setAppState("error");
    }
  };

  const stopScan = () => {
    abortRef.current?.abort();
    setAppState("idle");
  };

  const isUnsupported = appState === "unsupported";
  const isScanning = appState === "scanning";

  return (
    <div style={{ minHeight:"100dvh", background:C.bg, color:C.text, fontFamily:"'SF Pro Text','SF Pro','Helvetica Neue',sans-serif", display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto" }}>
      <style>{`
        @keyframes nfcPulse { 0%{transform:scale(0.6);opacity:0.7} 100%{transform:scale(1.8);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Header */}
      <div style={{ padding:"52px 20px 16px", background:C.bg, borderBottom:`1px solid ${C.border}`, flexShrink:0, position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#0a84ff,#bf5af2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📡</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:700, letterSpacing:"-0.01em" }}>NFC Reader</div>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.06em", marginTop:1 }}>
              {isUnsupported ? <span style={{color:C.orange}}>● iOS — native only</span> : isScanning ? <span style={{color:C.green}}>● Scanning…</span> : <span style={{color:C.dim}}>● Ready</span>}
            </div>
          </div>
          {tags.length > 0 && (
            <div style={{ background:C.purple, width:22, height:22, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#000" }}>{tags.length}</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, flexShrink:0, background:C.bg, position:"sticky", top:76, zIndex:19 }}>
        {([["scan","SCAN"],["history",`HISTORY${tags.length?` (${tags.length})`:""}` ],["ios","iOS GUIDE"]] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, background:"none", border:"none", borderBottom:tab===id?`2px solid ${C.purple}`:"2px solid transparent", color:tab===id?C.purple:C.muted, fontSize:10, fontWeight:700, letterSpacing:"0.1em", padding:"11px 0", cursor:"pointer", fontFamily:"inherit", transition:"color 0.15s" }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", overscrollBehavior:"contain" }}>

        {/* SCAN TAB */}
        {tab === "scan" && (
          <div style={{ padding:"32px 24px 40px", display:"flex", flexDirection:"column", alignItems:"center", gap:28 }}>

            {/* Main scanner UI */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, width:"100%" }}>
              {isScanning ? (
                <PulseRings color={C.blue} />
              ) : appState === "success" ? (
                <div style={{ width:72, height:72, borderRadius:"50%", background:C.green+"22", border:`2px solid ${C.green}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>✓</div>
              ) : appState === "error" ? (
                <div style={{ width:72, height:72, borderRadius:"50%", background:C.red+"22", border:`2px solid ${C.red}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>✕</div>
              ) : isUnsupported ? (
                <div style={{ width:72, height:72, borderRadius:"50%", background:C.orange+"22", border:`2px solid ${C.orange}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>🔒</div>
              ) : (
                <div style={{ width:72, height:72, borderRadius:"50%", background:C.blue+"22", border:`2px solid ${C.blue}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>📡</div>
              )}

              <div style={{ textAlign:"center" }}>
                <p style={{ fontSize:20, fontWeight:700, marginBottom:6 }}>
                  {isScanning?"Hold tag to phone":appState==="success"?"Tag read":appState==="error"?"Read failed":isUnsupported?"NFC unavailable":"Ready to scan"}
                </p>
                <p style={{ fontSize:13, color:C.sub, lineHeight:1.6, maxWidth:300 }}>
                  {isScanning ? "Keep the NFC tag near the top edge of your iPhone 13." :
                   appState==="success" ? `${tags[0]?.records.length ?? 0} NDEF record${(tags[0]?.records.length??0)!==1?"s":""} found. Check History tab.` :
                   appState==="error" ? error :
                   isUnsupported ? "Web NFC is not supported on iOS. See the iOS Guide tab for native alternatives." :
                   "Tap the button below to start scanning for NDEF tags."}
                </p>
              </div>
            </div>

            {/* Scan / Stop button */}
            {!isUnsupported && (
              <button
                onClick={isScanning ? stopScan : startScan}
                style={{
                  width:"100%", maxWidth:320,
                  background: isScanning ? C.red+"22" : "linear-gradient(135deg,#0a84ff,#bf5af2)",
                  border: isScanning ? `1.5px solid ${C.red}` : "none",
                  borderRadius:16, color: isScanning ? C.red : "#fff",
                  fontSize:15, fontWeight:700, padding:"16px 0",
                  cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em",
                  transition:"all 0.2s",
                }}
              >
                {isScanning ? "STOP SCANNING" : appState==="success" ? "SCAN AGAIN" : "START SCAN"}
              </button>
            )}

            {isUnsupported && (
              <button onClick={()=>setTab("ios")} style={{ width:"100%", maxWidth:320, background:`linear-gradient(135deg,${C.orange}33,${C.purple}33)`, border:`1.5px solid ${C.orange}66`, borderRadius:16, color:C.orange, fontSize:14, fontWeight:700, padding:"16px 0", cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em" }}>
                VIEW iOS ALTERNATIVES
              </button>
            )}

            {/* Tag tech info */}
            {!isUnsupported && (
              <div style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px" }}>
                <p style={{ fontSize:10, color:C.dim, letterSpacing:"0.1em", marginBottom:12 }}>SUPPORTED TAG TYPES</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {["NTAG213","NTAG215","NTAG216","Mifare Classic","Mifare Ultralight","ISO 14443","ISO 15693","FeliCa"].map(t=>(
                    <span key={t} style={{ background:C.border, color:C.sub, fontSize:10, padding:"4px 10px", borderRadius:20, border:`1px solid ${C.border2}` }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div style={{ padding:"16px 16px 40px" }}>
            {tags.length === 0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, paddingTop:80 }}>
                <span style={{ fontSize:44 }}>🏷</span>
                <p style={{ fontSize:13, color:C.muted, textAlign:"center" }}>No tags scanned yet.<br/>Go to Scan tab to read a tag.</p>
              </div>
            ) : tags.map((tag,ti) => (
              <div key={tag.id} style={{ animation:"fadeIn 0.25s ease", marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:10, color:C.dim, letterSpacing:"0.1em" }}>TAG {tags.length - ti}</span>
                  <span style={{ fontSize:10, color:C.muted, marginLeft:"auto" }}>
                    {tag.timestamp.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                  </span>
                </div>
                {tag.serialNumber && (
                  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:10, color:C.dim }}>SERIAL</span>
                    <span style={{ fontSize:11, color:C.sub, fontFamily:"'SF Mono','Menlo',monospace", letterSpacing:"0.04em" }}>{tag.serialNumber}</span>
                  </div>
                )}
                {tag.records.map((r,ri) => <RecordCard key={ri} record={r} index={ri}/>)}
                {ti < tags.length - 1 && <div style={{ height:1, background:C.border, margin:"16px 0" }}/>}
              </div>
            ))}
          </div>
        )}

        {/* iOS GUIDE TAB */}
        {tab === "ios" && (
          <div style={{ padding:"16px 16px 0" }}>
            <IosInstructions/>
          </div>
        )}
      </div>
    </div>
  );
}
