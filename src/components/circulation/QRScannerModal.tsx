import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQRScanner } from '@/hooks/useQRScanner';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (qrCode: string) => void;
  title?: string;
  description?: string;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onClose,
  onScan,
  title = 'Scan QR Code',
  description = 'Position the QR code within the scanner frame'
}) => {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const { isScanning, hasPermission, startScanning, stopScanning } = useQRScanner({
    onScan: (decodedText) => {
      setLastScanned(decodedText);
      stopScanning();
      onScan(decodedText);
      onClose();
    },
    onError: (error) => {
      setScanError(error);
    },
  });

  useEffect(() => {
    if (open) {
      setLastScanned(null);
      setScanError(null);
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        startScanning('qr-reader');
      }, 100);
    } else {
      stopScanning();
    }
  }, [open, startScanning, stopScanning]);

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
          <div
            ref={scannerContainerRef}
            className="relative w-full aspect-square max-w-[300px] rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30"
          >
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                </div>
              </div>
            )}
          </div>

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

          {lastScanned && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Scanned: {lastScanned}
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
                Scanning... Hold the QR code steady
              </p>
            ) : (
              <p>Click Start to begin scanning</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            {!isScanning ? (
              <Button onClick={() => startScanning('qr-reader')} className="flex-1 gap-2">
                <Camera className="h-4 w-4" />
                Start Scanning
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopScanning} className="flex-1 gap-2">
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
