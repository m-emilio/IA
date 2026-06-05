import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = [
  { name: "White",  hex: "#FFFFFF" },
  { name: "Warm",   hex: "#FFD580" },
  { name: "Red",    hex: "#FF2222" },
  { name: "Orange", hex: "#FF8800" },
  { name: "Yellow", hex: "#FFE600" },
  { name: "Green",  hex: "#00FF66" },
  { name: "Cyan",   hex: "#00FFEE" },
  { name: "Blue",   hex: "#3399FF" },
  { name: "Indigo", hex: "#6644FF" },
  { name: "Violet", hex: "#BB00FF" },
  { name: "Pink",   hex: "#FF44CC" },
  { name: "Rose",   hex: "#FF6688" },
];

// SOS morse: . . . — — — . . .
const SOS_PATTERN = [
  150,100, 150,100, 150,400,
  400,100, 400,100, 400,400,
  150,100, 150,100, 150,1200,
];

export default function Flashlight() {
  const [color, setColor]           = useState("#FFFFFF");
  const [brightness, setBrightness] = useState(100);
  const [beamSize, setBeamSize]     = useState(60);
  const [mode, setMode]             = useState("full");  // "full" | "beam"
  const [strobeOn, setStrobeOn]     = useState(false);
  const [strobeHz, setStrobeHz]     = useState(4);
  const [sosOn, setSosOn]           = useState(false);
  const [lit, setLit]               = useState(true);
  const [beamPos, setBeamPos]       = useState({ x: 50, y: 40 });
  const [tab, setTab]               = useState("color"); // "color"|"beam"|"special"

  const mainRef   = useRef(null);
  const sosRef    = useRef(null);
  const strobeRef = useRef(null);

  // ── Strobe ──────────────────────────────────────────────
  useEffect(() => {
    if (strobeRef.current) clearInterval(strobeRef.current);
    if (!strobeOn || sosOn) return;
    strobeRef.current = setInterval(
      () => setLit(v => !v),
      Math.round(1000 / strobeHz / 2)
    );
    return () => clearInterval(strobeRef.current);
  }, [strobeOn, strobeHz, sosOn]);

  // ── SOS ─────────────────────────────────────────────────
  useEffect(() => {
    if (sosRef.current) clearTimeout(sosRef.current);
    if (!sosOn) { setLit(true); return; }
    setStrobeOn(false);
    let idx = 0;
    const step = () => {
      const on = idx % 2 === 0;
      setLit(on);
      sosRef.current = setTimeout(() => {
        idx = (idx + 1) % SOS_PATTERN.length;
        step();
      }, SOS_PATTERN[idx]);
    };
    step();
    return () => clearTimeout(sosRef.current);
  }, [sosOn]);

  // ── Touch tracking on main canvas ───────────────────────
  const handleTouch = useCallback((e) => {
    if (mode !== "beam") return;
    e.preventDefault();
    const t   = e.touches[0];
    const el  = mainRef.current;
    if (!el) return;
    const r   = el.getBoundingClientRect();
    setBeamPos({
      x: ((t.clientX - r.left) / r.width)  * 100,
      y: ((t.clientY - r.top)  / r.height) * 100,
    });
  }, [mode]);

  const handleMouse = useCallback((e) => {
    if (mode !== "beam") return;
    const el = mainRef.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    setBeamPos({
      x: ((e.clientX - r.left) / r.width)  * 100,
      y: ((e.clientY - r.top)  / r.height) * 100,
    });
  }, [mode]);

  // ── Derived visual values ────────────────────────────────
  const alpha   = (brightness / 100).toFixed(2);
  const bgColor = lit ? color : "#000000";

  const fullBg = mode === "full"
    ? `rgba(${hexToRgb(bgColor)},${alpha})`
    : "black";

  const beamGrad = mode === "beam" && lit
    ? `radial-gradient(circle at ${beamPos.x}% ${beamPos.y}%,
        rgba(${hexToRgb(color)},${alpha}) 0%,
        rgba(${hexToRgb(color)},${(brightness/100*0.5).toFixed(2)}) ${beamSize * 0.4}%,
        rgba(${hexToRgb(color)},0.04) ${beamSize}%,
        black 100%)`
    : mode === "beam"
      ? "black"
      : undefined;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100vw",
                  background:"#0a0a0a", fontFamily:"'SF Pro Display',system-ui,sans-serif",
                  userSelect:"none", WebkitUserSelect:"none" }}>

      {/* ── LIGHT CANVAS ────────────────────────────────── */}
      <div
        ref={mainRef}
        onMouseMove={handleMouse}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        style={{
          flex: 1,
          background: beamGrad ?? fullBg,
          transition: strobeOn || sosOn ? "none" : "background 0.25s ease",
          touchAction: mode === "beam" ? "none" : "auto",
          cursor: "crosshair",
          position: "relative",
        }}
      >
        {/* Mode badge */}
        <div style={{
          position:"absolute", top:16, left:16,
          fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.35)",
          textTransform:"uppercase", fontWeight:600
        }}>
          {mode === "full" ? "Full Flood" : "Beam Mode"}
          {strobeOn && " · STROBE"}
          {sosOn    && " · SOS"}
        </div>

        {/* Beam crosshair */}
        {mode === "beam" && (
          <div style={{
            position:"absolute",
            left:`${beamPos.x}%`, top:`${beamPos.y}%`,
            transform:"translate(-50%,-50%)",
            width:36, height:36,
            border:`2px solid rgba(255,255,255,0.35)`,
            borderRadius:"50%",
            pointerEvents:"none",
          }} />
        )}
      </div>

      {/* ── CONTROL PANEL ───────────────────────────────── */}
      <div style={{
        background: "rgba(14,14,16,0.97)",
        backdropFilter:"blur(24px)",
        borderTop:"1px solid rgba(255,255,255,0.08)",
        padding:"12px 0 20px",
        flexShrink:0,
      }}>

        {/* Tab bar */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:14, padding:"0 16px" }}>
          {[
            { id:"color",   label:"🎨 Color"   },
            { id:"light",   label:"☀️ Light"   },
            { id:"special", label:"⚡ Special"  },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex:1,
                padding:"8px 4px",
                borderRadius:10,
                border:"none",
                fontSize:12,
                fontWeight:600,
                cursor:"pointer",
                background: tab === t.id ? "rgba(255,255,255,0.12)" : "transparent",
                color: tab === t.id ? "#fff" : "rgba(255,255,255,0.4)",
                transition:"all 0.2s",
                letterSpacing:0.3,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ── COLOR TAB ───────────────────────────────────── */}
        {tab === "color" && (
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch",
                        touchAction:"pan-x", paddingBottom:4 }}>
            <div style={{ display:"flex", gap:12, padding:"4px 20px",
                          width:"max-content" }}>
              {COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => { setColor(c.hex); setSosOn(false); }}
                  style={{
                    width:54, height:54, borderRadius:"50%", border:"none",
                    background: c.hex,
                    cursor:"pointer",
                    boxShadow: color === c.hex
                      ? `0 0 0 3px #0a0a0a, 0 0 0 5px ${c.hex}, 0 0 20px ${c.hex}88`
                      : `0 0 12px ${c.hex}44`,
                    transform: color === c.hex ? "scale(1.15)" : "scale(1)",
                    transition:"all 0.2s",
                    flexShrink:0,
                  }}
                  aria-label={c.name}
                />
              ))}
            </div>
            <div style={{ textAlign:"center", marginTop:8,
                          fontSize:11, color:"rgba(255,255,255,0.25)",
                          letterSpacing:1 }}>
              SWIPE TO SEE MORE COLORS →
            </div>
          </div>
        )}

        {/* ── LIGHT TAB ───────────────────────────────────── */}
        {tab === "light" && (
          <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:20 }}>

            {/* Mode toggle */}
            <div style={{ display:"flex", gap:8 }}>
              {[
                { v:"full", label:"Full Screen" },
                { v:"beam", label:"Beam Mode"   },
              ].map(m => (
                <button
                  key={m.v}
                  onClick={() => setMode(m.v)}
                  style={{
                    flex:1, padding:"10px 0", borderRadius:12, border:"none",
                    cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:0.3,
                    background: mode === m.v ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                    color: mode === m.v ? "#fff" : "rgba(255,255,255,0.4)",
                    transition:"all 0.2s",
                  }}
                >{m.label}</button>
              ))}
            </div>

            {/* Brightness */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between",
                            marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)",
                            letterSpacing:1 }}>
                <span>BRIGHTNESS</span>
                <span style={{ color:"#fff", fontWeight:700 }}>{brightness}%</span>
              </div>
              <div style={{ position:"relative" }}>
                <div style={{
                  position:"absolute", top:"50%", left:0, right:0,
                  height:6, borderRadius:3, transform:"translateY(-50%)",
                  background: `linear-gradient(to right, rgba(${hexToRgb(color)},0.1), ${color})`,
                  pointerEvents:"none",
                }} />
                <input type="range" min={5} max={100} value={brightness}
                  onChange={e => setBrightness(+e.target.value)}
                  style={sliderStyle("#fff")}
                />
              </div>
            </div>

            {/* Beam size (beam mode only) */}
            {mode === "beam" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between",
                              marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)",
                              letterSpacing:1 }}>
                  <span>BEAM WIDTH</span>
                  <span style={{ color:"#fff", fontWeight:700 }}>{beamSize}%</span>
                </div>
                <input type="range" min={10} max={100} value={beamSize}
                  onChange={e => setBeamSize(+e.target.value)}
                  style={sliderStyle(color)}
                />
              </div>
            )}
          </div>
        )}

        {/* ── SPECIAL TAB ─────────────────────────────────── */}
        {tab === "special" && (
          <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:14 }}>

            {/* Strobe */}
            <div style={{
              background:"rgba(255,255,255,0.05)", borderRadius:14,
              padding:"14px 16px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: strobeOn ? 12 : 0 }}>
                <div>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>⚡ Strobe</div>
                  <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:2 }}>
                    {strobeOn ? `${strobeHz} Hz` : "Flash rapidly"}
                  </div>
                </div>
                <Toggle active={strobeOn} onToggle={() => { setStrobeOn(v => !v); setSosOn(false); }} />
              </div>
              {strobeOn && (
                <div>
                  <input type="range" min={1} max={20} value={strobeHz}
                    onChange={e => setStrobeHz(+e.target.value)}
                    style={sliderStyle("#FF8800")}
                  />
                  <div style={{ display:"flex", justifyContent:"space-between",
                                fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
                    <span>Slow</span><span>Fast</span>
                  </div>
                </div>
              )}
            </div>

            {/* SOS */}
            <div style={{
              background: sosOn ? "rgba(255,30,30,0.12)" : "rgba(255,255,255,0.05)",
              borderRadius:14, padding:"14px 16px",
              border: sosOn ? "1px solid rgba(255,60,60,0.3)" : "1px solid transparent",
              transition:"all 0.3s",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color: sosOn ? "#FF4444" : "#fff", fontWeight:700, fontSize:14 }}>
                    🆘 SOS Signal
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:2 }}>
                    Morse code distress signal
                  </div>
                </div>
                <Toggle active={sosOn} color="#FF4444"
                  onToggle={() => { setSosOn(v => !v); setStrobeOn(false); }} />
              </div>
            </div>

            {/* Screen tap lock */}
            <div style={{
              background:"rgba(255,255,255,0.05)", borderRadius:14,
              padding:"14px 16px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>🔒 Lock Touch</div>
                  <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:2 }}>
                    Prevent accidental taps
                  </div>
                </div>
                <button
                  onClick={() => setMode(mode === "locked" ? "full" : "locked")}
                  style={{
                    padding:"8px 16px", borderRadius:20, border:"none",
                    cursor:"pointer", fontWeight:700, fontSize:12,
                    background: mode === "locked" ? "rgba(255,200,0,0.2)" : "rgba(255,255,255,0.1)",
                    color: mode === "locked" ? "#FFD700" : "rgba(255,255,255,0.5)",
                    transition:"all 0.2s",
                  }}
                >{mode === "locked" ? "Locked" : "Lock"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global input styling */}
      <style>{`
        input[type=range] { -webkit-appearance:none; appearance:none; outline:none; background:rgba(255,255,255,0.1); border-radius:4px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:26px; height:26px; border-radius:50%; background:#fff; cursor:pointer; box-shadow:0 2px 12px rgba(0,0,0,0.6); }
        input[type=range]::-moz-range-thumb { width:26px; height:26px; border-radius:50%; background:#fff; cursor:pointer; border:none; box-shadow:0 2px 12px rgba(0,0,0,0.6); }
      `}</style>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function sliderStyle(accentColor) {
  return {
    width:"100%", height:6, borderRadius:3,
    cursor:"pointer", accentColor,
    WebkitAppearance:"none", appearance:"none",
    background:`linear-gradient(to right, ${accentColor}99, ${accentColor})`,
  };
}

function Toggle({ active, onToggle, color = "#4CAF50" }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width:52, height:30, borderRadius:15, border:"none",
        cursor:"pointer", position:"relative", flexShrink:0,
        background: active ? color : "rgba(255,255,255,0.15)",
        transition:"background 0.25s",
      }}
    >
      <div style={{
        position:"absolute", top:3, borderRadius:"50%",
        width:24, height:24, background:"#fff",
        left: active ? 25 : 3,
        transition:"left 0.25s",
        boxShadow:"0 2px 6px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}
