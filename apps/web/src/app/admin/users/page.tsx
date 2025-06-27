'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Activity,
  Ban,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState([
    {
      id: 'USR001',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      phone: '090-1234-5678',
      status: 'active',
      joinDate: '2024-01-15',
      lastLogin: '2024-06-10 14:30',
      totalTrips: 45,
      totalSpent: '¥12,400',
      location: '東京都渋谷区'
    },
    {
      id: 'USR002',
      name: '佐藤 花子',
      email: 'sato@example.com',
      phone: '090-2345-6789',
      status: 'active',
      joinDate: '2024-02-20',
      lastLogin: '2024-06-10 09:15',
      totalTrips: 89,
      totalSpent: '¥28,900',
      location: '東京都新宿区'
    },
    {
      id: 'USR003',
      name: '山田 次郎',
      email: 'yamada@example.com',
      phone: '090-3456-7890',
      status: 'suspended',
      joinDate: '2024-03-10',
      lastLogin: '2024-06-08 16:45',
      totalTrips: 12,
      totalSpent: '¥3,200',
      location: '神奈川県横浜市'
    },
    {
      id: 'USR004',
      name: '鈴木 美咲',
      email: 'suzuki@example.com',
      phone: '090-4567-8901',
      status: 'inactive',
      joinDate: '2024-01-05',
      lastLogin: '2024-05-20 11:20',
      totalTrips: 156,
      totalSpent: '¥45,600',
      location: '東京都品川区'
    },
    {
      id: 'USR005',
      name: '高橋 健一',
      email: 'takahashi@example.com',
      phone: '090-5678-9012',
      status: 'active',
      joinDate: '2024-04-12',
      lastLogin: '2024-06-10 13:10',
      totalTrips: 67,
      totalSpent: '¥19,800',
      location: '千葉県船橋市'
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">アクティブ</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">非アクティブ</Badge>;
      case 'suspended':
        return <Badge variant="destructive">停止中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <Activity className="h-4 w-4 text-gray-600" />;
      case 'suspended':
        return <Ban className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const handleUserAction = (action: string, userId: string) => {
    console.log(`${action} user:`, userId);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-red-800">ユーザー管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規ユーザー
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,420</div>
            <p className="text-xs text-muted-foreground">
              今月 +12.5%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブユーザー</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,890</div>
            <p className="text-xs text-muted-foreground">
              全体の 83.6%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">新規登録</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-xs text-muted-foreground">
              今週
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">停止アカウント</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              要確認
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ユーザー名、メール、IDで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              フィルター
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            {filteredUsers.length} 人のユーザーが見つかりました
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(user.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-sm text-muted-foreground">#{user.id}</span>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {user.location}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{user.totalTrips}</div>
                    <div className="text-muted-foreground">旅行回数</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{user.totalSpent}</div>
                    <div className="text-muted-foreground">総支出</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{user.lastLogin.split(' ')[0]}</div>
                    <div className="text-muted-foreground">最終ログイン</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction('edit', user.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction('suspend', user.id)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction('delete', user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button variant="outline">
              さらに読み込む
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}