'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Clock,
  MapPin,
  Calendar,
  Download,
  FileText
} from 'lucide-react';

export function PassengerAnalytics() {
  // Mock data for analytics
  const hourlyData = [
    { hour: '6:00', passengers: 3200 },
    { hour: '7:00', passengers: 8500 },
    { hour: '8:00', passengers: 15200 },
    { hour: '9:00', passengers: 12000 },
    { hour: '10:00', passengers: 6500 },
    { hour: '11:00', passengers: 5200 },
    { hour: '12:00', passengers: 7800 },
    { hour: '13:00', passengers: 6900 },
    { hour: '14:00', passengers: 5400 },
    { hour: '15:00', passengers: 6200 },
    { hour: '16:00', passengers: 7500 },
    { hour: '17:00', passengers: 11200 },
    { hour: '18:00', passengers: 14500 },
    { hour: '19:00', passengers: 10200 },
    { hour: '20:00', passengers: 6800 },
  ];

  const stationRanking = [
    { station: '新宿駅', passengers: 28500, change: 5.2 },
    { station: '渋谷駅', passengers: 24200, change: -2.1 },
    { station: '東京駅', passengers: 22800, change: 3.8 },
    { station: '池袋駅', passengers: 19600, change: 1.5 },
    { station: '品川駅', passengers: 18200, change: 7.3 },
  ];

  const passengerTypes = [
    { type: '定期券利用者', count: 32450, percentage: 45 },
    { type: '回数券利用者', count: 21650, percentage: 30 },
    { type: '単発利用者', count: 18080, percentage: 25 },
  ];

  const peakHours = [
    { period: '朝ラッシュ (7:00-9:00)', average: 11900, occupancy: 185 },
    { period: '昼間 (10:00-16:00)', average: 6200, occupancy: 95 },
    { period: '夕ラッシュ (17:00-19:00)', average: 11966, occupancy: 190 },
    { period: '夜間 (20:00-23:00)', average: 4800, occupancy: 75 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の総乗客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">132,180</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
              前日比 +3.4%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均乗車率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124%</div>
            <p className="text-xs text-muted-foreground">
              混雑率基準: 100%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ピーク時乗客数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,200</div>
            <p className="text-xs text-muted-foreground">
              8:00-9:00
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均乗車時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5分</div>
            <p className="text-xs text-muted-foreground">
              全路線平均
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>時間帯別乗客数</CardTitle>
              <CardDescription>
                1時間ごとの乗客数推移
              </CardDescription>
            </div>
            <Select defaultValue="today">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">本日</SelectItem>
                <SelectItem value="yesterday">昨日</SelectItem>
                <SelectItem value="week">今週</SelectItem>
                <SelectItem value="month">今月</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>時間帯別グラフ表示エリア</p>
            </div>
          </div>
          
          {/* Peak Hours Summary */}
          <div className="mt-6 space-y-3">
            {peakHours.map((period) => (
              <div key={period.period} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{period.period}</p>
                  <p className="text-sm text-muted-foreground">
                    平均 {period.average.toLocaleString()}人
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{period.occupancy}%</p>
                  <p className="text-sm text-muted-foreground">混雑率</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Station Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>駅別乗降客数ランキング</CardTitle>
          <CardDescription>
            本日の乗降客数上位駅
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stationRanking.map((station, index) => (
              <div key={station.station} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{station.station}</p>
                    <p className="text-sm text-muted-foreground">
                      {station.passengers.toLocaleString()}人
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {station.change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${station.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(station.change)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Passenger Types */}
      <Card>
        <CardHeader>
          <CardTitle>利用者種別分析</CardTitle>
          <CardDescription>
            チケットタイプ別の利用状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {passengerTypes.map((type) => (
              <div key={type.type} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{type.type}</span>
                  <span className="font-medium">{type.count.toLocaleString()}人</span>
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

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>レポート出力</CardTitle>
          <CardDescription>
            詳細な分析レポートをダウンロード
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              日次レポート
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              週次レポート
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              月次レポート
            </Button>
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              カスタムレポート作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}