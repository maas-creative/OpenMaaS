'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Settings, Bell, Shield, Calendar, TrendingUp, Award, Edit } from 'lucide-react';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState({
    name: '田中 太郎',
    email: 'tanaka@example.com',
    phone: '090-1234-5678',
    address: '東京都渋谷区渋谷1-1-1',
    joinDate: '2024-01-15',
    totalTrips: 124,
    totalDistance: '2,450km',
    co2Saved: '320kg',
    favoriteMode: '電車'
  });

  const [preferences] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    privacy: {
      shareLocation: true,
      analytics: true,
      marketing: false
    },
    defaultSettings: {
      preferredMode: 'eco',
      maxWalkingDistance: '800m',
      language: 'ja'
    }
  });

  const [achievements] = useState([
    { id: 1, title: 'エコ旅行者', description: '100回以上公共交通機関を利用', earned: true },
    { id: 2, title: '効率マスター', description: '50回以上最適ルートを選択', earned: true },
    { id: 3, title: 'CO2セイバー', description: '100kg以上のCO2を削減', earned: true },
    { id: 4, title: '探検家', description: '10都市以上を訪問', earned: false },
    { id: 5, title: 'ナイトライダー', description: '50回以上夜間移動', earned: false }
  ]);

  const handleProfileUpdate = () => {
    console.log('Updating profile...');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">プロフィール</h1>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          設定
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>基本情報</CardTitle>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-3 w-3" />
                編集
              </Button>
            </div>
            <CardDescription>
              アカウントの基本情報を管理
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={userProfile.address}
                    onChange={(e) => setUserProfile({...userProfile, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleProfileUpdate} className="w-full md:w-auto">
              プロフィールを更新
            </Button>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              統計情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{userProfile.totalTrips}</div>
              <p className="text-sm text-muted-foreground">総旅行回数</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{userProfile.totalDistance}</div>
              <p className="text-sm text-muted-foreground">総移動距離</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userProfile.co2Saved}</div>
              <p className="text-sm text-muted-foreground">CO2削減量</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{userProfile.favoriteMode}</div>
              <p className="text-sm text-muted-foreground">よく利用する交通手段</p>
            </div>
            <div className="text-center pt-2 border-t">
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                登録日: {userProfile.joinDate}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            実績・バッジ
          </CardTitle>
          <CardDescription>
            あなたの旅行実績とエコ活動
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 border rounded-lg ${
                  achievement.earned ? 'bg-muted/50 border-green-200' : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Award className={`h-5 w-5 ${
                    achievement.earned ? 'text-yellow-500' : 'text-muted-foreground'
                  }`} />
                  <span className="font-semibold">{achievement.title}</span>
                  {achievement.earned && (
                    <Badge className="bg-green-100 text-green-800 text-xs">獲得済み</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">メール通知</div>
                <div className="text-sm text-muted-foreground">
                  予約確認や重要な更新
                </div>
              </div>
              <Badge variant={preferences.notifications.email ? "default" : "secondary"}>
                {preferences.notifications.email ? "有効" : "無効"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">プッシュ通知</div>
                <div className="text-sm text-muted-foreground">
                  リアルタイムの遅延情報
                </div>
              </div>
              <Badge variant={preferences.notifications.push ? "default" : "secondary"}>
                {preferences.notifications.push ? "有効" : "無効"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">SMS通知</div>
                <div className="text-sm text-muted-foreground">
                  緊急時の連絡
                </div>
              </div>
              <Badge variant={preferences.notifications.sms ? "default" : "secondary"}>
                {preferences.notifications.sms ? "有効" : "無効"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              プライバシー設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">位置情報共有</div>
                <div className="text-sm text-muted-foreground">
                  ルート最適化のため
                </div>
              </div>
              <Badge variant={preferences.privacy.shareLocation ? "default" : "secondary"}>
                {preferences.privacy.shareLocation ? "許可" : "拒否"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">利用統計</div>
                <div className="text-sm text-muted-foreground">
                  サービス改善のため
                </div>
              </div>
              <Badge variant={preferences.privacy.analytics ? "default" : "secondary"}>
                {preferences.privacy.analytics ? "許可" : "拒否"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">マーケティング</div>
                <div className="text-sm text-muted-foreground">
                  プロモーション情報
                </div>
              </div>
              <Badge variant={preferences.privacy.marketing ? "default" : "secondary"}>
                {preferences.privacy.marketing ? "許可" : "拒否"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}