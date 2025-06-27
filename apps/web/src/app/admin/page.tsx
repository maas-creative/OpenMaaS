'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Database,
  Zap
} from 'lucide-react';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminDashboardPage() {
  const systemStats = {
    totalUsers: 15420,
    activeUsers: 8930,
    totalTrips: 45320,
    totalRevenue: '¥12,450,000',
    systemUptime: '99.97%',
    apiLatency: '120ms'
  };

  const recentAlerts = [
    {
      id: 1,
      type: 'warning',
      message: 'JR山手線で15分の遅延が発生',
      time: '5分前',
      status: 'active'
    },
    {
      id: 2,
      type: 'info',
      message: '新規ユーザー登録が急増（+25%）',
      time: '1時間前',
      status: 'resolved'
    },
    {
      id: 3,
      type: 'error',
      message: 'Stripe API でタイムアウトエラー',
      time: '3時間前',
      status: 'resolved'
    }
  ];

  const topRoutes = [
    { from: '渋谷駅', to: '新宿駅', count: 1250, trend: '+5.2%' },
    { from: '東京駅', to: '品川駅', count: 980, trend: '+2.1%' },
    { from: '新宿駅', to: '池袋駅', count: 750, trend: '-1.8%' },
    { from: '横浜駅', to: '東京駅', count: 680, trend: '+8.5%' }
  ];

  const systemServices = [
    { name: 'Auth Service', status: 'healthy', uptime: '99.95%', port: '3001' },
    { name: 'User Service', status: 'healthy', uptime: '99.98%', port: '3002' },
    { name: 'Transit Service', status: 'warning', uptime: '98.50%', port: '3003' },
    { name: 'Route Service', status: 'healthy', uptime: '99.92%', port: '3004' },
    { name: 'Booking Service', status: 'healthy', uptime: '99.89%', port: '3005' },
    { name: 'Payment Service', status: 'healthy', uptime: '99.97%', port: '3006' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-red-800">管理ダッシュボード</h1>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">
            システム正常
          </Badge>
          <Button variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            リアルタイム監視
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600" />
              今月 +12.5%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブユーザー</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              過去24時間
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総旅行回数</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalTrips.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600" />
              今月 +8.2%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              今月の売上
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最新のアラート</CardTitle>
            <CardDescription>
              システムとサービスの重要な通知
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                  <Badge 
                    variant={alert.status === 'active' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.status === 'active' ? 'アクティブ' : '解決済み'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              システム状態
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>稼働時間</span>
                <span className="font-medium text-green-600">{systemStats.systemUptime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>API応答時間</span>
                <span className="font-medium">{systemStats.apiLatency}</span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">マイクロサービス</h4>
              <div className="space-y-2">
                {systemServices.slice(0, 3).map((service) => (
                  <div key={service.name} className="flex items-center justify-between text-xs">
                    <span>{service.name}</span>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status === 'healthy' ? '正常' : '警告'}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                すべて表示
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Routes */}
      <Card>
        <CardHeader>
          <CardTitle>人気ルート</CardTitle>
          <CardDescription>
            最も利用頻度の高いルートとトレンド
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topRoutes.map((route, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-800 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{route.from} → {route.to}</div>
                    <div className="text-sm text-muted-foreground">
                      {route.count.toLocaleString()} 回利用
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    route.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {route.trend}
                  </span>
                  {route.trend.startsWith('+') ? 
                    <TrendingUp className="h-4 w-4 text-green-600" /> :
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
          <CardDescription>
            よく使用される管理機能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>ユーザー管理</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Database className="h-6 w-6" />
              <span>データ管理</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Zap className="h-6 w-6" />
              <span>システム設定</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Activity className="h-6 w-6" />
              <span>パフォーマンス</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}