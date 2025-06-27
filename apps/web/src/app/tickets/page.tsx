'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  QrCode, 
  Download, 
  Share2, 
  Clock, 
  MapPin,
  Calendar,
  Check,
  X,
  Smartphone,
  Plane,
  Train,
  Bus
} from 'lucide-react';
import { DigitalTicket } from '@/components/tickets/digital-ticket';

interface Ticket {
  id: string;
  ticketNumber: string;
  type: 'train' | 'bus' | 'plane';
  status: 'active' | 'used' | 'expired' | 'cancelled';
  route: {
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    duration: number;
  };
  passenger: {
    name: string;
    type: 'adult' | 'child' | 'senior' | 'disabled';
  };
  seat?: {
    car?: string;
    seat?: string;
    class?: string;
  };
  price: number;
  purchaseDate: string;
  validUntil: string;
  qrData: string;
}

// Mock ticket data
const mockTickets: Ticket[] = [
  {
    id: '1',
    ticketNumber: 'TK-ABC12345',
    type: 'train',
    status: 'active',
    route: {
      from: '渋谷駅',
      to: '新宿駅',
      departureTime: '2024-01-15T14:30:00',
      arrivalTime: '2024-01-15T14:37:00',
      duration: 7,
    },
    passenger: {
      name: '山田太郎',
      type: 'adult',
    },
    seat: {
      car: '1号車',
      seat: '15A',
      class: '普通車',
    },
    price: 160,
    purchaseDate: '2024-01-15T10:30:00',
    validUntil: '2024-01-15T23:59:59',
    qrData: 'TK-ABC12345|2024-01-15T14:30:00|渋谷駅|新宿駅|山田太郎',
  },
  {
    id: '2',
    ticketNumber: 'TK-DEF67890',
    type: 'bus',
    status: 'active',
    route: {
      from: '新宿駅西口',
      to: '羽田空港',
      departureTime: '2024-01-16T09:00:00',
      arrivalTime: '2024-01-16T09:45:00',
      duration: 45,
    },
    passenger: {
      name: '山田太郎',
      type: 'adult',
    },
    price: 620,
    purchaseDate: '2024-01-15T18:20:00',
    validUntil: '2024-01-16T12:00:00',
    qrData: 'TK-DEF67890|2024-01-16T09:00:00|新宿駅西口|羽田空港|山田太郎',
  },
  {
    id: '3',
    ticketNumber: 'TK-GHI11111',
    type: 'train',
    status: 'used',
    route: {
      from: '東京駅',
      to: '品川駅',
      departureTime: '2024-01-14T16:15:00',
      arrivalTime: '2024-01-14T16:26:00',
      duration: 11,
    },
    passenger: {
      name: '山田太郎',
      type: 'adult',
    },
    price: 160,
    purchaseDate: '2024-01-14T15:45:00',
    validUntil: '2024-01-14T23:59:59',
    qrData: 'TK-GHI11111|2024-01-14T16:15:00|東京駅|品川駅|山田太郎',
  },
];

export default function TicketsPage() {
  const [tickets] = useState<Ticket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'used':
        return <Check className="h-4 w-4 text-gray-600" />;
      case 'expired':
      case 'cancelled':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '有効';
      case 'used':
        return '使用済み';
      case 'expired':
        return '期限切れ';
      case 'cancelled':
        return 'キャンセル';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'used':
        return 'secondary';
      case 'expired':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'train':
        return <Train className="h-4 w-4" />;
      case 'bus':
        return <Bus className="h-4 w-4" />;
      case 'plane':
        return <Plane className="h-4 w-4" />;
      default:
        return <Ticket className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ja-JP'),
      time: date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const filterTickets = (status: string) => {
    if (status === 'active') {
      return tickets.filter(t => t.status === 'active');
    } else if (status === 'history') {
      return tickets.filter(t => t.status === 'used' || t.status === 'expired' || t.status === 'cancelled');
    }
    return tickets;
  };

  const shareTicket = async (ticket: Ticket) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `チケット: ${ticket.ticketNumber}`,
          text: `${ticket.route.from} → ${ticket.route.to}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`チケット: ${ticket.ticketNumber}\n${ticket.route.from} → ${ticket.route.to}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">チケット</h1>
            <p className="text-muted-foreground">
              購入したチケットの確認と管理
            </p>
          </div>
          <Button onClick={() => window.location.href = '/routes'}>
            <Ticket className="mr-2 h-4 w-4" />
            新しいチケットを購入
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">有効なチケット</TabsTrigger>
            <TabsTrigger value="history">履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterTickets('active').map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTransportIcon(ticket.type)}
                        <CardTitle className="text-base">{ticket.ticketNumber}</CardTitle>
                      </div>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">{getStatusText(ticket.status)}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">出発</span>
                        <span className="font-medium">{ticket.route.from}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">到着</span>
                        <span className="font-medium">{ticket.route.to}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">出発時刻</span>
                        <span className="font-medium">
                          {formatDateTime(ticket.route.departureTime).time}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">金額</span>
                        <span className="font-bold">¥{ticket.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filterTickets('active').length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">有効なチケットがありません</h3>
                  <p className="text-muted-foreground mb-4">
                    新しい旅行を計画してチケットを購入しましょう
                  </p>
                  <Button onClick={() => window.location.href = '/routes'}>
                    経路を検索
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-3">
              {filterTickets('history').map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getTransportIcon(ticket.type)}
                        <div>
                          <p className="font-medium">{ticket.ticketNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.route.from} → {ticket.route.to}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(ticket.route.departureTime).date} {formatDateTime(ticket.route.departureTime).time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusVariant(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">{getStatusText(ticket.status)}</span>
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          ¥{ticket.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Digital Ticket Modal */}
      {selectedTicket && (
        <DigitalTicket
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onShare={() => shareTicket(selectedTicket)}
        />
      )}
    </div>
  );
}