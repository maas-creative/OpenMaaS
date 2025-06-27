'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight,
  Clock,
  MapPin,
  Navigation,
  Train,
  Bus,
  Users,
  CreditCard,
  CheckCircle,
  QrCode,
  Smartphone
} from 'lucide-react';

type JourneyStage = 'planning' | 'booking' | 'payment' | 'confirmed' | 'active' | 'completed';

interface RouteOption {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  transfers: number;
  price: number;
  steps: {
    mode: 'train' | 'bus' | 'walk';
    from: string;
    to: string;
    duration: number;
    route?: string;
  }[];
}

function JourneyContent() {
  const searchParams = useSearchParams();
  const [currentStage, setCurrentStage] = useState<JourneyStage>('planning');
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  const routeOptions: RouteOption[] = [
    {
      id: 'route-1',
      from: '渋谷駅',
      to: '新宿駅',
      departureTime: '2024-01-15T14:30:00',
      arrivalTime: '2024-01-15T14:37:00',
      duration: 7,
      transfers: 0,
      price: 160,
      steps: [
        {
          mode: 'train',
          from: '渋谷駅',
          to: '新宿駅',
          duration: 7,
          route: 'JR山手線',
        }
      ]
    }
  ];

  useEffect(() => {
    const stage = searchParams.get('stage') as JourneyStage;
    const routeId = searchParams.get('routeId');
    const tripId = searchParams.get('tripId');

    if (stage) setCurrentStage(stage);
    if (routeId) {
      const route = routeOptions.find(r => r.id === routeId);
      if (route) setSelectedRoute(route);
    }
    if (tripId) setActiveTripId(tripId);
  }, [searchParams, routeOptions]);

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    setCurrentStage('booking');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'train':
        return <Train className="h-4 w-4" />;
      case 'bus':
        return <Bus className="h-4 w-4" />;
      case 'walk':
        return <Navigation className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">旅行計画</h1>
        <p className="text-muted-foreground">
          最適なルートを選択してください
        </p>
      </div>

      <div className="space-y-4">
        {routeOptions.map((route) => (
          <Card 
            key={route.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleRouteSelect(route)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="text-center min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">出発</p>
                      <p className="font-medium text-sm sm:text-base truncate">{route.from}</p>
                      <p className="text-xs sm:text-sm text-blue-600">{formatTime(route.departureTime)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-center min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">到着</p>
                      <p className="font-medium text-sm sm:text-base truncate">{route.to}</p>
                      <p className="text-xs sm:text-sm text-blue-600">{formatTime(route.arrivalTime)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                      ¥{route.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {route.duration}分
                  </span>
                  <span>乗換: {route.transfers}回</span>
                </div>

                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  {route.steps.map((step, index) => (
                    <div key={index} className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {getModeIcon(step.mode)}
                        <span className="ml-1 hidden sm:inline">{step.route || step.mode}</span>
                        <span className="ml-1 sm:hidden">{step.mode}</span>
                      </Badge>
                      {index < route.steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JourneyContent />
    </Suspense>
  );
}