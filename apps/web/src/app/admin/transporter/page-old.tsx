'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Train, 
  BarChart3, 
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
  Activity,
  MapPin,
  Settings,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, withAuth } from '@/hooks/useAuth';
import { UserRole } from '@openmaas/types';
import { OperationManagement } from '@/components/admin/transporter/operation-management';
import { PassengerAnalytics } from '@/components/admin/transporter/passenger-analytics';
import { RevenueReport } from '@/components/admin/transporter/revenue-report';

function TransporterDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Mock data for dashboard
  const stats = {
    totalPassengers: 45823,
    activeVehicles: 142,
    onTimeRate: 94.2,
    revenue: 8547230,
    incidents: 3,
    delayedRoutes: 2,
  };

  const routePerformance = [
    { route: '山手線', passengers: 12500, onTime: 96.5, revenue: 2125000 },
    { route: '中央線', passengers: 8900, onTime: 92.3, revenue: 1513000 },
    { route: '京浜東北線', passengers: 10200, onTime: 94.8, revenue: 1734000 },
    { route: '東海道線', passengers: 6800, onTime: 91.2, revenue: 1632000 },
    { route: '総武線', passengers: 7423, onTime: 95.7, revenue: 1543230 },
  ];

  const recentIncidents = [
    { id: 1, route: '中央線', type: '車両故障', time: '14:23', status: '対応中', impact: '5分遅延' },
    { id: 2, route: '山手線', type: '混雑', time: '08:45', status: '解決済み', impact: '2分遅延' },
    { id: 3, route: '東海道線', type: '信号故障', time: '07:30', status: '対応中', impact: '10分遅延' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">交通事業者ダッシュボード</h1>
        <p className="text-muted-foreground mt-2">
          {user?.organizationData && 'operatorName' in user.organizationData 
            ? user.organizationData.operatorName 
            : '運行管理システム'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の乗客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPassengers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
              前日比 +12.3%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">定時運行率</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeRate}%</div>
            <p className="text-xs text-muted-foreground">
              目標: 95.0%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働車両</CardTitle>
            <Train className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeVehicles} / 150</div>
            <p className="text-xs text-muted-foreground">
              稼働率: 94.7%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の収益</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
              前日比 +8.5%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">インシデント</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.delayedRoutes} 路線で遅延発生中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">システム状態</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">正常</div>
            <p className="text-xs text-muted-foreground">
              全システム稼働中
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="operations">運行管理</TabsTrigger>
          <TabsTrigger value="passengers">乗客分析</TabsTrigger>
          <TabsTrigger value="revenue">収益レポート</TabsTrigger>
          <TabsTrigger value="schedule">スケジュール</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>路線別パフォーマンス</CardTitle>
              <CardDescription>
                本日の路線別運行実績
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routePerformance.map((route) => (
                  <div key={route.route} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Train className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{route.route}</p>
                        <p className="text-sm text-muted-foreground">
                          {route.passengers.toLocaleString()} 名乗車
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">定時運行率</p>
                        <p className={`font-medium ${route.onTime >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {route.onTime}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">収益</p>
                        <p className="font-medium">¥{route.revenue.toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="outline">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>最新のインシデント</CardTitle>
              <CardDescription>
                運行に影響を与えている事象
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <AlertCircle className={`h-5 w-5 ${
                        incident.status === '対応中' ? 'text-red-500' : 'text-green-500'
                      }`} />
                      <div>
                        <p className="font-medium">{incident.route} - {incident.type}</p>
                        <p className="text-sm text-muted-foreground">
                          発生時刻: {incident.time} | 影響: {incident.impact}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        incident.status === '対応中' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {incident.status}
                      </span>
                      <Button size="sm" variant="outline">対応詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>乗客データ分析</CardTitle>
              <CardDescription>
                時間帯別・路線別の詳細分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mr-4" />
                <p>分析チャートをここに表示</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>運行スケジュール管理</CardTitle>
              <CardDescription>
                本日の運行計画と調整
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <Calendar className="h-12 w-12 mr-4" />
                <p>運行スケジュールをここに表示</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Button>
          <MapPin className="mr-2 h-4 w-4" />
          運行状況マップ
        </Button>
        <Button variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          詳細レポート
        </Button>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          スタッフ管理
        </Button>
        <Button variant="outline">
          <Train className="mr-2 h-4 w-4" />
          車両管理
        </Button>
      </div>
    </div>
  );
}

export default withAuth(TransporterDashboard, {
  roles: [UserRole.TRANSPORT_OPERATOR, UserRole.ADMIN],
});