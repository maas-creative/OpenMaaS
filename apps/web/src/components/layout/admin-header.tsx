'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, Database, Settings, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavigation = [
  { name: '管理ダッシュボード', href: '/admin', icon: BarChart3 },
  { name: 'ユーザー管理', href: '/admin/users', icon: Users },
  { name: '交通データ管理', href: '/admin/transit', icon: Database },
  { name: 'システム設定', href: '/admin/settings', icon: Settings },
];

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-red-50/95 backdrop-blur supports-[backdrop-filter]:bg-red-50/60">
      <div className="container flex h-14 items-center">
        <div className="mr-6 flex items-center">
          <Link className="flex items-center space-x-2" href="/admin">
            <Shield className="h-6 w-6 text-red-600" />
            <span className="font-bold text-red-800">OpenMaaS Admin</span>
          </Link>
        </div>
        
        <nav className="flex items-center space-x-6 text-sm font-medium">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 transition-colors hover:text-red-700',
                  pathname === item.href
                    ? 'text-red-800'
                    : 'text-red-600/80'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline-block">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Admin search can go here */}
          </div>
          <nav className="flex items-center">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-sm font-medium text-red-600/80 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline-block">ユーザー画面に戻る</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}