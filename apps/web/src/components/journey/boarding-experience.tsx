'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Clock, 
  Train, 
  Navigation, 
  CheckCircle,
  AlertCircle,
  Users,
  Zap,
  ArrowRight,
  Bell,
  Smartphone
} from 'lucide-react';

interface BoardingExperienceProps {
  tripId: string;
  route: {
    from: string;
    to: string;
    stops: string[];
    estimatedDuration: number;
  };
  vehicle: {
    id: string;
    type: 'train' | 'bus';
    occupancy: number; // 0-100%
    nextStop: string;
    delayMinutes?: number;
  };
  onComplete?: () => void;
}

type TripStage = 'approaching' | 'boarding' | 'in-transit' | 'arriving' | 'completed';

export function BoardingExperience({ tripId, route, vehicle, onComplete }: BoardingExperienceProps) {
  const [currentStage, setCurrentStage] = useState<TripStage>('approaching');
  const [progress, setProgress] = useState(0);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      
      // Simulate trip progression
      const totalDuration = route.estimatedDuration * 60; // Convert to seconds
      const newProgress = Math.min((timeElapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Update stage based on progress
      if (newProgress < 5) {
        setCurrentStage('approaching');
      } else if (newProgress < 10) {
        setCurrentStage('boarding');
      } else if (newProgress < 95) {
        setCurrentStage('in-transit');
        
        // Update current stop
        const stopsToGo = Math.floor((newProgress - 10) / (85 / route.stops.length));
        setCurrentStopIndex(Math.min(stopsToGo, route.stops.length - 1));
      } else if (newProgress < 100) {
        setCurrentStage('arriving');
      } else {
        setCurrentStage('completed');
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeElapsed, route.estimatedDuration, route.stops.length, onComplete]);

  useEffect(() => {
    // Add notifications based on stage changes
    const stageNotifications = {
      approaching: '車両が接近中です',
      boarding: '乗車してください',
      'in-transit': '運行中です',
      arriving: 'まもなく到着します',
      completed: '目的地に到着しました'
    };

    const notification = stageNotifications[currentStage];
    if (notification) {
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    }
  }, [currentStage]);

  const getStageIcon = (stage: TripStage) => {
    switch (stage) {
      case 'approaching':
        return <Navigation className="h-5 w-5 text-blue-500" />;
      case 'boarding':
        return <Users className="h-5 w-5 text-orange-500" />;
      case 'in-transit':
        return <Train className="h-5 w-5 text-green-500" />;
      case 'arriving':
        return <MapPin className="h-5 w-5 text-purple-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStageText = (stage: TripStage) => {
    switch (stage) {
      case 'approaching':
        return '車両接近中';
      case 'boarding':
        return '乗車中';
      case 'in-transit':
        return '運行中';
      case 'arriving':
        return '到着準備中';
      case 'completed':
        return '到着完了';
      default:
        return stage;
    }
  };

  const getOccupancyText = (occupancy: number) => {
    if (occupancy < 30) return '空いています';
    if (occupancy < 60) return '普通';
    if (occupancy < 80) return '混雑';
    return '非常に混雑';
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy < 30) return 'text-green-600';
    if (occupancy < 60) return 'text-yellow-600';
    if (occupancy < 80) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                {getStageIcon(currentStage)}
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">{getStageText(currentStage)}</h2>
                  <p className="opacity-90 text-sm sm:text-base truncate">{route.from} → {route.to}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs sm:text-sm opacity-90">経過時間</p>
                <p className="text-xl sm:text-2xl font-bold">{formatTime(timeElapsed)}</p>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>進行状況</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Current Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-muted-foreground">現在地</p>
                <p className="font-medium text-sm sm:text-base">
                  {currentStage === 'approaching' || currentStage === 'boarding' 
                    ? route.from 
                    : currentStage === 'completed'
                    ? route.to
                    : route.stops[currentStopIndex] || '運行中'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-muted-foreground">次の停車駅</p>
                <p className="font-medium text-sm sm:text-base">
                  {currentStage === 'completed' ? '---' : vehicle.nextStop}
                </p>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">車両ID</p>
                  <Badge variant="outline" className="text-xs">{vehicle.id}</Badge>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">混雑状況</p>
                  <p className={`font-medium text-sm ${getOccupancyColor(vehicle.occupancy)}`}>
                    {getOccupancyText(vehicle.occupancy)}
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground">遅延</p>
                  <p className={`font-medium text-sm ${vehicle.delayMinutes ? 'text-red-600' : 'text-green-600'}`}>
                    {vehicle.delayMinutes ? `${vehicle.delayMinutes}分遅れ` : '定刻'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Map */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            運行ルート
          </h3>
          <div className="space-y-3">
            {[route.from, ...route.stops, route.to].map((stop, index) => {
              const isCurrentStop = currentStage === 'in-transit' && index === currentStopIndex + 1;
              const isPassed = currentStage === 'completed' || 
                              (currentStage === 'in-transit' && index <= currentStopIndex) ||
                              (currentStage === 'arriving' && index < route.stops.length + 1);
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    isCurrentStop 
                      ? 'bg-blue-500 border-blue-500 animate-pulse' 
                      : isPassed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300'
                  }`} />
                  <span className={`${
                    isCurrentStop ? 'font-bold text-blue-600' : 
                    isPassed ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {stop}
                  </span>
                  {isCurrentStop && (
                    <Badge variant="outline" className="text-xs">
                      現在地
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            リアルタイム通知
          </h3>
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${
                  index === 0 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {index === 0 && <Zap className="h-4 w-4" />}
                  <span className="text-sm">{notification}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {currentStage === 'completed' && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">到着完了</h3>
              <p className="text-muted-foreground">
                {route.to}に到着しました。ご利用ありがとうございました。
              </p>
            </div>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => window.location.href = '/tickets'}>
                <Smartphone className="mr-2 h-4 w-4" />
                チケット履歴を確認
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/routes'}>
                新しい旅行を計画
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}