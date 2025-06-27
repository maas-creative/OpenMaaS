'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, Download, Plus, Calendar, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock } from 'lucide-react';

export default function PaymentsPage() {
  const [paymentMethods] = useState([
    {
      id: 'pm_1',
      type: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    },
    {
      id: 'pm_2',
      type: 'mastercard',
      last4: '5555',
      expiryMonth: 8,
      expiryYear: 2026,
      isDefault: false
    }
  ]);

  const [transactions] = useState([
    {
      id: 'tx_001',
      type: 'payment',
      amount: '¥520',
      description: '渋谷駅 → 東京駅',
      date: '2024-06-10',
      status: 'completed',
      method: 'Visa ****4242'
    },
    {
      id: 'tx_002',
      type: 'refund',
      amount: '¥1,200',
      description: '六本木 → 銀座 (キャンセル)',
      date: '2024-06-08',
      status: 'completed',
      method: 'Visa ****4242'
    },
    {
      id: 'tx_003',
      type: 'payment',
      amount: '¥200',
      description: '新宿駅 → 品川駅',
      date: '2024-06-05',
      status: 'completed',
      method: 'MasterCard ****5555'
    },
    {
      id: 'tx_004',
      type: 'payment',
      amount: '¥550',
      description: '横浜駅 → 東京駅',
      date: '2024-06-05',
      status: 'pending',
      method: 'Visa ****4242'
    }
  ]);

  const getCardBrand = (type: string) => {
    switch (type) {
      case 'visa':
        return '🇻 Visa';
      case 'mastercard':
        return '🇲 Mastercard';
      case 'amex':
        return '🇦 American Express';
      default:
        return '💳 カード';
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'payment' ? 
      <ArrowUpRight className="h-4 w-4 text-red-600" /> :
      <ArrowDownLeft className="h-4 w-4 text-green-600" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">処理中</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">決済・請求</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          請求書をダウンロード
        </Button>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の支出</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥8,420</div>
            <p className="text-xs text-muted-foreground">
              先月から +12.3%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">節約金額</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥2,100</div>
            <p className="text-xs text-muted-foreground">
              効率的なルート選択で
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の取引</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              15回の支払い、9回の返金
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均単価</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥351</div>
            <p className="text-xs text-muted-foreground">
              1回の旅行あたり
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>支払い方法</CardTitle>
              <CardDescription>
                登録されている支払い方法の管理
              </CardDescription>
            </div>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              カードを追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getCardBrand(method.type)} ****{method.last4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary">デフォルト</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      有効期限: {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    編集
                  </Button>
                  <Button variant="ghost" size="sm">
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>取引履歴</CardTitle>
          <CardDescription>
            最近の支払いと返金の履歴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{transaction.description}</span>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{transaction.date}</span>
                      <span>{transaction.method}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${
                    transaction.type === 'payment' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {transaction.type === 'payment' ? '-' : '+'}{transaction.amount}
                  </span>
                  <Button variant="ghost" size="sm">
                    詳細
                  </Button>
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
  );
}