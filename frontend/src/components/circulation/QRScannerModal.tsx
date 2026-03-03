import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle2,
  QrCode,
} from 'lucide-react';
import { useQRScanner } from '@/hooks/useQRScanner';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { scaleVariants, pulseRingVariants, slideUpVariants } from '@/lib/animations';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (qrCode: string) => void;
  title?: string;
  description?: string;
  /** If true, keeps scanning after each code detected (for multi-book scanning) */
  continuous?: boolean;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onClose,
  onScan,
  title = 'Scan QR Code',
  description = 'Position the QR code within the scanner frame',
  continuous = false,
}) => {
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanFlash, setLastScanFlash] = useState(false);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const {
    isScanning,
    hasPermission,
    startScanning,
    stopScanning,
    resetLastScan,
  } = useQRScanner({
    continuous,
    onScan: (decodedText) => {
      if (continuous) {
        // In continuous mode, accumulate codes and flash success
        setScannedCodes((prev) => {
          if (prev.includes(decodedText)) return prev;
          return [...prev, decodedText];
        });
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }
        setLastScanFlash(true);
        flashTimeoutRef.current = setTimeout(() => setLastScanFlash(false), 600);
        onScan(decodedText);
      } else {
        // Single scan mode: flash and close
        setScannedCodes([decodedText]);
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }
        setLastScanFlash(true);
        flashTimeoutRef.current = setTimeout(() => {
          onScan(decodedText);
          onClose();
        }, 600);
      }
    },
    onError: (error) => {
      setScanError(error);
    },
  });

  useEffect(() => {
    if (open) {
      setScannedCodes([]);
      setScanError(null);
      setLastScanFlash(false);
      resetLastScan();
      // Small delay to ensure DOM is ready
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
      startTimeoutRef.current = setTimeout(() => {
        startScanning('qr-reader');
      }, 150);
    } else {
      stopScanning();
    }
    return () => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  }, []);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Scanner Container */}
          <motion.div
            ref={scannerContainerRef}
            className="relative w-full aspect-square max-w-[300px] rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30"
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={scaleVariants}
          >
            <div id="qr-reader" className="w-full h-full" />

            {/* Scanning overlay */}
            <AnimatePresence>
              {isScanning && !lastScanFlash && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="absolute inset-0 border-2 border-primary/50 rounded-lg"
                    animate={{
                      borderColor: [
                        'rgba(var(--primary), 0.5)',
                        'rgba(var(--primary), 0.8)',
                        'rgba(var(--primary), 0.5)',
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg"
                    variants={pulseRingVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scan success flash */}
            <AnimatePresence>
              {lastScanFlash && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-green-500/20 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                    }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Status Messages */}
          {hasPermission === false && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              Camera access denied. Please enable camera permissions.
            </div>
          )}

          {scanError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {scanError}
            </div>
          )}

          {/* Scanned codes list (continuous mode) */}
          {continuous && scannedCodes.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                Scanned ({scannedCodes.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {scannedCodes.map((code) => (
                  <Badge
                    key={code}
                    variant="secondary"
                    className="text-xs font-mono"
                  >
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Single scan result */}
          {!continuous && scannedCodes.length > 0 && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Scanned: {scannedCodes[0]}
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            {isScanning ? (
              <p className="flex items-center gap-2 justify-center">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {continuous
                  ? 'Scanning... Point at each QR code'
                  : 'Scanning... Hold the QR code steady'}
              </p>
            ) : (
              <p>Click Start to begin scanning</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {continuous && scannedCodes.length > 0 ? 'Done' : 'Cancel'}
            </Button>
            {!isScanning ? (
              <Button
                onClick={() => startScanning('qr-reader')}
                className="flex-1 gap-2"
              >
                <Camera className="h-4 w-4" />
                Start Scanning
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={stopScanning}
                className="flex-1 gap-2"
              >
                <CameraOff className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerModal;
