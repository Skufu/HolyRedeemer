import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseQRScannerOptions {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  /** If true, scanner stays open after a scan (for scanning multiple items) */
  continuous?: boolean;
  /** Debounce time in ms to prevent duplicate scans of the same code */
  debounceMs?: number;
}

export const useQRScanner = ({
  onScan,
  onError,
  continuous = false,
  debounceMs = 2000,
}: UseQRScannerOptions) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScanCodeRef = useRef<string>('');
  const isMountedRef = useRef(true);

  const startScanning = useCallback(async (elementId: string) => {
    if (isScanning) return;

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
          const now = Date.now();
          // Debounce: skip if same code was scanned recently
          if (
            decodedText === lastScanCodeRef.current &&
            now - lastScanTimeRef.current < debounceMs
          ) {
            return;
          }

          lastScanTimeRef.current = now;
          lastScanCodeRef.current = decodedText;
          setLastScannedCode(decodedText);
          onScan(decodedText);

          // If not continuous mode, auto-stop after scan
          if (!continuous && scannerRef.current) {
            scannerRef.current
              .stop()
              .then(() => {
                scannerRef.current?.clear();
                scannerRef.current = null;
                if (isMountedRef.current) {
                  setIsScanning(false);
                }
              })
              .catch(() => {
                scannerRef.current = null;
                if (isMountedRef.current) {
                  setIsScanning(false);
                }
              });
          }
        },
        () => {
          // QR code not found in frame - ignore
        },
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start scanner';
      setHasPermission(false);
      onError?.(errorMessage);
    }
  }, [isScanning, onScan, onError, continuous, debounceMs]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore errors during stop
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const resetLastScan = useCallback(() => {
    setLastScannedCode(null);
    lastScanCodeRef.current = '';
    lastScanTimeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return {
    isScanning,
    hasPermission,
    lastScannedCode,
    startScanning,
    stopScanning,
    resetLastScan,
  };
};
