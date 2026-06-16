
const mapChart = echarts.init(document.getElementById('map-container'));

async function startProject() {
    try {
        // 1. お手元のGeoJSONファイルを読み込み
        const geoResponse = await fetch('N03-20250101_prefecture.json');
        if (!geoResponse.ok) throw new Error("GeoJSONの取得に失敗しました");
        const geoJson = await geoResponse.json();

        // 2. EChartsに日本地図を登録（プロパティ: 'N03_001'）
        echarts.registerMap('japan', geoJson, { nameProperty: 'N03_001' });

        // 3. 地図の表示オプション設定（表示だけの最小限の設定）
        const mapOption = {
           
            series: [{
                type: 'map',
                map: 'japan',
                
                roam: false, // 地図の移動・拡大縮小は完全禁止（固定）
                
                // 地図の位置を下側に下げるための配置調整
                center: [137.5, 37.5], 
                zoom: 1.35, 
                
                itemStyle: {
                    borderColor: '#94a3b8', // 市区町村の境界線
                    borderWidth: 0.3,
                    areaColor: '#cbd5e1' // 地図のベースカラー（ライトグレー）
                },
                emphasis: {
                    itemStyle: { areaColor: '#60a5fa' } // ホバー時はきれいな青色に変化
                }
            }]
        };

        // 4. 地図を描画
        mapChart.setOption(mapOption);

    } catch (err) {
        console.error('エラーが発生しました:', err);
    }
}

// 画面サイズ変更時に自動追従
window.addEventListener('resize', () => {
    mapChart.resize();
});

startProject();