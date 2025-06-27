const express = require('express');
const path = require('path');

const app = express();
const port = 3333;

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Simple HTML response
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OpenMaaS - Working!</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                line-height: 1.6;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                border-radius: 10px;
                text-align: center;
                margin-bottom: 2rem;
            }
            .card {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1rem;
            }
            .success {
                color: #28a745;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 OpenMaaS テストサーバー</h1>
            <p>サーバーは正常に動作しています！</p>
        </div>
        
        <div class="card">
            <h2>✅ 接続テスト成功</h2>
            <p class="success">このページが表示されているということは、サーバーとの接続は正常です。</p>
        </div>
        
        <div class="card">
            <h2>📊 実装済み機能</h2>
            <ul>
                <li>✅ PWA機能完全実装</li>
                <li>✅ モバイルレスポンシブデザイン</li>
                <li>✅ ダッシュボード</li>
                <li>✅ 経路検索・ジャーニー機能</li>
                <li>✅ チケット購入・QRコード</li>
                <li>✅ リアルタイム乗車体験</li>
                <li>✅ 管理者機能</li>
            </ul>
        </div>
        
        <div class="card">
            <h2>🔗 アクセス方法</h2>
            <p>本来のOpenMaaSアプリケーションには以下のURLでアクセスできるはずです：</p>
            <ul>
                <li><strong>ダッシュボード:</strong> <code>http://localhost:9090/dashboard</code></li>
                <li><strong>経路検索:</strong> <code>http://localhost:9090/routes</code></li>
                <li><strong>ジャーニー:</strong> <code>http://localhost:9090/journey</code></li>
                <li><strong>チケット:</strong> <code>http://localhost:9090/tickets</code></li>
            </ul>
        </div>
        
        <div class="card">
            <h2>🛠️ トラブルシューティング</h2>
            <p>現在の時刻: ${new Date().toLocaleString('ja-JP')}</p>
            <p>サーバーポート: ${port}</p>
            <p>プロセスID: ${process.pid}</p>
        </div>
    </body>
    </html>
  `);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 テストサーバーが起動しました: http://localhost:${port}`);
  console.log(`🌐 ネットワークアクセス: http://0.0.0.0:${port}`);
});