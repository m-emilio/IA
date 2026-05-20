import { useState, useMemo } from "react";

const COLORS = [
  "#00FFD1","#FF6B35","#FFE14D","#A78BFA","#34D399",
  "#F472B6","#60A5FA","#FBBF24","#F87171","#4ADE80",
];

const BASE_DATA = [
  { street:"Grand Concourse",    from:"E 149th St",    to:"E 161st St",    dir:"NB", period:"AM Peak",    vol:28400 },
  { street:"Grand Concourse",    from:"E 161st St",    to:"Fordham Rd",    dir:"SB", period:"PM Peak",    vol:26100 },
  { street:"Fordham Road",       from:"Jerome Ave",    to:"Grand Concourse",dir:"EB", period:"AM Peak",   vol:22800 },
  { street:"Fordham Road",       from:"Grand Concourse",to:"Webster Ave",  dir:"WB", period:"PM Peak",    vol:21500 },
  { street:"Jerome Avenue",      from:"Burnside Ave",  to:"Fordham Rd",    dir:"NB", period:"AM Peak",    vol:19700 },
  { street:"Jerome Avenue",      from:"Fordham Rd",    to:"Kingsbridge Rd",dir:"SB", period:"PM Peak",    vol:18300 },
  { street:"White Plains Road",  from:"E Tremont Ave", to:"Pelham Pkwy",   dir:"NB", period:"PM Peak",    vol:16900 },
  { street:"White Plains Road",  from:"Pelham Pkwy",   to:"E Tremont Ave", dir:"SB", period:"AM Peak",    vol:15200 },
  { street:"Boston Road",        from:"E 180th St",    to:"Pelham Pkwy",   dir:"NB", period:"Midday",     vol:13400 },
  { street:"Pelham Parkway",     from:"White Plains Rd",to:"Boston Rd",    dir:"EB", period:"AM Peak",    vol:17600 },
  { street:"Pelham Parkway",     from:"Boston Rd",     to:"Bronx River Pkwy",dir:"WB",period:"PM Peak",  vol:16200 },
  { street:"Webster Avenue",     from:"Fordham Rd",    to:"Gun Hill Rd",   dir:"NB", period:"AM Peak",    vol:14800 },
  { street:"Webster Avenue",     from:"Gun Hill Rd",   to:"Fordham Rd",    dir:"SB", period:"PM Peak",    vol:13900 },
  { street:"East Tremont Ave",   from:"Third Ave",     to:"Boston Rd",     dir:"EB", period:"AM Peak",    vol:11700 },
  { street:"East Tremont Ave",   from:"Boston Rd",     to:"Third Ave",     dir:"WB", period:"PM Peak",    vol:10900 },
  { street:"Southern Boulevard", from:"E 149th St",    to:"E Tremont Ave", dir:"NB", period:"Midday",     vol:9800  },
  { street:"Kingsbridge Road",   from:"Jerome Ave",    to:"Grand Concourse",dir:"EB",period:"AM Peak",    vol:12300 },
  { street:"Tremont Avenue",     from:"Jerome Ave",    to:"Webster Ave",   dir:"EB", period:"PM Peak",    vol:10400 },
  { street:"Gun Hill Road",      from:"Webster Ave",   to:"White Plains Rd",dir:"EB",period:"AM Peak",    vol:13100 },
  { street:"Gun Hill Road",      from:"White Plains Rd",to:"Webster Ave",  dir:"WB", period:"Overnight",  vol:3200  },
  { street:"Grand Concourse",    from:"Fordham Rd",    to:"Kingsbridge Rd",dir:"NB", period:"Overnight",  vol:4100  },
  { street:"Fordham Road",       from:"Webster Ave",   to:"Third Ave",     dir:"EB", period:"Overnight",  vol:2900  },
  { street:"Jerome Avenue",      from:"Kingsbridge Rd",to:"W 231st St",    dir:"NB", period:"Midday",     vol:11200 },
  { street:"Bruckner Boulevard", from:"E 138th St",    to:"E Tremont Ave", dir:"NB", period:"AM Peak",    vol:24600 },
  { street:"Bruckner Boulevard", from:"E Tremont Ave", to:"E 138th St",    dir:"SB", period:"PM Peak",    vol:23100 },
];

function jitter(n) {
  return Math.round(n * (0.88 + Math.random() * 0.24));
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
      borderRadius:12, padding:"16px 20px",
    }}>
      <div style={{ fontSize:10, color:"#6b7280", letterSpacing:2, textTransform:"uppercase",
        fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:"#00FFD1",
        fontFamily:"'Syne',sans-serif", lineHeight:1.1 }}>{value}</div>
    </div>
  );
}

function Bar({ label, value, max, color, rank }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, gap:8 }}>
        <span style={{ fontSize:13, color:"#e5e7eb", fontFamily:"'Syne',sans-serif", fontWeight:600,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          <span style={{ color, fontSize:10, marginRight:6 }}>#{rank}</span>{label}
        </span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color, fontWeight:700, flexShrink:0 }}>
          {value.toLocaleString()}
        </span>
      </div>
      <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.07)" }}>
        <div style={{
          height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg,${color}88,${color})`,
          boxShadow:`0 0 8px ${color}55`,
          transition:"width 1s cubic-bezier(.16,1,.3,1)",
        }}/>
      </div>
    </div>
  );
}

export default function App() {
  const [seed, setSeed]   = useState(0);
  const [view, setView]   = useState("bars");
  const [filter, setFilter] = useState("All");

  const rows = useMemo(() => BASE_DATA.map(r => ({ ...r, vol: jitter(r.vol) })), [seed]);

  const periods = ["All", "AM Peak", "PM Peak", "Midday", "Overnight"];
  const filtered = filter === "All" ? rows : rows.filter(r => r.period === filter);

  const byStreet = {};
  filtered.forEach(r => {
    byStreet[r.street] = (byStreet[r.street]||0) + r.vol;
  });
  const streets = Object.entries(byStreet).sort((a,b)=>b[1]-a[1]);
  const maxVol  = streets[0]?.[1] || 1;
  const total   = filtered.reduce((s,r)=>s+r.vol,0);
  const avg     = filtered.length ? Math.round(total/filtered.length) : 0;
  const busiest = streets[0]?.[0] || "—";

  const periodColors = {
    "AM Peak":"#00FFD1", "PM Peak":"#FF6B35",
    "Midday":"#FFE14D", "Overnight":"#A78BFA",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080c14", color:"#f9fafb",
      fontFamily:"'Syne',sans-serif", paddingBottom:60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        select,button{outline:none;font-family:inherit;}
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom:"1px solid rgba(0,255,209,0.1)", padding:"24px 20px 18px",
        background:"linear-gradient(180deg,rgba(0,255,209,0.06) 0%,transparent 100%)",
      }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#00FFD1", boxShadow:"0 0 8px #00FFD1" }}/>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:3,
            color:"#00FFD1", textTransform:"uppercase" }}>Bronx · NYC DOT Patterns</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:28, fontWeight:800, letterSpacing:-1 }}>
              Bronx Traffic <span style={{ color:"#00FFD1" }}>Monitor</span>
            </h1>
            <p style={{ margin:"4px 0 0", fontSize:11, color:"#6b7280", fontFamily:"'DM Mono',monospace" }}>
              25 corridors · historical volume patterns
            </p>
          </div>
          <button onClick={()=>setSeed(s=>s+1)} style={{
            background:"rgba(0,255,209,0.12)", border:"1px solid rgba(0,255,209,0.3)",
            color:"#00FFD1", borderRadius:8, padding:"9px 16px",
            fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0,
          }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding:"20px" }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20, animation:"fadeUp 0.4s ease" }}>
          <StatCard label="Corridors" value={streets.length} />
          <StatCard label="Total Vol" value={(total/1000).toFixed(0)+"k"} />
          <StatCard label="Avg / Segment" value={avg.toLocaleString()} />
          <StatCard label="Busiest" value={busiest.split(" ").slice(0,2).join(" ")} />
        </div>

        {/* Period filter */}
        <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
          {periods.map(p=>(
            <button key={p} onClick={()=>setFilter(p)} style={{
              background: filter===p ? (periodColors[p]||"rgba(0,255,209,0.2)") + "28" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter===p ? (periodColors[p]||"#00FFD1")+"55" : "rgba(255,255,255,0.08)"}`,
              color: filter===p ? (periodColors[p]||"#00FFD1") : "#6b7280",
              borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:700,
              cursor:"pointer", transition:"all 0.2s",
            }}>{p}</button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display:"flex", gap:2, marginBottom:18,
          background:"rgba(255,255,255,0.04)", width:"fit-content",
          borderRadius:10, padding:3, border:"1px solid rgba(255,255,255,0.07)" }}>
          {[["bars","📊 Streets"],["table","📋 Records"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              background:view===v?"rgba(0,255,209,0.14)":"transparent",
              border:view===v?"1px solid rgba(0,255,209,0.28)":"1px solid transparent",
              color:view===v?"#00FFD1":"#6b7280",
              borderRadius:7, padding:"7px 14px", fontWeight:700, fontSize:12,
              cursor:"pointer", transition:"all 0.2s",
            }}>{lbl}</button>
          ))}
        </div>

        {/* Bars */}
        {view==="bars" && (
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:14, padding:"20px", animation:"fadeUp 0.4s ease" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#e5e7eb", marginBottom:16 }}>
              Daily Vehicle Volume by Street
            </div>
            {streets.map(([s,v],i)=>(
              <Bar key={s} label={s} value={v} max={maxVol} color={COLORS[i%COLORS.length]} rank={i+1}/>
            ))}
          </div>
        )}

        {/* Table */}
        {view==="table" && (
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:14, overflow:"hidden", animation:"fadeUp 0.4s ease" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,255,209,0.04)" }}>
                    {["Street","Segment","Dir","Period","Vol"].map((h,i)=>(
                      <th key={h} style={{
                        padding:"10px 10px", fontSize:10, letterSpacing:2, textTransform:"uppercase",
                        color:"#00FFD1", fontFamily:"'DM Mono',monospace", fontWeight:500,
                        textAlign:i===4?"right":"left", whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r,i)=>{
                    const c = COLORS[i%COLORS.length];
                    const pc = periodColors[r.period]||"#9ca3af";
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"9px 10px", fontSize:12, color:"#e5e7eb", fontWeight:600, whiteSpace:"nowrap" }}>{r.street}</td>
                        <td style={{ padding:"9px 10px", fontFamily:"'DM Mono',monospace", fontSize:10, color:"#6b7280", whiteSpace:"nowrap" }}>
                          {r.from} → {r.to}
                        </td>
                        <td style={{ padding:"9px 10px" }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                            color:"#9ca3af", background:"rgba(255,255,255,0.06)",
                            borderRadius:4, padding:"2px 5px" }}>{r.dir}</span>
                        </td>
                        <td style={{ padding:"9px 10px" }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                            color:pc, background:`${pc}15`,
                            borderRadius:4, padding:"2px 6px", whiteSpace:"nowrap" }}>{r.period}</span>
                        </td>
                        <td style={{ padding:"9px 10px", textAlign:"right" }}>
                          <span style={{
                            fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700,
                            color:c, background:`${c}18`, border:`1px solid ${c}33`,
                            borderRadius:5, padding:"2px 8px",
                          }}>{r.vol.toLocaleString()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ marginTop:18, fontSize:10, color:"#374151", fontFamily:"'DM Mono',monospace", lineHeight:1.6 }}>
          Based on NYC DOT historical traffic patterns. For official live counts →{" "}
          <a href="https://data.cityofnewyork.us/Transportation/Automated-Traffic-Volume-Counts/7ym2-wayt"
            target="_blank" rel="noreferrer" style={{ color:"#00FFD133" }}>NYC Open Data ↗</a>
        </p>
      </div>
    </div>
  );
}
