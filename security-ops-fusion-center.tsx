import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Shield,
  Network,
  BarChart3,
  Settings,
  Search,
  TrendingUp,
  Lock,
  Radio,
  FileText,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Code,
  Activity,
  Zap,
  Eye,
  ChevronRight,
  Plus,
  Trash2,
  Package,
  Minus,
} from 'lucide-react';

interface ThreatIndicator {
  id: string;
  ioc: string;
  type: 'ip' | 'domain' | 'hash' | 'email';
  tlp: 'white' | 'green' | 'amber' | 'red';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  firstSeen: string;
  attackers: string[];
  tactics: string[];
  confidence: number;
}

interface PKICert {
  id: string;
  subject: string;
  issuer: string;
  expires: string;
  status: 'valid' | 'expiring' | 'expired' | 'revoked';
  algorithm: string;
  keySize: number;
  usage: string[];
}

interface IDSAlert {
  id: string;
  timestamp: string;
  signature: string;
  sourceIP: string;
  destIP: string;
  protocol: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'blocked' | 'allowed';
  count: number;
}

interface RFIDAssessment {
  id: string;
  location: string;
  assetCount: number;
  scanQuality: number;
  threats: number;
  lastScan: string;
}

interface IncidentRecord {
  id: string;
  title: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  created: string;
  assignee: string;
  iocs: string[];
  timeline: string[];
}

interface Asset {
  id: string;
  hostname: string;
  ip: string;
  status: 'online' | 'offline' | 'compromised';
  lastSeen: string;
  vulnerability: number;
  osType: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: 'hardware' | 'software' | 'supplies' | 'security';
  quantity: number;
  unit: string;
  lastUpdated: string;
  location: string;
}

const SecurityOpsFusionCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedThreat, setSelectedThreat] = useState<ThreatIndicator | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: 'asset-1',
      hostname: 'firewall-01.corp',
      ip: '10.0.0.1',
      status: 'online',
      lastSeen: '2025-05-30 15:32',
      vulnerability: 0,
      osType: 'Palo Alto Networks',
    },
    {
      id: 'asset-2',
      hostname: 'siem-master.corp',
      ip: '10.0.1.50',
      status: 'online',
      lastSeen: '2025-05-30 15:35',
      vulnerability: 2,
      osType: 'Linux (Ubuntu 22.04)',
    },
    {
      id: 'asset-3',
      hostname: 'ad-dc-01.corp',
      ip: '10.0.1.10',
      status: 'compromised',
      lastSeen: '2025-05-30 14:22',
      vulnerability: 7,
      osType: 'Windows Server 2019',
    },
    {
      id: 'asset-4',
      hostname: 'backup-srv-02.corp',
      ip: '10.0.2.20',
      status: 'offline',
      lastSeen: '2025-05-28 09:12',
      vulnerability: 3,
      osType: 'Windows Server 2022',
    },
  ]);
  const [newAssetHostname, setNewAssetHostname] = useState('');
  const [newAssetIP, setNewAssetIP] = useState('');
  const [newAssetOS, setNewAssetOS] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [pkiCerts, setPkiCerts] = useState<PKICert[]>([
    {
      id: 'pki-1',
      subject: 'api.company.internal',
      issuer: 'Internal CA',
      expires: '2025-08-15',
      status: 'valid',
      algorithm: 'RSA-4096',
      keySize: 4096,
      usage: ['TLS Web Server Auth', 'Digital Signature'],
    },
    {
      id: 'pki-2',
      subject: 'mail.company.internal',
      issuer: 'Internal CA',
      expires: '2025-07-02',
      status: 'expiring',
      algorithm: 'RSA-2048',
      keySize: 2048,
      usage: ['S/MIME', 'TLS Web Server Auth'],
    },
    {
      id: 'pki-3',
      subject: 'vpn.company.internal',
      issuer: 'Internal CA',
      expires: '2024-12-10',
      status: 'expired',
      algorithm: 'RSA-2048',
      keySize: 2048,
      usage: ['VPN Authentication'],
    },
  ]);
  const [newCertSubject, setNewCertSubject] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('Internal CA');
  const [newCertExpires, setNewCertExpires] = useState('');
  const [newCertAlgorithm, setNewCertAlgorithm] = useState('RSA-2048');
  const [newCertKeySize, setNewCertKeySize] = useState('2048');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    {
      id: 'inv-1',
      name: 'Network Cables (Cat6)',
      category: 'hardware',
      quantity: 45,
      unit: 'units',
      lastUpdated: '2025-05-30',
      location: 'Warehouse B',
    },
    {
      id: 'inv-2',
      name: 'Server RAM 32GB',
      category: 'hardware',
      quantity: 12,
      unit: 'units',
      lastUpdated: '2025-05-28',
      location: 'Data Center A',
    },
    {
      id: 'inv-3',
      name: 'SSL Certificates',
      category: 'security',
      quantity: 8,
      unit: 'licenses',
      lastUpdated: '2025-05-30',
      location: 'Digital',
    },
    {
      id: 'inv-4',
      name: 'Antivirus Licenses',
      category: 'software',
      quantity: 250,
      unit: 'licenses',
      lastUpdated: '2025-05-29',
      location: 'Digital',
    },
    {
      id: 'inv-5',
      name: 'Security Keys (2FA)',
      category: 'security',
      quantity: 34,
      unit: 'units',
      lastUpdated: '2025-05-27',
      location: 'Branch Office C',
    },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'hardware' | 'software' | 'supplies' | 'security'>('hardware');

  // Mock Data - Threat Intelligence
  const threats: ThreatIndicator[] = [
    {
      id: '1',
      ioc: '192.168.1.105',
      type: 'ip',
      tlp: 'red',
      severity: 'critical',
      source: 'CISA Advisory',
      firstSeen: '2025-05-28',
      attackers: ['Lazarus Group', 'APT28'],
      tactics: ['T1595 - Active Scanning', 'T1190 - Exploit Public-Facing App'],
      confidence: 95,
    },
    {
      id: '2',
      ioc: 'malicious.xyz',
      type: 'domain',
      tlp: 'amber',
      severity: 'high',
      source: 'Internal Honeypot',
      firstSeen: '2025-05-29',
      attackers: ['APT41'],
      tactics: ['T1566 - Phishing', 'T1598 - Phishing for Information'],
      confidence: 87,
    },
    {
      id: '3',
      ioc: 'a1b2c3d4e5f6g7h8...',
      type: 'hash',
      tlp: 'green',
      severity: 'medium',
      source: 'VirusTotal Feed',
      firstSeen: '2025-05-27',
      attackers: ['FIN7'],
      tactics: ['T1566 - Phishing'],
      confidence: 72,
    },
    {
      id: '4',
      ioc: 'attacker@badactors.net',
      type: 'email',
      tlp: 'white',
      severity: 'low',
      source: 'Community Feed',
      firstSeen: '2025-05-30',
      attackers: ['Unknown'],
      tactics: [],
      confidence: 45,
    },
  ];



  // Mock Data - IDS Alerts
  const idsAlerts: IDSAlert[] = [
    {
      id: 'ids-1',
      timestamp: '2025-05-30 14:32:15',
      signature: 'ET MALWARE Win32/Emotet.C!C',
      sourceIP: '203.0.113.45',
      destIP: '10.0.1.50',
      protocol: 'TCP',
      severity: 'critical',
      action: 'blocked',
      count: 847,
    },
    {
      id: 'ids-2',
      timestamp: '2025-05-30 13:45:22',
      signature: 'SQL Injection Attempt',
      sourceIP: '198.51.100.12',
      destIP: '10.0.2.100',
      protocol: 'TCP/443',
      severity: 'high',
      action: 'blocked',
      count: 234,
    },
    {
      id: 'ids-3',
      timestamp: '2025-05-30 12:10:08',
      signature: 'Brute Force SSH',
      sourceIP: '192.0.2.88',
      destIP: '10.0.1.25',
      protocol: 'TCP/22',
      severity: 'medium',
      action: 'allowed',
      count: 1523,
    },
  ];

  // Mock Data - RFID
  const rfidAssets: RFIDAssessment[] = [
    {
      id: 'rfid-1',
      location: 'Data Center A',
      assetCount: 1248,
      scanQuality: 98,
      threats: 0,
      lastScan: '2025-05-30 08:15:00',
    },
    {
      id: 'rfid-2',
      location: 'Warehouse B',
      assetCount: 456,
      scanQuality: 94,
      threats: 2,
      lastScan: '2025-05-29 16:45:00',
    },
    {
      id: 'rfid-3',
      location: 'Branch Office C',
      assetCount: 189,
      scanQuality: 87,
      threats: 5,
      lastScan: '2025-05-28 10:20:00',
    },
  ];

  // Mock Data - Incidents
  const incidents: IncidentRecord[] = [
    {
      id: 'inc-1',
      title: 'Potential Insider Threat - Anomalous Data Exfil',
      status: 'open',
      severity: 'critical',
      created: '2025-05-30',
      assignee: 'Sarah Chen',
      iocs: ['192.168.1.105', 'a1b2c3d4e5f6g7h8...'],
      timeline: [
        '14:32 - Large data transfer detected on SIEM',
        '14:45 - User account flagged for abnormal behavior',
        '15:00 - Incident created and assigned',
      ],
    },
    {
      id: 'inc-2',
      title: 'Phishing Campaign - High Volume Email Alerts',
      status: 'in-progress',
      severity: 'high',
      created: '2025-05-29',
      assignee: 'Marcus Rodriguez',
      iocs: ['malicious.xyz'],
      timeline: [
        '09:15 - Email gateway flags 1240 phishing emails',
        '09:30 - Campaign linked to APT41',
        '10:00 - User awareness notification sent',
      ],
    },
    {
      id: 'inc-3',
      title: 'Expired SSL Certificate - Remediation Complete',
      status: 'resolved',
      severity: 'medium',
      created: '2025-05-15',
      assignee: 'Jennifer Park',
      iocs: [],
      timeline: [
        '2025-05-15 - Certificate expiration detected',
        '2025-05-16 - New cert provisioned',
        '2025-05-20 - Successfully deployed',
      ],
    },
  ];



  const getStatusIcon = (status: string) => {
    if (status === 'online') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'offline') return <AlertCircle className="w-4 h-4 text-slate-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'hardware':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
      case 'software':
        return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
      case 'security':
        return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'supplies':
        return 'bg-amber-900/30 text-amber-300 border-amber-700/50';
      default:
        return 'bg-slate-800/30 text-slate-300 border-slate-700/50';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Inventory Management Functions
  const addInventoryItem = () => {
    if (newItemName.trim()) {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        name: newItemName,
        category: newItemCategory,
        quantity: 1,
        unit: 'units',
        lastUpdated: new Date().toISOString().split('T')[0],
        location: 'Unassigned',
      };
      setInventoryItems([...inventoryItems, newItem]);
      setNewItemName('');
    }
  };

  const removeInventoryItem = (id: string) => {
    setInventoryItems(inventoryItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, change: number) => {
    setInventoryItems(
      inventoryItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
      )
    );
  };

  const filteredInventory = useMemo(() => {
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryItems, searchTerm]);

  const inventorySummary = useMemo(() => {
    return {
      total: inventoryItems.length,
      hardware: inventoryItems.filter((i) => i.category === 'hardware').length,
      software: inventoryItems.filter((i) => i.category === 'software').length,
      security: inventoryItems.filter((i) => i.category === 'security').length,
      supplies: inventoryItems.filter((i) => i.category === 'supplies').length,
    };
  }, [inventoryItems]);

  // Render Dashboard
  const Dashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400">Active Threats</p>
          <p className="text-2xl font-bold text-red-400">{threats.filter((t) => t.severity === 'critical').length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400">Open Incidents</p>
          <p className="text-2xl font-bold text-amber-400">{incidents.filter((i) => i.status === 'open').length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400">Assets Online</p>
          <p className="text-2xl font-bold text-emerald-400">{assets.filter((a) => a.status === 'online').length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400">Inventory Items</p>
          <p className="text-2xl font-bold text-blue-400">{inventorySummary.total}</p>
        </div>
      </div>
    </div>
  );

  // Render Threat Intelligence
  const ThreatIntel = () => (
    <div className="space-y-3">
      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search IOCs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 flex-1 outline-none focus:border-amber-700/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        {threats.map((threat) => (
          <div
            key={threat.id}
            className={`bg-slate-900/50 border rounded-lg p-3 text-xs cursor-pointer transition ${
              selectedThreat?.id === threat.id ? 'border-amber-700/50 bg-amber-900/20' : 'border-slate-700/30'
            }`}
            onClick={() => setSelectedThreat(selectedThreat?.id === threat.id ? null : threat)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-mono text-sm text-slate-200">{threat.ioc}</div>
                <div className="text-slate-500 text-xs mt-1">Type: {threat.type.toUpperCase()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    threat.severity === 'critical'
                      ? 'bg-red-900/50 text-red-300'
                      : threat.severity === 'high'
                        ? 'bg-orange-900/50 text-orange-300'
                        : threat.severity === 'medium'
                          ? 'bg-amber-900/50 text-amber-300'
                          : 'bg-emerald-900/50 text-emerald-300'
                  }`}
                >
                  {threat.severity}
                </span>
              </div>
            </div>

            {selectedThreat?.id === threat.id && (
              <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-2 text-slate-400">
                <div>
                  <p className="text-slate-300 font-mono">Source:</p>
                  <p>{threat.source}</p>
                </div>
                <div>
                  <p className="text-slate-300 font-mono">Confidence:</p>
                  <p>{threat.confidence}%</p>
                </div>
                <div>
                  <p className="text-slate-300 font-mono">Attackers:</p>
                  <p>{threat.attackers.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render PKI Dashboard
  const PKIDashboard = () => {
    const addCertificate = () => {
      if (newCertSubject.trim() && newCertExpires.trim()) {
        const newCert: PKICert = {
          id: `pki-${Date.now()}`,
          subject: newCertSubject,
          issuer: newCertIssuer,
          expires: newCertExpires,
          status: 'valid',
          algorithm: newCertAlgorithm,
          keySize: parseInt(newCertKeySize),
          usage: ['General Purpose'],
        };
        setPkiCerts([...pkiCerts, newCert]);
        setNewCertSubject('');
        setNewCertExpires('');
      }
    };

    const removeCertificate = (id: string) => {
      setPkiCerts(pkiCerts.filter((cert) => cert.id !== id));
    };

    const updateCertStatus = (id: string, newStatus: 'valid' | 'expiring' | 'expired' | 'revoked') => {
      setPkiCerts(
        pkiCerts.map((cert) =>
          cert.id === id ? { ...cert, status: newStatus } : cert
        )
      );
    };

    const updateExpireDate = (id: string, newDate: string) => {
      setPkiCerts(
        pkiCerts.map((cert) =>
          cert.id === id ? { ...cert, expires: newDate } : cert
        )
      );
    };

    return (
      <div className="space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
            <p className="text-slate-500">Valid</p>
            <p className="text-lg font-bold text-emerald-300">
              {pkiCerts.filter((c) => c.status === 'valid').length}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
            <p className="text-slate-500">Expiring</p>
            <p className="text-lg font-bold text-amber-300">
              {pkiCerts.filter((c) => c.status === 'expiring').length}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
            <p className="text-slate-500">Expired</p>
            <p className="text-lg font-bold text-red-300">
              {pkiCerts.filter((c) => c.status === 'expired').length}
            </p>
          </div>
        </div>

        {/* Add New Certificate */}
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 space-y-2">
          <label className="text-xs text-slate-400 block">Add New Certificate</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Subject (e.g., api.company.internal)"
              value={newCertSubject}
              onChange={(e) => setNewCertSubject(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-700/50"
            />
            <input
              type="text"
              placeholder="Issuer (e.g., Internal CA)"
              value={newCertIssuer}
              onChange={(e) => setNewCertIssuer(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-700/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                placeholder="Expiration Date"
                value={newCertExpires}
                onChange={(e) => setNewCertExpires(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-700/50"
              />
              <select
                value={newCertAlgorithm}
                onChange={(e) => setNewCertAlgorithm(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-700/50"
              >
                <option>RSA-2048</option>
                <option>RSA-4096</option>
                <option>ECDSA-256</option>
                <option>ECDSA-384</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newCertKeySize}
                onChange={(e) => setNewCertKeySize(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-700/50"
              >
                <option value="2048">2048-bit</option>
                <option value="4096">4096-bit</option>
                <option value="8192">8192-bit</option>
              </select>
              <button
                onClick={addCertificate}
                className="bg-amber-900/50 hover:bg-amber-900/70 border border-amber-700/50 text-amber-300 px-3 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Search/Filter */}
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 flex-1 outline-none focus:border-amber-700/50"
            />
          </div>
        </div>

        {/* Certificates List */}
        <div className="space-y-2">
          {pkiCerts
            .filter(
              (cert) =>
                cert.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cert.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cert.algorithm.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((cert) => (
              <div
                key={cert.id}
                className={`bg-slate-900/50 border rounded-lg p-3 text-xs ${
                  cert.status === 'expired'
                    ? 'border-red-700/50'
                    : cert.status === 'expiring'
                      ? 'border-amber-700/50'
                      : 'border-emerald-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-slate-200">{cert.subject}</div>
                    <div className="text-slate-500 mt-1 text-xs">Issuer: {cert.issuer}</div>
                  </div>
                  <button
                    onClick={() => removeCertificate(cert.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-700/30">
                  {/* Certificate Details */}
                  <div className="grid grid-cols-2 gap-2 text-slate-500">
                    <div>
                      Algorithm: <span className="text-slate-300 font-mono text-xs">{cert.algorithm}</span>
                    </div>
                    <div>
                      Key Size: <span className="text-slate-300">{cert.keySize}-bit</span>
                    </div>
                  </div>

                  {/* Status Controls */}
                  <div>
                    <p className="text-slate-500 mb-1">Status</p>
                    <div className="grid grid-cols-2 gap-1">
                      {['valid', 'expiring', 'expired', 'revoked'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateCertStatus(cert.id, status as any)}
                          className={`px-2 py-1 rounded text-xs font-bold transition ${
                            cert.status === status
                              ? status === 'valid'
                                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                                : status === 'expiring'
                                  ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                                  : status === 'expired'
                                    ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                                    : 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
                              : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expiration Date Editor */}
                  <div>
                    <p className="text-slate-500 mb-1">Expires</p>
                    <input
                      type="date"
                      value={cert.expires}
                      onChange={(e) => updateExpireDate(cert.id, e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-700/50"
                    />
                  </div>

                  {/* Usage Tags */}
                  <div>
                    <p className="text-slate-500 mb-1">Usage</p>
                    <div className="flex flex-wrap gap-1">
                      {cert.usage.map((use, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-300">
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Render IDS Dashboard
  const IDSDashboard = () => (
    <div className="space-y-3">
      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
        <div className="text-xs text-slate-400">Total Alerts Today</div>
        <div className="text-2xl font-bold text-red-400 mt-1">
          {idsAlerts.reduce((sum, a) => sum + a.count, 0).toLocaleString()}
        </div>
      </div>

      <div className="space-y-2">
        {idsAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`bg-slate-900/50 border rounded-lg p-3 text-xs ${
              alert.severity === 'critical'
                ? 'border-red-700/50'
                : alert.severity === 'high'
                  ? 'border-orange-700/50'
                  : 'border-slate-700/30'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-mono text-sm text-slate-200 mb-1">{alert.signature}</div>
                <div className="text-slate-500 grid grid-cols-2 gap-2">
                  <div>SRC: {alert.sourceIP}</div>
                  <div>DST: {alert.destIP}</div>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                  alert.severity === 'critical'
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-orange-900/50 text-orange-300'
                }`}
              >
                {alert.count}x
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Protocol: {alert.protocol}</span>
              <span className={alert.action === 'blocked' ? 'text-emerald-300' : 'text-amber-300'}>
                {alert.action.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render RFID Dashboard
  const RFIDDashboard = () => (
    <div className="space-y-3">
      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Total Assets Tracked</p>
          <p className="text-lg font-bold text-purple-300">
            {rfidAssets.reduce((sum, a) => sum + a.assetCount, 0).toLocaleString()}
          </p>
        </div>
        <Radio className="w-6 h-6 text-purple-400" />
      </div>

      <div className="space-y-2">
        {rfidAssets.map((rfid) => (
          <div key={rfid.id} className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-sm text-slate-200">{rfid.location}</div>
              <div className="flex items-center gap-1">
                {rfid.threats > 0 && (
                  <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs font-bold">
                    {rfid.threats} Threats
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Assets: {rfid.assetCount}</span>
                <span className="text-slate-300">{rfid.assetCount} items</span>
              </div>

              <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    rfid.scanQuality >= 95
                      ? 'bg-emerald-500'
                      : rfid.scanQuality >= 90
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${rfid.scanQuality}%` }}
                />
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Scan Quality</span>
                <span className="text-slate-300">{rfid.scanQuality}%</span>
              </div>

              <div className="text-slate-500">
                Last Scan: <span className="text-slate-300 text-xs">{rfid.lastScan}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Incident Management
  const IncidentMgmt = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { status: 'open', count: incidents.filter((i) => i.status === 'open').length, color: 'text-red-300' },
          {
            status: 'in-progress',
            count: incidents.filter((i) => i.status === 'in-progress').length,
            color: 'text-amber-300',
          },
          { status: 'resolved', count: incidents.filter((i) => i.status === 'resolved').length, color: 'text-emerald-300' },
          { status: 'closed', count: incidents.filter((i) => i.status === 'closed').length, color: 'text-slate-300' },
        ].map((stat) => (
          <div key={stat.status} className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
            <p className="text-slate-500 capitalize">{stat.status}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className={`bg-slate-900/50 border-l-4 rounded-lg p-3 text-xs ${
              incident.severity === 'critical'
                ? 'border-l-red-500'
                : incident.severity === 'high'
                  ? 'border-l-orange-500'
                  : 'border-l-amber-500'
            } border-slate-700/30`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-mono text-sm text-slate-200 mb-1">{incident.title}</h4>
                <p className="text-slate-500">Assigned: {incident.assignee}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  incident.status === 'open'
                    ? 'bg-red-900/50 text-red-300'
                    : incident.status === 'in-progress'
                      ? 'bg-amber-900/50 text-amber-300'
                      : 'bg-emerald-900/50 text-emerald-300'
                }`}
              >
                {incident.status}
              </span>
            </div>

            {incident.iocs.length > 0 && (
              <div className="mb-2 text-slate-500">
                IOCs:{' '}
                <span className="text-slate-300 font-mono text-xs">
                  {incident.iocs.join(', ')}
                </span>
              </div>
            )}

            <div className="text-slate-600">
              <p className="text-xs mb-1">Timeline:</p>
              {incident.timeline.map((entry, idx) => (
                <p key={idx} className="text-xs text-slate-500 ml-2">
                  • {entry}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Asset Tracking
  const AssetTracking = () => {
    const filteredAssets = assets.filter(
      (asset) =>
        asset.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.osType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addAsset = () => {
      if (newAssetHostname.trim() && newAssetIP.trim() && newAssetOS.trim()) {
        const newAsset: Asset = {
          id: `asset-${Date.now()}`,
          hostname: newAssetHostname,
          ip: newAssetIP,
          status: 'online',
          lastSeen: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString(),
          vulnerability: 0,
          osType: newAssetOS,
        };
        setAssets([...assets, newAsset]);
        setNewAssetHostname('');
        setNewAssetIP('');
        setNewAssetOS('');
      }
    };

    const removeAsset = (id: string) => {
      setAssets(assets.filter((asset) => asset.id !== id));
    };

    const updateAssetStatus = (id: string, newStatus: 'online' | 'offline' | 'compromised') => {
      setAssets(
        assets.map((asset) =>
          asset.id === id
            ? { ...asset, status: newStatus, lastSeen: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString() }
            : asset
        )
      );
    };

    const updateVulnerability = (id: string, change: number) => {
      setAssets(
        assets.map((asset) =>
          asset.id === id ? { ...asset, vulnerability: Math.max(0, asset.vulnerability + change) } : asset
        )
      );
    };

    return (
      <div className="space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { status: 'online', count: assets.filter((a) => a.status === 'online').length, icon: CheckCircle, color: 'text-emerald-300' },
            { status: 'offline', count: assets.filter((a) => a.status === 'offline').length, icon: AlertCircle, color: 'text-slate-400' },
            {
              status: 'compromised',
              count: assets.filter((a) => a.status === 'compromised').length,
              icon: AlertTriangle,
              color: 'text-red-300',
            },
          ].map((stat) => (
            <div key={stat.status} className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
              <p className="text-slate-500 capitalize text-xs mb-1">{stat.status}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Add New Asset */}
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 space-y-2">
          <label className="text-xs text-slate-400 block">Add New Asset</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Hostname (e.g., server-01.corp)"
              value={newAssetHostname}
              onChange={(e) => setNewAssetHostname(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-700/50"
            />
            <input
              type="text"
              placeholder="IP Address (e.g., 10.0.1.50)"
              value={newAssetIP}
              onChange={(e) => setNewAssetIP(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-700/50"
            />
            <input
              type="text"
              placeholder="OS Type (e.g., Linux, Windows Server 2022)"
              value={newAssetOS}
              onChange={(e) => setNewAssetOS(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-700/50"
            />
            <button
              onClick={addAsset}
              className="w-full bg-amber-900/50 hover:bg-amber-900/70 border border-amber-700/50 text-amber-300 px-3 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 transition"
            >
              <Plus className="w-3 h-3" />
              Add Asset
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 flex-1 outline-none focus:border-amber-700/50"
            />
          </div>
        </div>

        {/* Assets List */}
        <div className="space-y-2">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`bg-slate-900/50 border rounded-lg p-3 text-xs ${
                  asset.status === 'compromised'
                    ? 'border-red-700/50'
                    : asset.status === 'offline'
                      ? 'border-slate-700/30'
                      : 'border-emerald-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-slate-200 flex items-center gap-2">
                      {getStatusIcon(asset.status)}
                      {asset.hostname}
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-xs">{asset.ip}</div>
                  </div>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-700/30">
                  {/* OS Type */}
                  <div className="grid grid-cols-1 gap-2 text-slate-500">
                    <div>
                      OS: <span className="text-slate-300">{asset.osType}</span>
                    </div>
                    <div>
                      Last Seen: <span className="text-slate-300 text-xs">{asset.lastSeen}</span>
                    </div>
                  </div>

                  {/* Status Controls */}
                  <div>
                    <p className="text-slate-500 mb-1">Status</p>
                    <div className="flex gap-1">
                      {['online', 'offline', 'compromised'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateAssetStatus(asset.id, status as any)}
                          className={`flex-1 px-2 py-1 rounded text-xs font-bold transition ${
                            asset.status === status
                              ? status === 'online'
                                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                                : status === 'offline'
                                  ? 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                                  : 'bg-red-900/50 text-red-300 border border-red-700/50'
                              : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vulnerability Management */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-500">Vulnerabilities</p>
                      <span
                        className={`text-sm font-bold ${
                          asset.vulnerability > 5
                            ? 'text-red-300'
                            : asset.vulnerability > 2
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                        }`}
                      >
                        {asset.vulnerability}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-800/50 rounded p-1">
                      <button
                        onClick={() => updateVulnerability(asset.id, -1)}
                        className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 p-0.5 rounded transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <div className="flex-1 bg-slate-900/50 rounded h-2">
                        <div
                          className={`h-full rounded transition-all ${
                            asset.vulnerability > 5
                              ? 'bg-red-500'
                              : asset.vulnerability > 2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${(asset.vulnerability / 10) * 100}%` }}
                        />
                      </div>
                      <button
                        onClick={() => updateVulnerability(asset.id, 1)}
                        className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 p-0.5 rounded transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4 text-center text-slate-500">
              {searchTerm ? 'No assets found matching your search.' : 'No assets configured yet.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Inventory Management
  const InventoryMgmt = () => (
    <div className="space-y-3">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
          <p className="text-slate-500">Total Items</p>
          <p className="text-lg font-bold text-blue-300">{inventorySummary.total}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
          <p className="text-slate-500">Hardware</p>
          <p className="text-lg font-bold text-cyan-300">{inventorySummary.hardware}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
          <p className="text-slate-500">Software</p>
          <p className="text-lg font-bold text-purple-300">{inventorySummary.software}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded p-2">
          <p className="text-slate-500">Security</p>
          <p className="text-lg font-bold text-red-300">{inventorySummary.security}</p>
        </div>
      </div>

      {/* Add New Item */}
      <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 space-y-2">
        <label className="text-xs text-slate-400 block">Add New Item</label>
        <input
          type="text"
          placeholder="Item name..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addInventoryItem()}
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-700/50"
        />
        <div className="flex gap-2">
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value as any)}
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-700/50"
          >
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="security">Security</option>
            <option value="supplies">Supplies</option>
          </select>
          <button
            onClick={addInventoryItem}
            className="bg-amber-900/50 hover:bg-amber-900/70 border border-amber-700/50 text-amber-300 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 flex-1 outline-none focus:border-amber-700/50"
          />
        </div>
      </div>

      {/* Inventory List */}
      <div className="space-y-2">
        {filteredInventory.length > 0 ? (
          filteredInventory.map((item) => (
            <div key={item.id} className={`bg-slate-900/50 border rounded-lg p-3 text-xs border-slate-700/30`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-mono text-sm text-slate-200 mb-1">{item.name}</div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getCategoryColor(item.category)}`}>
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-slate-500">Location: {item.location}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeInventoryItem(item.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 rounded transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/30">
                <div>
                  <p className="text-slate-500 mb-1">Quantity</p>
                  <div className="flex items-center gap-1 bg-slate-800/50 rounded p-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 p-0.5 rounded transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="flex-1 text-center font-bold text-slate-300">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 p-0.5 rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Unit</p>
                  <p className="text-slate-300 font-mono">{item.unit}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Last Updated</p>
                  <p className="text-slate-300 text-xs">{item.lastUpdated}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4 text-center text-slate-500">
            No items found matching your search.
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'threatintel', label: 'Threat Intel', icon: Target },
    { id: 'pki', label: 'PKI', icon: Lock },
    { id: 'ids', label: 'IDS/WAF', icon: Network },
    { id: 'rfid', label: 'RFID', icon: Radio },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'assets', label: 'Assets', icon: Shield },
    { id: 'inventory', label: 'Inventory', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/50 to-slate-900/20 border-b border-slate-800/50 backdrop-blur sticky top-0 z-40 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 bg-gradient-to-br from-amber-500 to-red-600 rounded">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-transparent rounded animate-pulse" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold text-amber-300">SECURITY OPS</h1>
              <p className="text-xs text-slate-500">Fusion Center v2.1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'threatintel' && <ThreatIntel />}
        {activeTab === 'pki' && <PKIDashboard />}
        {activeTab === 'ids' && <IDSDashboard />}
        {activeTab === 'rfid' && <RFIDDashboard />}
        {activeTab === 'incidents' && <IncidentMgmt />}
        {activeTab === 'assets' && <AssetTracking />}
        {activeTab === 'inventory' && <InventoryMgmt />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800/50 backdrop-blur px-2 py-2">
        <div className="grid grid-cols-8 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded transition text-xs font-mono ${
                  activeTab === tab.id
                    ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs leading-tight text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SecurityOpsFusionCenter;
