'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Upload, 
  Download, 
  RefreshCw, 
  Search, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Train,
  Bus,
  MapPin,
  Calendar,
  Activity,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminTransitPage() {
  const [gtfsFeeds] = useState([
    {
      id: 'feed_001',
      name: 'JR東日本 山手線',
      provider: 'JR East',
      status: 'active',
      lastUpdate: '2024-06-10 06:00',
      routes: 29,
      stops: 580,
      trips: 2450,
      fileSize: '15.2MB',
      validFrom: '2024-06-01',
      validTo: '2024-08-31'
    },
    {
      id: 'feed_002',
      name: '東京メトロ全線',
      provider: 'Tokyo Metro',
      status: 'active',
      lastUpdate: '2024-06-10 05:30',
      routes: 13,
      stops: 285,
      trips: 1890,
      fileSize: '12.8MB',
      validFrom: '2024-06-01',
      validTo: '2024-08-31'
    },
    {
      id: 'feed_003',
      name: '都営地下鉄',
      provider: 'Toei Subway',
      status: 'warning',
      lastUpdate: '2024-06-09 18:45',
      routes: 4,
      stops: 106,
      trips: 720,
      fileSize: '5.4MB',
      validFrom: '2024-06-01',
      validTo: '2024-08-31'
    },
    {
      id: 'feed_004',
      name: '都営バス',
      provider: 'Toei Bus',
      status: 'error',
      lastUpdate: '2024-06-08 12:20',
      routes: 180,
      stops: 3200,
      trips: 8500,
      fileSize: '45.6MB',
      validFrom: '2024-06-01',
      validTo: '2024-08-31'
    }
  ]);

  const [realtimeFeeds] = useState([
    {
      id: 'rt_001',
      name: 'JR東日本 リアルタイム',
      provider: 'JR East',
      status: 'active',
      lastUpdate: '30秒前',
      alerts: 2,
      delays: 5,
      cancellations: 0
    },
    {
      id: 'rt_002',
      name: '東京メトロ リアルタイム',
      provider: 'Tokyo Metro',
      status: 'active',
      lastUpdate: '45秒前',
      alerts: 0,
      delays: 1,
      cancellations: 0
    },
    {
      id: 'rt_003',
      name: '都営地下鉄 リアルタイム',
      provider: 'Toei Subway',
      status: 'warning',
      lastUpdate: '2分前',
      alerts: 1,
      delays: 3,
      cancellations: 0
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">正常</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>;
      case 'error':
        return <Badge variant="destructive">エラー</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleFeedAction = (action: string, feedId: string) => {
    console.log(`${action} feed:`, feedId);
  };

  return (
    <>
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-red-800">交通データ管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            GTFSアップロード
          </Button>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブフィード</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3件が更新待ち
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ルート数</CardTitle>
            <Train className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">226</div>
            <p className="text-xs text-muted-foreground">
              電車・バス・地下鉄
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総停留所数</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,171</div>
            <p className="text-xs text-muted-foreground">
              関東圏内
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">データ更新頻度</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              過去30日の成功率
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GTFS Feeds Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>GTFSフィード管理</CardTitle>
              <CardDescription>
                静的な交通データの管理と更新
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                全て更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gtfsFeeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(feed.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{feed.name}</span>
                      <span className="text-sm text-muted-foreground">by {feed.provider}</span>
                      {getStatusBadge(feed.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Train className="h-3 w-3" />
                        {feed.routes} ルート
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {feed.stops} 停留所
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {feed.lastUpdate}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{feed.trips}</div>
                    <div className="text-muted-foreground">運行数</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{feed.fileSize}</div>
                    <div className="text-muted-foreground">ファイルサイズ</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{feed.validTo}</div>
                    <div className="text-muted-foreground">有効期限</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedAction('view', feed.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedAction('edit', feed.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedAction('refresh', feed.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedAction('delete', feed.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Feeds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            リアルタイムフィード
          </CardTitle>
          <CardDescription>
            GTFS-RTデータの監視と管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {realtimeFeeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(feed.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{feed.name}</span>
                      {getStatusBadge(feed.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      最終更新: {feed.lastUpdate}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{feed.alerts}</div>
                    <div className="text-muted-foreground">アラート</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-600">{feed.delays}</div>
                    <div className="text-muted-foreground">遅延</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-600">{feed.cancellations}</div>
                    <div className="text-muted-foreground">運休</div>
                  </div>
                  <Button variant="outline" size="sm">
                    詳細を見る
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality & Validation */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>データ品質チェック</CardTitle>
            <CardDescription>
              GTFSデータの整合性と品質
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">データ整合性</span>
              <Badge className="bg-green-100 text-green-800">良好</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">停留所位置精度</span>
              <Badge className="bg-green-100 text-green-800">98.5%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">時刻表データ</span>
              <Badge className="bg-yellow-100 text-yellow-800">要確認</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">ルート定義</span>
              <Badge className="bg-green-100 text-green-800">完全</Badge>
            </div>
            <Button variant="outline" className="w-full">
              詳細レポートを表示
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>システム統計</CardTitle>
            <CardDescription>
              データ処理とパフォーマンス
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">日次データ更新</span>
              <span className="font-semibold">12/12 成功</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">リアルタイム処理</span>
              <span className="font-semibold">15.2k/分</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API応答時間</span>
              <span className="font-semibold">145ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">ストレージ使用量</span>
              <span className="font-semibold">2.1GB / 10GB</span>
            </div>
            <Button variant="outline" className="w-full">
              パフォーマンス詳細
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}