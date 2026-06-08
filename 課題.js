const geoJsonPath = './N03-20250101_prefecture.json'; 
const csvPath = './温度.csv'; 

let parsedClimateData = []; 
let currentType = 'avg'; // 'avg' | 'max' | 'min'

const chartDom = document.getElementById('chart');
const myChart = echarts.init(chartDom);

/**
 * 日付文字列のパース（6-Jan や 25-Nov などに対応）
 */
function parseDateStr(dateStr) {
    if (!dateStr) return null;
    
    const cleanStr = dateStr.trim().replace(/[\r\n]/g, '');
    if (!cleanStr || cleanStr === '日付' || cleanStr === '年月') return null;

    if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-'); 
        if (parts.length !== 2) return null;

        const monthMap = { 
            'Jan':1, 'Feb':2, 'Mar':3, 'Apr':4, 'May':5, 'Jun':6, 
            'Jul':7, 'Aug':8, 'Sep':9, 'Oct':10, 'Nov':11, 'Dec':12 
        };

        let monthRaw = parts[1].trim();
        let yearRaw = parts[0].trim();
        
        if (isNaN(parts[0]) && monthMap[parts[0].substring(0,3)]) {
            monthRaw = parts[0].trim();
            yearRaw = parts[1].trim();
        }

        const monthKey = monthRaw.substring(0, 3);
        const month = monthMap[monthKey];
        if (!month) return null;

        let yearNum = parseInt(yearRaw);
        if (isNaN(yearNum)) return null;

        if (yearNum < 100) {
            yearNum += (yearNum >= 50) ? 1900 : 2000;
        }
        
        return { year: yearNum, month: month };
    }
    
    return null;
}

/**
 * CSVパース関数
 */
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const rawPrefNames = lines[0].split(',');
    const dataRows = lines.slice(1); 
    const result = [];

    function sanitizePrefName(name) {
        if (!name) return '';
        let trimmed = name.trim().replace(/^\uFEFF/, '');
        if (trimmed === '兵庫') return '兵庫県'; 
        return trimmed;
    }

    dataRows.forEach(row => {
        const cols = row.split(',');
        const dateStr = cols[0]; 
        const dateObj = parseDateStr(dateStr);
        if (!dateObj) return;

        for (let i = 1; i < cols.length; i += 3) {
            const prefRaw = rawPrefNames[i];
            if (!prefRaw || prefRaw.trim() === '') continue;

            const prefName = sanitizePrefName(prefRaw);
            if (!prefName) continue;

            const val1 = cols[i] ? parseFloat(cols[i].trim()) : NaN;
            const val2 = cols[i+1] ? parseFloat(cols[i+1].trim()) : NaN;
            const val3 = cols[i+2] ? parseFloat(cols[i+2].trim()) : NaN;

            const avgTemp = isNaN(val1) ? null : val1;
            const minTemp = isNaN(val2) ? null : val2;
            const maxTemp = isNaN(val3) ? null : val3;

            result.push({
                year: dateObj.year,
                month: dateObj.month,
                pref: prefName,
                avg: avgTemp,
                min: minTemp,
                max: maxTemp
            });
        }
    });

    console.log(`【デバッグ】CSVから合計 ${result.length} 件のデータを読み込みました。`);
    return result;
}

/**
 * 地図の描画・更新
 */
function updateChart() {
    const year = parseInt(document.getElementById('yearSlider').value);
    const month = parseInt(document.getElementById('monthSlider').value);
    
    const filtered = parsedClimateData.filter(d => d.year === year && d.month === month);
    
    const validValues = filtered
        .map(d => d[currentType])
        .filter(v => v !== null && !isNaN(v));

    let minVisual = -5;
    let maxVisual = 35;

    if (validValues.length > 0) {
        minVisual = Math.min(...validValues);
        maxVisual = Math.max(...validValues);
        if (maxVisual - minVisual < 1) {
            maxVisual += 1;
        }
    }

    const mapData = filtered.map(d => {
        return {
            name: d.pref,       
            value: d[currentType] 
        };
    });

    const typeLabel = currentType === 'avg' ? '平均気温' : (currentType === 'max' ? '最高気温' : '最低気温');

    myChart.setOption({
        tooltip: {
            trigger: 'item',
            position: [20, 20], // 左上に固定
            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
            borderColor: '#ccc',
            borderWidth: 1,
            padding: 10,
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#333'
            },
            formatter: function(params) {
                if (params.value !== undefined && !isNaN(params.value)) {
                    return `${params.name}<br><span style="font-size:12px; font-weight:normal; color:#666;">${typeLabel}: ${params.value}℃</span>`;
                }
                return `${params.name}<br><span style="font-size:12px; font-weight:normal; color:#666;">データ無し</span>`;
            }
        },
        visualMap: {
            min: minVisual,
            max: maxVisual,
            text: ['高', '低'],
            realtime: false,
            calculable: true,
            inRange: {
                color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
            }
        },
        series: [
    {
          name: '県庁所在地気候データ',
            type: 'map',
            map: 'japan_geojson',
            roam: true,
            nameProperty: 'N03_001', 

        // クリック時のハイライトを無効化
        selectedMode: false, 

        // --- 修正ポイント：文字を絶対に表示しない設定 ---
        label: {
            show: false // 普段から県の名前を表示しない
        },

        emphasis: {
            label: {
                show: false // ★マウスを乗せたときも県の名前を表示しない
            },
            // もしマウスを乗せたときに、その県の色が変わるのすら邪魔な場合は
            // 以下のコメントアウトを解除すると、ホバーしても完全に無反応にできます
            itemStyle: {
                areaColor: null // 通常時の色のままにする
            }
            
        },

        // --- 都道府県ごとのデータ ---
        data: mapData
            // CSVから読み込んだデータが入る部分
        
    }
]
    });
}

myChart.showLoading();

Promise.all([
    fetch(geoJsonPath).then(res => {
        if (!res.ok) throw new Error('GeoJSONの読み込み失敗');
        return res.json();
    }),
    fetch(csvPath).then(res => {
        if (!res.ok) throw new Error('CSVの読み込み失敗');
        return res.arrayBuffer();
    })
])
.then(([geoJson, csvBuffer]) => {
    myChart.hideLoading();
    
    echarts.registerMap('japan_geojson', geoJson, { nameProperty: 'N03_001' });
    
    const utf8Decoder = new TextDecoder('utf-8');
    const csvText = utf8Decoder.decode(csvBuffer);
    
    parsedClimateData = parseCSV(csvText);
    
    updateChart();
    
    document.getElementById('yearSlider').addEventListener('input', (e) => {
        document.getElementById('yearDisplay').textContent = e.target.value;
        updateChart();
    });
    
    document.getElementById('monthSlider').addEventListener('input', (e) => {
        document.getElementById('monthDisplay').textContent = e.target.value;
        updateChart();
    });
    
    document.querySelectorAll('input[name="dataType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentType = e.target.value;
            updateChart();
        });
    });
})
.catch(error => {
    myChart.hideLoading();
    console.error("エラー詳細:", error);
});