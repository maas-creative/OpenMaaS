'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Receipt,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export function RevenueReport() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock revenue data
  const revenueOverview = {
    total: 854723000,
    previousTotal: 812450000,
    growth: 5.2,
    target: 900000000,
    achievement: 94.9,
  };

  const revenueByType = [
    { type: '定期券', amount: 385225350, percentage: 45, trend: 3.2 },
    { type: '回数券', amount: 256416900, percentage: 30, trend: -1.5 },
    { type: '単発乗車券', amount: 128208450, percentage: 15, trend: 8.7 },
    { type: '特別券・企画券', amount: 85472300, percentage: 10, trend: 12.3 },
  ];

  const routeRevenue = [
    { route: '山手線', revenue: 212500000, passengers: 1250000, avgFare: 170 },
    { route: '中央線', revenue: 151300000, passengers: 890000, avgFare: 170 },
    { route: '京浜東北線', revenue: 173400000, passengers: 1020000, avgFare: 170 },
    { route: '東海道線', revenue: 163200000, passengers: 680000, avgFare: 240 },
    { route: '総武線', revenue: 154323000, passengers: 742300, avgFare: 208 },
  ];

  const paymentMethods = [
    { method: 'ICカード', amount: 598306100, percentage: 70 },
    { method: 'モバイル決済', amount: 153850140, percentage: 18 },
    { method: '現金', amount: 85472300, percentage: 10 },
    { method: 'クレジットカード', amount: 17094460, percentage: 2 },
  ];

  const monthlyTrend = [
    { month: '1月', revenue: 782450000, target: 800000000 },
    { month: '2月', revenue: 798230000, target: 820000000 },
    { month: '3月', revenue: 812450000, target: 850000000 },
    { month: '4月', revenue: 854723000, target: 900000000 },
  ];

  const formatCurrency = (amount: number) => {
    return `¥${(amount / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総収益</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueOverview.total)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              前期比 +{revenueOverview.growth}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">目標達成率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueOverview.achievement}%</div>
            <p className="text-xs text-muted-foreground">
              目標: {formatCurrency(revenueOverview.target)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均運賃</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥185</div>
            <p className="text-xs text-muted-foreground">
              <ArrowUpRight className="inline h-3 w-3 text-green-600" />
              前月比 +¥5
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">決済手数料</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥12.8M</div>
            <p className="text-xs text-muted-foreground">
              収益の1.5%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Type */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>券種別収益</CardTitle>
              <CardDescription>
                チケットタイプ別の収益内訳
              </CardDescription>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">日次</SelectItem>
                <SelectItem value="week">週次</SelectItem>
                <SelectItem value="month">月次</SelectItem>
                <SelectItem value="year">年次</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueByType.map((type) => (
              <div key={type.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{type.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(type.amount)} ({type.percentage}%)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {type.trend > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${type.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(type.trend)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${type.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route Performance */}
      <Card>
        <CardHeader>
          <CardTitle>路線別収益実績</CardTitle>
          <CardDescription>
            各路線の収益パフォーマンス
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">路線</th>
                  <th className="text-right py-2">収益</th>
                  <th className="text-right py-2">乗客数</th>
                  <th className="text-right py-2">平均運賃</th>
                  <th className="text-right py-2">収益/km</th>
                </tr>
              </thead>
              <tbody>
                {routeRevenue.map((route) => (
                  <tr key={route.route} className="border-b">
                    <td className="py-3 font-medium">{route.route}</td>
                    <td className="text-right py-3">{formatCurrency(route.revenue)}</td>
                    <td className="text-right py-3">{route.passengers.toLocaleString()}</td>
                    <td className="text-right py-3">¥{route.avgFare}</td>
                    <td className="text-right py-3">
                      <Badge variant="outline">高効率</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>決済方法別内訳</CardTitle>
          <CardDescription>
            利用された決済方法の割合
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{method.method}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(method.amount)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{method.percentage}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>月次収益推移</CardTitle>
          <CardDescription>
            目標対比での収益推移
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center text-muted-foreground">
              <PieChart className="h-12 w-12 mx-auto mb-4" />
              <p>月次推移グラフ表示エリア</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>財務レポート出力</CardTitle>
          <CardDescription>
            詳細な財務分析レポートをダウンロード
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              収益サマリー
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              詳細レポート
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              予実分析
            </Button>
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              カスタムレポート
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}