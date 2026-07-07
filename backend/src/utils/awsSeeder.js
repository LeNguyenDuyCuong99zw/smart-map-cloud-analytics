/**
 * awsSeeder.js
 * Cào địa điểm thực tế tại TP.HCM và đẩy dữ liệu lên cơ sở dữ liệu AWS (DynamoDB) qua Lambda
 */

const axios = require('axios');

const AWS_LAMBDA_URL = 'https://ilymibyahd.execute-api.ap-southeast-1.amazonaws.com/default/LogMapSearchHistory';

async function seedAWSDatabase() {
  console.log('🔄 Bước 1: Đang cào dữ liệu địa điểm thực tế tại TP.HCM từ Overpass...');

  // Bán kính 1200m quanh Quận 1
  const query = `[out:json];
    node(around:1200, 10.7769, 106.6994)[amenity~"cafe|restaurant|museum"];
    out;`;

  const overpassUrl = `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const overpassRes = await axios.get(overpassUrl, {
      timeout: 20000,
      headers: { 'User-Agent': 'MapVitSeeder/1.0' }
    });

    const elements = overpassRes.data.elements || [];
    const validPlaces = elements.filter(item => item.tags && item.tags.name).slice(0, 50); // Đẩy thử 50 địa điểm tiêu biểu

    console.log(`✅ Đã cào thành công ${validPlaces.length} địa điểm.`);
    console.log('\n🔄 Bước 2: Đang bắt đầu đẩy dữ liệu lên AWS DynamoDB...');

    // Lặp qua từng địa điểm và gửi lên AWS Lambda
    let successCount = 0;
    for (let i = 0; i < validPlaces.length; i++) {
      const item = validPlaces[i];
      const category = item.tags.amenity;
      const name = item.tags.name;

      // Phân chia query để khớp với cấu trúc log (Search hoặc Place)
      const isSearch = Math.random() > 0.4;
      const logData = {
        userId: `user_seeded_${Math.floor(Math.random() * 5) + 1}`, // Giả lập 5 user khác nhau
        query: isSearch ? `Search: ${name}` : name,
        name: isSearch ? `Search: ${name}` : `Place: ${name}`,
        lat: item.lat,
        lng: item.lon
      };

      try {
        await axios.post(AWS_LAMBDA_URL, logData);
        successCount++;
        console.log(`  [${i + 1}/${validPlaces.length}] Đã đẩy: ${name} (${category}) -> AWS`);
      } catch (err) {
        console.warn(`  [${i + 1}/${validPlaces.length}] Lỗi đẩy địa điểm "${name}":`, err.message);
      }

      // Giãn cách 200ms giữa các request để tránh quá tải API Gateway
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n🏆 HOÀN THÀNH: Đã lưu thành công ${successCount}/${validPlaces.length} địa điểm thực tế lên AWS DynamoDB!`);
  } catch (error) {
    console.error('❌ Lỗi tiến trình seeding:', error.message);
  }
}

seedAWSDatabase();
