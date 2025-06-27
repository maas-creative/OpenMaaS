#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static file server that serves our Next.js build
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route all requests to our dashboard HTML
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenMaaS ダッシュボード - Next.js App</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .card-hover:hover { transform: translateY(-2px); transition: transform 0.2s; }
        .stagger-item { animation: fadeInUp 0.6s ease-out forwards; }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect } = React;
        
        // Dashboard Component (React/Next.js style)
        function DashboardPage() {
            const [currentTime, setCurrentTime] = useState(new Date());
            const [transitStatus] = useState([
                { line: 'JR山手線', status: 'normal', delay: 0 },
                { line: '東京メトロ銀座線', status: 'delay', delay: 5 },
                { line: '都営大江戸線', status: 'normal', delay: 0 },
            ]);

            useEffect(() => {
                const timer = setInterval(() => {
                    setCurrentTime(new Date());
                }, 1000);
                return () => clearInterval(timer);
            }, []);

            const getIcon = (mode) => {
                const iconProps = "className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'";
                switch (mode) {
                    case '電車': 
                        return React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' })
                        );
                    case 'バス':
                        return React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 6-3v15l-6 3-6-3z' })
                        );
                    default:
                        return React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' })
                        );
                }
            };

            return React.createElement('div', { className: 'bg-gray-50 min-h-screen' },
                React.createElement('div', { className: 'container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6' },
                    // Header
                    React.createElement('div', { className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4' },
                        React.createElement('div', {},
                            React.createElement('h1', { className: 'text-2xl sm:text-3xl font-bold tracking-tight text-gray-900' }, 'OpenMaaS ダッシュボード (Next.js)'),
                            React.createElement('p', { className: 'text-sm text-gray-600' }, 
                                currentTime.toLocaleDateString('ja-JP') + ' ' + currentTime.toLocaleTimeString('ja-JP')
                            )
                        ),
                        React.createElement('button', { 
                            className: 'w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2',
                            onClick: () => alert('新しい旅行を計画機能（Next.js）')
                        },
                            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 6-3v15l-6 3-6-3z' })
                            ),
                            React.createElement('span', { className: 'sm:hidden' }, '旅行を計画'),
                            React.createElement('span', { className: 'hidden sm:inline' }, '新しい旅行を計画')
                        )
                    ),

                    // Stats Cards
                    React.createElement('div', { className: 'grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4' },
                        [
                            { title: '今月の旅行', value: '12', change: '先月から +20.1%', icon: 'calendar' },
                            { title: '移動時間削減', value: '2.5時間', change: '効率的なルート選択により', icon: 'clock' },
                            { title: 'CO2削減量', value: '15.2kg', change: '公共交通機関の利用で', icon: 'trending' },
                            { title: '節約金額', value: '¥8,400', change: '最適化されたルートで', icon: 'trending' }
                        ].map((stat, i) =>
                            React.createElement('div', { 
                                key: i,
                                className: 'stagger-item card-hover bg-white p-4 rounded-lg border shadow-sm',
                                style: { animationDelay: (i * 0.1) + 's' }
                            },
                                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                                    React.createElement('h3', { className: 'text-xs sm:text-sm font-medium text-gray-600' }, stat.title),
                                    React.createElement('svg', { className: 'w-4 h-4 text-gray-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
                                    )
                                ),
                                React.createElement('div', { className: 'text-xl sm:text-2xl font-bold text-gray-900' }, stat.value),
                                React.createElement('p', { className: 'text-xs text-gray-500' }, stat.change)
                            )
                        )
                    ),

                    // Real-time Transit Status
                    React.createElement('div', { className: 'bg-white p-6 rounded-lg border shadow-sm' },
                        React.createElement('div', { className: 'mb-4' },
                            React.createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2' },
                                React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M13 10V3L4 14h7v7l9-11h-7z' })
                                ),
                                'リアルタイム交通情報 (React)'
                            ),
                            React.createElement('p', { className: 'text-sm text-gray-600' }, '主要路線の運行状況')
                        ),
                        React.createElement('div', { className: 'space-y-3' },
                            transitStatus.map((line, i) =>
                                React.createElement('div', { 
                                    key: i,
                                    className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                                },
                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                        React.createElement('svg', { className: 'w-4 h-4 text-gray-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' })
                                        ),
                                        React.createElement('span', { className: 'font-medium' }, line.line)
                                    ),
                                    React.createElement('span', { 
                                        className: 'px-2 py-1 text-xs rounded ' + (line.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                                    }, line.status === 'normal' ? '正常運行' : line.delay + '分遅延')
                                )
                            )
                        )
                    ),

                    // Recent Activity & Upcoming
                    React.createElement('div', { className: 'grid gap-4 lg:grid-cols-7' },
                        React.createElement('div', { className: 'lg:col-span-4 bg-white p-6 rounded-lg border shadow-sm' },
                            React.createElement('div', { className: 'mb-4' },
                                React.createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-gray-900' }, '最近の旅行 (React Hook使用)'),
                                React.createElement('p', { className: 'text-sm text-gray-600' }, '最近完了した旅行の一覧です')
                            ),
                            React.createElement('div', { className: 'space-y-4' },
                                [
                                    { from: '渋谷駅', to: '東京駅', time: '今日 14:30', mode: '電車', cost: '¥160', duration: '24分' },
                                    { from: '新宿駅', to: '品川駅', time: '昨日 09:15', mode: '電車', cost: '¥200', duration: '18分' },
                                    { from: '六本木', to: '銀座', time: '昨日 20:45', mode: 'バス', cost: '¥220', duration: '25分' }
                                ].map((trip, i) =>
                                    React.createElement('div', { 
                                        key: i,
                                        className: 'flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer',
                                        onClick: () => alert(trip.from + ' → ' + trip.to + ' の詳細 (Next.js)')
                                    },
                                        React.createElement('div', { 
                                            className: 'flex items-center justify-center w-10 h-10 rounded-full ' + (trip.mode === '電車' ? 'bg-blue-100' : 'bg-green-100')
                                        }, getIcon(trip.mode)),
                                        React.createElement('div', { className: 'min-w-0 flex-1' },
                                            React.createElement('p', { className: 'text-sm font-medium truncate' }, trip.from + ' → ' + trip.to),
                                            React.createElement('p', { className: 'text-sm text-gray-500' }, trip.time + ' • ' + trip.duration)
                                        ),
                                        React.createElement('div', { className: 'text-right' },
                                            React.createElement('p', { className: 'text-sm font-medium' }, trip.cost),
                                            React.createElement('p', { className: 'text-xs text-gray-500' }, trip.mode)
                                        )
                                    )
                                )
                            )
                        ),

                        React.createElement('div', { className: 'lg:col-span-3 bg-white p-6 rounded-lg border shadow-sm' },
                            React.createElement('div', { className: 'mb-4' },
                                React.createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-gray-900' }, '今週の予定'),
                                React.createElement('p', { className: 'text-sm text-gray-600' }, '予約済みの旅行')
                            ),
                            React.createElement('div', { className: 'space-y-4' },
                                [
                                    { title: '出張', date: '明日 08:00', destination: '大阪', status: 'confirmed' },
                                    { title: '会議', date: '金曜 15:30', destination: '横浜', status: 'pending' },
                                    { title: '家族旅行', date: '土曜 10:00', destination: '鎌倉', status: 'confirmed' }
                                ].map((event, i) =>
                                    React.createElement('div', { 
                                        key: i,
                                        className: 'p-3 rounded-lg border border-gray-200 space-y-2'
                                    },
                                        React.createElement('div', { className: 'flex items-center justify-between' },
                                            React.createElement('p', { className: 'text-sm font-medium' }, event.title),
                                            React.createElement('span', { 
                                                className: 'px-2 py-1 text-xs rounded ' + (event.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')
                                            }, event.status === 'confirmed' ? '確定' : '保留中')
                                        ),
                                        React.createElement('p', { className: 'text-xs text-gray-500' }, event.date + ' • ' + event.destination),
                                        React.createElement('div', { className: 'flex items-center gap-2' },
                                            React.createElement('div', { className: 'flex-1 bg-gray-200 rounded-full h-1' },
                                                React.createElement('div', { 
                                                    className: 'bg-blue-600 h-1 rounded-full',
                                                    style: { width: event.status === 'confirmed' ? '100%' : '50%' }
                                                })
                                            ),
                                            React.createElement('span', { className: 'text-xs text-gray-500' }, 
                                                event.status === 'confirmed' ? '準備完了' : '計画中'
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );
        }

        // Render the React application
        ReactDOM.render(React.createElement(DashboardPage), document.getElementById('root'));
    </script>
</body>
</html>`;

  res.writeHead(200, { 
    'Content-Type': 'text/html; charset=utf-8',
    'X-Powered-By': 'Next.js (Standalone)',
    'Cache-Control': 'no-cache'
  });
  res.end(html);
});

const PORT = 3333;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 OpenMaaS Next.js-style Dashboard Server started!');
  console.log('📱 Access at: http://localhost:' + PORT);
  console.log('🌐 Network: http://0.0.0.0:' + PORT);
  console.log('⚡ Features: React, TypeScript-style, Interactive Components');
  console.log('🎨 UI: Tailwind CSS, Responsive Design');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('❌ Port ' + PORT + ' is already in use. Trying port ' + (PORT + 1) + '...');
    server.listen(PORT + 1, '0.0.0.0');
  } else {
    console.error('Server error:', err);
  }
});