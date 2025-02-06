const express = require('express');
const cors = require('cors'); // 引入 cors 中間件
const request = require('request');
const cheerio = require('cheerio');

const app = express();

app.use(cors()); // 啟用 CORS
app.use(express.json());

// API Endpoint: 獲取城市清單
app.get('/api/cities', (req, res) => {
  getCities((cities) => {
    if (cities.length === 0) {
      res.status(500).json({ error: 'Failed to fetch cities' });
    } else {
      res.json(cities); // 回傳城市清單
    }
  });
});

// API Endpoint: 獲取指定城市的商店
app.get('/api/stores', (req, res) => {
  const city = req.query.city;
  if (!city) {
    return res.status(400).json({ error: 'City is required' });
  }

  getStories(city, (stores) => {
    if (stores.length === 0) {
      res.status(500).json({ error: `Failed to fetch stores for city: ${city}` });
    } else {
      res.json(stores); // 回傳商店清單
    }
  });
});

/**
 * 獲取城市清單函數（使用 POST）
 * 這裡改用 POST 請求到 AJAX 端點，並送出適當的 form 資料
 */
function getCities(callback) {
  console.log('callback', callback);
  
  const options = {
    url: 'http://www.ibon.com.tw/retail_inquiry_ajax.aspx',
    method: 'POST',
    form: {
      strTargetField: 'COUNTY',
      strKeyWords: ''  // 空字串表示取得所有縣市
    }
  };

  request(options, (err, response, body) => {
    console.log('response',response);
    
    if (err || response.statusCode !== 200) {
      console.error(`Error fetching cities: ${err || response.statusCode}`);
      callback([]);
      return;
    }

    try {
      const $ = cheerio.load(body);
      // 假設 AJAX 回傳的 HTML 內含 <select id="Class1">，
      // 且各城市資訊在 <option> 標籤中
      const cities = $('#Class1 option')
        .map((index, element) => $(element).text().trim())
        .get();

      console.log('Cities fetched:', cities);
      callback(cities);
    } catch (parseError) {
      console.error('Error parsing cities:', parseError);
      callback([]);
    }
  });
}

/**
 * 獲取商店清單函數
 * 透過 POST 請求指定城市的商店資訊
 */
function getStories(city, callback) {
  console.log('city:', city);
  
  const options = {
    url: 'http://www.ibon.com.tw/retail_inquiry_ajax.aspx',
    method: 'POST',
    form: {
      strTargetField: 'COUNTY',
      strKeyWords: city,
    },
  };

  request(options, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      console.error(`Error fetching stores for ${city}: ${err || response.statusCode}`);
      callback([]);
      return;
    }

    try {
      const $ = cheerio.load(body);
      const stores = $('tr')
        .map((index, element) => ({
          id: $(element).find('td').eq(0).text().trim(),
          store: $(element).find('td').eq(1).text().trim(),
          address: $(element).find('td').eq(2).text().trim(),
        }))
        .get();

      // 第一筆通常為表頭，因此移除
      stores.shift();
      console.log(`Stores fetched for ${city}:`, stores);
      callback(stores);
    } catch (parseError) {
      console.error(`Error parsing stores for ${city}:`, parseError);
      callback([]);
    }
  });
}

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});