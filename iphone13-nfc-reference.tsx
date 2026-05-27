import { useState, useEffect, useRef } from "react";

const NFC_DATA = {
  hardware: {
    title: "Hardware Specs",
    icon: "⬡",
    color: "#00E5FF",
    specs: [
      { label: "Chip", value: "NXP SN110U (Secure NFC)", note: "Integrated in Apple A15 Bionic platform" },
      { label: "Frequency", value: "13.56 MHz", note: "ISO/IEC 18000-3 compliant" },
      { label: "Antenna Location", value: "Top-rear housing", note: "Within 4 cm optimal read zone" },
      { label: "Read Range", value: "Up to 10 cm", note: "Typical: 1–4 cm for reliable coupling" },
      { label: "Max Session Duration", value: "60 seconds", note: "System enforced — NFCTagReaderSession" },
      { label: "Background Reading", value: "Supported (iOS 13+)", note: "com.apple.developer.nfc.readersession.formats" },
      { label: "Write Support", value: "NDEF write via iOS 13+", note: "NFCNDEFReaderSession.connect() required" },
      { label: "Secure Element", value: "Apple Pay / Wallet only", note: "3rd party cannot access SE directly" },
    ],
  },
  protocols: {
    title: "Supported Protocols",
    icon: "◈",
    color: "#FFD60A",
    items: [
      {
        name: "NDEF",
        standard: "NFC Forum",
        class: "NFCNDEFReaderSession",
        ios: "11+",
        background: true,
        description: "Read and write NFC Data Exchange Format records. Supports Text, URI, Smart Poster, MIME, and External Type records. Most common for URL tags, business cards, product authentication.",
        capabilities: ["Read NDEF messages", "Write NDEF records", "Format blank tags", "Lock tags (make read-only)", "Background tag reading via entitlement"],
        apduFlow: null,
      },
      {
        name: "ISO 7816-4",
        standard: "ISO/IEC",
        class: "NFCISO7816Tag",
        ios: "13+",
        background: false,
        description: "Contactless smart card communication via APDUs. Used for government IDs (e-passport, CAC), transit cards, and payment-adjacent applets. Requires explicit AID selection.",
        capabilities: ["SELECT by AID", "READ BINARY", "GET DATA", "VERIFY (PIN/CHV)", "EXTERNAL AUTHENTICATE", "GENERAL AUTHENTICATE"],
        apduFlow: ["SELECT AID → SW 9000", "VERIFY PIN (if needed) → SW 9000", "READ BINARY / GET DATA → payload + SW 9000"],
      },
      {
        name: "ISO 15693",
        standard: "ISO/IEC",
        class: "NFCISO15693Tag",
        ios: "14+",
        background: false,
        description: "Vicinity cards — longer read range (~1 m). Used for supply chain, library RFID, asset tracking. Addressed by 8-byte UID.",
        capabilities: ["Read single/multiple blocks", "Write single block", "Lock block", "Get system info", "Read AFI/DSFID"],
        apduFlow: null,
      },
      {
        name: "FeliCa",
        standard: "Sony / JIS X 6319-4",
        class: "NFCFeliCaTag",
        ios: "13+",
        background: false,
        description: "High-speed protocol used across Japanese transit (Suica, PASMO), e-money, and building access in East Asia. 212/424 kbps data rate.",
        capabilities: ["Read Without Encryption", "Write Without Encryption", "Request Service", "Request Response", "Request System Code"],
        apduFlow: null,
      },
      {
        name: "MiFare",
        standard: "NXP",
        class: "NFCMiFareTag",
        ios: "13+",
        background: false,
        description: "NXP's MiFare Classic, Ultralight, Plus, and DESFire families. Widely used for access control, loyalty cards, event tickets. Native APDU passthrough on DESFire.",
        capabilities: ["MiFare Classic (Sector/Block R/W)", "MiFare Ultralight (Page R/W)", "MiFare DESFire APDU passthrough", "sendMiFareISO7816APDU()", "sendMiFareCommand()"],
        apduFlow: null,
      },
    ],
  },
  sessions: {
    title: "Session Types",
    icon: "⬡",
    color: "#34C759",
    items: [
      {
        name: "NFCTagReaderSession",
        use: "ISO 7816, ISO 15693, FeliCa, MiFare",
        ios: "13+",
        thread: "Delegate on background queue",
        lifecycle: [
          "init(pollingOption:delegate:queue:) — set pollingOption for tag types",
          "begin() — starts RF field, presents system NFC sheet",
          "tagReaderSession(_:didDetectTags:) — delegate fires on tag detect",
          "connect(to:completionHandler:) — establish RF connection to tag",
          "invalidate() — ends session, dismisses sheet",
          "invalidate(errorMessage:) — ends with user-visible error string",
        ],
        pollingOptions: [
          ".iso14443 — ISO 7816 + MiFare",
          ".iso15693 — Vicinity tags",
          ".iso18092 — FeliCa",
          ".pace — German ID cards (iOS 15+)",
        ],
        notes: "Only one NFCTagReaderSession active at a time system-wide. Must call connect() before sending any commands. Tags disconnect if phone moves away — handle NFCReaderErrorTagNotConnected.",
      },
      {
        name: "NFCNDEFReaderSession",
        use: "NDEF read/write on all tag types",
        ios: "11+",
        thread: "Delegate on background queue",
        lifecycle: [
          "init(delegate:queue:invalidateAfterFirstRead:) — set invalidateAfterFirstRead for scan-once",
          "begin() — activates RF field",
          "readerSession(_:didDetectNDEFs:) — fires with NFCNDEFMessage array",
          "readerSession(_:didDetectTags:) — iOS 13+ for write-enabled flow",
          "connect(to:completionHandler:) — required before write",
          "invalidate() / invalidate(errorMessage:)",
        ],
        pollingOptions: null,
        notes: "For write operations: use didDetectTags (not didDetectNDEFs), call connect(), then writeNDEF(). To lock a tag permanently: queryNDEFStatus → .readWrite, then writeLock(). Background tag reading does NOT go through this session — it uses system handling.",
      },
      {
        name: "Background Tag Reading",
        use: "Universal Links via NDEF URI records",
        ios: "12+",
        thread: "System-handled (no session)",
        lifecycle: [
          "No NFCTagReaderSession required",
          "Entitlement: com.apple.developer.nfc.readersession.formats",
          "Tag must contain NDEF URI record with https:// scheme",
          "System shows banner notification → taps open app via Universal Link",
          "App handles URL in application(_:continue:restorationHandler:)",
        ],
        pollingOptions: null,
        notes: "Only fires when screen is ON and device is unlocked. Does not work in airplane mode. Requires Associated Domains entitlement + apple-app-site-association file on your server. NFC icon appears in Control Center when active.",
      },
    ],
  },
  errors: {
    title: "Error Codes",
    icon: "◆",
    color: "#FF453A",
    items: [
      { code: "NFCReaderErrorUnsupportedFeature", hex: "0x00", cause: "Device doesn't support NFC or entitlement missing", fix: "Check NFCTagReaderSession.readingAvailable before UI. Verify entitlement in .entitlements file." },
      { code: "NFCReaderErrorSecurityViolation", hex: "0x01", cause: "App not entitled or provisioning mismatch", fix: "Regenerate provisioning profile after enabling NFC capability on Apple Developer Portal." },
      { code: "NFCReaderErrorInvalidParameter", hex: "0x03", cause: "Nil delegate, empty pollingOption, or bad APDU bytes", fix: "Ensure pollingOption is not empty []. Validate APDU CLA/INS/P1/P2 bytes before sending." },
      { code: "NFCReaderErrorParameterOutOfBound", hex: "0x04", cause: "APDU payload exceeds tag's max buffer", fix: "Use extended APDU (Lc/Le > 255) only if tag supports ISO 7816-4 extended length. Chunk data into ≤255 byte blocks." },
      { code: "NFCReaderErrorTagNotConnected", hex: "0x05", cause: "Tag left RF field before command completed", fix: "Implement retry logic in completion handler. Prompt user to hold steady. Disable MagSafe accessories." },
      { code: "NFCReaderErrorTagResponseError", hex: "0x06", cause: "Tag returned unexpected response or bad SW status", fix: "Log raw response bytes. Check SW1 SW2 (e.g. 6A82 = file not found, 6982 = security status not satisfied)." },
      { code: "NFCReaderErrorSessionTimeout", hex: "0x07", cause: "60-second session window expired", fix: "Pre-cache any network data before begin(). Minimize APDU round-trips. Restart session gracefully." },
      { code: "NFCReaderErrorSessionTerminatedUnexpectedly", hex: "0x08", cause: "System interrupted session (call, notification, lock)", fix: "Handle in didInvalidateWithError. Offer user a retry button. Never auto-restart without user intent." },
      { code: "NFCReaderErrorFirstNDEFTagRead", hex: "0x09", cause: "invalidateAfterFirstRead was true — expected behavior", fix: "Not an error — session closed after first read as configured. Use false if you need multi-read." },
      { code: "NFCReaderTransceiveErrorTagConnectionLost", hex: "0x100", cause: "RF connection dropped during transceive", fix: "Retry connect(to:) before next APDU. Alert user to maintain contact." },
      { code: "NFCReaderTransceiveErrorRetryExceeded", hex: "0x101", cause: "Too many retransmissions at RF layer", fix: "Tag may be damaged or counterfeit. Reduce ambient RF interference. Test with known-good tag." },
      { code: "NFCReaderTransceiveErrorTagResponseError", hex: "0x102", cause: "Tag responded with framing/CRC error", fix: "Check tag condition. Ensure tag type matches pollingOption. Ferrite shielding on metallic surfaces." },
    ],
  },
  antenna: {
    title: "Antenna & Placement",
    icon: "◎",
    color: "#BF5AF2",
    zones: [
      { id: "optimal", label: "Optimal Zone", y: 8, h: 18, color: "#34C759", opacity: 0.25, desc: "Top 18% of rear — strongest coupling. Center tag here for fastest read." },
      { id: "good", label: "Good Zone", y: 26, h: 14, color: "#FFD60A", opacity: 0.2, desc: "Upper-middle rear — acceptable coupling with slight attenuation." },
      { id: "weak", label: "Weak / Avoid", y: 40, h: 60, color: "#FF453A", opacity: 0.1, desc: "Below midpoint — coupling drops sharply. Expect read failures or session timeouts." },
    ],
    tips: [
      { icon: "✓", text: "Remove metallic or MagSafe cases — metal attenuates 13.56 MHz field severely" },
      { icon: "✓", text: "Tilt phone 15–30° rather than flat-on-tag for thicker credential carriers" },
      { icon: "✓", text: "Wipe rear glass — oils/moisture can slightly shift resonant frequency" },
      { icon: "✗", text: "Do not scan near other NFC/RFID readers — cross-talk causes NFCReaderErrorTagResponseError" },
      { icon: "✗", text: "Avoid scanning in high RF environments (airport security, server rooms)" },
      { icon: "✗", text: "Do not hold tag perpendicular to phone — antenna coupling requires parallel plane alignment" },
    ],
  },
};

const TABS = [
  { id: "hardware", label: "Hardware", icon: "⬡" },
  { id: "protocols", label: "Protocols", icon: "◈" },
  { id: "sessions", label: "Sessions", icon: "⊕" },
  { id: "errors", label: "Errors", icon: "◆" },
  { id: "antenna", label: "Antenna", icon: "◎" },
];

function RippleWave({ color }) {
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          animation: `ripple 2.4s ease-out ${i * 0.8}s infinite`,
          opacity: 0,
        }} />
      ))}
      <div style={{
        position: "absolute",
        inset: "50%",
        transform: "translate(-50%, -50%)",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 20px ${color}88`,
      }} />
    </div>
  );
}

function PhoneDiagram({ zones }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 20px" }}>
      <div style={{ position: "relative", width: 120, height: 240 }}>
        {/* Phone body */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg, #2A2D38 0%, #1A1D26 100%)",
          borderRadius: 22,
          border: "2px solid #3A3D4A",
          boxShadow: "0 8px 32px #00000066, inset 0 1px 0 #4A4D5A",
          overflow: "hidden",
        }}>
          {/* Zones */}
          {zones.map((z) => (
            <div key={z.id} style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${z.y}%`,
              height: `${z.h}%`,
              background: z.color,
              opacity: z.opacity,
            }} />
          ))}
          {/* Camera island */}
          <div style={{
            position: "absolute",
            top: 10,
            left: 12,
            width: 44,
            height: 44,
            background: "#111318",
            borderRadius: 14,
            border: "1.5px solid #2A2D38",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: 5,
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: "#1E2130", border: "1px solid #2E3148" }} />
            ))}
          </div>
          {/* NFC antenna indicator */}
          <div style={{
            position: "absolute",
            top: "8%",
            right: 6,
            width: 28,
            height: 4,
            background: "#00E5FF44",
            borderRadius: 2,
            boxShadow: "0 0 8px #00E5FF66",
          }} />
          <div style={{
            position: "absolute",
            top: "calc(8% + 6px)",
            right: 6,
            fontSize: 6,
            color: "#00E5FF",
            letterSpacing: 0.3,
          }}>NFC</div>
          {/* Screen area */}
          <div style={{
            position: "absolute",
            bottom: 16,
            left: 8,
            right: 8,
            height: 100,
            background: "#0A0C14",
            borderRadius: 10,
            border: "1px solid #2A2D38",
          }} />
          {/* Dynamic island */}
          <div style={{
            position: "absolute",
            bottom: 122,
            left: "50%",
            transform: "translateX(-50%)",
            width: 36,
            height: 9,
            background: "#0A0C14",
            borderRadius: 5,
          }} />
        </div>
        {/* Zone labels */}
        {zones.slice(0,2).map((z) => (
          <div key={z.id} style={{
            position: "absolute",
            left: 126,
            top: `${z.y + z.h / 2 - 5}%`,
            fontSize: 8,
            color: z.color,
            fontFamily: "'DM Mono', monospace",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}>← {z.label}</div>
        ))}
      </div>
    </div>
  );
}

export default function NFCReference() {
  const [tab, setTab] = useState("hardware");
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(null);
  const section = NFC_DATA[tab];

  const copy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const accentColor = section?.color || "#00E5FF";

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Courier New', monospace",
      background: "#0A0B10",
      minHeight: "100vh",
      color: "#C4CAD8",
      display: "flex",
      flexDirection: "column",
      maxWidth: 780,
      margin: "0 auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2E3A; border-radius: 2px; }
        @keyframes ripple {
          0% { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 8px var(--glow); }
          50% { box-shadow: 0 0 20px var(--glow), 0 0 40px var(--glow-dim); }
        }
        .anim-in { animation: fadeSlide 0.25s ease-out both; }
        .tab-item { transition: all 0.18s; }
        .tab-item:hover { opacity: 0.85; }
        .expand-row { transition: background 0.15s; cursor: pointer; }
        .expand-row:hover { background: #13151E !important; }
        .tip-row:hover { background: #13151E; }
        .copy-btn { transition: all 0.15s; opacity: 0.5; }
        .copy-btn:hover { opacity: 1; }
      `}</style>

      {/* Hero header */}
      <div style={{
        padding: "22px 20px 18px",
        background: "linear-gradient(180deg, #0E1020 0%, #0A0B10 100%)",
        borderBottom: `1px solid ${accentColor}22`,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <RippleWave color={accentColor} />
          <div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: "#F0F2F8",
              letterSpacing: -0.5,
              lineHeight: 1.1,
            }}>iPhone 13 Pro Max</div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: accentColor,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginTop: 2,
            }}>NFC Reference</div>
            <div style={{ fontSize: 9, color: "#404558", letterSpacing: 0.5, marginTop: 4 }}>
              CoreNFC · 13.56 MHz · ISO 14443/15693/18092
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          paddingBottom: 2,
        }}>
          {TABS.map((t) => {
            const tc = NFC_DATA[t.id]?.color || "#00E5FF";
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className="tab-item"
                onClick={() => { setTab(t.id); setExpanded(null); }}
                style={{
                  background: active ? `${tc}18` : "transparent",
                  border: `1px solid ${active ? tc : "#1E2230"}`,
                  color: active ? tc : "#505668",
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 11 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="anim-in" key={tab} style={{ flex: 1, padding: "16px 16px 32px", overflow: "auto" }}>

        {/* HARDWARE */}
        {tab === "hardware" && (
          <div>
            <SectionHeader color={accentColor} title="iPhone 13 Pro Max NFC Hardware" sub="NXP SN110U · Apple A15 Bionic Platform" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {NFC_DATA.hardware.specs.map((s, i) => (
                <div key={i} style={{
                  background: "#0E1018",
                  border: "1px solid #1A1E2A",
                  borderRadius: 10,
                  padding: "12px 14px",
                  gridColumn: i < 2 ? "span 1" : undefined,
                }}>
                  <div style={{ fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#E0E4F0", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#404558", lineHeight: 1.5 }}>{s.note}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, background: "#0E1018", border: `1px solid ${accentColor}22`, borderRadius: 10, padding: "14px" }}>
              <div style={{ fontSize: 9, color: accentColor, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>
                Key iOS APIs
              </div>
              {[
                ["NFCTagReaderSession.readingAvailable", "Bool — always check before showing NFC UI"],
                ["NFCTagReaderSession(pollingOption:delegate:queue:)", "Init with .iso14443 | .iso15693 | .iso18092 | .pace"],
                ["NFCNDEFReaderSession(delegate:queue:invalidateAfterFirstRead:)", "High-level NDEF read/write session"],
                ["session.begin()", "Activates RF field + shows system NFC sheet"],
                ["session.invalidate()", "Ends session gracefully"],
                ["session.alertMessage", "String shown in system NFC sheet during scan"],
              ].map(([fn, desc], i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 0",
                  borderTop: i > 0 ? "1px solid #13151E" : "none",
                }}>
                  <code style={{ fontSize: 10, color: "#8BE6A0", flex: 1, wordBreak: "break-all", lineHeight: 1.5 }}>{fn}</code>
                  <span style={{ fontSize: 10, color: "#404558", textAlign: "right", maxWidth: 160, lineHeight: 1.4 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROTOCOLS */}
        {tab === "protocols" && (
          <div>
            <SectionHeader color={accentColor} title="NFC Protocols" sub="All tag types supported on iPhone 13 Pro Max" />
            {NFC_DATA.protocols.items.map((p, i) => {
              const open = expanded === p.name;
              return (
                <div key={p.name} style={{
                  background: "#0E1018",
                  border: `1px solid ${open ? accentColor + "44" : "#1A1E2A"}`,
                  borderRadius: 10,
                  marginBottom: 8,
                  overflow: "hidden",
                }}>
                  <div
                    className="expand-row"
                    onClick={() => setExpanded(open ? null : p.name)}
                    style={{
                      padding: "13px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: open ? `${accentColor}08` : "transparent",
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: accentColor,
                      boxShadow: `0 0 8px ${accentColor}`,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E4F0" }}>{p.name}</span>
                        <span style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          background: "#1A1E2A",
                          color: "#606880",
                          borderRadius: 4,
                          letterSpacing: 0.5,
                        }}>{p.standard}</span>
                        <span style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          background: p.background ? "#1A2E1A" : "#1A1E2A",
                          color: p.background ? "#30D158" : "#606880",
                          borderRadius: 4,
                        }}>{p.background ? "BG Read ✓" : "Foreground only"}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#505668", marginTop: 3 }}>{p.class}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, color: "#404558" }}>iOS {p.ios}</span>
                      <span style={{ color: accentColor, fontSize: 14, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                    </div>
                  </div>
                  {open && (
                    <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${accentColor}22` }}>
                      <p style={{ fontSize: 11, color: "#707888", lineHeight: 1.7, margin: "12px 0 12px" }}>{p.description}</p>
                      <div style={{ fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Capabilities</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: p.apduFlow ? 14 : 0 }}>
                        {p.capabilities.map((c, ci) => (
                          <span key={ci} style={{
                            fontSize: 10,
                            background: "#131620",
                            border: "1px solid #1E2230",
                            color: "#909AAE",
                            padding: "3px 9px",
                            borderRadius: 4,
                          }}>{c}</span>
                        ))}
                      </div>
                      {p.apduFlow && (
                        <>
                          <div style={{ fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>
                            APDU Sequence
                          </div>
                          {p.apduFlow.map((step, si) => (
                            <div key={si} style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              padding: "5px 0",
                              borderTop: si > 0 ? "1px solid #13151E" : "none",
                            }}>
                              <span style={{ fontSize: 9, color: accentColor, flexShrink: 0, marginTop: 1 }}>{si + 1}.</span>
                              <code style={{ fontSize: 10, color: "#8BE6A0", lineHeight: 1.5 }}>{step}</code>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SESSIONS */}
        {tab === "sessions" && (
          <div>
            <SectionHeader color={accentColor} title="Session Types" sub="CoreNFC session management for iPhone 13 Pro Max" />
            {NFC_DATA.sessions.items.map((s) => {
              const open = expanded === s.name;
              return (
                <div key={s.name} style={{
                  background: "#0E1018",
                  border: `1px solid ${open ? accentColor + "44" : "#1A1E2A"}`,
                  borderRadius: 10,
                  marginBottom: 10,
                  overflow: "hidden",
                }}>
                  <div
                    className="expand-row"
                    onClick={() => setExpanded(open ? null : s.name)}
                    style={{
                      padding: "14px",
                      background: open ? `${accentColor}08` : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#E0E4F0", marginBottom: 4 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: "#505668" }}>{s.use}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#404558", padding: "2px 6px", background: "#131620", borderRadius: 4 }}>iOS {s.ios}</span>
                        <span style={{ color: accentColor, fontSize: 14, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                      </div>
                    </div>
                  </div>
                  {open && (
                    <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${accentColor}22` }}>
                      <div style={{ fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", margin: "12px 0 8px", fontWeight: 500 }}>
                        Lifecycle
                      </div>
                      {s.lifecycle.map((step, i) => (
                        <div key={i} style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "6px 10px",
                          background: "#0A0C14",
                          borderRadius: 6,
                          marginBottom: 4,
                        }}>
                          <span style={{ fontSize: 9, color: accentColor, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>{i + 1}</span>
                          <code style={{ fontSize: 10, color: "#8BE6A0", lineHeight: 1.6, wordBreak: "break-all" }}>{step}</code>
                        </div>
                      ))}
                      {s.pollingOptions && (
                        <>
                          <div style={{ fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", margin: "12px 0 8px", fontWeight: 500 }}>
                            Polling Options
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {s.pollingOptions.map((opt, i) => (
                              <span key={i} style={{ fontSize: 10, background: "#131620", border: "1px solid #1E2230", color: "#909AAE", padding: "3px 9px", borderRadius: 4 }}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      <div style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        background: "#13151A",
                        border: `1px solid ${accentColor}22`,
                        borderRadius: 8,
                        fontSize: 10,
                        color: "#707888",
                        lineHeight: 1.6,
                      }}>
                        <span style={{ color: accentColor, marginRight: 6 }}>ℹ</span>{s.notes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ERRORS */}
        {tab === "errors" && (
          <div>
            <SectionHeader color={accentColor} title="Error Codes" sub="NFCReaderError — CoreNFC domain" />
            {NFC_DATA.errors.items.map((e, i) => {
              const open = expanded === e.code;
              return (
                <div key={e.code} style={{
                  background: "#0E1018",
                  border: `1px solid ${open ? accentColor + "55" : "#1A1E2A"}`,
                  borderRadius: 8,
                  marginBottom: 6,
                  overflow: "hidden",
                }}>
                  <div
                    className="expand-row"
                    onClick={() => setExpanded(open ? null : e.code)}
                    style={{
                      padding: "11px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: open ? `${accentColor}08` : "transparent",
                    }}
                  >
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#FF453A",
                      background: "#2D0A09",
                      border: "1px solid #FF453A44",
                      padding: "2px 6px",
                      borderRadius: 4,
                      flexShrink: 0,
                      letterSpacing: 0.5,
                    }}>{e.hex}</span>
                    <span style={{ fontSize: 11, color: "#C4CAD8", flex: 1, wordBreak: "break-all" }}>{e.code}</span>
                    <span style={{ color: "#404558", fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                  </div>
                  {open && (
                    <div style={{ padding: "0 14px 12px", borderTop: "1px solid #1A1E2A" }}>
                      <div style={{ margin: "10px 0 6px", fontSize: 9, color: "#FF453A99", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 500 }}>Cause</div>
                      <p style={{ fontSize: 11, color: "#909AAE", lineHeight: 1.6 }}>{e.cause}</p>
                      <div style={{ margin: "10px 0 6px", fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 500 }}>Fix</div>
                      <p style={{ fontSize: 11, color: "#909AAE", lineHeight: 1.6 }}>{e.fix}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ANTENNA */}
        {tab === "antenna" && (
          <div>
            <SectionHeader color={accentColor} title="Antenna & Placement" sub="13.56 MHz coupling zones — rear housing" />
            <PhoneDiagram zones={NFC_DATA.antenna.zones} />
            {/* Zone legend */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {NFC_DATA.antenna.zones.map((z) => (
                <div key={z.id} style={{
                  flex: 1,
                  minWidth: 140,
                  background: "#0E1018",
                  border: `1px solid ${z.color}33`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: z.color }}>{z.label}</span>
                  </div>
                  <p style={{ fontSize: 10, color: "#505668", lineHeight: 1.5 }}>{z.desc}</p>
                </div>
              ))}
            </div>
            {/* Tips */}
            <div style={{ fontSize: 9, color: accentColor + "99", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>
              Placement Best Practices
            </div>
            {NFC_DATA.antenna.tips.map((t, i) => (
              <div key={i} className="tip-row" style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 7,
                marginBottom: 4,
                background: "#0E1018",
                border: "1px solid #1A1E2A",
              }}>
                <span style={{
                  fontSize: 11,
                  color: t.icon === "✓" ? "#30D158" : "#FF453A",
                  flexShrink: 0,
                  fontWeight: 700,
                }}>{t.icon}</span>
                <span style={{ fontSize: 11, color: "#808898", lineHeight: 1.5 }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ color, title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 16,
        fontWeight: 700,
        color: "#E8EAF0",
        letterSpacing: -0.3,
        marginBottom: 3,
      }}>{title}</div>
      <div style={{ fontSize: 10, color: color + "99", letterSpacing: 0.5 }}>{sub}</div>
    </div>
  );
}
