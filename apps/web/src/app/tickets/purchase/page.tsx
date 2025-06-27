'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Minus, 
  Plus,
  Ticket,
  Smartphone,
  Users,
  Calendar
} from 'lucide-react';
import { RealtimeStatus } from '@/components/transit/realtime-status';

interface RouteSegment {
  from: string;
  to: string;
  routeId: string;
  routeName: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  vehicleType: 'train' | 'bus' | 'tram';
}

interface TicketType {
  id: string;
  name: string;
  description: string;
  priceMultiplier: number;
  maxQuantity: number;
}

const ticketTypes: TicketType[] = [
  { id: 'adult', name: '大人', description: '12歳以上', priceMultiplier: 1.0, maxQuantity: 10 },
  { id: 'child', name: '子供', description: '6-11歳', priceMultiplier: 0.5, maxQuantity: 10 },
  { id: 'senior', name: 'シニア', description: '65歳以上', priceMultiplier: 0.8, maxQuantity: 10 },
  { id: 'disabled', name: '身体障害者', description: '介護者含む', priceMultiplier: 0.5, maxQuantity: 4 },
];

function PurchaseContent() {
  const searchParams = useSearchParams();
  const [selectedRoute, setSelectedRoute] = useState<RouteSegment | null>(null);
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({
    adult: 1,
    child: 0,
    senior: 0,
    disabled: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'payment' | 'success'>('select');

  // Mock route data - in real app, this would come from route planning
  useEffect(() => {
    const routeData: RouteSegment = {
      from: searchParams.get('from') || '渋谷駅',
      to: searchParams.get('to') || '新宿駅',
      routeId: searchParams.get('routeId') || 'JR-YAMANOTE',
      routeName: searchParams.get('routeName') || 'JR山手線',
      departureTime: searchParams.get('departure') || '14:30',
      arrivalTime: searchParams.get('arrival') || '14:37',
      duration: parseInt(searchParams.get('duration') || '7'),
      price: parseInt(searchParams.get('price') || '160'),
      vehicleType: (searchParams.get('type') as any) || 'train',
    };
    setSelectedRoute(routeData);
  }, [searchParams]);

  const updateQuantity = (ticketTypeId: string, change: number) => {
    setTicketQuantities(prev => {
      const ticketType = ticketTypes.find(t => t.id === ticketTypeId);
      const newQuantity = Math.max(0, Math.min(
        prev[ticketTypeId] + change,
        ticketType?.maxQuantity || 10
      ));
      return { ...prev, [ticketTypeId]: newQuantity };
    });
  };

  const getTotalQuantity = () => {
    return Object.values(ticketQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    if (!selectedRoute) return 0;
    return ticketTypes.reduce((total, ticketType) => {
      const quantity = ticketQuantities[ticketType.id];
      return total + (selectedRoute.price * ticketType.priceMultiplier * quantity);
    }, 0);
  };

  const getTax = () => {
    return Math.floor(getTotalPrice() * 0.1);
  };

  const getFinalPrice = () => {
    return getTotalPrice() + getTax();
  };

  const handlePurchase = async () => {
    if (getTotalQuantity() === 0) return;

    setIsProcessing(true);
    setStep('payment');

    // Simulate Stripe payment process
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('success');
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedRoute) {
    return <div>Loading...</div>;
  }

  if (step === 'success') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Ticket className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-green-800">購入完了</h1>
            <p className="text-muted-foreground mt-2">
              チケットの購入が完了しました
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>購入日時</span>
                  <span>{new Date().toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>チケット番号</span>
                  <Badge variant="outline">TK-{Math.random().toString(36).substr(2, 8).toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>合計金額</span>
                  <span className="font-bold">¥{getFinalPrice().toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => window.location.href = '/tickets'}>
              <Smartphone className="mr-2 h-4 w-4" />
              チケットを表示
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/dashboard'}>
              ダッシュボードに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">チケット購入</h1>
          <p className="text-muted-foreground">
            乗車券を購入してスムーズに移動しましょう
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Route Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  乗車ルート
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">出発</p>
                      <p className="font-medium">{selectedRoute.from}</p>
                      <p className="text-sm text-blue-600">{selectedRoute.departureTime}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">到着</p>
                      <p className="font-medium">{selectedRoute.to}</p>
                      <p className="text-sm text-blue-600">{selectedRoute.arrivalTime}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{selectedRoute.routeName}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      所要時間: {selectedRoute.duration}分
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  乗車券の種類と枚数
                </CardTitle>
                <CardDescription>
                  必要な枚数を選択してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketTypes.map((ticketType) => (
                  <div key={ticketType.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="font-medium">{ticketType.name}</p>
                        <Badge variant="outline">{ticketType.description}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ¥{Math.floor(selectedRoute.price * ticketType.priceMultiplier).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(ticketType.id, -1)}
                        disabled={ticketQuantities[ticketType.id] === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {ticketQuantities[ticketType.id]}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(ticketType.id, 1)}
                        disabled={ticketQuantities[ticketType.id] >= ticketType.maxQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Real-time Status */}
            <RealtimeStatus 
              feedId="JR-EAST" 
              routeId={selectedRoute.routeId}
            />
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>注文内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {ticketTypes.map((ticketType) => {
                    const quantity = ticketQuantities[ticketType.id];
                    if (quantity === 0) return null;
                    
                    const price = Math.floor(selectedRoute.price * ticketType.priceMultiplier);
                    return (
                      <div key={ticketType.id} className="flex justify-between text-sm">
                        <span>{ticketType.name} × {quantity}</span>
                        <span>¥{(price * quantity).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                {getTotalQuantity() > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>小計</span>
                        <span>¥{getTotalPrice().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>消費税</span>
                        <span>¥{getTax().toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>合計</span>
                        <span>¥{getFinalPrice().toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  className="w-full" 
                  onClick={handlePurchase}
                  disabled={getTotalQuantity() === 0 || isProcessing}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isProcessing ? '処理中...' : 
                   step === 'payment' ? '決済処理中...' : 
                   '購入手続きへ'}
                </Button>

                {getTotalQuantity() === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    チケットを選択してください
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketPurchasePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchaseContent />
    </Suspense>
  );
}