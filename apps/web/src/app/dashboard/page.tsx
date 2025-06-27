'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Map, Calendar, Clock, TrendingUp, Train, Bus, Car, Bike, Zap, Plus, ArrowUp, Leaf, Wallet, Users, MapPin, Navigation, BarChart3, CheckCircle } from 'lucide-react';
import TransitStatusMap from '@/components/map/transit-status-map';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [transitStatus] = useState([
    { line: 'JR山手線', status: 'normal', delay: 0 },
    { line: '東京メトロ銀座線', status: 'delay', delay: 5 },
    { line: '都営大江戸線', status: 'normal', delay: 0 },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getIcon = (mode: string) => {
    switch (mode) {
      case '電車': return <Train className="w-5 h-5 text-blue-600" />;
      case 'バス': return <Bus className="w-5 h-5 text-green-600" />;
      case '車': return <Car className="w-5 h-5 text-red-600" />;
      case '自転車': return <Bike className="w-5 h-5 text-yellow-600" />;
      default: return <Train className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 transition-colors duration-300">
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 fade-in">
        {/* Header */}
        <div className="relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50 slide-in-left">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 dark:from-blue-600/20 dark:to-green-600/20"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                ダッシュボード
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                {currentTime.toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} {currentTime.toLocaleTimeString('ja-JP')}
              </p>
            </div>
          </div>
          <Button className="relative bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <Plus className="mr-2 h-5 w-5" />
            新しい旅行を計画
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 stagger-item group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">今月の旅行</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">12</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-2">
                    <ArrowUp className="w-3 h-3" />
                    先月から +20.1%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/50 border border-green-200/50 dark:border-green-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 stagger-item group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-green-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">移動時間削減</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">2.5時間</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    効率的なルート選択により
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/50 dark:to-emerald-800/50 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 stagger-item group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-emerald-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">CO2削減量</p>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">15.2kg</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    公共交通機関の利用で
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/50 dark:to-yellow-800/50 border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 stagger-item group">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/5 to-yellow-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">節約金額</p>
                  <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">¥8,400</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    最適化されたルートで
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        {/* Transit Status Map */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 mb-6">
          <div className="lg:col-span-2">
            <TransitStatusMap height="h-80" />
          </div>
          
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 slide-in-right">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                  <Zap className="h-5 w-5 text-white animate-pulse" />
                </div>
                運行アラート
              </CardTitle>
              <CardDescription>
                影響のある路線の詳細情報
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transitStatus.filter(line => line.status !== 'normal').map((line, i) => (
                  <div key={i} className="relative overflow-hidden flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-md`}>
                        <Train className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{line.line}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{line.delay}分遅延</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="shadow-sm">
                      遅延中
                    </Badge>
                  </div>
                ))}
                {transitStatus.filter(line => line.status === 'normal').length === transitStatus.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p className="font-medium">すべての路線が正常運行中</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Real-time Transit Status */}
          <Card className="lg:col-span-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 slide-in-left">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Train className="h-5 w-5 text-white" />
                </div>
                路線別運行状況
              </CardTitle>
              <CardDescription>
                主要路線の詳細な運行情報
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transitStatus.map((line, i) => (
                  <div key={i} className="relative overflow-hidden flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${line.status === 'normal' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-red-500 to-red-600'} rounded-full flex items-center justify-center shadow-md`}>
                        <Train className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{line.line}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">主要路線</p>
                      </div>
                    </div>
                    <Badge 
                      variant={line.status === 'normal' ? 'default' : 'destructive'}
                      className={`text-sm font-medium px-4 py-2 rounded-full shadow-sm ${
                        line.status === 'normal' 
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0' 
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0'
                      }`}
                    >
                      {line.status === 'normal' ? '正常運行' : `${line.delay}分遅延`}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 slide-in-right">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 h-14 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 group transition-all duration-300">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                新しいルートを検索
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-14 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 group transition-all duration-300">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                予定を追加
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-14 border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 group transition-all duration-300">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                グループ旅行を計画
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-14 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 group transition-all duration-300">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                月次レポート表示
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3 bg-card dark:bg-card shadow-sm hover:shadow-md transition-shadow slide-in-left">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                最近の旅行
              </CardTitle>
              <CardDescription>
                最近完了した旅行の一覧です
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { from: '渋谷駅', to: '東京駅', time: '今日 14:30', mode: '電車', cost: '¥160', duration: '24分' },
                  { from: '新宿駅', to: '品川駅', time: '昨日 09:15', mode: '電車', cost: '¥200', duration: '18分' },
                  { from: '六本木', to: '銀座', time: '昨日 20:45', mode: 'バス', cost: '¥220', duration: '25分' },
                ].map((trip, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border hover:shadow-sm transition-shadow cursor-pointer stagger-item">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                      {getIcon(trip.mode)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">
                        {trip.from} → {trip.to}
                      </p>
                      <p className="text-sm text-gray-500">
                        {trip.time} • {trip.duration}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{trip.cost}</p>
                      <p className="text-xs text-gray-500">{trip.mode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-card dark:bg-card shadow-sm hover:shadow-md transition-shadow slide-in-left">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                今週の予定
              </CardTitle>
              <CardDescription>
                予約済みの旅行
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: '出張', date: '明日 08:00', destination: '大阪', type: 'business', status: 'confirmed' },
                  { title: '会議', date: '金曜 15:30', destination: '横浜', type: 'meeting', status: 'pending' },
                  { title: '家族旅行', date: '土曜 10:00', destination: '鎌倉', type: 'leisure', status: 'confirmed' },
                ].map((event, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 space-y-3 hover:shadow-sm transition-shadow stagger-item">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{event.title}</p>
                      <Badge 
                        variant={event.status === 'confirmed' ? 'default' : 'secondary'}
                        className={`text-xs font-medium ${
                          event.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {event.status === 'confirmed' ? '確定' : '保留中'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {event.date} • {event.destination}
                    </p>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={event.status === 'confirmed' ? 100 : 50} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-gray-500 font-medium">
                        {event.status === 'confirmed' ? '準備完了' : '計画中'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}