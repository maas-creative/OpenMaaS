'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Train, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  Radio,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface Route {
  id: string;
  name: string;
  status: 'normal' | 'delayed' | 'suspended';
  delay?: number;
  lastUpdate: Date;
}

interface Vehicle {
  id: string;
  routeId: string;
  position: { lat: number; lng: number };
  speed: number;
  occupancy: number;
  status: 'active' | 'maintenance' | 'inactive';
}

export function OperationManagement() {
  const [routes, setRoutes] = useState<Route[]>([
    { id: '1', name: '山手線', status: 'normal', lastUpdate: new Date() },
    { id: '2', name: '中央線', status: 'delayed', delay: 5, lastUpdate: new Date() },
    { id: '3', name: '京浜東北線', status: 'normal', lastUpdate: new Date() },
    { id: '4', name: '東海道線', status: 'delayed', delay: 10, lastUpdate: new Date() },
    { id: '5', name: '総武線', status: 'suspended', lastUpdate: new Date() },
  ]);

  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [estimatedResolution, setEstimatedResolution] = useState('');

  const handleStatusUpdate = () => {
    // In real app, call API to update status
    console.log('Updating status for route:', selectedRoute);
    console.log('Message:', updateMessage);
    console.log('Estimated resolution:', estimatedResolution);
    
    // Reset form
    setSelectedRoute('');
    setUpdateMessage('');
    setEstimatedResolution('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-50';
      case 'delayed':
        return 'text-yellow-600 bg-yellow-50';
      case 'suspended':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="h-4 w-4" />;
      case 'delayed':
        return <Clock className="h-4 w-4" />;
      case 'suspended':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Route Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>運行状況一覧</CardTitle>
          <CardDescription>
            リアルタイムの運行状況を管理・更新
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routes.map((route) => (
              <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Train className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-semibold">{route.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      最終更新: {format(route.lastUpdate, 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Badge className={getStatusColor(route.status)}>
                    <span className="flex items-center space-x-1">
                      {getStatusIcon(route.status)}
                      <span>
                        {route.status === 'normal' && '正常運行'}
                        {route.status === 'delayed' && `${route.delay}分遅延`}
                        {route.status === 'suspended' && '運転見合わせ'}
                      </span>
                    </span>
                  </Badge>
                  
                  <div className="flex items-center space-x-2">
                    {route.status === 'normal' ? (
                      <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      リアルタイム配信中
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>運行状況更新</CardTitle>
          <CardDescription>
            運行に影響がある場合は速やかに更新してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="route">路線選択</Label>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger id="route">
                    <SelectValue placeholder="路線を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">運行状況</Label>
                <Select>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="状況を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">正常運行</SelectItem>
                    <SelectItem value="delayed">遅延</SelectItem>
                    <SelectItem value="suspended">運転見合わせ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="message">状況説明</Label>
              <Textarea
                id="message"
                placeholder="例：信号故障のため、上下線で約10分の遅れが発生しています。"
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="resolution">復旧見込み</Label>
              <Input
                id="resolution"
                type="time"
                value={estimatedResolution}
                onChange={(e) => setEstimatedResolution(e.target.value)}
              />
            </div>
            
            <Button onClick={handleStatusUpdate} className="w-full">
              <Radio className="mr-2 h-4 w-4" />
              運行状況を更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Vehicle Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>車両位置モニタリング</CardTitle>
          <CardDescription>
            GPS追跡による車両のリアルタイム位置情報
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4" />
              <p>リアルタイム地図表示エリア</p>
              <p className="text-sm mt-2">142台の車両を追跡中</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">128</p>
              <p className="text-sm text-muted-foreground">運行中</p>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold">10</p>
              <p className="text-sm text-muted-foreground">遅延中</p>
            </div>
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold">4</p>
              <p className="text-sm text-muted-foreground">点検中</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}