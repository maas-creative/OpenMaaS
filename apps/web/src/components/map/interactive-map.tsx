'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Train, 
  Bus, 
  Car, 
  ZoomIn, 
  ZoomOut,
  Locate,
  Route
} from 'lucide-react';

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'station' | 'stop' | 'destination';
}

interface RouteStep {
  from: MapLocation;
  to: MapLocation;
  mode: string;
  line: string;
  color: string;
}

interface InteractiveMapProps {
  fromLocation?: string;
  toLocation?: string;
  routes?: RouteStep[][];
  height?: string;
}

export default function InteractiveMap({ 
  fromLocation, 
  toLocation, 
  routes = [], 
  height = 'h-64' 
}: InteractiveMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [showCurrentLocation, setShowCurrentLocation] = useState(false);
  
  // Mock Tokyo area coordinates
  const tokyoCenter = { lat: 35.6762, lng: 139.6503 };
  
  // Mock locations for demo
  const mockLocations: MapLocation[] = [
    { id: 'shibuya', name: '渋谷駅', lat: 35.6580, lng: 139.7016, type: 'station' },
    { id: 'shinjuku', name: '新宿駅', lat: 35.6896, lng: 139.7006, type: 'station' },
    { id: 'tokyo', name: '東京駅', lat: 35.6812, lng: 139.7671, type: 'station' },
    { id: 'ikebukuro', name: '池袋駅', lat: 35.7295, lng: 139.7109, type: 'station' },
    { id: 'ueno', name: '上野駅', lat: 35.7141, lng: 139.7774, type: 'station' },
  ];

  // Mock route data
  const mockRoutes: RouteStep[][] = [
    [
      {
        from: mockLocations[0], // 渋谷
        to: mockLocations[1],   // 新宿
        mode: 'train',
        line: 'JR山手線',
        color: '#00AC84'
      },
      {
        from: mockLocations[1], // 新宿
        to: mockLocations[2],   // 東京
        mode: 'bus',
        line: '都営バス',
        color: '#E85298'
      }
    ]
  ];

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleCurrentLocation = () => {
    setShowCurrentLocation(!showCurrentLocation);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'train': return <Train className="h-3 w-3" />;
      case 'bus': return <Bus className="h-3 w-3" />;
      case 'car': return <Car className="h-3 w-3" />;
      default: return <Navigation className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-0 relative">
        <div className={`${height} bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg relative overflow-hidden`}>
          {/* Map Canvas */}
          <div 
            className="absolute inset-0 transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Background Grid */}
            <svg 
              className="absolute inset-0 w-full h-full" 
              style={{ background: 'linear-gradient(to bottom right, #f0f9ff, #ecfdf5)' }}
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Mock Station Markers */}
            {mockLocations.map((location, index) => (
              <div
                key={location.id}
                className="absolute"
                style={{
                  left: `${20 + index * 15}%`,
                  top: `${30 + Math.sin(index) * 20}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="relative group">
                  <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform" />
                  
                  {/* Station Label */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap border">
                      {location.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mock Route Lines */}
            {routes.length > 0 && routes[selectedRoute] && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {routes[selectedRoute].map((step, index) => (
                  <g key={index}>
                    <line
                      x1={`${20 + index * 15}%`}
                      y1={`${30 + Math.sin(index) * 20}%`}
                      x2={`${20 + (index + 1) * 15}%`}
                      y2={`${30 + Math.sin(index + 1) * 20}%`}
                      stroke={step.color}
                      strokeWidth="3"
                      strokeDasharray={step.mode === 'bus' ? '5,5' : 'none'}
                      opacity="0.8"
                    />
                    
                    {/* Route Mode Icon */}
                    <foreignObject
                      x={`${20 + index * 15 + 7.5}%`}
                      y={`${30 + Math.sin(index + 0.5) * 20}%`}
                      width="20"
                      height="20"
                      className="pointer-events-none"
                    >
                      <div className="w-5 h-5 bg-white rounded-full border shadow-sm flex items-center justify-center">
                        {getModeIcon(step.mode)}
                      </div>
                    </foreignObject>
                  </g>
                ))}
              </svg>
            )}

            {/* Current Location Marker */}
            {showCurrentLocation && (
              <div
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="relative">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                  <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full opacity-30 animate-ping" />
                </div>
              </div>
            )}
          </div>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomIn} className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut} className="h-8 w-8 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCurrentLocation} className="h-8 w-8 p-0">
              <Locate className={`h-4 w-4 ${showCurrentLocation ? 'text-green-600' : ''}`} />
            </Button>
          </div>

          {/* Route Legend */}
          {routes.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Route className="h-4 w-4" />
                  <span className="text-sm font-medium">選択されたルート</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {routes[selectedRoute]?.map((step, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <span className="mr-1">{getModeIcon(step.mode)}</span>
                      {step.line}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Locations Overlay */}
          {(fromLocation || toLocation) && (
            <div className="absolute top-4 left-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
                {fromLocation && (
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">出発:</span>
                    <span className="font-medium">{fromLocation}</span>
                  </div>
                )}
                {toLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-muted-foreground">到着:</span>
                    <span className="font-medium">{toLocation}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Integration Notice */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent p-4">
          <div className="text-center text-white text-sm">
            <p className="font-medium">デモ用インタラクティブマップ</p>
            <p className="text-xs opacity-90">
              本格的な地図統合は Mapbox GL JS / Google Maps API で実装予定
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}