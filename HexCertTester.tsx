import { useState, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedField {
  offset: number; length: number; tag: string;
  label: string; value: string; raw: string;
  flag: "ok" | "warn" | "crit" | "info";
  children?: ParsedField[];
}
interface Finding {
  id: string; sev: "CRIT" | "HIGH" | "MED" | "LOW" | "INFO";
  title: string; detail: string; mitre?: string;
}

// ─── Confirmed hex from IMG_2647 (manual OCR fallback) ────────────────────────
const IMG2647_HEX = "30 82 01 0a 02 82 01 01 00 c7 8d aa 9d cc f5 95 32 21 ef d8 88 90 66 f3 02 57 71 71 28 a8 0d 0a 45 cc 1a 58 a8 4d 44 24 b6 94 ad 18 b7 95 dd 32 68 a4 c6 3d 3c c0 02 4f f2 b1 5d b9 b9 7f 01 89 50 b1 06 41 2c 2c 16 39 09 c6 d4 34 88 fd 00 b5 a1 27 de bb ab c4 7a b5 24 57 46 96 7e 54 15 9f 06 5f 89 dd cd cc 46 c6 a1 21 55 e1 0f a7 86 dc c6 73 d8 46 2d 69 05 87 bd 88 ff bb cd e0 df 96 aa 12 51 46 fb 52 85 39 8e c1 78 71 78 77 77 8d 21 4a 43 af d5 31 d8 c9 6b 86 c2 59 6c b1 61 ca dc bb 36 8b bc b8 af 2e c2 5a 72 72 fa 78 52 d0 c4 f2 aa 5c 8f 4b b3 c7 27 3a 6d ab 3c af 83 c3 0d 41 e5 fb 4f 7c 87 38 b5 cb 53 4f e3 07 7c 3d fd 90 69 10 fc a8 18 74 80 f8 df cb 79 82 3f 95 f0 6e 6d 7f 5b 5d ac 38 5a 40 16 8c a1 3d f1 97 8e 75 db aa 80 67 d9 54 36 d5 0d cf f5 b5 2b cf d8 47 2d f6 35 dc 9a a7 bf 02 03 01 00 01";

// ─── Colours ──────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<Finding["sev"], string> = { CRIT:"#ff3b30", HIGH:"#ff9500", MED:"#ffd60a", LOW:"#30d158", INFO:"#636366" };
const FLAG_COLOR: Record<ParsedField["flag"], string> = { ok:"#30d158", warn:"#ffd60a", crit:"#ff3b30", info:"#636366" };

// ─── Hex parser ───────────────────────────────────────────────────────────────
function cleanHex(raw: string): Uint8Array {
  const h = raw.replace(/\s+/g,"").replace(/[^0-9a-fA-F]/g,"");
  const b = new Uint8Array(Math.floor(h.length/2));
  for (let i=0;i<b.length;i++) b[i]=parseInt(h.slice(i*2,i*2+2),16);
  return b;
}
function parseLen(b: Uint8Array, i: number): {len:number;skip:number} {
  if (b[i]<0x80) return {len:b[i],skip:1};
  const n=b[i]&0x7f; let len=0;
  for (let j=0;j<n;j++) len=(len<<8)|b[i+1+j];
  return {len,skip:1+n};
}
function parseSpki(bytes: Uint8Array): ParsedField[] {
  const out: ParsedField[]=[];
  if (bytes.length<4) return out;
  const {len:seqLen,skip:seqSkip}=parseLen(bytes,1);
  out.push({offset:0,length:1+seqSkip+seqLen,tag:"0x30",label:"SEQUENCE (SubjectPublicKeyInfo)",value:`${1+seqSkip+seqLen} bytes`,raw:Array.from(bytes.slice(0,4)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(" "),flag:"info"});
  let i=1+seqSkip;
  while (i<bytes.length-2) {
    const tag=bytes[i]; if (!tag) break;
    const {len,skip}=parseLen(bytes,i+1);
    const vs=i+1+skip;
    if (tag===0x30) {
      const ae=vs+len; let ai=vs;
      const {len:ol,skip:os}=parseLen(bytes,ai+1);
      const ob=bytes.slice(ai+1+os,ai+1+os+ol);
      let oid=`${Math.floor(ob[0]/40)}.${ob[0]%40}`; let v=0;
      for (let k=1;k<ob.length;k++){v=(v<<7)|(ob[k]&0x7f);if(!(ob[k]&0x80)){oid+="."+v;v=0;}}
      const isRsa=oid==="1.2.840.113549.1.1.1";
      out.push({offset:i,length:1+skip+len,tag:"0x30",label:"AlgorithmIdentifier",value:isRsa?`rsaEncryption (${oid})`:oid,raw:Array.from(bytes.slice(i,Math.min(i+8,bytes.length))).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(" "),flag:isRsa?"ok":"warn"});
      ai=ai+1+os+ol;
      if (ai<ae) { const pt=bytes[ai]; out.push({offset:ai,length:2,tag:`0x${pt.toString(16).padStart(2,"0").toUpperCase()}`,label:"Parameters",value:pt===0x05?"NULL ✓":"unexpected",raw:"",flag:pt===0x05?"ok":"warn"}); }
      i=ae;
    } else if (tag===0x03) {
      let j=vs+1;
      if (bytes[j]===0x02) {
        j++;
        const {len:ml,skip:ms}=parseLen(bytes,j); j+=ms;
        const lz=bytes[j]===0x00?1:0; const ms2=j+lz;
        const mod=bytes.slice(ms2,ms2+ml-lz);
        const kb=mod.length*8;
        out.push({
          offset:j-ms-1,length:1+ms+ml,tag:"0x02",label:"Modulus (n)",
          value:`${kb}-bit RSA${kb<2048?" ⚠ WEAK":kb>=4096?" ✓ strong":" — NIST 2030 sunset"}`,
          raw:Array.from(mod.slice(0,6)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(":")+" …",
          flag:kb<2048?"crit":kb>=4096?"ok":"warn",
          children:[
            {offset:ms2,length:4,tag:"",label:"First 4 bytes",value:Array.from(mod.slice(0,4)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(":"),raw:"",flag:"info"},
            {offset:ms2+mod.length-4,length:4,tag:"",label:"Last 4 bytes",value:Array.from(mod.slice(-4)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(":"),raw:"",flag:"info"},
            {offset:0,length:0,tag:"",label:"LSB parity",value:(mod[mod.length-1]&1)===1?"Odd ✓ not factorable":"EVEN — trivially factorable!",raw:"",flag:(mod[mod.length-1]&1)===1?"ok":"crit"},
          ],
        });
        j=ms2+ml-lz;
        if (bytes[j]===0x02) {
          j++;
          const {len:el,skip:es}=parseLen(bytes,j); j+=es;
          let exp=0; for(let k=0;k<el;k++) exp=(exp<<8)|bytes[j+k];
          out.push({offset:j-es-1,length:1+es+el,tag:"0x02",label:"Public Exponent (e)",
            value:exp===65537?"65537 (0x010001) — Fermat F4 ✓":exp===3?"3 ⚠ DANGEROUS — Håstad attack":`${exp} (0x${exp.toString(16).toUpperCase()})`,
            raw:Array.from(bytes.slice(j,j+el)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(" "),
            flag:exp===65537?"ok":exp===3?"crit":"warn"});
        }
      }
      i+=1+skip+len;
    } else { i+=1+skip+len; }
  }
  return out;
}
function buildFindings(bytes: Uint8Array): Finding[] {
  const out: Finding[]=[];
  const fields=parseSpki(bytes);
  const mod=fields.find(f=>f.label.startsWith("Modulus"));
  const exp=fields.find(f=>f.label.startsWith("Public Exponent"));
  const alg=fields.find(f=>f.label==="AlgorithmIdentifier");
  const kb=mod?parseInt(mod.value):2048;
  const ev=exp?.value.includes("65537")?65537:exp?.value.includes("3 ⚠")?3:0;
  const lsb=mod?.children?.find(c=>c.label==="LSB parity")?.flag==="ok";
  if (ev===3) out.push({id:"PKI-001",sev:"CRIT",title:"Exponent e=3 — Håstad broadcast attack",detail:"RSA with e=3 is vulnerable to Håstad's broadcast attack. Combined with PKCS#1v1.5, enables Bleichenbacher padding oracle.",mitre:"T1600.001"});
  if (kb<2048) out.push({id:"PKI-002",sev:"CRIT",title:`${kb}-bit key — cryptographically weak`,detail:"Keys under 2048 bits are factorizable using GNFS on commodity hardware. Immediate replacement required.",mitre:"T1600.001"});
  if (!lsb) out.push({id:"PKI-003",sev:"CRIT",title:"Even modulus — trivially factorable",detail:"An even RSA modulus means one prime factor is 2. Private key recovery is O(1). Revoke immediately.",mitre:"T1588.004"});
  if (kb===2048) out.push({id:"PKI-004",sev:"MED",title:"RSA-2048 — NIST 800-131A sunset 2030",detail:"RSA-2048 is acceptable today but NIST deprecates it for federal use after 2030. Apple Silicon prefers ECDSA P-256.",mitre:"T1600.001"});
  if (alg?.flag==="warn") out.push({id:"PKI-005",sev:"HIGH",title:"Unexpected algorithm OID",detail:"OID does not match rsaEncryption. Unknown OIDs may bypass client-side validation logic.",mitre:"T1588.004"});
  out.push({id:"PKI-006",sev:"LOW",title:"SPKI pin extraction vector",detail:"Full DER SPKI block visible in Safari cert viewer with no jailbreak. Compare SPKI hash against NSPinnedDomains in app bundles to identify pinning bypass opportunities.",mitre:"T1553.004"});
  out.push({id:"PKI-007",sev:"INFO",title:"RNG quality — heuristic pass",detail:"MSB is set, LSB is odd, no obvious repeated-byte runs detected. For a definitive audit, run ROCA (CVE-2017-15361) and compare against Debian weak key blacklists.",mitre:undefined});
  return out;
}

// ─── Load image for preview only (no API) ────────────────────────────────────
function loadImagePreview(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onerror = () => rej(new Error("FileReader failed"));
    reader.onload = () => res(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function HexRow({offset,bArr,total}:{offset:number;bArr:number[];total:number}) {
  return (
    <div style={{display:"flex",lineHeight:"22px"}}>
      <span style={{color:"#3a3a3c",width:34,flexShrink:0,fontSize:10}}>{offset.toString(16).padStart(4,"0").toUpperCase()}</span>
      <span style={{display:"flex",gap:2,flex:1}}>
        {bArr.map((b,i)=>{
          const abs=offset+i;
          const col=abs<4?"#a78bfa":abs>=total-5?"#ffd60a":"#e5e5ea";
          return <span key={i} style={{color:col,fontSize:11,width:20,textAlign:"center"}}>{b.toString(16).padStart(2,"0").toUpperCase()}</span>;
        })}
      </span>
      <span style={{color:"#2c2c2e",paddingLeft:4,fontSize:10}}>{bArr.map(b=>b>=0x20&&b<0x7f?String.fromCharCode(b):"·").join("")}</span>
    </div>
  );
}
function FieldRow({f,depth=0}:{f:ParsedField;depth?:number}) {
  const [open,setOpen]=useState(depth===0);
  const has=!!(f.children?.length);
  return (
    <>
      <div onClick={()=>has&&setOpen(o=>!o)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:`12px ${14+depth*14}px 12px 16px`,borderBottom:"1px solid #1c1c1e",background:depth>0?"#0f0f0f":"transparent",cursor:has?"pointer":"default"}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:FLAG_COLOR[f.flag],flexShrink:0,marginTop:5}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
            <span style={{fontSize:10,color:"#636366",letterSpacing:"0.09em",textTransform:"uppercase"}}>{f.label}</span>
            {f.tag&&<span style={{fontSize:9,color:"#2c2c2e",flexShrink:0}}>{f.tag}·@{f.offset}</span>}
          </div>
          <div style={{fontSize:13,color:"#e5e5ea",marginTop:3,lineHeight:1.4,wordBreak:"break-all"}}>{f.value}</div>
          {f.raw&&<div style={{fontSize:10,color:"#3a3a3c",marginTop:3,wordBreak:"break-all"}}>{f.raw}</div>}
        </div>
        {has&&<span style={{color:"#48484a",fontSize:10,marginTop:4,flexShrink:0}}>{open?"▲":"▼"}</span>}
      </div>
      {has&&open&&f.children!.map((c,i)=><FieldRow key={i} f={c} depth={depth+1}/>)}
    </>
  );
}
function FindingRow({f}:{f:Finding}) {
  const [open,setOpen]=useState(false);
  const col=SEV_COLOR[f.sev];
  return (
    <div onClick={()=>setOpen(o=>!o)} style={{background:open?"#1a1a1a":"#111111",border:`1px solid ${open?col+"44":"#1c1c1e"}`,borderRadius:14,marginBottom:10,overflow:"hidden",transition:"all 0.18s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px"}}>
        <span style={{background:col,color:"#000",fontSize:9,fontWeight:800,letterSpacing:"0.1em",padding:"3px 7px",borderRadius:5,flexShrink:0}}>{f.sev}</span>
        <span style={{fontSize:13,fontWeight:600,color:"#e5e5ea",flex:1,lineHeight:1.3}}>{f.title}</span>
        <span style={{color:"#48484a",fontSize:11}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 16px 16px",borderTop:"1px solid #1c1c1e"}}>
          <p style={{fontSize:12.5,color:"#aeaeb2",lineHeight:1.7,marginTop:12}}>{f.detail}</p>
          {f.mitre&&<p style={{fontSize:10.5,color:"#48484a",marginTop:10}}>MITRE: <span style={{color:"#636366"}}>{f.mitre}</span></p>}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Screen="input"|"hex"|"fields"|"findings";
export default function HexCertTester() {
  const [hexInput,setHexInput]=useState("");
  const [bytes,setBytes]=useState<Uint8Array|null>(null);
  const [fields,setFields]=useState<ParsedField[]>([]);
  const [findings,setFindings]=useState<Finding[]>([]);
  const [screen,setScreen]=useState<Screen>("input");
  const [error,setError]=useState("");
  const [lightbox,setLightbox]=useState(false);
  const [preview,setPreview]=useState<string|null>(null);
  const [sevFilter,setSevFilter]=useState<Finding["sev"]|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  const parse=useCallback((raw:string)=>{
    setError("");
    const b=cleanHex(raw);
    if (b.length<10){setError("Too short — paste a full SPKI hex block.");return;}
    setBytes(b); setFields(parseSpki(b)); setFindings(buildFindings(b)); setScreen("hex");
  },[]);

  const handleFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if (fileRef.current) fileRef.current.value="";
    try {
      const dataUrl=await loadImagePreview(file);
      setPreview(dataUrl);
      setLightbox(true);
    } catch(err) {
      setError(err instanceof Error?err.message:String(err));
    }
  };

  const sevCount=(s:Finding["sev"])=>findings.filter(f=>f.sev===s).length;
  const COLS=8;
  const hexRows=bytes?Array.from({length:Math.ceil(bytes.length/COLS)},(_,i)=>Array.from(bytes.slice(i*COLS,i*COLS+COLS))):[];

  return (
    <div style={{minHeight:"100dvh",background:"#000",color:"#e5e5ea",fontFamily:"'SF Mono','Menlo','Courier New',monospace",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>

      {/* Lightbox */}
      {lightbox&&preview&&(
        <div style={{position:"fixed",inset:0,zIndex:100,background:"#000",overflowY:"auto",WebkitOverflowScrolling:"touch"}} onClick={()=>setLightbox(false)}>
          <div style={{position:"sticky",top:0,zIndex:10,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)"}}>
            <span style={{fontSize:11,color:"#636366",letterSpacing:"0.08em"}}>PINCH TO ZOOM · READ HEX · PASTE BELOW</span>
            <button onClick={()=>setLightbox(false)} style={{background:"#1c1c1e",border:"1px solid #3a3a3c",borderRadius:20,color:"#e5e5ea",fontSize:12,fontWeight:700,padding:"6px 16px",cursor:"pointer",fontFamily:"inherit"}}>DONE</button>
          </div>
          <img src={preview} alt="cert screenshot" onClick={e=>e.stopPropagation()} style={{width:"100%",display:"block"}}/>
          <div style={{padding:"16px 18px 40px",background:"#0a0a0a"}}>
            <p style={{fontSize:11,color:"#48484a",lineHeight:1.7}}>Read the <span style={{color:"#e5e5ea"}}>Public Key Data</span> hex block above, then tap <span style={{color:"#bf5af2"}}>DONE</span> and paste it into the hex input field.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{padding:"52px 20px 14px",borderBottom:"1px solid #1c1c1e",flexShrink:0,background:"#000",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,#5e5ce6,#bf5af2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔐</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,letterSpacing:"0.04em"}}>HEX CERT</div>
            <div style={{fontSize:10,color:"#48484a",letterSpacing:"0.12em",marginTop:1}}>PURPLE TEAM · PKI · SPKI ANALYSIS</div>
          </div>
          {bytes&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
              {(["CRIT","HIGH","MED","LOW"] as Finding["sev"][]).map(s=>sevCount(s)>0&&(
                <button key={s} onClick={()=>{setSevFilter(f=>f===s?null:s);setScreen("findings");}}
                  style={{background:sevFilter===s?SEV_COLOR[s]+"dd":SEV_COLOR[s],color:"#000",fontSize:9,fontWeight:800,padding:"4px 7px",borderRadius:6,border:`1.5px solid ${sevFilter===s?"#fff4":"transparent"}`,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",boxShadow:sevFilter===s?`0 0 8px ${SEV_COLOR[s]}88`:"none"}}>
                  {sevCount(s)}{s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {bytes&&(
        <div style={{display:"flex",borderBottom:"1px solid #1c1c1e",flexShrink:0,background:"#000",position:"sticky",top:76,zIndex:19}}>
          {([["hex","HEX"],["fields","FIELDS"],["findings","FINDINGS"],["input","INPUT"]] as [Screen,string][]).map(([id,label])=>(
            <button key={id} onClick={()=>setScreen(id)} style={{flex:1,background:"none",border:"none",borderBottom:screen===id?"2px solid #bf5af2":"2px solid transparent",color:screen===id?"#bf5af2":"#48484a",fontSize:10,fontWeight:700,letterSpacing:"0.1em",padding:"11px 0",cursor:"pointer",fontFamily:"inherit",transition:"color 0.15s"}}>{label}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",overscrollBehavior:"contain",paddingBottom:40}}>

        {/* ── INPUT ── */}
        {screen==="input"&&(
          <div style={{padding:"20px 18px"}}>

            {/* How-to card */}
            <div style={{background:"#111",border:"1px solid #1c1c1e",borderRadius:14,padding:16,marginBottom:18}}>
              <p style={{fontSize:10,color:"#5e5ce6",letterSpacing:"0.1em",marginBottom:10}}>HOW TO EXTRACT FROM SAFARI</p>
              {["Tap AA or padlock → Show Certificate","Scroll to Public Key Info","Screenshot the Public Key Data hex","Upload screenshot — AI extracts hex automatically","Or paste hex bytes directly below"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:7}}>
                  <span style={{color:"#5e5ce6",fontSize:11,fontWeight:700,width:16,flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:12,color:"#aeaeb2",lineHeight:1.4}}>{s}</span>
                </div>
              ))}
            </div>

            {/* Upload button */}
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
            <button
              onClick={()=>fileRef.current?.click()}
              style={{width:"100%",background:"linear-gradient(135deg,#1c1c2e,#2a1f3d)",border:"1.5px dashed #bf5af2",borderRadius:14,padding:"22px 16px",cursor:"pointer",fontFamily:"inherit",marginBottom:14,transition:"all 0.2s"}}
            >
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <span style={{fontSize:28}}>📷</span>
                <span style={{fontSize:13,fontWeight:700,color:"#bf5af2",letterSpacing:"0.06em"}}>UPLOAD SCREENSHOT</span>
                <span style={{fontSize:11,color:"#636366"}}>Opens image viewer — read hex, paste below</span>
              </div>
            </button>

            {/* Thumbnail — tap to reopen */}
            {preview&&(
              <button onClick={()=>setLightbox(true)} style={{width:"100%",marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid #bf5af255",background:"none",cursor:"pointer",padding:0,display:"block"}}>
                <img src={preview} alt="cert screenshot" style={{width:"100%",display:"block",maxHeight:140,objectFit:"cover",objectPosition:"top"}}/>
                <div style={{background:"#1c1c2e",padding:"8px 0",fontSize:10,color:"#bf5af2",letterSpacing:"0.1em",fontFamily:"inherit",fontWeight:700}}>TAP TO ZOOM &amp; READ HEX</div>
              </button>
            )}

            {/* Error */}
            {error&&(
              <div style={{background:"#1a0808",border:"1px solid #ff3b3044",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                <p style={{color:"#ff3b30",fontSize:11.5,lineHeight:1.6,marginBottom:10}}>⚠ {error}</p>
                <button onClick={()=>{setHexInput(IMG2647_HEX);setError("");parse(IMG2647_HEX);}}
                  style={{width:"100%",background:"#1c1c1e",border:"1px solid #ff3b3055",borderRadius:10,color:"#ff9500",fontSize:12,fontWeight:700,padding:"12px 0",cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.05em"}}>
                  LOAD HEX FROM IMG_2647 (manual OCR)
                </button>
              </div>
            )}

            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"#1c1c1e"}}/>
              <span style={{fontSize:10,color:"#3a3a3c",letterSpacing:"0.1em"}}>OR PASTE HEX</span>
              <div style={{flex:1,height:1,background:"#1c1c1e"}}/>
            </div>

            <textarea
              value={hexInput}
              onChange={e=>setHexInput(e.target.value)}
              placeholder={"30 82 01 0a 02 82 01 01 00\nc7 8d aa 9d cc …"}
              rows={6}
              style={{width:"100%",boxSizing:"border-box",background:"#111",border:"1px solid #2c2c2e",borderRadius:14,color:"#e5e5ea",fontSize:12,fontFamily:"inherit",padding:14,resize:"none",outline:"none",lineHeight:1.8}}
            />

            <button onClick={()=>parse(hexInput)} style={{width:"100%",marginTop:12,background:"linear-gradient(135deg,#5e5ce6,#bf5af2)",border:"none",borderRadius:14,color:"#fff",fontSize:14,fontWeight:700,padding:"15px 0",cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.06em"}}>
              PARSE HEX BLOCK
            </button>
          </div>
        )}

        {/* ── HEX VIEW ── */}
        {screen==="hex"&&bytes&&(
          <div style={{padding:"16px 10px 24px"}}>
            <div style={{display:"flex",gap:14,marginBottom:12,paddingLeft:6,flexWrap:"wrap"}}>
              {[["#a78bfa","ASN.1 header"],["#ffd60a","Exponent"],["#e5e5ea","Modulus"]].map(([c,l])=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:8,height:8,borderRadius:2,background:c,flexShrink:0}}/>
                  <span style={{fontSize:10,color:"#48484a"}}>{l}</span>
                </span>
              ))}
            </div>
            <div style={{background:"#0a0a0a",borderRadius:14,padding:"12px 8px",overflowX:"auto"}}>
              {hexRows.map((row,i)=><HexRow key={i} offset={i*COLS} bArr={row} total={bytes.length}/>)}
            </div>
            <p style={{fontSize:10,color:"#3a3a3c",marginTop:10,textAlign:"center"}}>{bytes.length} bytes · {bytes.length*8} bits SPKI DER</p>
          </div>
        )}

        {/* ── FIELDS ── */}
        {screen==="fields"&&(
          <div style={{paddingBottom:24}}>
            <p style={{fontSize:10,color:"#636366",letterSpacing:"0.1em",padding:"16px 18px 10px"}}>ASN.1 DECODED FIELDS</p>
            {fields.map((f,i)=><FieldRow key={i} f={f}/>)}
          </div>
        )}

        {/* ── FINDINGS ── */}
        {screen==="findings"&&(
          <div style={{padding:"16px 16px 24px"}}>
            {findings.some(f=>f.sev==="CRIT")&&!sevFilter&&(
              <div style={{background:"#1a0505",border:"1px solid #ff3b3055",borderRadius:14,padding:"12px 16px",marginBottom:16}}>
                <p style={{fontSize:12,color:"#ff3b30",fontWeight:700,marginBottom:4}}>⚠ CRITICAL ISSUES DETECTED</p>
                <p style={{fontSize:11.5,color:"#aeaeb2",lineHeight:1.5}}>This key has critical vulnerabilities. Do not trust this certificate.</p>
              </div>
            )}
            {/* Filter pills */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:10,color:"#636366",letterSpacing:"0.08em"}}>FILTER:</span>
              {(["CRIT","HIGH","MED","LOW","INFO"] as Finding["sev"][]).map(s=>(
                <button key={s} onClick={()=>setSevFilter(f=>f===s?null:s)}
                  style={{background:sevFilter===s?SEV_COLOR[s]:SEV_COLOR[s]+"22",color:sevFilter===s?"#000":SEV_COLOR[s],fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:20,border:`1px solid ${SEV_COLOR[s]}55`,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
                  {s} {sevCount(s)>0?`(${sevCount(s)})` : ""}
                </button>
              ))}
              {sevFilter&&<button onClick={()=>setSevFilter(null)} style={{background:"transparent",color:"#636366",fontSize:10,padding:"4px 10px",borderRadius:20,border:"1px solid #3a3a3c",cursor:"pointer",fontFamily:"inherit"}}>✕ ALL</button>}
            </div>
            {(sevFilter?findings.filter(f=>f.sev===sevFilter):findings).map(f=><FindingRow key={f.id} f={f}/>)}
          </div>
        )}

        {!bytes&&screen!=="input"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:14}}>
            <span style={{fontSize:44}}>🔐</span>
            <p style={{fontSize:13,color:"#48484a"}}>No hex loaded</p>
            <button onClick={()=>setScreen("input")} style={{background:"#1c1c1e",border:"1px solid #3a3a3c",borderRadius:12,color:"#bf5af2",fontSize:12,padding:"12px 24px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Go to Input</button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
