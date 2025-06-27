'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, MapPin, Zap, RefreshCw, Navigation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface VehiclePosition {
  tripId?: string;
  routeId?: string;
  vehicleId: string;
  position: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  currentStatus?: number;
  timestamp?: number;
  congestionLevel?: number;
  occupancyStatus?: number;
}

interface Alert {
  alertId: string;
  headerText: string;
  descriptionText: string;
  effect?: number;
  cause?: number;
  activePeriods: { start?: number; end?: number }[];
}

interface StopPrediction {
  routeId: string;
  routeName?: string;
  tripId: string;
  headsign?: string;
  arrivalTime?: number;
  departureTime?: number;
  delay?: number;
  realtimeStatus: 'SCHEDULED' | 'UPDATED' | 'CANCELLED';
}

interface RealtimeStatusProps {
  feedId: string;
  stopId?: string;
  routeId?: string;
  vehicleId?: string;
}

export function RealtimeStatus({ feedId, stopId, routeId, vehicleId }: RealtimeStatusProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch vehicle positions
  const { data: vehiclePositions = [], refetch: refetchVehicles } = useQuery({
    queryKey: ['vehiclePositions', feedId],
    queryFn: async () => {
      const response = await fetch(`/api/realtime/vehicle-positions/${feedId}`);
      return response.json() as Promise<VehiclePosition[]>;
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch alerts
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', feedId, routeId],
    queryFn: async () => {
      const url = routeId 
        ? `/api/realtime/route/${feedId}/${routeId}/alerts`
        : `/api/realtime/alerts/${feedId}`;
      const response = await fetch(url);
      return response.json() as Promise<Alert[]>;
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Fetch stop predictions if stopId provided
  const { data: stopPredictions, refetch: refetchPredictions } = useQuery({
    queryKey: ['stopPredictions', feedId, stopId],
    queryFn: async () => {
      if (!stopId) return null;
      const response = await fetch(`/api/realtime/stop/${feedId}/${stopId}/predictions`);
      return response.json() as Promise<{ stopId: string; predictions: StopPrediction[] }>;
    },
    enabled: !!stopId,
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Fetch specific vehicle location if vehicleId provided
  const { data: vehicleLocation, refetch: refetchVehicle } = useQuery({
    queryKey: ['vehicleLocation', feedId, vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const response = await fetch(`/api/realtime/vehicle/${feedId}/${vehicleId}/location`);
      return response.json() as Promise<VehiclePosition>;
    },
    enabled: !!vehicleId,
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const refreshAll = () => {
    refetchVehicles();
    refetchAlerts();
    refetchPredictions();
    refetchVehicle();
  };

  const getOccupancyText = (status?: number) => {
    switch (status) {
      case 0: return '空席あり';
      case 1: return '多数の座席あり';
      case 2: return '少数の座席あり';
      case 3: return '立席のみ';
      case 4: return '非常に混雑';
      case 5: return '満員';
      case 6: return '乗車不可';
      default: return '不明';
    }
  };

  const getCongestionText = (level?: number) => {
    switch (level) {
      case 1: return 'スムーズ';
      case 2: return 'ストップ&ゴー';
      case 3: return '渋滞';
      case 4: return '重度の渋滞';
      default: return '不明';
    }
  };

  const getDelayText = (delay?: number) => {
    if (!delay) return '定刻';
    if (delay > 0) return `${Math.floor(delay / 60)}分遅れ`;
    return `${Math.abs(Math.floor(delay / 60))}分早い`;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp * 1000).toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">リアルタイム情報</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className="h-4 w-4 mr-1" />
            自動更新
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              運行情報・お知らせ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.alertId} className="p-3 bg-white rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-900">{alert.headerText}</h4>
                <p className="text-sm text-orange-700 mt-1">{alert.descriptionText}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stop Predictions */}
      {stopPredictions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              到着予定時刻
            </CardTitle>
            <CardDescription>
              停留所: {stopId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stopPredictions.predictions.length === 0 ? (
              <p className="text-muted-foreground">現在の到着予定はありません</p>
            ) : (
              <div className="space-y-3">
                {stopPredictions.predictions.slice(0, 5).map((prediction, index) => (
                  <div key={`${prediction.tripId}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={prediction.routeId ? 'default' : 'secondary'}>
                        {prediction.routeId || 'N/A'}
                      </Badge>
                      <div>
                        <p className="font-medium">{prediction.headsign || '行き先不明'}</p>
                        <p className="text-sm text-muted-foreground">
                          便: {prediction.tripId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatTime(prediction.arrivalTime || prediction.departureTime)}
                      </p>
                      <div className="flex items-center space-x-1">
                        <Badge 
                          variant={
                            prediction.realtimeStatus === 'CANCELLED' ? 'destructive' :
                            prediction.realtimeStatus === 'UPDATED' ? 'default' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {prediction.realtimeStatus === 'CANCELLED' ? '運休' :
                           prediction.realtimeStatus === 'UPDATED' ? '遅延' : '定刻'}
                        </Badge>
                        {prediction.delay && (
                          <span className="text-xs text-muted-foreground">
                            {getDelayText(prediction.delay)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Location */}
      {vehicleLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Navigation className="h-5 w-5 mr-2" />
              車両位置
            </CardTitle>
            <CardDescription>
              車両ID: {vehicleLocation.vehicleId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">位置</p>
                <p className="font-medium">
                  {vehicleLocation.position.latitude.toFixed(6)}, {vehicleLocation.position.longitude.toFixed(6)}
                </p>
              </div>
              {vehicleLocation.position.speed && (
                <div>
                  <p className="text-sm text-muted-foreground">速度</p>
                  <p className="font-medium">{Math.round(vehicleLocation.position.speed * 3.6)} km/h</p>
                </div>
              )}
              {vehicleLocation.occupancyStatus !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">混雑状況</p>
                  <Badge variant="outline">
                    {getOccupancyText(vehicleLocation.occupancyStatus)}
                  </Badge>
                </div>
              )}
              {vehicleLocation.congestionLevel !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">交通状況</p>
                  <Badge variant="outline">
                    {getCongestionText(vehicleLocation.congestionLevel)}
                  </Badge>
                </div>
              )}
            </div>
            {vehicleLocation.timestamp && (
              <p className="text-xs text-muted-foreground">
                最終更新: {new Date(vehicleLocation.timestamp * 1000).toLocaleString('ja-JP')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Overview */}
      {!vehicleId && vehiclePositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              運行中の車両
            </CardTitle>
            <CardDescription>
              現在運行中の車両: {vehiclePositions.length}台
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehiclePositions.slice(0, 6).map((vehicle) => (
                <div key={vehicle.vehicleId} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{vehicle.vehicleId}</p>
                    {vehicle.routeId && (
                      <Badge variant="outline">{vehicle.routeId}</Badge>
                    )}
                  </div>
                  {vehicle.occupancyStatus !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getOccupancyText(vehicle.occupancyStatus)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}