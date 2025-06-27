'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Train, 
  Bus, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Navigation,
  ZoomIn,
  ZoomOut,
  Locate,
  RefreshCw
} from 'lucide-react';

interface TransitLine {
  id: string;
  name: string;
  type: 'train' | 'bus' | 'metro';
  status: 'normal' | 'delay' | 'suspended';
  delay: number;
  color: string;
  position: { x: number; y: number };
}

interface TransitStatusMapProps {
  height?: string;
  showControls?: boolean;
}

export default function TransitStatusMap({ 
  height = 'h-64',
  showControls = true 
}: TransitStatusMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // Mock transit line data
  const transitLines: TransitLine[] = [
    {
      id: 'yamanote',
      name: 'JR山手線',
      type: 'train',
      status: 'normal',
      delay: 0,
      color: '#00AC84',
      position: { x: 45, y: 40 }
    },
    {
      id: 'ginza',
      name: '東京メトロ銀座線',
      type: 'metro',
      status: 'delay',
      delay: 5,
      color: '#FF6600',
      position: { x: 35, y: 55 }
    },
    {
      id: 'oedo',
      name: '都営大江戸線',
      type: 'metro',
      status: 'normal',
      delay: 0,
      color: '#B6007A',
      position: { x: 60, y: 35 }
    },
    {
      id: 'bus_route1',
      name: '都営バス 新宿線',
      type: 'bus',
      status: 'delay',
      delay: 3,
      color: '#00B48F',
      position: { x: 30, y: 70 }
    },
    {
      id: 'chuo',
      name: 'JR中央線',
      type: 'train',
      status: 'suspended',
      delay: 15,
      color: '#FF6600',
      position: { x: 55, y: 60 }
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'delay':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'suspended':
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default:
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'delay': return 'bg-yellow-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string, delay: number) => {
    switch (status) {
      case 'normal': return '正常運行';
      case 'delay': return `${delay}分遅延`;
      case 'suspended': return '運転見合わせ';
      default: return '不明';
    }
  };

  const getLineTypeIcon = (type: string) => {
    switch (type) {
      case 'train':
      case 'metro':
        return <Train className="h-4 w-4" />;
      case 'bus':
        return <Bus className="h-4 w-4" />;
      default:
        return <Navigation className="h-4 w-4" />;
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            リアルタイム運行状況
          </CardTitle>
          {showControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              更新
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className={`${height} relative overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50`}>
          {/* Map Canvas */}
          <div 
            className="absolute inset-0 transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Background Grid */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="transitGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.2"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#transitGrid)" />
              
              {/* Mock route lines */}
              <g opacity="0.6">
                <path d="M 20,60 Q 50,40 80,60" stroke="#00AC84" strokeWidth="3" fill="none" strokeDasharray="5,5" />
                <path d="M 10,80 L 90,50" stroke="#FF6600" strokeWidth="3" fill="none" />
                <path d="M 30,20 Q 60,50 90,80" stroke="#B6007A" strokeWidth="3" fill="none" strokeDasharray="10,5" />
              </g>
            </svg>

            {/* Transit Line Markers */}
            {transitLines.map((line) => (
              <div
                key={line.id}
                className="absolute cursor-pointer group"
                style={{
                  left: `${line.position.x}%`,
                  top: `${line.position.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => setSelectedLine(selectedLine === line.id ? null : line.id)}
              >
                {/* Status Indicator */}
                <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-200 ${getStatusColor(line.status)} ${selectedLine === line.id ? 'scale-125' : 'hover:scale-110'}`} />
                
                {/* Status Pulse for delays/issues */}
                {line.status !== 'normal' && (
                  <div className={`absolute inset-0 w-4 h-4 rounded-full opacity-30 animate-ping ${getStatusColor(line.status)}`} />
                )}
                
                {/* Hover Tooltip */}
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-white px-3 py-2 rounded-lg shadow-lg border text-xs font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                      {getLineTypeIcon(line.type)}
                      <span>{line.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(line.status)}
                      <span>{getStatusText(line.status, line.delay)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map Controls */}
          {showControls && (
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomIn} className="h-8 w-8 p-0">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleZoomOut} className="h-8 w-8 p-0">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <Locate className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Selected Line Details */}
          {selectedLine && (
            <div className="absolute bottom-4 left-4 right-4">
              {(() => {
                const line = transitLines.find(l => l.id === selectedLine);
                if (!line) return null;
                
                return (
                  <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getLineTypeIcon(line.type)}
                        <div>
                          <h4 className="font-medium">{line.name}</h4>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(line.status)}
                            <span className="text-sm text-muted-foreground">
                              {getStatusText(line.status, line.delay)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedLine(null)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Status Legend */}
        <div className="p-4 border-t bg-white/50">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-muted-foreground">運行状況:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>正常</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>遅延</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>運転見合わせ</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}