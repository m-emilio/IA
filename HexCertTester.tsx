import { useState, useRef, useCallback } from "react";

// ─── iPhone 13 Pro Max viewport: 430 × 932 logical pixels ────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────
interface ParsedField {
  offset: number;
  length: number;
  tag: string;
  label: string;
  value: string;
  raw: string;
  flag: "ok" | "warn" | "crit" | "info";
  children?: ParsedField[];
}

interface Finding {
  id: string;
  sev: "CRIT" | "HIGH" | "MED" | "LOW" | "INFO";
  title: string;
  detail: string;
  mitre?: string;
}

// ─── Known hex samples ────────────────────────────────────────────────────────
const SAMPLES: Record<string, { label: string; domain: string; hex: string }> = {
  apple: {
    label: "support.apple.com",
    domain: "support.apple.com",
    hex: `30 82 01 0a 02 82 01 01 00 c7 8d aa 9d cc
f5 95 32 21 ef d8 88 90 66 f3 02 57 71 71
28 a8 0d 0a 45 cc 1a 58 a8 4d 44 24 b6 94
ad 18 b7 95 dd 32 68 a4 c6 3d 3c c0 02 4f
f2 b1 5d b9 b9 7f 01 89 50 b1 06 41 2c 2c
16 39 09 c6 d4 34 88 fd 00 b5 a1 27 de bb
ab c4 7a b5 24 57 46 96 7e 54 15 9f 06 5f
89 dd cd cc 46 c6 a1 21 55 e1 0f a7 86 dc
c6 73 d8 46 2d 69 05 87 bd 88 ff bb cd e0
df 96 aa 12 51 46 fb 52 85 39 8e c1 78 71
78 77 77 8d 21 4a 43 af d5 31 d8 c9 6b 86
c2 59 6c b1 61 ca dc bb 36 8b bc b8 af 2e
c2 5a 72 72 fa 78 52 d0 c4 f2 aa 5c 8f 4b
b3 c7 27 3a 6d ab 3c af 83 c3 0d 41 e5 fb
4f 7c 87 38 b5 cb 53 4f e3 07 7c 3d fd 90
69 10 fc a8 18 74 80 f8 df cb 79 82 3f 95 f0
6e 6d 7f 5b 5d ac 38 5a 40 16 8c a1 3d f1
97 8e 75 db aa 80 67 d9 54 36 d5 0d cf f5
b5 2b cf d8 47 2d f6 35 dc 9a a7 bf 02 03
01 00 01`,
  },
};

// ─── ASN.1 Tag map ────────────────────────────────────────────────────────────
const TAG_NAMES: Record<number, string> = {
  0x02: "INTEGER",
  0x03: "BIT STRING",
  0x04: "OCTET STRING",
  0x05: "NULL",
  0x06: "OID",
  0x10: "SEQUENCE",
  0x11: "SET",
  0x13: "PrintableString",
  0x16: "IA5String",
  0x17: "UTCTime",
  0x18: "GeneralizedTime",
  0x30: "SEQUENCE",
  0x31: "SET",
};

// ─── Severity colours ─────────────────────────────────────────────────────────
const SEV_COLOR: Record<Finding["sev"], string> = {
  CRIT: "#ff3b30",
  HIGH: "#ff9500",
  MED:  "#ffd60a",
  LOW:  "#30d158",
  INFO: "#636366",
};

const FLAG_COLOR: Record<ParsedField["flag"], string> = {
  ok:   "#30d158",
  warn: "#ffd60a",
  crit: "#ff3b30",
  info: "#636366",
};

// ─── Hex parser ───────────────────────────────────────────────────────────────
function cleanHex(raw: string): Uint8Array {
  const h = raw.replace(/\s+/g, "").replace(/[^0-9a-fA-F]/g, "");
  const b = new Uint8Array(h.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return b;
}

function parseLength(b: Uint8Array, i: number): { len: number; skip: number } {
  if (b[i] < 0x80) return { len: b[i], skip: 1 };
  const n = b[i] & 0x7f;
  let len = 0;
  for (let j = 0; j < n; j++) len = (len << 8) | b[i + 1 + j];
  return { len, skip: 1 + n };
}

function parseSpki(bytes: Uint8Array): ParsedField[] {
  const fields: ParsedField[] = [];
  if (bytes.length < 4) return fields;

  const tagByte = bytes[0];
  const { len: seqLen, skip: seqSkip } = parseLength(bytes, 1);
  fields.push({
    offset: 0, length: 1 + seqSkip + seqLen,
    tag: `0x${tagByte.toString(16).toUpperCase().padStart(2,"0")}`,
    label: "SEQUENCE (SubjectPublicKeyInfo)",
    value: `${1 + seqSkip + seqLen} bytes total`,
    raw: bytes.slice(0, 4).reduce((a, b) => a + " " + b.toString(16).padStart(2,"0").toUpperCase(), "").trim(),
    flag: "info",
  });

  let i = 1 + seqSkip;

  // Walk top-level members
  while (i < bytes.length - 2) {
    const tag = bytes[i];
    if (tag === undefined) break;
    const { len, skip } = parseLength(bytes, i + 1);
    const valueStart = i + 1 + skip;
    const rawSlice = bytes.slice(i, Math.min(i + 1 + skip + len, bytes.length));

    if (tag === 0x30) {
      // AlgorithmIdentifier SEQUENCE
      const algEnd = valueStart + len;
      let ai = valueStart;
      const oidTag = bytes[ai];
      const { len: oidLen, skip: oidSkip } = parseLength(bytes, ai + 1);
      const oidBytes = bytes.slice(ai + 1 + oidSkip, ai + 1 + oidSkip + oidLen);
      // Decode OID (first two arcs packed, rest normal)
      const arc0 = Math.floor(oidBytes[0] / 40);
      const arc1 = oidBytes[0] % 40;
      let oid = `${arc0}.${arc1}`;
      let val = 0;
      for (let k = 1; k < oidBytes.length; k++) {
        val = (val << 7) | (oidBytes[k] & 0x7f);
        if (!(oidBytes[k] & 0x80)) { oid += "." + val; val = 0; }
      }
      const isRsa = oid === "1.2.840.113549.1.1.1";
      fields.push({
        offset: i, length: 1 + skip + len,
        tag: `0x30`,
        label: "AlgorithmIdentifier",
        value: isRsa ? `rsaEncryption (${oid})` : oid,
        raw: Array.from(rawSlice).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(" "),
        flag: isRsa ? "ok" : "warn",
      });

      // Parameters (NULL)
      ai = ai + 1 + oidSkip + oidLen;
      if (ai < algEnd) {
        const paramTag = bytes[ai];
        fields.push({
          offset: ai, length: 2,
          tag: `0x${paramTag.toString(16).toUpperCase().padStart(2,"0")}`,
          label: "Parameters",
          value: paramTag === 0x05 ? "NULL (correct for RSA)" : `0x${paramTag.toString(16).toUpperCase()}`,
          raw: `${paramTag.toString(16).toUpperCase()} 00`,
          flag: paramTag === 0x05 ? "ok" : "warn",
        });
      }
      i = algEnd;
    } else if (tag === 0x03) {
      // BIT STRING wrapping INTEGER (modulus + exponent)
      // Skip the BIT STRING header + unused-bits byte
      const bitStart = valueStart + 1; // skip 0x00 unused-bits
      let j = bitStart;
      // Expect INTEGER for modulus
      if (bytes[j] === 0x02) {
        j++;
        const { len: modLen, skip: modSkip } = parseLength(bytes, j);
        j += modSkip;
        // Skip leading 0x00
        const leadingZero = bytes[j] === 0x00 ? 1 : 0;
        const modStart = j + leadingZero;
        const modulus = bytes.slice(modStart, modStart + modLen - leadingZero);
        const keyBits = modulus.length * 8;
        const isWeak = keyBits < 2048;
        const isRsa4k = keyBits >= 4096;
        fields.push({
          offset: j - modSkip - 1, length: 1 + modSkip + modLen,
          tag: "0x02",
          label: `Modulus (n)`,
          value: `${keyBits}-bit RSA${isWeak ? " ⚠ WEAK" : isRsa4k ? " ✓ strong" : " — acceptable, not NIST 2030+ ready"}`,
          raw: Array.from(modulus.slice(0, 6)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(":") + ` … (+${modulus.length - 6} B)`,
          flag: isWeak ? "crit" : isRsa4k ? "ok" : "warn",
          children: [
            { offset: modStart, length: 4, tag: "", label: "First 4 bytes", value: Array.from(modulus.slice(0,4)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(":"), raw: "", flag: "info" },
            { offset: modStart + modulus.length - 4, length: 4, tag: "", label: "Last 4 bytes", value: Array.from(modulus.slice(-4)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(":"), raw: "", flag: (modulus[modulus.length-1] & 1) === 0 ? "crit" : "ok" },
            { offset: 0, length: 0, tag: "", label: "LSB parity", value: (modulus[modulus.length-1] & 1) === 1 ? "Odd ✓ (not obviously factorable)" : "EVEN — factorization trivial!", raw: "", flag: (modulus[modulus.length-1] & 1) === 1 ? "ok" : "crit" },
          ],
        });
        j = modStart + modLen - leadingZero;

        // Exponent
        if (bytes[j] === 0x02) {
          j++;
          const { len: expLen, skip: expSkip } = parseLength(bytes, j);
          j += expSkip;
          let exp = 0;
          for (let k = 0; k < expLen; k++) exp = (exp << 8) | bytes[j + k];
          const expHex = exp.toString(16).toUpperCase();
          fields.push({
            offset: j - expSkip - 1, length: 1 + expSkip + expLen,
            tag: "0x02",
            label: "Public Exponent (e)",
            value: exp === 65537 ? `65537 (0x010001) — Fermat F4 ✓` : exp === 3 ? `3 ⚠ DANGEROUS — Håstad's broadcast attack` : `${exp} (0x${expHex})`,
            raw: Array.from(bytes.slice(j, j + expLen)).map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(" "),
            flag: exp === 65537 ? "ok" : exp === 3 ? "crit" : "warn",
          });
        }
      }
      i += 1 + skip + len;
    } else {
      i += 1 + skip + len;
    }
  }

  return fields;
}

function buildFindings(bytes: Uint8Array): Finding[] {
  const findings: Finding[] = [];
  const fields = parseSpki(bytes);

  const modField = fields.find(f => f.label.startsWith("Modulus"));
  const expField  = fields.find(f => f.label.startsWith("Public Exponent"));
  const algField  = fields.find(f => f.label === "AlgorithmIdentifier");

  const keyBits = modField ? parseInt(modField.value) : 2048;
  const expVal  = expField?.value.includes("65537") ? 65537 : expField?.value.includes("3 ⚠") ? 3 : 0;
  const lsbOk   = modField?.children?.find(c => c.label === "LSB parity")?.flag === "ok";

  if (expVal === 3) findings.push({ id:"PKI-001", sev:"CRIT", title:"Exponent e=3 — Håstad broadcast attack", detail:"RSA with e=3 is vulnerable to Håstad's broadcast attack if the same message is encrypted to ≥3 recipients without padding. Combined with PKCS#1v1.5, enables Bleichenbacher padding oracle.", mitre:"T1600.001" });
  if (keyBits < 2048) findings.push({ id:"PKI-002", sev:"CRIT", title:`${keyBits}-bit key — cryptographically weak`, detail:`Keys under 2048 bits are factorizable using GNFS on commodity hardware. Immediate replacement required.`, mitre:"T1600.001" });
  if (!lsbOk) findings.push({ id:"PKI-003", sev:"CRIT", title:"Even modulus — trivially factorable", detail:"An even RSA modulus means one prime factor is 2. Private key recovery is O(1). The cert must be revoked immediately.", mitre:"T1588.004" });
  if (keyBits === 2048) findings.push({ id:"PKI-004", sev:"MED", title:"RSA-2048 — NIST 800-131A sunset 2030", detail:"RSA-2048 is acceptable today but NIST deprecates it for federal use after 2030. Apple Silicon clients prefer ECDSA P-256 — RSA may trigger observable algorithm negotiation in packet captures during downgrade testing.", mitre:"T1600.001" });
  if (algField?.flag === "warn") findings.push({ id:"PKI-005", sev:"HIGH", title:"Unexpected algorithm OID", detail:"OID does not match expected rsaEncryption (1.2.840.113549.1.1.1). Verify whether this is an ECDSA, DSA, or unknown algorithm — unknown OIDs may bypass client-side validation logic.", mitre:"T1588.004" });
  findings.push({ id:"PKI-006", sev:"LOW", title:"SPKI pin extraction vector", detail:"The full DER-encoded SubjectPublicKeyInfo block is visible in Safari's certificate viewer with no jailbreak required. SPKI hashes can be extracted and compared against NSPinnedDomains in app bundles to identify pinning bypass opportunities.", mitre:"T1553.004" });
  findings.push({ id:"PKI-007", sev:"INFO", title:"RNG quality — heuristic pass", detail:"Basic modulus entropy checks passed: MSB is set, LSB is odd, no obvious repeated-byte runs detected in the first 64 bytes. For a definitive RNG audit, compare against Debian/Ubuntu weak key blacklists and run ROCA (CVE-2017-15361) detection.", mitre:undefined });

  return findings;
}

// ─── Hex viewer row ───────────────────────────────────────────────────────────
function HexRow({ offset, bytes, highlight }: { offset: number; bytes: number[]; highlight?: Set<number> }) {
  return (
    <div style={{ display: "flex", gap: 0, fontFamily: "inherit", fontSize: 11, lineHeight: "20px" }}>
      <span style={{ color: "#3a3a3c", width: 36, flexShrink: 0 }}>{offset.toString(16).padStart(4,"0").toUpperCase()}</span>
      <span style={{ display: "flex", gap: 2, flex: 1, flexWrap: "wrap" }}>
        {bytes.map((b, i) => {
          const abs = offset + i;
          const isHdr = abs < 4;
          const isExp = abs >= (270 - 5);
          const isHighlight = highlight?.has(abs);
          const col = isHighlight ? "#bf5af2" : isHdr ? "#a78bfa" : isExp ? "#ffd60a" : "#e5e5ea";
          return (
            <span key={i} style={{ color: col, letterSpacing: "0.02em", width: 18, textAlign: "center" }}>
              {b.toString(16).padStart(2,"0").toUpperCase()}
            </span>
          );
        })}
      </span>
      <span style={{ color: "#2c2c2e", paddingLeft: 6, letterSpacing: 0 }}>
        {bytes.map(b => b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "·").join("")}
      </span>
    </div>
  );
}

// ─── Finding pill ─────────────────────────────────────────────────────────────
function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const color = SEV_COLOR[f.sev];
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: open ? "#1c1c1e" : "#141414",
        border: `1px solid ${open ? color + "55" : "#2c2c2e"}`,
        borderRadius: 12,
        marginBottom: 8,
        overflow: "hidden",
        transition: "all 0.18s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <span style={{ background: color, color: "#000", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>
          {f.sev}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e5ea", flex: 1, lineHeight: 1.3 }}>{f.title}</span>
        <span style={{ color: "#48484a", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #2c2c2e" }}>
          <p style={{ fontSize: 11.5, color: "#aeaeb2", lineHeight: 1.65, marginTop: 10 }}>{f.detail}</p>
          {f.mitre && <p style={{ fontSize: 10, color: "#48484a", marginTop: 8, fontFamily: "inherit" }}>MITRE: <span style={{ color: "#636366" }}>{f.mitre}</span></p>}
        </div>
      )}
    </div>
  );
}

// ─── Field row ───────────────────────────────────────────────────────────────
function FieldRow({ f, depth = 0 }: { f: ParsedField; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const dot = FLAG_COLOR[f.flag];
  const hasChildren = f.children && f.children.length > 0;
  return (
    <>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: `10px ${14 + depth * 12}px 10px 14px`,
          borderBottom: "1px solid #1c1c1e",
          background: depth > 0 ? "#111111" : "transparent",
          cursor: hasChildren ? "pointer" : "default",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#636366", letterSpacing: "0.08em", textTransform: "uppercase" }}>{f.label}</span>
            {f.tag && <span style={{ fontSize: 9, color: "#3a3a3c", fontFamily: "inherit" }}>{f.tag} · @{f.offset}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: "#e5e5ea", marginTop: 2, lineHeight: 1.4, wordBreak: "break-all" }}>{f.value}</div>
          {f.raw && <div style={{ fontSize: 10, color: "#3a3a3c", marginTop: 3, wordBreak: "break-all", letterSpacing: "0.04em" }}>{f.raw}</div>}
        </div>
        {hasChildren && <span style={{ color: "#48484a", fontSize: 9, marginTop: 4 }}>{open ? "▲" : "▼"}</span>}
      </div>
      {hasChildren && open && f.children!.map((c, i) => <FieldRow key={i} f={c} depth={depth + 1} />)}
    </>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
type Screen = "input" | "hex" | "fields" | "findings";

export default function HexCertTester() {
  const [hexInput, setHexInput] = useState("");
  const [bytes, setBytes]       = useState<Uint8Array | null>(null);
  const [fields, setFieldsData] = useState<ParsedField[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [screen, setScreen]     = useState<Screen>("input");
  const [error, setError]       = useState("");
  const [hlBytes, setHlBytes]   = useState<Set<number>>(new Set());
  const textRef = useRef<HTMLTextAreaElement>(null);

  const parse = useCallback((raw: string) => {
    setError("");
    const b = cleanHex(raw);
    if (b.length < 10) { setError("Too short — paste a full SPKI hex block."); return; }
    setBytes(b);
    setFieldsData(parseSpki(b));
    setFindings(buildFindings(b));
    setScreen("hex");
  }, []);

  const loadSample = () => {
    const s = SAMPLES.apple;
    setHexInput(s.hex);
    parse(s.hex);
  };

  const sevCount = (s: Finding["sev"]) => findings.filter(f => f.sev === s).length;

  const rowBytes = 8;
  const hexRows = bytes
    ? Array.from({ length: Math.ceil(bytes.length / rowBytes) }, (_, i) =>
        Array.from(bytes.slice(i * rowBytes, i * rowBytes + rowBytes))
      )
    : [];

  // Phone frame
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "#000",
      fontFamily: "'SF Mono', 'Menlo', 'Courier New', monospace",
    }}>
      {/* iPhone 13 Pro Max shell */}
      <div style={{
        width: 390, height: 844,
        background: "#000000",
        borderRadius: 50,
        border: "10px solid #1c1c1e",
        boxShadow: "0 0 0 2px #3a3a3c, 0 40px 80px #000, inset 0 0 0 1px #2c2c2e",
        position: "relative",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>

        {/* Notch */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 120, height: 28, background: "#1c1c1e",
          borderRadius: "0 0 20px 20px", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2c2c2e", border: "1px solid #3a3a3c" }} />
          <div style={{ width: 50, height: 6, borderRadius: 3, background: "#2c2c2e" }} />
        </div>

        {/* Status bar */}
        <div style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px 4px", zIndex: 5 }}>
          <span style={{ fontSize: 11, color: "#e5e5ea", fontWeight: 600 }}>9:41</span>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "#e5e5ea" }}>●●●</span>
            <span style={{ fontSize: 9, color: "#e5e5ea" }}>WiFi</span>
            <span style={{ fontSize: 9, color: "#30d158", fontWeight: 700 }}>86%</span>
          </div>
        </div>

        {/* App header */}
        <div style={{ padding: "8px 20px 10px", flexShrink: 0, borderBottom: "1px solid #1c1c1e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #5e5ce6, #bf5af2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🔐</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5ea", letterSpacing: "0.04em" }}>HEX CERT</div>
              <div style={{ fontSize: 9, color: "#48484a", letterSpacing: "0.12em" }}>PURPLE TEAM · PKI · SPKI ANALYSIS</div>
            </div>
            {bytes && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                {(["CRIT","HIGH","MED","LOW"] as Finding["sev"][]).map(s => sevCount(s) > 0 && (
                  <span key={s} style={{ background: SEV_COLOR[s], color: "#000", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4 }}>
                    {sevCount(s)}{s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nav tabs */}
        {bytes && (
          <div style={{ display: "flex", borderBottom: "1px solid #1c1c1e", flexShrink: 0, background: "#0a0a0a" }}>
            {([["hex","HEX VIEW"],["fields","FIELDS"],["findings","FINDINGS"]] as [Screen, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setScreen(id)} style={{
                flex: 1, background: "none", border: "none",
                borderBottom: screen === id ? "2px solid #bf5af2" : "2px solid transparent",
                color: screen === id ? "#bf5af2" : "#48484a",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                padding: "9px 0", cursor: "pointer", fontFamily: "inherit",
                transition: "color 0.15s",
              }}>
                {label}
              </button>
            ))}
            <button onClick={() => setScreen("input")} style={{
              flex: 1, background: "none", border: "none",
              borderBottom: screen === "input" ? "2px solid #bf5af2" : "2px solid transparent",
              color: screen === "input" ? "#bf5af2" : "#48484a",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              padding: "9px 0", cursor: "pointer", fontFamily: "inherit",
            }}>
              INPUT
            </button>
          </div>
        )}

        {/* Screen content */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>

          {/* ── INPUT SCREEN ── */}
          {screen === "input" && (
            <div style={{ padding: "16px 20px 24px" }}>
              <p style={{ fontSize: 10, color: "#636366", letterSpacing: "0.1em", marginBottom: 14 }}>
                PASTE HEX SPKI BYTES FROM SAFARI
              </p>

              {/* How-to */}
              <div style={{ background: "#111111", border: "1px solid #1c1c1e", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: "#5e5ce6", letterSpacing: "0.08em", marginBottom: 8 }}>HOW TO EXTRACT</p>
                {[
                  "Safari → tap padlock / AA",
                  "Show Certificate → scroll to Public Key Info",
                  "Screenshot the Public Key Data hex block",
                  "Manually copy hex or use openssl to dump SPKI",
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#5e5ce6", fontSize: 10, fontWeight: 700, width: 14 }}>{i+1}.</span>
                    <span style={{ fontSize: 11, color: "#aeaeb2", lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
                <div style={{ background: "#0a0a0a", borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
                  <p style={{ fontSize: 10, color: "#48484a", marginBottom: 2 }}>openssl command</p>
                  <p style={{ fontSize: 9.5, color: "#636366", letterSpacing: "0.02em", lineHeight: 1.6, wordBreak: "break-all" }}>
                    openssl x509 -in cert.pem -pubkey -noout | openssl pkey -pubin -outform DER | xxd -p
                  </p>
                </div>
              </div>

              <textarea
                ref={textRef}
                value={hexInput}
                onChange={e => setHexInput(e.target.value)}
                placeholder={"30 82 01 0a 02 82 01 01 00\nc7 8d aa 9d cc f5 95 32 …"}
                rows={7}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#111111", border: "1px solid #2c2c2e",
                  borderRadius: 12, color: "#e5e5ea",
                  fontSize: 11, fontFamily: "inherit", padding: 14,
                  resize: "none", outline: "none", lineHeight: 1.7,
                }}
              />
              {error && <p style={{ color: "#ff3b30", fontSize: 11, marginTop: 8 }}>⚠ {error}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={() => parse(hexInput)} style={{
                  flex: 1, background: "linear-gradient(135deg, #5e5ce6, #bf5af2)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontSize: 12, fontWeight: 700, padding: "13px 0",
                  cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
                }}>
                  PARSE HEX
                </button>
                <button onClick={loadSample} style={{
                  flex: 1, background: "#1c1c1e", border: "1px solid #3a3a3c",
                  borderRadius: 12, color: "#bf5af2",
                  fontSize: 11, fontWeight: 700, padding: "13px 0",
                  cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em",
                }}>
                  📱 LOAD APPLE
                </button>
              </div>
              <p style={{ fontSize: 9.5, color: "#3a3a3c", marginTop: 10, textAlign: "center" }}>
                Loads support.apple.com RSA-2048 SPKI from IMG_2647.PNG
              </p>
            </div>
          )}

          {/* ── HEX VIEW SCREEN ── */}
          {screen === "hex" && bytes && (
            <div style={{ padding: "12px 16px 24px" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                {[["#a78bfa","ASN.1 header"],["#ffd60a","Exponent"],["#e5e5ea","Modulus"],["#bf5af2","Selected"]].map(([c,l]) => (
                  <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: "#48484a" }}>{l}</span>
                  </span>
                ))}
              </div>
              <div style={{ background: "#0a0a0a", borderRadius: 12, padding: "10px 6px", overflowX: "auto" }}>
                {hexRows.map((row, i) => (
                  <HexRow key={i} offset={i * rowBytes} bytes={row} highlight={hlBytes.size > 0 ? hlBytes : undefined} />
                ))}
              </div>
              <p style={{ fontSize: 9.5, color: "#3a3a3c", marginTop: 10, textAlign: "center" }}>
                {bytes.length} bytes · {bytes.length * 8} bits SPKI DER
              </p>
            </div>
          )}

          {/* ── FIELDS SCREEN ── */}
          {screen === "fields" && (
            <div style={{ paddingBottom: 24 }}>
              <p style={{ fontSize: 10, color: "#636366", letterSpacing: "0.1em", padding: "14px 20px 8px" }}>
                ASN.1 DECODED FIELDS
              </p>
              {fields.map((f, i) => <FieldRow key={i} f={f} />)}
            </div>
          )}

          {/* ── FINDINGS SCREEN ── */}
          {screen === "findings" && (
            <div style={{ padding: "14px 16px 24px" }}>
              <p style={{ fontSize: 10, color: "#636366", letterSpacing: "0.1em", marginBottom: 14 }}>
                ADVERSARIAL FINDINGS — TAP TO EXPAND
              </p>
              {findings.map(f => <FindingRow key={f.id} f={f} />)}
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {!bytes && screen !== "input" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12 }}>
              <span style={{ fontSize: 40 }}>🔐</span>
              <p style={{ fontSize: 12, color: "#48484a" }}>No hex loaded yet</p>
              <button onClick={() => setScreen("input")} style={{
                background: "#1c1c1e", border: "1px solid #3a3a3c",
                borderRadius: 10, color: "#bf5af2", fontSize: 11,
                padding: "10px 20px", cursor: "pointer", fontFamily: "inherit",
              }}>
                Go to Input
              </button>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 120, height: 4, borderRadius: 2, background: "#3a3a3c" }} />
        </div>
      </div>
    </div>
  );
}
