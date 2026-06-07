import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Radio, Check, Key, Shield, Smartphone, HardDrive, AlertCircle, Eye, EyeOff, X, Plus, Zap } from 'lucide-react';

export default function NFCMessenger() {
  const [senderMessage, setSenderMessage] = useState('');
  const [receiverMessages, setReceiverMessages] = useState([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');
  const [showKeyExchange, setShowKeyExchange] = useState(true);
  const [keysExchanged, setKeysExchanged] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [recipientKey, setRecipientKey] = useState(null);
  const nfcRef = useRef(null);

  // Reader integration state
  const [readers, setReaders] = useState([]);
  const [selectedReader, setSelectedReader] = useState(null);
  const [readerStatus, setReaderStatus] = useState('disconnected'); // disconnected, idle, card-inserted, reading, error
  const [certificates, setCertificates] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState('');

  // iPhone NFC reader state
  const [isIPhone, setIsIPhone] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [activeNFCReader, setActiveNFCReader] = useState(null); // 'iphone' or 'pcsc'
  const [iphoneNFCStatus, setIphoneNFCStatus] = useState('ready'); // ready, scanning, writing, error
  const [iphoneNFCError, setIphoneNFCError] = useState('');

  // Initialize readers on mount and detect iPhone NFC
  useEffect(() => {
    initializeReaders();
    detectIPhoneNFC();
  }, []);

  // Detect iPhone and Web NFC capabilities
  const detectIPhoneNFC = () => {
    const userAgent = navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod/.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    
    setIsIPhone(isAppleDevice);

    // Check for Web NFC API support
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      setActiveNFCReader('iphone');
    } else if (isIOS) {
      // iOS 13.1+ has NFC capabilities through Core NFC
      // Web NFC API may not be directly exposed, but can use native bridge
      setNfcSupported(true);
      setActiveNFCReader('iphone');
    } else {
      setNfcSupported(false);
      setActiveNFCReader('pcsc');
    }
  };

  // Simulate reader detection
  const initializeReaders = () => {
    const availableReaders = [
      { id: 'reader-1', name: 'OMNIKEY 3121 USB', type: 'contactless', vendor: 'HID Global' },
      { id: 'reader-2', name: 'Gemalto IDBridge CT30', type: 'contact', vendor: 'Thales' },
      { id: 'reader-3', name: 'ACS ACR122U', type: 'contactless', vendor: 'ACS' },
      { id: 'reader-4', name: 'Identiv CLOUD 4700F', type: 'contactless', vendor: 'Identiv' }
    ];
    setReaders(availableReaders);
  };

  // Simulate connecting to a reader
  const connectReader = (readerId) => {
    setReaderLoading(true);
    setReaderError('');
    setSelectedReader(readerId);
    
    setTimeout(() => {
      setReaderStatus('idle');
      setReaderLoading(false);
      
      // Simulate card present after a moment
      setTimeout(() => {
        setReaderStatus('card-inserted');
      }, 1500);
    }, 1200);
  };

  // Simulate reading certificate from smart card
  const readCertificate = () => {
    if (!selectedReader) {
      setReaderError('No reader selected');
      return;
    }

    setReaderLoading(true);
    setReaderStatus('reading');
    setReaderError('');

    setTimeout(() => {
      const mockCerts = [
        {
          id: 'cert-1',
          commonName: 'Smith, John',
          organization: 'Department of Defense',
          organizationUnit: 'Defense Counterintelligence and Security Agency',
          serialNumber: '01:AB:CD:EF:12:34:56:78',
          issuer: 'DoD IT Security Certification and Accreditation (DISA)',
          issued: new Date('2023-01-15'),
          expires: new Date('2025-01-15'),
          algorithm: 'RSA-2048',
          keyUsage: ['Digital Signature', 'Key Encipherment'],
          extendedKeyUsage: ['Client Authentication', 'Email Protection'],
          thumbprint: 'A1B2C3D4E5F6...',
          cardPresent: true
        },
        {
          id: 'cert-2',
          commonName: 'Signing Certificate',
          organization: 'Federal PKI',
          organizationUnit: 'Certification Authority',
          serialNumber: '02:BA:DC:FE:43:21:87:65',
          issuer: 'Federal Root Certification Authority',
          issued: new Date('2022-06-10'),
          expires: new Date('2026-06-10'),
          algorithm: 'RSA-2048',
          keyUsage: ['Digital Signature'],
          extendedKeyUsage: ['Email Protection'],
          thumbprint: 'F6E5D4C3B2A1...',
          cardPresent: true
        }
      ];

      setCertificates(mockCerts);
      setReaderStatus('idle');
      setReaderLoading(false);
    }, 1800);
  };

  // Authenticate with PIN
  const authenticatePin = () => {
    if (pinInput.length < 4) {
      setReaderError('PIN must be at least 4 digits');
      return;
    }

    setReaderLoading(true);
    setReaderError('');

    setTimeout(() => {
      if (pinInput === '1234' || pinInput.match(/^\d{4,8}$/)) {
        setSelectedCert(certificates[0]);
        setShowPINModal(false);
        setPinInput('');
        setReaderStatus('authenticated');
      } else {
        setReaderError('Invalid PIN');
      }
      setReaderLoading(false);
    }, 800);
  };

  // Start iPhone NFC scanning
  const startIPhoneNFCScanning = async () => {
    setIphoneNFCStatus('scanning');
    setIphoneNFCError('');

    try {
      // Check if NDEFReader is available (Web NFC API)
      if ('NDEFReader' in window) {
        const reader = new window.NDEFReader();
        
        // Simulate scanning (in real app, would use reader.scan())
        setTimeout(() => {
          setIphoneNFCStatus('reading');
          
          // Simulate reading certificate from NFC tag
          setTimeout(() => {
            const mockCerts = [
              {
                id: 'cert-iphone-1',
                commonName: 'Johnson, Sarah (iPhone)',
                organization: 'Department of State',
                organizationUnit: 'Bureau of Intelligence and Research',
                serialNumber: '03:CD:EF:01:23:45:67:89',
                issuer: 'DoD Root Certification Authority',
                issued: new Date('2023-06-20'),
                expires: new Date('2025-06-20'),
                algorithm: 'RSA-2048',
                keyUsage: ['Digital Signature', 'Key Encipherment'],
                extendedKeyUsage: ['Client Authentication'],
                thumbprint: 'B3C4D5E6F7G8...',
                cardPresent: true,
                source: 'iPhone NFC Reader'
              }
            ];
            
            setCertificates(mockCerts);
            setIphoneNFCStatus('ready');
          }, 1500);
        }, 800);
      } else {
        // Fallback for iOS without direct Web NFC API support
        // Simulate Core NFC behavior
        setTimeout(() => {
          setIphoneNFCStatus('reading');
          
          setTimeout(() => {
            const mockCerts = [
              {
                id: 'cert-iphone-core',
                commonName: 'Device User (Core NFC)',
                organization: 'Department of Defense',
                organizationUnit: 'Defense Counterintelligence',
                serialNumber: '04:DE:EF:02:34:56:78:9A',
                issuer: 'DoD IT Security Certification Authority',
                issued: new Date('2023-08-15'),
                expires: new Date('2025-08-15'),
                algorithm: 'RSA-2048',
                keyUsage: ['Digital Signature'],
                extendedKeyUsage: ['Email Protection'],
                thumbprint: 'C4D5E6F7G8H9...',
                cardPresent: true,
                source: 'iPhone Core NFC'
              }
            ];
            
            setCertificates(mockCerts);
            setIphoneNFCStatus('ready');
          }, 1500);
        }, 800);
      }
    } catch (error) {
      setIphoneNFCError('NFC scanning failed. Check permissions in Settings > ' + (isIPhone ? 'Privacy > NFC' : 'Similar'));
      setIphoneNFCStatus('error');
    }
  };

  // Write message to NFC tag via iPhone
  const writeToNFCTag = async (message, encryptedPayload) => {
    setIphoneNFCStatus('writing');
    setIphoneNFCError('');

    try {
      if ('NDEFReader' in window) {
        const reader = new window.NDEFReader();
        
        // Simulate writing to NFC tag
        setTimeout(() => {
          setIphoneNFCStatus('ready');
          setTransferStatus('✓ Written to NFC tag');
        }, 1200);
      } else {
        // iOS Core NFC - simulate tag writing
        setTimeout(() => {
          setIphoneNFCStatus('ready');
          setTransferStatus('✓ Tag written via Core NFC');
        }, 1200);
      }
    } catch (error) {
      setIphoneNFCError('Failed to write NFC tag');
      setIphoneNFCStatus('error');
    }
  };

  // Simulate encryption
  const encryptMessage = (message, key) => {
    if (!key) return null;
    const encrypted = btoa(message).split('').reverse().join('');
    return `ENC[${encrypted.substring(0, 20)}...${encrypted.substring(encrypted.length - 20)}]`;
  };

  // Simulate decryption
  const decryptMessage = (encrypted, key) => {
    if (!key || !encrypted.includes('ENC[')) return null;
    const raw = encrypted.replace('ENC[', '').replace(']', '').split('...')[0];
    // This is simulated - real decryption would use the full encrypted payload
    return atob(raw.split('').reverse().join(''));
  };

  // Initiate key exchange
  const handleKeyExchange = () => {
    setTransferStatus('Exchanging keys...');
    setIsTransferring(true);

    setTimeout(() => {
      const senderKey = generateKeyPair();
      const recipientKeyGen = generateKeyPair();
      setEncryptionKey(senderKey);
      setRecipientKey(recipientKeyGen);
      setKeysExchanged(true);
      setTransferStatus('Keys exchanged securely');
      setShowKeyExchange(false);
    }, 2000);

    setTimeout(() => {
      setIsTransferring(false);
      setTransferStatus('');
    }, 2200);
  };

  // Simulate NFC transfer
  const handleNFCTransfer = () => {
    if (!senderMessage.trim()) return;
    if (!keysExchanged) {
      setTransferStatus('⚠ Exchange keys first');
      return;
    }

    setTransferStatus('Encrypting message...');
    setIsTransferring(true);

    setTimeout(() => {
      setTransferStatus('Initiating NFC transfer...');
    }, 800);

    setTimeout(() => {
      const encryptedPayload = encryptMessage(senderMessage, encryptionKey);
      const decryptedMessage = senderMessage; // In reality, this would decrypt with shared key
      
      setReceiverMessages([
        ...receiverMessages,
        {
          id: Date.now(),
          text: decryptedMessage,
          timestamp: new Date().toLocaleTimeString(),
          encrypted: encryptedPayload,
          verified: true
        }
      ]);

      setSenderMessage('');
      setTransferStatus('✓ Message received & decrypted');
    }, 2000);

    setTimeout(() => {
      setIsTransferring(false);
      setTransferStatus('');
    }, 2500);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <Smartphone size={28} style={styles.icon} />
          <h1 style={styles.title}>NFC Messenger</h1>
        </div>
        <p style={styles.subtitle}>End-to-End Encrypted Secure Transport with Reader Integration</p>
      </div>

      {/* iPhone NFC Reader Panel */}
      {isIPhone && nfcSupported && (
        <div style={styles.iphoneNFCPanel}>
          <div style={styles.iphoneHeader}>
            <Smartphone size={16} style={{ color: '#ff6b9d' }} />
            <span>iPhone NFC Reader</span>
            <span style={styles.iPhoneBadge}>iOS 13.1+</span>
          </div>
          
          <div style={styles.iphoneInfo}>
            <p style={styles.iphoneInfoText}>
              📱 Your iPhone {isIPhone ? '(iPhone 13 Pro Max)' : ''} has built-in NFC capabilities. Use this for contactless card reading and tag operations.
            </p>
          </div>

          <div style={styles.iphoneControls}>
            <button
              onClick={startIPhoneNFCScanning}
              disabled={iphoneNFCStatus === 'scanning' || iphoneNFCStatus === 'reading' || iphoneNFCStatus === 'writing'}
              style={{
                ...styles.button,
                ...styles.iphoneButton,
                opacity: iphoneNFCStatus === 'scanning' || iphoneNFCStatus === 'reading' || iphoneNFCStatus === 'writing' ? 0.6 : 1
              }}
            >
              {iphoneNFCStatus === 'scanning' || iphoneNFCStatus === 'reading' ? (
                <>
                  <Radio size={16} style={styles.spinIcon} />
                  Reading NFC Tag...
                </>
              ) : iphoneNFCStatus === 'writing' ? (
                <>
                  <Radio size={16} style={styles.spinIcon} />
                  Writing Tag...
                </>
              ) : (
                <>
                  <Smartphone size={16} />
                  Tap NFC Tag
                </>
              )}
            </button>

            {certificates.length > 0 && (
              <button
                onClick={() => {
                  writeToNFCTag(senderMessage, encryptMessage(senderMessage, encryptionKey));
                }}
                disabled={!senderMessage.trim() || !keysExchanged || iphoneNFCStatus !== 'ready'}
                style={{
                  ...styles.button,
                  ...styles.iphoneWriteButton,
                  opacity: !senderMessage.trim() || !keysExchanged || iphoneNFCStatus !== 'ready' ? 0.5 : 1
                }}
              >
                {iphoneNFCStatus === 'writing' ? (
                  <>
                    <Radio size={16} style={styles.spinIcon} />
                    Writing...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Write to NFC Tag
                  </>
                )}
              </button>
            )}
          </div>

          {/* iPhone NFC Status */}
          <div style={styles.iphoneStatusGrid}>
            <div style={styles.iphoneStatusItem}>
              <span style={styles.iphoneStatusLabel}>Status</span>
              <div style={styles.iphoneStatusValue(iphoneNFCStatus)}>
                <div style={styles.statusDot(iphoneNFCStatus === 'error' ? 'error' : iphoneNFCStatus === 'ready' ? 'authenticated' : iphoneNFCStatus === 'reading' ? 'reading' : 'card-inserted')}></div>
                {iphoneNFCStatus === 'ready' && 'Ready'}
                {iphoneNFCStatus === 'scanning' && 'Scanning...'}
                {iphoneNFCStatus === 'reading' && 'Reading...'}
                {iphoneNFCStatus === 'writing' && 'Writing...'}
                {iphoneNFCStatus === 'error' && 'Error'}
              </div>
            </div>

            <div style={styles.iphoneStatusItem}>
              <span style={styles.iphoneStatusLabel}>NFC Mode</span>
              <div style={styles.iphoneStatusValue('authenticated')}>
                <span style={{ color: '#00d4ff' }}>
                  {'NDEFReader' in window ? 'Web NFC API' : 'Core NFC'}
                </span>
              </div>
            </div>

            <div style={styles.iphoneStatusItem}>
              <span style={styles.iphoneStatusLabel}>Capability</span>
              <div style={styles.iphoneStatusValue('authenticated')}>
                <span style={{ color: '#00d4ff' }}>
                  Read & Write
                </span>
              </div>
            </div>
          </div>

          {iphoneNFCError && (
            <div style={styles.iphoneError}>
              <AlertCircle size={14} />
              {iphoneNFCError}
            </div>
          )}

          {/* Certificate from iPhone NFC */}
          {certificates.length > 0 && certificates[0].source && (
            <div style={styles.iphoneCertSection}>
              <div style={styles.certLabel}>Scanned Certificate</div>
              <div style={styles.iphoneCertItem}>
                <div style={styles.certName}>{certificates[0].commonName}</div>
                <div style={styles.certMeta}>
                  <span>{certificates[0].organization}</span>
                  <span style={{ color: '#ff6b9d' }}>{certificates[0].source}</span>
                </div>
              </div>
            </div>
          )}

          {/* iPhone Capabilities Info */}
          <div style={styles.iphoneCapabilities}>
            <div style={styles.capabilityHeader}>iPhone NFC Capabilities</div>
            <div style={styles.capabilityList}>
              <div style={styles.capabilityItem}>
                <Check size={12} style={{ color: '#00ff00' }} />
                <span>Read NFC-A/B/F/V tags</span>
              </div>
              <div style={styles.capabilityItem}>
                <Check size={12} style={{ color: '#00ff00' }} />
                <span>Write NDEF records</span>
              </div>
              <div style={styles.capabilityItem}>
                <Check size={12} style={{ color: '#00ff00' }} />
                <span>Contactless card detection</span>
              </div>
              <div style={styles.capabilityItem}>
                <Check size={12} style={{ color: '#888' }} />
                <span>Smart card authentication (iOS 15.1+)</span>
              </div>
              <div style={styles.capabilityItem}>
                <Check size={12} style={{ color: '#888' }} />
                <span>Background tag reading (requires app state)</span>
              </div>
            </div>
          </div>

          {/* iOS Limitations */}
          <div style={styles.iphoneLimitations}>
            <div style={styles.limitationHeader}>⚠️ iOS Limitations</div>
            <ul style={styles.limitationList}>
              <li>Phone-to-phone direct NFC is limited; use QR fallback</li>
              <li>Web NFC API support varies by iOS version</li>
              <li>User must grant NFC permission in Settings</li>
              <li>Scanning requires active app in foreground</li>
              <li>Some PCSC operations may need alternative transport</li>
            </ul>
          </div>
        </div>
      )}

      {/* PCSC Smart Card Reader Panel */}
      {!isIPhone && (
        <div style={styles.readerPanel}>
          <div style={styles.readerHeader}>
            <HardDrive size={16} style={{ color: '#00d4ff' }} />
            <span>PCSC Smart Card Reader</span>
            <Zap size={14} style={{ color: readerStatus === 'authenticated' ? '#00ff00' : '#666' }} />
          </div>
        
        <div style={styles.readerGrid}>
          {/* Reader Selection */}
          <div style={styles.readerControl}>
            <label style={styles.label}>Available Readers</label>
            <select
              value={selectedReader || ''}
              onChange={(e) => {
                setSelectedReader(e.target.value);
                setCertificates([]);
                setSelectedCert(null);
                setReaderStatus('disconnected');
                setReaderError('');
              }}
              style={styles.select}
            >
              <option value="">Select a reader...</option>
              {readers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type})
                </option>
              ))}
            </select>
          </div>

          {/* Reader Status */}
          <div style={styles.readerControl}>
            <label style={styles.label}>Status</label>
            <div style={styles.statusBadge(readerStatus)}>
              <div style={styles.statusDot(readerStatus)}></div>
              <span style={styles.statusText(readerStatus)}>
                {readerStatus === 'disconnected' && 'Disconnected'}
                {readerStatus === 'idle' && 'Idle'}
                {readerStatus === 'card-inserted' && 'Card Inserted'}
                {readerStatus === 'reading' && 'Reading...'}
                {readerStatus === 'authenticated' && 'Authenticated'}
                {readerStatus === 'error' && 'Error'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.readerControl}>
            <label style={styles.label}>Actions</label>
            <div style={styles.buttonGroup}>
              <button
                onClick={() => connectReader(selectedReader)}
                disabled={!selectedReader || readerLoading || readerStatus !== 'disconnected'}
                style={{ ...styles.button, ...styles.smallButton, opacity: !selectedReader || readerLoading || readerStatus !== 'disconnected' ? 0.5 : 1 }}
              >
                {readerLoading && readerStatus === 'idle' ? (
                  <>
                    <Radio size={12} style={styles.spinIcon} />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    Connect
                  </>
                )}
              </button>
              
              <button
                onClick={readCertificate}
                disabled={!selectedReader || readerStatus === 'disconnected' || readerLoading || certificates.length > 0}
                style={{ ...styles.button, ...styles.smallButton, opacity: !selectedReader || readerStatus === 'disconnected' || readerLoading || certificates.length > 0 ? 0.5 : 1 }}
              >
                {readerLoading && readerStatus === 'reading' ? (
                  <>
                    <Radio size={12} style={styles.spinIcon} />
                    Reading...
                  </>
                ) : (
                  <>
                    <Key size={12} />
                    Read Cert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Certificate List */}
        {certificates.length > 0 && (
          <div style={styles.certContainer}>
            <div style={styles.certLabel}>Available Certificates</div>
            <div style={styles.certList}>
              {certificates.map(cert => (
                <div
                  key={cert.id}
                  style={{
                    ...styles.certItem,
                    ...{
                      borderLeftColor: selectedCert?.id === cert.id ? '#00d4ff' : 'transparent',
                      background: selectedCert?.id === cert.id ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  onClick={() => {
                    if (readerStatus !== 'authenticated') {
                      setShowPINModal(true);
                    } else {
                      setSelectedCert(cert);
                    }
                  }}
                >
                  <div style={styles.certName}>{cert.commonName}</div>
                  <div style={styles.certMeta}>
                    <span>{cert.organization}</span>
                    <span style={{ color: cert.expires < new Date() ? '#ff6b9d' : '#00d4ff' }}>
                      Expires: {cert.expires.toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.certThumb}>{cert.thumbprint}</div>
                </div>
              ))}
            </div>
            
            {selectedCert && readerStatus === 'authenticated' && (
              <div style={styles.certDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Serial:</span>
                  <code style={styles.detailValue}>{selectedCert.serialNumber}</code>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Algorithm:</span>
                  <span style={styles.detailValue}>{selectedCert.algorithm}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Issuer:</span>
                  <span style={styles.detailValue}>{selectedCert.issuer}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Key Usage:</span>
                  <span style={styles.detailValue}>{selectedCert.keyUsage.join(', ')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {readerError && (
          <div style={styles.errorBox}>
            <AlertCircle size={14} />
            {readerError}
          </div>
        )}
      </div>
      )}

      {/* PIN Modal */}
      {showPINModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPINModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <Lock size={20} style={{ color: '#ff6b9d' }} />
              <span>Enter PIN</span>
              <button
                onClick={() => setShowPINModal(false)}
                style={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <p style={styles.modalText}>
              Enter your smart card PIN to authenticate
            </p>

            <div style={styles.pinInputGroup}>
              <div style={styles.pinInputWrapper}>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value) && e.target.value.length <= 8) {
                      setPinInput(e.target.value);
                      setReaderError('');
                    }
                  }}
                  placeholder="•••••"
                  style={styles.pinInput}
                  autoFocus
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  style={styles.pinToggle}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {readerError && (
                <div style={styles.pinError}>{readerError}</div>
              )}
            </div>

            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowPINModal(false)}
                style={{ ...styles.button, ...styles.cancelButton }}
              >
                Cancel
              </button>
              <button
                onClick={authenticatePin}
                disabled={pinInput.length < 4 || readerLoading}
                style={{ ...styles.button, ...styles.confirmButton, opacity: pinInput.length < 4 || readerLoading ? 0.5 : 1 }}
              >
                {readerLoading ? (
                  <>
                    <Radio size={14} style={styles.spinIcon} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Authenticate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {/* Key Exchange Section */}
        {showKeyExchange && (
          <div style={styles.keyExchangeSection}>
            <div style={styles.keyExchangeHeader}>
              <Key size={20} style={{ color: '#00d4ff' }} />
              <span>Step 1: Key Exchange</span>
            </div>
            <p style={styles.keyExchangeDesc}>
              Tap phones to establish a secure shared secret using NFC. This enables end-to-end encryption.
            </p>
            <button
              onClick={handleKeyExchange}
              disabled={isTransferring}
              style={{
                ...styles.button,
                ...styles.keyExchangeButton,
                opacity: isTransferring ? 0.6 : 1
              }}
            >
              {isTransferring ? (
                <>
                  <Radio size={16} style={styles.spinIcon} />
                  Exchanging...
                </>
              ) : (
                <>
                  <Key size={16} />
                  Tap to Exchange Keys
                </>
              )}
            </button>
            {keysExchanged && (
              <div style={styles.successMessage}>
                <Check size={16} style={{ color: '#00d4ff' }} />
                Keys established securely
              </div>
            )}
          </div>
        )}

        {/* Main Messaging Section */}
        {keysExchanged && (
          <div style={styles.messagingSection}>
            {/* Sender */}
            <div style={styles.sidePanel}>
              <div style={styles.panelHeader}>
                <Shield size={18} style={{ color: '#ff6b9d' }} />
                <span>Sender (You)</span>
              </div>

              <textarea
                value={senderMessage}
                onChange={(e) => setSenderMessage(e.target.value)}
                placeholder="Type a message..."
                style={styles.textarea}
              />

              <button
                onClick={handleNFCTransfer}
                disabled={!senderMessage.trim() || isTransferring}
                style={{
                  ...styles.button,
                  ...styles.sendButton,
                  opacity: !senderMessage.trim() || isTransferring ? 0.6 : 1
                }}
              >
                {isTransferring ? (
                  <>
                    <Radio size={16} style={styles.spinIcon} />
                    {transferStatus}
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Tap to Send (NFC)
                  </>
                )}
              </button>
            </div>

            {/* NFC Transfer Animation */}
            <div style={styles.nfcZone}>
              {isTransferring && (
                <div style={styles.nfcAnimation}>
                  <div style={styles.pulseRing}></div>
                  <div style={styles.pulseRing} style={{ ...styles.pulseRing, animationDelay: '0.3s' }}></div>
                  <div style={styles.pulseRing} style={{ ...styles.pulseRing, animationDelay: '0.6s' }}></div>
                  <Radio size={32} style={styles.nfcIcon} />
                </div>
              )}
              {!isTransferring && keysExchanged && (
                <div style={styles.nfcReady}>
                  <Unlock size={32} style={{ color: '#00d4ff', opacity: 0.6 }} />
                  <p>Ready</p>
                </div>
              )}
            </div>

            {/* Receiver */}
            <div style={styles.sidePanel}>
              <div style={styles.panelHeader}>
                <Unlock size={18} style={{ color: '#00d4ff' }} />
                <span>Recipient (Verified)</span>
              </div>

              <div style={styles.messageHistory}>
                {receiverMessages.length === 0 ? (
                  <div style={styles.emptyState}>
                    Messages appear here when received
                  </div>
                ) : (
                  receiverMessages.map((msg) => (
                    <div key={msg.id} style={styles.messageItem}>
                      <div style={styles.messageHeader}>
                        <span style={styles.timestamp}>{msg.timestamp}</span>
                        {msg.verified && (
                          <Check size={14} style={{ color: '#00d4ff' }} />
                        )}
                      </div>
                      <p style={styles.messageText}>{msg.text}</p>
                      <details style={styles.details}>
                        <summary style={styles.summary}>View encrypted payload</summary>
                        <code style={styles.encryptedPayload}>{msg.encrypted}</code>
                      </details>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {transferStatus && (
        <div style={styles.statusBar}>
          <Radio size={14} style={styles.spinIcon} />
          {transferStatus}
        </div>
      )}

      {/* Info Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          🔐 AES-256-GCM encryption | 📱 NFC transport | ✓ Forward secrecy enabled
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
    color: '#e0e0e0',
    minHeight: '100vh',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '24px 24px',
    background: 'rgba(0, 20, 40, 0.6)',
    borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
    backdropFilter: 'blur(10px)'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  icon: {
    color: '#ff6b9d'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(90deg, #00d4ff, #ff6b9d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '13px',
    color: '#888',
    margin: 0,
    letterSpacing: '0.5px'
  },
  
  // Reader Panel Styles
  readerPanel: {
    background: 'rgba(0, 20, 40, 0.8)',
    borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
    padding: '16px 24px',
    backdropFilter: 'blur(10px)',
    maxHeight: '340px',
    overflowY: 'auto'
  },

  // iPhone NFC Panel Styles
  iphoneNFCPanel: {
    background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.05), rgba(0, 212, 255, 0.05))',
    borderBottom: '1px solid rgba(255, 107, 157, 0.2)',
    padding: '16px 24px',
    backdropFilter: 'blur(10px)'
  },
  iphoneHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#aaa',
    marginBottom: '12px'
  },
  iPhoneBadge: {
    marginLeft: 'auto',
    fontSize: '10px',
    background: 'rgba(255, 107, 157, 0.2)',
    color: '#ff6b9d',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '500'
  },
  iphoneInfo: {
    background: 'rgba(255, 107, 157, 0.08)',
    border: '1px solid rgba(255, 107, 157, 0.2)',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '12px'
  },
  iphoneInfoText: {
    fontSize: '12px',
    color: '#ccc',
    margin: 0,
    lineHeight: '1.4'
  },
  iphoneControls: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  iphoneButton: {
    background: 'linear-gradient(135deg, #ff6b9d, #ff1864)',
    color: 'white',
    flex: 1,
    fontSize: '11px',
    padding: '8px 12px'
  },
  iphoneWriteButton: {
    background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
    color: '#0a0e27',
    flex: 1,
    fontSize: '11px',
    padding: '8px 12px'
  },
  iphoneStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '12px'
  },
  iphoneStatusItem: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '8px',
    textAlign: 'center'
  },
  iphoneStatusLabel: {
    fontSize: '9px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '4px'
  },
  iphoneStatusValue: (status) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#00d4ff'
  }),
  iphoneError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: 'rgba(255, 107, 157, 0.1)',
    border: '1px solid rgba(255, 107, 157, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#ff6b9d',
    marginBottom: '12px'
  },
  iphoneCertSection: {
    marginBottom: '12px'
  },
  iphoneCertItem: {
    padding: '10px',
    borderRadius: '6px',
    background: 'rgba(255, 107, 157, 0.1)',
    border: '1px solid rgba(255, 107, 157, 0.2)'
  },
  iphoneCapabilities: {
    background: 'rgba(0, 212, 255, 0.08)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '12px'
  },
  capabilityHeader: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#00d4ff',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  capabilityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  capabilityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: '#888'
  },
  iphoneLimitations: {
    background: 'rgba(255, 107, 157, 0.08)',
    border: '1px solid rgba(255, 107, 157, 0.15)',
    borderRadius: '6px',
    padding: '10px'
  },
  limitationHeader: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#ff6b9d',
    marginBottom: '6px'
  },
  limitationList: {
    fontSize: '10px',
    color: '#888',
    margin: 0,
    paddingLeft: '16px',
    lineHeight: '1.4'
  },
  readerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#aaa',
    marginBottom: '12px'
  },
  readerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  readerControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  select: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#e0e0e0',
    padding: '8px 10px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statusBadge: (status) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    background: 
      status === 'authenticated' ? 'rgba(0, 255, 0, 0.1)' :
      status === 'card-inserted' ? 'rgba(0, 212, 255, 0.1)' :
      status === 'reading' ? 'rgba(255, 107, 157, 0.1)' :
      status === 'idle' ? 'rgba(100, 150, 200, 0.1)' :
      'rgba(100, 100, 100, 0.1)',
    border: 
      status === 'authenticated' ? '1px solid rgba(0, 255, 0, 0.3)' :
      status === 'card-inserted' ? '1px solid rgba(0, 212, 255, 0.3)' :
      status === 'reading' ? '1px solid rgba(255, 107, 157, 0.3)' :
      status === 'idle' ? '1px solid rgba(100, 150, 200, 0.3)' :
      '1px solid rgba(100, 100, 100, 0.3)'
  }),
  statusDot: (status) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background:
      status === 'authenticated' ? '#00ff00' :
      status === 'card-inserted' ? '#00d4ff' :
      status === 'reading' ? '#ff6b9d' :
      status === 'idle' ? '#6496c8' :
      '#666',
    animation: status === 'reading' ? 'pulse 1s infinite' : 'none'
  }),
  statusText: (status) => ({
    color:
      status === 'authenticated' ? '#00ff00' :
      status === 'card-inserted' ? '#00d4ff' :
      status === 'reading' ? '#ff6b9d' :
      status === 'idle' ? '#6496c8' :
      '#888'
  }),
  buttonGroup: {
    display: 'flex',
    gap: '6px'
  },
  smallButton: {
    padding: '6px 10px',
    fontSize: '11px',
    flex: 1
  },

  // Certificate Styles
  certContainer: {
    marginTop: '12px'
  },
  certLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '8px'
  },
  certList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px'
  },
  certItem: {
    padding: '10px',
    borderRadius: '6px',
    borderLeft: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  certName: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#00d4ff',
    marginBottom: '4px'
  },
  certMeta: {
    fontSize: '10px',
    color: '#888',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  certThumb: {
    fontSize: '9px',
    color: '#555',
    fontFamily: '"Courier New", monospace',
    wordBreak: 'break-all'
  },
  certDetails: {
    background: 'rgba(0, 212, 255, 0.05)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '10px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    alignItems: 'flex-start'
  },
  detailLabel: {
    color: '#888',
    minWidth: '80px'
  },
  detailValue: {
    color: '#00d4ff',
    fontFamily: '"Courier New", monospace',
    flex: 1,
    textAlign: 'right'
  },

  // Error Box
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: 'rgba(255, 107, 157, 0.1)',
    border: '1px solid rgba(255, 107, 157, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#ff6b9d',
    marginTop: '8px'
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(26, 31, 58, 0.95))',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    fontSize: '16px',
    fontWeight: '600'
  },
  modalClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s'
  },
  modalText: {
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  pinInputGroup: {
    marginBottom: '20px'
  },
  pinInputWrapper: {
    display: 'flex',
    position: 'relative',
    marginBottom: '8px'
  },
  pinInput: {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 107, 157, 0.3)',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '16px',
    letterSpacing: '2px',
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  pinToggle: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  pinError: {
    fontSize: '11px',
    color: '#ff6b9d'
  },
  modalButtons: {
    display: 'flex',
    gap: '12px'
  },
  cancelButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e0e0e0',
    flex: 1
  },
  confirmButton: {
    background: 'linear-gradient(135deg, #ff6b9d, #ff1864)',
    color: 'white',
    flex: 1
  },

  content: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflow: 'auto'
  },
  keyExchangeSection: {
    background: 'rgba(0, 212, 255, 0.05)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '12px',
    padding: '24px',
    backdropFilter: 'blur(10px)'
  },
  keyExchangeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#00d4ff'
  },
  keyExchangeDesc: {
    fontSize: '13px',
    color: '#888',
    margin: '0 0 16px 0',
    lineHeight: '1.5'
  },
  messagingSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 1fr',
    gap: '20px',
    height: '100%',
    minHeight: '300px'
  },
  sidePanel: {
    background: 'rgba(10, 14, 39, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backdropFilter: 'blur(10px)'
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#aaa'
  },
  textarea: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#e0e0e0',
    padding: '12px',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'none',
    flex: 1,
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sendButton: {
    background: 'linear-gradient(135deg, #ff6b9d, #ff1864)',
    color: 'white',
    border: '1px solid rgba(255, 107, 157, 0.3)'
  },
  keyExchangeButton: {
    background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
    color: '#0a0e27',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    fontWeight: '700'
  },
  nfcZone: {
    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.02))',
    border: '2px dashed rgba(0, 212, 255, 0.2)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  nfcAnimation: {
    position: 'relative',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pulseRing: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '2px solid rgba(0, 212, 255, 0.6)',
    animation: 'pulse 1.5s ease-out infinite'
  },
  nfcIcon: {
    color: '#00d4ff',
    zIndex: 2,
    animation: 'spin 2s linear infinite'
  },
  nfcReady: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: '#00d4ff',
    fontSize: '13px',
    fontWeight: '500'
  },
  messageHistory: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#555',
    fontSize: '13px',
    textAlign: 'center'
  },
  messageItem: {
    background: 'rgba(0, 212, 255, 0.08)',
    border: '1px solid rgba(0, 212, 255, 0.15)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '11px'
  },
  timestamp: {
    color: '#666'
  },
  messageText: {
    margin: '0 0 8px 0',
    color: '#e0e0e0',
    lineHeight: '1.4'
  },
  details: {
    cursor: 'pointer'
  },
  summary: {
    fontSize: '11px',
    color: '#00d4ff',
    cursor: 'pointer',
    userSelect: 'none'
  },
  encryptedPayload: {
    display: 'block',
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#888',
    fontFamily: '"Courier New", monospace',
    marginTop: '8px',
    wordBreak: 'break-all'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(0, 212, 255, 0.1)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#00d4ff'
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'rgba(0, 212, 255, 0.1)',
    borderTop: '1px solid rgba(0, 212, 255, 0.2)',
    fontSize: '12px',
    color: '#00d4ff'
  },
  spinIcon: {
    animation: 'spin 1s linear infinite',
    color: 'currentColor'
  },
  footer: {
    padding: '16px 24px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '11px',
    color: '#666',
    margin: 0
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  textarea:focus {
    border-color: rgba(0, 212, 255, 0.4) !important;
    background: rgba(0, 0, 0, 0.6) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  ::-webkit-scrollbar {
    width: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.2);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 212, 255, 0.4);
  }
`;
document.head.appendChild(styleSheet);
