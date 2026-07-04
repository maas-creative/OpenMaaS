'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Train, 
  Bus, 
  Bike, 
  MapPin, 
  Calendar, 
  CreditCard,
  Users,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const features = [
    {
      icon: <Train className="h-8 w-8" />,
      title: "マルチモーダル交通",
      description: "電車、バス、自転車など複数の交通手段を組み合わせた最適なルートを提案"
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "リアルタイム情報",
      description: "運行状況や遅延情報をリアルタイムで確認できます"
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "簡単予約",
      description: "複数の交通機関をワンストップで予約・決済"
    },
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: "統合決済",
      description: "すべての交通手段の料金をまとめて支払い"
    }
  ];

  const mockLogin = (email: string) => {
    const mockUsers = {
      'user@example.com': {
        id: '1',
        externalId: 'keycloak-1',
        email: 'user@example.com',
        roles: ['USER'],
        profile: {
          firstName: '太郎',
          lastName: '山田',
          displayName: '山田太郎',
        },
        preferences: {
          language: 'ja',
          currency: 'JPY',
          timezone: 'Asia/Tokyo',
          notifications: {
            email: true,
            push: true,
            sms: false,
            tripReminders: true,
            serviceAlerts: true,
            promotions: false,
          },
        },
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
      },
      'operator@jr.example.com': {
        id: '2',
        externalId: 'keycloak-2',
        email: 'operator@jr.example.com',
        roles: ['TRANSPORT_OPERATOR'],
        profile: {
          firstName: '次郎',
          lastName: '鈴木',
          displayName: 'JR東日本 運行管理者',
        },
        preferences: {
          language: 'ja',
          currency: 'JPY',
          timezone: 'Asia/Tokyo',
          notifications: {
            email: true,
            push: true,
            sms: true,
            tripReminders: false,
            serviceAlerts: true,
            promotions: false,
          },
        },
        createdAt: new Date('2023-06-01').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
        organizationData: {
          operatorId: 'jr-east',
          operatorName: 'JR東日本',
          operatorType: 'rail',
          coverageArea: ['東京', '神奈川', '埼玉', '千葉', '茨城', '栃木', '群馬'],
          fleetSize: 1200,
          activeRoutes: 85,
          certifications: ['ISO9001', 'ISO14001'],
          permissions: {
            canManageSchedules: true,
            canViewAnalytics: true,
            canManageFleet: true,
            canSetPricing: false,
            canViewFinancials: true,
            canManageStaff: false,
          },
        },
      },
      'provider@jtb.example.com': {
        id: '3',
        externalId: 'keycloak-3',
        email: 'provider@jtb.example.com',
        roles: ['TICKET_PROVIDER'],
        profile: {
          firstName: '花子',
          lastName: '佐藤',
          displayName: 'JTB 商品企画担当',
        },
        preferences: {
          language: 'ja',
          currency: 'JPY',
          timezone: 'Asia/Tokyo',
          notifications: {
            email: true,
            push: true,
            sms: false,
            tripReminders: false,
            serviceAlerts: true,
            promotions: true,
          },
        },
        createdAt: new Date('2023-09-01').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
        organizationData: {
          providerId: 'jtb-001',
          providerName: 'JTB',
          providerType: 'travel_agency',
          supportedTransportTypes: ['rail', 'bus', 'ferry', 'tram'],
          commissionRate: 0.08,
          contractStartDate: new Date('2023-01-01').toISOString(),
          contractEndDate: new Date('2025-12-31').toISOString(),
          permissions: {
            canCreatePackages: true,
            canSetPricing: true,
            canViewSalesData: true,
            canManageInventory: true,
            canIssueRefunds: true,
            canAccessCustomerData: false,
          },
        },
      },
      'admin@openmaas.example.com': {
        id: '4',
        externalId: 'keycloak-4',
        email: 'admin@openmaas.example.com',
        roles: ['ADMIN'],
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          displayName: 'システム管理者',
        },
        preferences: {
          language: 'ja',
          currency: 'JPY',
          timezone: 'Asia/Tokyo',
          notifications: {
            email: true,
            push: true,
            sms: true,
            tripReminders: false,
            serviceAlerts: true,
            promotions: false,
          },
        },
        createdAt: new Date('2023-01-01').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
      },
    };

    const user = mockUsers[email as keyof typeof mockUsers];
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90"></div>
        <div className="relative container mx-auto px-4 py-24">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-6">
              未来の移動を、今ここに
            </h1>
            <p className="text-xl mb-8 opacity-90">
              OpenMaaSは、すべての交通手段を統合し、<br />
              あなたの移動をシームレスに最適化します
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => router.push('/dashboard')}
              >
                今すぐ始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-blue-600"
              >
                詳細を見る
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          OpenMaaSの特徴
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Operations Snapshot Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-100 bg-blue-50/60">
            <CardHeader>
              <div className="flex items-center gap-3 text-blue-700">
                <Bus className="h-6 w-6" />
                <CardTitle className="text-lg">運行ネットワーク</CardTitle>
              </div>
              <CardDescription>鉄道・バス・フェリーを横断して運行状況を確認</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-900">128</p>
              <p className="text-sm text-blue-700">連携中の路線</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-emerald-50/60">
            <CardHeader>
              <div className="flex items-center gap-3 text-emerald-700">
                <Bike className="h-6 w-6" />
                <CardTitle className="text-lg">ラストワンマイル</CardTitle>
              </div>
              <CardDescription>シェアサイクルと徒歩接続を含めた移動提案</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-900">42</p>
              <p className="text-sm text-emerald-700">利用可能なモビリティ拠点</p>
            </CardContent>
          </Card>
          <Card className="border-violet-100 bg-violet-50/60">
            <CardHeader>
              <div className="flex items-center gap-3 text-violet-700">
                <Users className="h-6 w-6" />
                <CardTitle className="text-lg">利用者サポート</CardTitle>
              </div>
              <CardDescription>予約・決済・遅延通知をまとめて追跡</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-violet-900">24/7</p>
              <p className="text-sm text-violet-700">サポート監視</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Demo Users Section */}
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>デモユーザーでログイン</CardTitle>
            <CardDescription>
              以下のユーザーでシステムの機能を体験できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => mockLogin('user@example.com')}
              >
                <div className="text-left">
                  <p className="font-semibold">一般利用者</p>
                  <p className="text-sm text-gray-600">user@example.com</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => mockLogin('operator@jr.example.com')}
              >
                <div className="text-left">
                  <p className="font-semibold">交通事業者</p>
                  <p className="text-sm text-gray-600">operator@jr.example.com</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => mockLogin('provider@jtb.example.com')}
              >
                <div className="text-left">
                  <p className="font-semibold">チケット提供者</p>
                  <p className="text-sm text-gray-600">provider@jtb.example.com</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => mockLogin('admin@openmaas.example.com')}
              >
                <div className="text-left">
                  <p className="font-semibold">システム管理者</p>
                  <p className="text-sm text-gray-600">admin@openmaas.example.com</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            移動の未来を体験しよう
          </h2>
          <p className="text-xl mb-8 opacity-90">
            OpenMaaSで、より便利で効率的な移動を実現します
          </p>
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push('/dashboard')}
          >
            無料で始める
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
