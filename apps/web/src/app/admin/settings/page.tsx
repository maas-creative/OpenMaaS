'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Database, 
  Bell, 
  Shield, 
  Mail, 
  Globe, 
  Server,
  Key,
  AlertTriangle
} from 'lucide-react';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <>
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-red-800">システム設定</h1>
          <Button onClick={handleSave} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? '保存中...' : '設定を保存'}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">一般設定</TabsTrigger>
            <TabsTrigger value="database">データベース</TabsTrigger>
            <TabsTrigger value="notifications">通知設定</TabsTrigger>
            <TabsTrigger value="security">セキュリティ</TabsTrigger>
            <TabsTrigger value="api">API設定</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>基本設定</span>
                </CardTitle>
                <CardDescription>
                  システム全体の基本的な設定を管理します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="system-name">システム名</Label>
                    <Input id="system-name" defaultValue="OpenMaaS" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="system-version">バージョン</Label>
                    <Input id="system-version" defaultValue="1.0.0" disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system-description">システム説明</Label>
                  <Input 
                    id="system-description" 
                    defaultValue="統合モビリティプラットフォーム" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>メンテナンスモード</Label>
                    <p className="text-sm text-muted-foreground">
                      システムをメンテナンスモードに切り替えます
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>地域設定</CardTitle>
                <CardDescription>
                  タイムゾーンと言語の設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">タイムゾーン</Label>
                    <Input id="timezone" defaultValue="Asia/Tokyo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">デフォルト言語</Label>
                    <Input id="language" defaultValue="ja-JP" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>データベース設定</span>
                </CardTitle>
                <CardDescription>
                  PostgreSQL データベースの設定を管理します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="db-host">ホスト</Label>
                    <Input id="db-host" defaultValue="localhost" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-port">ポート</Label>
                    <Input id="db-port" defaultValue="5432" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-name">データベース名</Label>
                  <Input id="db-name" defaultValue="openmaas" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-username">ユーザー名</Label>
                  <Input id="db-username" defaultValue="postgres" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>接続プール</Label>
                    <p className="text-sm text-muted-foreground">
                      データベース接続プールを有効にします
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Redis設定</CardTitle>
                <CardDescription>
                  キャッシュとセッション管理の設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="redis-host">Redisホスト</Label>
                    <Input id="redis-host" defaultValue="localhost" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redis-port">Redisポート</Label>
                    <Input id="redis-port" defaultValue="6379" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>通知設定</span>
                </CardTitle>
                <CardDescription>
                  システム通知とアラートの設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>システムアラート</Label>
                    <p className="text-sm text-muted-foreground">
                      システムエラーや警告の通知
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>メンテナンス通知</Label>
                    <p className="text-sm text-muted-foreground">
                      メンテナンス予定の事前通知
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ユーザーアクティビティ</Label>
                    <p className="text-sm text-muted-foreground">
                      異常なユーザーアクティビティの検出
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>メール設定</span>
                </CardTitle>
                <CardDescription>
                  SMTP設定とメール通知
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTPホスト</Label>
                    <Input id="smtp-host" placeholder="smtp.example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTPポート</Label>
                    <Input id="smtp-port" defaultValue="587" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">SMTPユーザー名</Label>
                  <Input id="smtp-username" placeholder="username@example.com" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SSL/TLS</Label>
                    <p className="text-sm text-muted-foreground">
                      暗号化された接続を使用
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>セキュリティ設定</span>
                </CardTitle>
                <CardDescription>
                  認証とセキュリティポリシーの設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jwt-secret">JWTシークレット</Label>
                  <Input id="jwt-secret" type="password" placeholder="••••••••••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jwt-expiry">JWTトークン有効期限 (時間)</Label>
                  <Input id="jwt-expiry" defaultValue="24" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>2要素認証</Label>
                    <p className="text-sm text-muted-foreground">
                      管理者アカウントで2FAを強制
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>パスワードポリシー</Label>
                    <p className="text-sm text-muted-foreground">
                      強力なパスワード要件を適用
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keycloak設定</CardTitle>
                <CardDescription>
                  認証プロバイダーの設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keycloak-url">Keycloak URL</Label>
                  <Input id="keycloak-url" defaultValue="http://localhost:8080" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keycloak-realm">レルム</Label>
                  <Input id="keycloak-realm" defaultValue="openmaas" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keycloak-client">クライアントID</Label>
                  <Input id="keycloak-client" defaultValue="openmaas-web" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>API設定</span>
                </CardTitle>
                <CardDescription>
                  Kong API ゲートウェイとサービス設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kong-admin-url">Kong Admin URL</Label>
                  <Input id="kong-admin-url" defaultValue="http://localhost:8001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kong-proxy-url">Kong Proxy URL</Label>
                  <Input id="kong-proxy-url" defaultValue="http://localhost:8000" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>レート制限</Label>
                    <p className="text-sm text-muted-foreground">
                      API レート制限を有効にします
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>外部API設定</span>
                </CardTitle>
                <CardDescription>
                  外部サービスのAPIキー設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mapbox-token">Mapbox アクセストークン</Label>
                  <Input id="mapbox-token" type="password" placeholder="pk.••••••••••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-key">Stripe パブリックキー</Label>
                  <Input id="stripe-key" type="password" placeholder="pk_••••••••••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp-url">OpenTripPlanner URL</Label>
                  <Input id="otp-url" defaultValue="http://localhost:8080/otp" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span>重要な注意</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700">
                  設定の変更は即座に反映されます。機密情報（パスワード、APIキーなど）は適切に暗号化されて保存されます。
                  本番環境での設定変更は慎重に行ってください。
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}