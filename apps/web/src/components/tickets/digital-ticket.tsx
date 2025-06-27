'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Download, 
  Share2, 
  Smartphone, 
  QrCode,
  MapPin,
  Clock,
  User,
  Train,
  Bus,
  Plane,
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { generateQrCode as generateQrCodeAPI, getCurrentQrCode } from '@/lib/api/qr-code';

interface DigitalTicketProps {
  ticket: {
    id: string;
    ticketNumber: string;
    type: 'train' | 'bus' | 'plane';
    status: 'active' | 'used' | 'expired' | 'cancelled';
    route: {
      from: string;
      to: string;
      departureTime: string;
      arrivalTime: string;
      duration: number;
    };
    passenger: {
      name: string;
      type: 'adult' | 'child' | 'senior' | 'disabled';
    };
    seat?: {
      car?: string;
      seat?: string;
      class?: string;
    };
    price: number;
    purchaseDate: string;
    validUntil: string;
    qrData: string;
  };
  onClose: () => void;
  onShare: () => void;
}

export function DigitalTicket({ ticket, onClose, onShare }: DigitalTicketProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isScreenCaptureDetected, setIsScreenCaptureDetected] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
    startQRRefreshTimer();
    setupScreenCaptureDetection();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ticket]);

  const startQRRefreshTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Regenerate QR code with new timestamp
          setQrTimestamp(Date.now());
          generateQRCode();
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const setupScreenCaptureDetection = useCallback(() => {
    // Detect when the page becomes hidden (potential screenshot)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsScreenCaptureDetected(true);
        setTimeout(() => setIsScreenCaptureDetected(false), 3000);
      }
    };

    // Detect potential screen recording
    const handleKeyDown = (e: KeyboardEvent) => {
      // Common screenshot shortcuts
      if (
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) || // macOS
        (e.key === 'PrintScreen') || // Windows
        (e.altKey && e.key === 'PrintScreen') // Windows Alt+PrintScreen
      ) {
        setIsScreenCaptureDetected(true);
        setTimeout(() => setIsScreenCaptureDetected(false), 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const generateQRCode = async () => {
    try {
      // Create time-based QR data with user info for security
      // Create checksum without Japanese characters
      const checksumSource = `${ticket.ticketNumber}-${qrTimestamp}`;
      const checksum = btoa(checksumSource).slice(0, 8);
      
      const secureQrData = {
        ticket: ticket.qrData,
        timestamp: qrTimestamp,
        userId: ticket.passenger.name,
        validFor: 30, // seconds
        checksum: checksum
      };

      const qrDataString = JSON.stringify(secureQrData);
      
      const url = await QRCode.toDataURL(qrDataString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Create watermarked version
      const watermarkedUrl = await addWatermarkToQR(url);
      setQrCodeUrl(watermarkedUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const addWatermarkToQR = async (qrUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = watermarkCanvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(qrUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw QR code
        ctx.drawImage(img, 0, 0);
        
        // Add semi-transparent watermark
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        
        // Add timestamp watermark
        const now = new Date();
        const timeText = now.toLocaleTimeString('ja-JP');
        ctx.fillText(timeText, canvas.width / 2, canvas.height - 10);
        
        // Add user watermark
        ctx.fillText(ticket.passenger.name.substring(0, 3) + '***', canvas.width / 2, 20);
        
        ctx.restore();
        
        resolve(canvas.toDataURL());
      };
      img.src = qrUrl;
    });
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'train':
        return <Train className="h-6 w-6" />;
      case 'bus':
        return <Bus className="h-6 w-6" />;
      case 'plane':
        return <Plane className="h-6 w-6" />;
      default:
        return <Train className="h-6 w-6" />;
    }
  };

  const getTransportName = (type: string) => {
    switch (type) {
      case 'train':
        return '鉄道';
      case 'bus':
        return 'バス';
      case 'plane':
        return '航空';
      default:
        return '交通機関';
    }
  };

  const getPassengerTypeText = (type: string) => {
    switch (type) {
      case 'adult':
        return '大人';
      case 'child':
        return '子供';
      case 'senior':
        return 'シニア';
      case 'disabled':
        return '身体障害者';
      default:
        return type;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
      }),
      time: date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const isTicketActive = () => {
    const now = new Date();
    const validUntil = new Date(ticket.validUntil);
    const departureTime = new Date(ticket.route.departureTime);
    
    return ticket.status === 'active' && now < validUntil && now < departureTime;
  };

  const downloadTicket = () => {
    // Create a canvas with the ticket design
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    // Draw ticket background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ticket content
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('OpenMaaS', 40, 60);

    ctx.font = '24px Arial';
    ctx.fillText(ticket.ticketNumber, 40, 120);

    ctx.font = '20px Arial';
    ctx.fillText(`${ticket.route.from} → ${ticket.route.to}`, 40, 180);

    // Download the canvas as an image
    const link = document.createElement('a');
    link.download = `ticket-${ticket.ticketNumber}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const activateTicket = () => {
    setIsAnimating(true);
    // Simulate ticket activation animation
    setTimeout(() => {
      setIsAnimating(false);
      // Here you would typically call an API to activate the ticket
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold">デジタルチケット</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* QR Code Section */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className={`relative inline-block p-3 sm:p-4 bg-white rounded-lg border-2 transition-all duration-500 ${
              isAnimating ? 'animate-pulse border-green-500 shadow-lg' : 'border-gray-200'
            } ${
              isScreenCaptureDetected ? 'border-red-500 bg-red-50' : ''
            }`}>
              {qrCodeUrl && (
                <div className="relative">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-32 h-32 sm:w-48 sm:h-48 mx-auto"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      pointerEvents: isScreenCaptureDetected ? 'none' : 'auto'
                    }}
                  />
                  
                  {/* Security overlay */}
                  {isScreenCaptureDetected && (
                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center rounded">
                      <div className="text-white text-center font-bold">
                        <div className="text-lg">⚠️</div>
                        <div className="text-xs">キャプチャ検知</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Timer indicator */}
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg font-mono">
                    {timeRemaining}s
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                改札でこのQRコードをスキャンしてください
              </p>
              <div className="flex justify-center space-x-2">
                <Badge 
                  variant={isTicketActive() ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  {isTicketActive() ? '使用可能' : ticket.status === 'used' ? '使用済み' : '使用不可'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {timeRemaining}秒で更新
                </Badge>
              </div>
              
              {isScreenCaptureDetected && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-2">
                  <p className="text-red-800 text-xs font-medium">
                    ⚠️ スクリーンキャプチャが検知されました。セキュリティのためQRコードを一時的に非表示にしています。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Information */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTransportIcon(ticket.type)}
                  <span className="font-medium">{getTransportName(ticket.type)}</span>
                </div>
                <Badge variant="outline">{ticket.ticketNumber}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">出発地</p>
                  <p className="font-medium text-sm sm:text-base">{ticket.route.from}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">目的地</p>
                  <p className="font-medium text-sm sm:text-base">{ticket.route.to}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">出発日時</p>
                  <p className="font-medium text-sm">
                    {formatDateTime(ticket.route.departureTime).date}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-blue-600">
                    {formatDateTime(ticket.route.departureTime).time}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">到着予定</p>
                  <p className="font-medium text-sm sm:text-base">
                    {formatDateTime(ticket.route.arrivalTime).time}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    所要時間: {ticket.route.duration}分
                  </p>
                </div>
              </div>

              {ticket.seat && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-2">座席情報</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {ticket.seat.car && (
                      <div>
                        <span className="text-muted-foreground">車両: </span>
                        <span className="font-medium">{ticket.seat.car}</span>
                      </div>
                    )}
                    {ticket.seat.seat && (
                      <div>
                        <span className="text-muted-foreground">座席: </span>
                        <span className="font-medium">{ticket.seat.seat}</span>
                      </div>
                    )}
                    {ticket.seat.class && (
                      <div>
                        <span className="text-muted-foreground">クラス: </span>
                        <span className="font-medium">{ticket.seat.class}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">乗客</p>
                  <p className="font-medium">{ticket.passenger.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getPassengerTypeText(ticket.passenger.type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">運賃</p>
                  <p className="text-xl font-bold">¥{ticket.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>購入日時: {formatDateTime(ticket.purchaseDate).date} {formatDateTime(ticket.purchaseDate).time}</p>
                <p>有効期限: {formatDateTime(ticket.validUntil).date} {formatDateTime(ticket.validUntil).time}</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isTicketActive() && (
              <Button 
                className="w-full" 
                onClick={activateTicket}
                disabled={isAnimating}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                {isAnimating ? 'アクティベート中...' : 'チケットをアクティベート'}
              </Button>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={downloadTicket}>
                <Download className="mr-2 h-4 w-4" />
                保存
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                共有
              </Button>
            </div>
          </div>

          {/* Enhanced Security Notice */}
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <div className="text-red-600">🔒</div>
                <div>
                  <p className="text-xs text-red-800 font-medium mb-1">
                    <strong>セキュリティ保護機能:</strong>
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• QRコードは30秒ごとに自動更新されます</li>
                    <li>• ユーザー情報がウォーターマークで保護されています</li>
                    <li>• スクリーンキャプチャを検知すると表示を制限します</li>
                    <li>• このコードには個人情報と時間制限が含まれています</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>重要:</strong> このQRコードをスクリーンショットで保存したり、
                他人と共有したりしないでください。不正利用の恐れがあります。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}