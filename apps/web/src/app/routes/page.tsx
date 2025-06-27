'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, Zap, Train, Bus, Car, Navigation } from 'lucide-react';
import InteractiveMap from '@/components/map/interactive-map';

export default function RoutesPage() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [searchResults, setSearchResults] = useState([
    {
      id: 1,
      duration: '42分',
      cost: '¥520',
      co2: '2.1kg',
      transfers: 1,
      modes: ['train', 'bus'],
      steps: [
        { mode: 'train', line: 'JR山手線', from: '渋谷', to: '新宿', time: '15分', color: '#00AC84' },
        { mode: 'bus', line: '都営バス', from: '新宿駅西口', to: '東京駅', time: '27分', color: '#E85298' }
      ]
    },
    {
      id: 2,
      duration: '55分',
      cost: '¥380',
      co2: '1.8kg',
      transfers: 2,
      modes: ['train', 'train'],
      steps: [
        { mode: 'train', line: 'JR山手線', from: '渋谷', to: '有楽町', time: '25分', color: '#00AC84' },
        { mode: 'train', line: '東京メトロ丸ノ内線', from: '有楽町', to: '東京', time: '8分', color: '#F62E36' },
        { mode: 'train', line: 'JR東海道線', from: '東京', to: '品川', time: '22分', color: '#FF6600' }
      ]
    },
    {
      id: 3,
      duration: '35分',
      cost: '¥1,200',
      co2: '8.5kg',
      transfers: 0,
      modes: ['car'],
      steps: [
        { mode: 'car', line: 'タクシー', from: '渋谷', to: '東京駅', time: '35分', color: '#FFA500' }
      ]
    }
  ]);

  const handleSearch = () => {
    console.log('Searching routes from', fromLocation, 'to', toLocation);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'train': return <Train className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      case 'car': return <Car className="h-4 w-4" />;
      default: return <Navigation className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">経路検索</h1>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ルート検索
          </CardTitle>
          <CardDescription>
            出発地と目的地を入力して最適なルートを検索
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">出発地</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="from"
                  placeholder="例: 渋谷駅"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">目的地</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="to"
                  placeholder="例: 東京駅"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSearch} className="w-full md:w-auto">
            <Search className="mr-2 h-4 w-4" />
            ルートを検索
          </Button>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <InteractiveMap 
        fromLocation={fromLocation}
        toLocation={toLocation}
        routes={searchResults.map(result => result.steps.map(step => ({
          from: { id: step.from, name: step.from, lat: 0, lng: 0, type: 'station' as const },
          to: { id: step.to, name: step.to, lat: 0, lng: 0, type: 'station' as const },
          mode: step.mode,
          line: step.line,
          color: step.color
        })))}
        height="h-80"
      />

      {/* Search Results */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">検索結果</h2>
        
        {searchResults.map((route) => (
          <Card key={route.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{route.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {route.modes.map((mode, idx) => (
                      <span key={idx}>{getModeIcon(mode)}</span>
                    ))}
                  </div>
                  <Badge variant="secondary">{route.transfers}回乗換</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{route.cost}</span>
                  <span>CO2: {route.co2}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {route.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getModeIcon(step.mode)}
                      <span className="font-medium">{step.line}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm">{step.from} → {step.to}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {step.time}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button>
                  <Zap className="mr-2 h-4 w-4" />
                  このルートで予約
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}