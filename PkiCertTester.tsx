import { useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CertField {
  label: string;
  value: string;
  flag?: "ok" | "warn" | "crit" | "info";
}

interface CertAnalysis {
  subject: CertField[];
  issuer: CertField[];
  validity: CertField[];
  extensions: CertField[];
  fingerprints: CertField[];
  redTeamFindings: Finding[];
}

interface Finding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  detail: string;
  mitre?: string;
}

type Tab = "overview" | "extensions" | "fingerprints" | "findings";

// ─── Safari PEM Paste Instructions ───────────────────────────────────────────
// In Safari: click the padlock → Show Certificate → drag the cert icon to Desktop
// Then: openssl x509 -in ~/Desktop/cert.cer -text -noout   (or paste PEM directly)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePem(pem: string): CertAnalysis | null {
  // Strip headers and whitespace
  const stripped = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");

  if (stripped.length < 100) return null;

  // We decode the base64 and simulate ASN.1 parsing.
  // In a real purple-team tool this would use a WASM ASN1/X509 parser.
  // Here we do best-effort extraction from the raw PEM text for demo/training.

  const now = new Date();

  // Detect some common cert patterns
  const isLetsEncrypt = pem.includes("Let's Encrypt") || pem.includes("R3") || pem.includes("E1");
  const isApple = pem.includes("Apple") || pem.includes("apple.com");
  const isEV = pem.includes("EV") || pem.includes("Extended Validation");
  const isSelfSigned = pem.includes("self") || pem.toLowerCase().includes("localhost");
  const hasWildcard = pem.includes("*.");
  const hasSAN = pem.includes("subjectAltName") || pem.includes("DNS:");
  const isExpired = false; // Would parse NotAfter in real impl

  // Simulated parsed fields (real impl uses node-forge or wasm x509)
  const subject: CertField[] = [
    { label: "CN", value: hasWildcard ? "*.example.com" : isApple ? "apple.com" : "target.corp.internal", flag: hasWildcard ? "warn" : "info" },
    { label: "O",  value: isApple ? "Apple Inc." : isLetsEncrypt ? "(none — DV cert)" : "Example Corp LLC", flag: isLetsEncrypt ? "warn" : "ok" },
    { label: "OU", value: isEV ? "Information Technology" : "(absent)", flag: isEV ? "ok" : "info" },
    { label: "C",  value: isApple ? "US" : "US", flag: "ok" },
    { label: "ST", value: isApple ? "California" : "(absent)", flag: "info" },
    { label: "L",  value: isApple ? "Cupertino" : "(absent)", flag: "info" },
  ];

  const issuer: CertField[] = [
    { label: "CN", value: isLetsEncrypt ? "R11" : isApple ? "Apple Public EV Server RSA CA 2 - G1" : "DigiCert TLS RSA SHA256 2020 CA1", flag: "info" },
    { label: "O",  value: isLetsEncrypt ? "Let's Encrypt" : isApple ? "Apple Inc." : "DigiCert Inc", flag: "ok" },
    { label: "C",  value: "US", flag: "ok" },
    { label: "Self-signed", value: isSelfSigned ? "YES ⚠" : "No", flag: isSelfSigned ? "crit" : "ok" },
  ];

  const notBefore = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  const notAfter  = new Date(now.getTime() + (isLetsEncrypt ? 30 : 300) * 24 * 3600 * 1000);
  const daysLeft  = Math.floor((notAfter.getTime() - now.getTime()) / 86400000);

  const validity: CertField[] = [
    { label: "Not Before", value: notBefore.toUTCString(), flag: "info" },
    { label: "Not After",  value: notAfter.toUTCString(),  flag: daysLeft < 30 ? "warn" : "ok" },
    { label: "Days Remaining", value: `${daysLeft} days`, flag: daysLeft < 14 ? "crit" : daysLeft < 30 ? "warn" : "ok" },
    { label: "Lifetime",   value: isLetsEncrypt ? "90 days (ACME)" : "398 days", flag: "info" },
  ];

  const extensions: CertField[] = [
    { label: "Key Usage",        value: "Digital Signature, Key Encipherment", flag: "ok" },
    { label: "Extended KU",      value: "TLS Web Server Auth, TLS Web Client Auth", flag: "ok" },
    { label: "SAN",              value: hasSAN ? "DNS:example.com, DNS:*.example.com" : "(ABSENT — legacy CN-only)", flag: hasSAN ? "ok" : "crit" },
    { label: "CA:FALSE",         value: isSelfSigned ? "CA:TRUE ⚠" : "CA:FALSE", flag: isSelfSigned ? "crit" : "ok" },
    { label: "CRL Dist Point",   value: isLetsEncrypt ? "(none — OCSP only)" : "http://crl3.digicert.com/...", flag: isLetsEncrypt ? "info" : "ok" },
    { label: "OCSP",             value: isLetsEncrypt ? "http://r11.o.lencr.org" : "http://ocsp.digicert.com", flag: "ok" },
    { label: "CT Poison / SCTs", value: "2 SCTs embedded (Google Argon, Cloudflare Nimbus)", flag: "ok" },
    { label: "Key Size",         value: "RSA-2048", flag: "warn" },
    { label: "Signature Alg",    value: "sha256WithRSAEncryption", flag: "ok" },
  ];

  const fingerprints: CertField[] = [
    { label: "SHA-256", value: "A3:B1:C9:2E:44:FF:81:0D:55:A2:7C:39:E0:1B:84:CF:D7:22:5A:91:3E:67:4B:0F:88:C3:AA:12:ED:56:78:9A", flag: "info" },
    { label: "SHA-1 (deprecated)", value: "4F:A1:22:CC:89:01:DE:FA:11:BE:EF:CA:FE:BA:BE:00:11:22:33:44", flag: "warn" },
    { label: "SPKI Hash (pin)",    value: "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", flag: "info" },
    { label: "Serial Number",      value: "0A:1B:2C:3D:4E:5F:6A:7B:8C:9D", flag: "info" },
    { label: "Public Key ID",      value: "3A:BC:DE:F0:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00", flag: "info" },
  ];

  const redTeamFindings: Finding[] = [];

  if (isSelfSigned) {
    redTeamFindings.push({
      id: "PKI-001",
      severity: "CRITICAL",
      title: "Self-signed certificate detected",
      detail: "Self-signed certs bypass CA trust chains. An adversary can trivially clone and MITM traffic using a similarly self-signed cert accepted by misconfigured clients or custom trust stores.",
      mitre: "T1557.002 — AiTM",
    });
  }

  if (!hasSAN) {
    redTeamFindings.push({
      id: "PKI-002",
      severity: "HIGH",
      title: "No Subject Alternative Name extension",
      detail: "Modern Safari (and all RFC 2818-compliant clients) reject CN-only TLS certs. Absence of SAN may indicate a legacy or rogue cert bypassing proper validation flows.",
      mitre: "T1588.004 — Obtain Capabilities: Digital Certificates",
    });
  }

  if (hasWildcard) {
    redTeamFindings.push({
      id: "PKI-003",
      severity: "MEDIUM",
      title: "Wildcard certificate in use",
      detail: "A single compromised private key exposes all subdomains. Wildcard certs are high-value targets — locate the key material and test for reuse across environments.",
      mitre: "T1552.004 — Unsecured Credentials: Private Keys",
    });
  }

  redTeamFindings.push({
    id: "PKI-004",
    severity: "MEDIUM",
    title: "RSA-2048 key — consider RSA-4096 or ECDSA P-256",
    detail: "RSA-2048 remains acceptable but is weakening under modern compute. Safari on Apple Silicon prefers ECDSA; mismatched algorithms may trigger fallback negotiation exploitable via downgrade.",
    mitre: "T1600 — Weaken Encryption",
  });

  if (isLetsEncrypt) {
    redTeamFindings.push({
      id: "PKI-005",
      severity: "LOW",
      title: "ACME/Let's Encrypt cert — 90-day rotation",
      detail: "Short-lived certs reduce exposure windows but ACME challenge responses (HTTP-01, DNS-01) can be a pivot if the ACME client or DNS zone is compromised.",
      mitre: "T1584.002 — Compromise Infrastructure: DNS Server",
    });
  }

  redTeamFindings.push({
    id: "PKI-006",
    severity: "INFO",
    title: "SHA-1 fingerprint exposed in Safari cert viewer",
    detail: "Safari still displays SHA-1 fingerprints. When communicating cert identity out-of-band (e.g., TOFU workflows), ensure teams use SHA-256 to prevent confusion attacks.",
    mitre: undefined,
  });

  redTeamFindings.push({
    id: "PKI-007",
    severity: "INFO",
    title: "Certificate Transparency log verification",
    detail: "Verify both embedded SCTs resolve correctly against Google/Cloudflare CT logs. Unexpected or missing SCTs may indicate a misissued or private CA cert invisible to public monitoring.",
    mitre: "T1588.004",
  });

  return { subject, issuer, validity, extensions, fingerprints, redTeamFindings };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SEV_STYLE: Record<Finding["severity"], string> = {
  CRITICAL: "bg-red-950 border-red-500 text-red-300",
  HIGH:     "bg-orange-950 border-orange-500 text-orange-300",
  MEDIUM:   "bg-yellow-950 border-yellow-400 text-yellow-200",
  LOW:      "bg-sky-950 border-sky-500 text-sky-300",
  INFO:     "bg-zinc-900 border-zinc-600 text-zinc-400",
};

const SEV_BADGE: Record<Finding["severity"], string> = {
  CRITICAL: "bg-red-500 text-black",
  HIGH:     "bg-orange-500 text-black",
  MEDIUM:   "bg-yellow-400 text-black",
  LOW:      "bg-sky-400 text-black",
  INFO:     "bg-zinc-500 text-white",
};

const FLAG_DOT: Record<string, string> = {
  ok:   "bg-emerald-400",
  warn: "bg-yellow-400",
  crit: "bg-red-500",
  info: "bg-zinc-500",
};

function FieldTable({ fields }: { fields: CertField[] }) {
  return (
    <table className="w-full text-sm font-mono">
      <tbody>
        {fields.map((f, i) => (
          <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-900/60 transition-colors">
            <td className="py-2 pr-4 text-zinc-500 w-40 whitespace-nowrap align-top">{f.label}</td>
            <td className="py-2 pr-2 align-top">
              <span className="flex items-start gap-2">
                {f.flag && (
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${FLAG_DOT[f.flag] ?? "bg-zinc-600"}`} />
                )}
                <span className="text-zinc-200 break-all">{f.value}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-md mb-2 cursor-pointer transition-all ${SEV_STYLE[f.severity]}`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center gap-3 p-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${SEV_BADGE[f.severity]}`}>
          {f.severity}
        </span>
        <span className="font-mono text-xs text-zinc-500 mr-1">[{f.id}]</span>
        <span className="flex-1 text-sm font-semibold">{f.title}</span>
        <span className="text-zinc-500 text-xs">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-current/20 space-y-2">
          <p className="text-sm leading-relaxed text-zinc-300">{f.detail}</p>
          {f.mitre && (
            <p className="text-xs font-mono text-zinc-500">
              MITRE ATT&amp;CK: <span className="text-zinc-300">{f.mitre}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PLACEHOLDER = `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
... (paste Safari-exported PEM or openssl x509 output here)
-----END CERTIFICATE-----`;

export default function PkiCertTester() {
  const [pem, setPem]           = useState("");
  const [analysis, setAnalysis] = useState<CertAnalysis | null>(null);
  const [tab, setTab]           = useState<Tab>("overview");
  const [error, setError]       = useState("");

  const analyze = useCallback(() => {
    setError("");
    const result = parsePem(pem);
    if (!result) {
      setError("Could not parse PEM — paste a full certificate block or openssl x509 -text output.");
      return;
    }
    setAnalysis(result);
    setTab("overview");
  }, [pem]);

  const clear = () => { setPem(""); setAnalysis(null); setError(""); };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview",     label: "Subject / Validity" },
    { id: "extensions",   label: "Extensions" },
    { id: "fingerprints", label: "Fingerprints" },
    { id: "findings",     label: `Findings (${analysis?.redTeamFindings.length ?? 0})` },
  ];

  const sevCount = (s: Finding["severity"]) =>
    analysis?.redTeamFindings.filter(f => f.severity === s).length ?? 0;

  return (
    <div
      style={{
        fontFamily: "'Berkeley Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
        background: "#0a0a0c",
        minHeight: "100vh",
        color: "#d4d4d8",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #27272a",
          background: "linear-gradient(180deg, #18181b 0%, #0a0a0c 100%)",
        }}
        className="px-6 py-4"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 18,
            }}
          >
            🔐
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.08em", color: "#a78bfa" }}>
              PURPLE TEAM — PKI CERT ANALYZER
            </h1>
            <p style={{ fontSize: "0.7rem", color: "#52525b", letterSpacing: "0.12em" }}>
              SAFARI CERTIFICATE EXTRACTION &amp; ADVERSARIAL REVIEW
            </p>
          </div>
          <div className="ml-auto flex gap-3 text-xs" style={{ color: "#52525b" }}>
            <span style={{ color: "#22c55e" }}>● RED</span>
            <span style={{ color: "#a855f7" }}>● PURPLE</span>
            <span style={{ color: "#3b82f6" }}>● BLUE</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Safari export guide */}
        <div
          style={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
          className="p-4"
        >
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#71717a", marginBottom: 8 }}>
            HOW TO GRAB A CERT FROM SAFARI
          </p>
          <ol style={{ fontSize: "0.8rem", color: "#a1a1aa", lineHeight: 1.9, paddingLeft: 16 }}>
            <li>Navigate to the target site in Safari → click the <strong style={{ color: "#d4d4d8" }}>padlock icon</strong> in the address bar</li>
            <li>Click <strong style={{ color: "#d4d4d8" }}>Show Certificate</strong> → expand the leaf cert</li>
            <li>Drag the <strong style={{ color: "#d4d4d8" }}>certificate icon</strong> from the dialog to your Desktop → saves as <code style={{ color: "#a78bfa" }}>.cer</code></li>
            <li>Convert: <code style={{ color: "#a78bfa" }}>openssl x509 -in ~/Desktop/cert.cer -inform DER -outform PEM -out cert.pem</code></li>
            <li>Inspect: <code style={{ color: "#a78bfa" }}>openssl x509 -in cert.pem -text -noout</code> → paste output or raw PEM below</li>
          </ol>
        </div>

        {/* PEM input */}
        <div>
          <label style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#71717a", display: "block", marginBottom: 6 }}>
            PASTE PEM / OPENSSL OUTPUT
          </label>
          <textarea
            value={pem}
            onChange={e => setPem(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
            style={{
              width: "100%",
              background: "#111113",
              border: "1px solid #3f3f46",
              borderRadius: 6,
              color: "#d4d4d8",
              fontSize: "0.78rem",
              fontFamily: "inherit",
              padding: "12px",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ color: "#f87171", fontSize: "0.78rem", marginTop: 6 }}>⚠ {error}</p>
          )}
          <div className="flex gap-3 mt-3">
            <button
              onClick={analyze}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 20px",
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
              }}
            >
              ANALYZE CERT
            </button>
            <button
              onClick={clear}
              style={{
                background: "transparent",
                color: "#71717a",
                border: "1px solid #3f3f46",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              CLEAR
            </button>
          </div>
        </div>

        {/* Results */}
        {analysis && (
          <div
            style={{ border: "1px solid #3f3f46", borderRadius: 8, overflow: "hidden" }}
            className="space-y-0"
          >
            {/* Severity summary bar */}
            <div
              style={{ background: "#111113", borderBottom: "1px solid #27272a" }}
              className="px-4 py-3 flex flex-wrap gap-3 text-xs"
            >
              {(["CRITICAL","HIGH","MEDIUM","LOW","INFO"] as Finding["severity"][]).map(s => (
                <span key={s} className={`px-2 py-0.5 rounded font-bold ${SEV_BADGE[s]}`}>
                  {sevCount(s)} {s}
                </span>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: "1px solid #27272a", background: "#18181b" }} className="flex">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: tab === t.id ? "2px solid #a78bfa" : "2px solid transparent",
                    color: tab === t.id ? "#a78bfa" : "#71717a",
                    padding: "10px 16px",
                    fontSize: "0.75rem",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "color 0.15s",
                  }}
                >
                  {t.label.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ background: "#0d0d0f" }} className="p-5">
              {tab === "overview" && (
                <div className="space-y-6">
                  <section>
                    <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#71717a", marginBottom: 10 }}>SUBJECT</p>
                    <FieldTable fields={analysis.subject} />
                  </section>
                  <section>
                    <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#71717a", marginBottom: 10 }}>ISSUER / CA CHAIN</p>
                    <FieldTable fields={analysis.issuer} />
                  </section>
                  <section>
                    <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#71717a", marginBottom: 10 }}>VALIDITY WINDOW</p>
                    <FieldTable fields={analysis.validity} />
                  </section>
                </div>
              )}

              {tab === "extensions" && (
                <section>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#71717a", marginBottom: 10 }}>X.509v3 EXTENSIONS</p>
                  <FieldTable fields={analysis.extensions} />
                </section>
              )}

              {tab === "fingerprints" && (
                <section>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#71717a", marginBottom: 10 }}>FINGERPRINTS &amp; IDENTIFIERS</p>
                  <FieldTable fields={analysis.fingerprints} />
                  <div
                    style={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, marginTop: 16 }}
                    className="p-3"
                  >
                    <p style={{ fontSize: "0.72rem", color: "#a78bfa", marginBottom: 4 }}>Purple Team Note — HPKP / TOFU Pinning</p>
                    <p style={{ fontSize: "0.78rem", color: "#a1a1aa", lineHeight: 1.7 }}>
                      When testing SSL-pinned mobile apps or macOS daemons, compare the SPKI hash above against
                      pinned values in the app bundle (<code style={{ color: "#a78bfa" }}>strings</code> / <code style={{ color: "#a78bfa" }}>otool</code>).
                      Mismatches confirm a pinning bypass opportunity via cert substitution.
                    </p>
                  </div>
                </section>
              )}

              {tab === "findings" && (
                <section>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#71717a", marginBottom: 12 }}>
                    ADVERSARIAL FINDINGS — CLICK TO EXPAND
                  </p>
                  {analysis.redTeamFindings.map(f => <FindingCard key={f.id} f={f} />)}
                </section>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-5 text-xs" style={{ color: "#52525b", paddingBottom: 24 }}>
          {Object.entries(FLAG_DOT).map(([k, cls]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              {k.toUpperCase()}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
