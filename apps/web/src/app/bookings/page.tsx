'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Train, Bus, Car, X, MoreHorizontal, CheckCircle, AlertCircle } from 'lucide-react';

export default function BookingsPage() {
  const [bookings] = useState([
    {
      id: 'BK001',
      status: 'confirmed',
      date: '2024-06-10',
      time: '08:30',
      from: '渋谷駅',
      to: '東京駅',
      duration: '42分',
      cost: '¥520',
      modes: ['train', 'bus'],
      details: [
        { mode: 'train', line: 'JR山手線', from: '渋谷', to: '新宿', time: '08:30-08:45' },
        { mode: 'bus', line: '都営バス', from: '新宿駅西口', to: '東京駅', time: '08:50-09:12' }
      ]
    },
    {
      id: 'BK002',
      status: 'upcoming',
      date: '2024-06-12',
      time: '15:30',
      from: '新宿駅',
      to: '品川駅',
      duration: '25分',
      cost: '¥200',
      modes: ['train'],
      details: [
        { mode: 'train', line: 'JR山手線', from: '新宿', to: '品川', time: '15:30-15:55' }
      ]
    },
    {
      id: 'BK003',
      status: 'cancelled',
      date: '2024-06-08',
      time: '12:00',
      from: '六本木',
      to: '銀座',
      duration: '35分',
      cost: '¥1,200',
      modes: ['car'],
      details: [
        { mode: 'car', line: 'タクシー', from: '六本木', to: '銀座', time: '12:00-12:35' }
      ]
    },
    {
      id: 'BK004',
      status: 'completed',
      date: '2024-06-05',
      time: '09:15',
      from: '横浜駅',
      to: '東京駅',
      duration: '55分',
      cost: '¥550',
      modes: ['train'],
      details: [
        { mode: 'train', line: 'JR東海道線', from: '横浜', to: '東京', time: '09:15-10:10' }
      ]
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800">確定済み</Badge>;
      case 'upcoming':
        return <Badge className="bg-green-100 text-green-800">予定</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">完了</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">キャンセル</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'upcoming':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'train': return <Train className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      case 'car': return <Car className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    console.log('Cancelling booking:', bookingId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">予約管理</h1>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          新しい予約
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の予約</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              先月から +3件
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">予定中</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              今週の予定
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了済み</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              今月完了
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">キャンセル率</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.3%</div>
            <p className="text-xs text-muted-foreground">
              先月から -2.1%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">予約一覧</h2>
        
        {bookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(booking.status)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">#{booking.id}</span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{booking.cost}</span>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.from}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.to}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.duration}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {booking.details.map((detail, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getModeIcon(detail.mode)}
                      <span className="font-medium">{detail.line}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm">{detail.from} → {detail.to}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {detail.time}
                    </div>
                  </div>
                ))}
              </div>

              {booking.status === 'confirmed' || booking.status === 'upcoming' ? (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    詳細を見る
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                    <X className="mr-1 h-3 w-3" />
                    キャンセル
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    詳細を見る
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}