'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  BarChart3, 
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Percent,
  FileText,
  PlusCircle,
  Tag,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, withAuth } from '@/hooks/useAuth';
import { UserRole } from '@openmaas/types';
import { Badge } from '@/components/ui/badge';

function ProviderDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Mock data for dashboard
  const stats = {
    totalSales: 127,
    revenue: 3847500,
    activePackages: 24,
    conversionRate: 12.5,
    avgTicketPrice: 30295,
    inventory: 1850,
  };

  const topPackages = [
    { 
      id: 1,
      name: '東京日帰り観光パス',
      type: 'day_pass',
      sold: 45,
      revenue: 450000,
      inventory: 200,
      price: 10000,
      rating: 4.8
    },
    { 
      id: 2,
      name: '関東周遊3日間パス',
      type: 'multi_day',
      sold: 28,
      revenue: 840000,
      inventory: 150,
      price: 30000,
      rating: 4.6
    },
    { 
      id: 3,
      name: '箱根温泉旅行セット',
      type: 'package',
      sold: 18,
      revenue: 720000,
      inventory: 80,
      price: 40000,
      rating: 4.9
    },
    { 
      id: 4,
      name: '鎌倉・江ノ島観光きっぷ',
      type: 'day_pass',
      sold: 36,
      revenue: 252000,
      inventory: 300,
      price: 7000,
      rating: 4.7
    },
  ];

  const recentOrders = [
    { 
      id: 'ORD-001',
      customer: '田中様',
      package: '東京日帰り観光パス',
      quantity: 2,
      total: 20000,
      status: '確定',
      time: '10分前'
    },
    { 
      id: 'ORD-002',
      customer: '鈴木様',
      package: '関東周遊3日間パス',
      quantity: 1,
      total: 30000,
      status: '処理中',
      time: '25分前'
    },
    { 
      id: 'ORD-003',
      customer: 'Johnson様',
      package: '箱根温泉旅行セット',
      quantity: 4,
      total: 160000,
      status: '確定',
      time: '1時間前'
    },
  ];

  const transportTypes = [
    { type: '鉄道', percentage: 65, color: 'bg-blue-500' },
    { type: 'バス', percentage: 25, color: 'bg-green-500' },
    { type: 'フェリー', percentage: 10, color: 'bg-purple-500' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">チケット提供者ダッシュボード</h1>
        <p className="text-muted-foreground mt-2">
          {user?.organizationData && 'providerName' in user.organizationData 
            ? user.organizationData.providerName 
            : 'チケット販売管理システム'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の販売数</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
              前日比 +23.5%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              平均単価: ¥{stats.avgTicketPrice.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効パッケージ</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePackages}</div>
            <p className="text-xs text-muted-foreground">
              在庫総数: {stats.inventory.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン率</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              目標: 15.0%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブ顧客</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              リピート率: 34.2%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">手数料率</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.0%</div>
            <p className="text-xs text-muted-foreground">
              収益: ¥{(stats.revenue * 0.08).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="packages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="packages">パッケージ管理</TabsTrigger>
          <TabsTrigger value="orders">注文管理</TabsTrigger>
          <TabsTrigger value="analytics">販売分析</TabsTrigger>
          <TabsTrigger value="pricing">価格設定</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">人気パッケージ</h3>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              新規パッケージ作成
            </Button>
          </div>
          
          <div className="grid gap-4">
            {topPackages.map((pkg) => (
              <Card key={pkg.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {pkg.type === 'day_pass' ? '日帰りパス' : 
                             pkg.type === 'multi_day' ? '複数日パス' : 'パッケージ'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            評価: ⭐ {pkg.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                      <div>
                        <p className="text-sm text-muted-foreground">販売数</p>
                        <p className="font-semibold">{pkg.sold}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">売上</p>
                        <p className="font-semibold">¥{pkg.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">在庫</p>
                        <p className="font-semibold">{pkg.inventory}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">価格</p>
                        <p className="font-semibold">¥{pkg.price.toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="outline">編集</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>最新の注文</CardTitle>
              <CardDescription>
                リアルタイムで更新される注文情報
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer} - {order.package} × {order.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">¥{order.total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {order.time}
                        </p>
                      </div>
                      <Badge variant={order.status === '確定' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                      <Button size="sm" variant="outline">詳細</Button>
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
              <CardTitle>販売分析</CardTitle>
              <CardDescription>
                交通手段別の販売割合
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transportTypes.map((transport) => (
                  <div key={transport.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{transport.type}</span>
                      <span className="font-medium">{transport.percentage}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${transport.color}`}
                        style={{ width: `${transport.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>詳細な売上チャートをここに表示</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>価格設定管理</CardTitle>
              <CardDescription>
                動的価格設定とプロモーション管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <Tag className="h-12 w-12 mr-4" />
                <p>価格設定インターフェースをここに表示</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          新規パッケージ
        </Button>
        <Button variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          売上レポート
        </Button>
        <Button variant="outline">
          <Tag className="mr-2 h-4 w-4" />
          プロモーション作成
        </Button>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          在庫管理
        </Button>
      </div>
    </div>
  );
}

export default withAuth(ProviderDashboard, {
  roles: [UserRole.TICKET_PROVIDER, UserRole.ADMIN],
});