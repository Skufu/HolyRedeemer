import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseQRScannerOptions {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export const useQRScanner = ({ onScan, onError }: UseQRScannerOptions) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementIdRef = useRef<string>('');

  const startScanning = useCallback(async (elementId: string) => {
    if (isScanning) return;

    elementIdRef.current = elementId;
    
    try {
      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // QR code not found in frame - ignore
        }
      );

      setIsScanning(true);
      setHasPermission(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
        setHasPermission(false);
        onError?.(errorMessage);
      }
  }, [isScanning, onScan, onError]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  }, [isScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return {
    isScanning,
    hasPermission,
    startScanning,
    stopScanning,
  };
};
