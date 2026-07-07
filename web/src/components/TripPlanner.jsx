/**
 * TripPlanner.jsx — Giao diện Smart Trip Planner (CSP)
 * Cho phép user thêm địa điểm, chọn loại và để hệ thống CSP sắp xếp lịch trình tối ưu
 */

import { useState } from 'react';
import { planTripWithCSP, searchPlaces } from '../services/api';

const PLACE_TYPES = [
  { value: 'default', label: '📍 Địa điểm tham quan', color: '#4318FF' },
  { value: 'restaurant', label: '🍜 Nhà hàng / Quán ăn', color: '#FF6B35' },
  { value: 'cafe', label: '☕ Quán cafe', color: '#8B5E3C' },
  { value: 'museum', label: '🏛️ Bảo tàng', color: '#6B4EAF' },
  { value: 'park', label: '🌿 Công viên', color: '#01B574' },
  { value: 'shopping', label: '🛍️ Mua sắm', color: '#E91E63' },
];

const TYPE_COLORS = Object.fromEntries(PLACE_TYPES.map((t) => [t.value, t.color]));

export default function TripPlanner({ onClose, onRouteResult, userLocation }) {
  const [places, setPlaces] = useState([]);
  const [newPlace, setNewPlace] = useState({ name: '', lat: '', lng: '', type: 'default' });
  const [maxHours, setMaxHours] = useState(8);
  const [startHour, setStartHour] = useState(8);
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleNameChange = (val) => {
    setNewPlace(prev => ({ ...prev, name: val, lat: '', lng: '' })); // Reset toạ độ khi đổi chữ
    if (searchTimeout) clearTimeout(searchTimeout);

    if (val.trim().length > 1) {
      const timeout = setTimeout(async () => {
        try {
          const res = await searchPlaces(val);
          setSuggestions(res.places || []);
        } catch (err) {
          console.error(err);
        }
      }, 400);
      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (place) => {
    // Tự động nhận diện loại địa điểm (Type) dựa trên từ khóa trong tên
    let detectedType = 'default';
    const nameLower = place.name.toLowerCase();
    
    if (nameLower.includes('coffee') || nameLower.includes('cà phê') || nameLower.includes('cafe') || nameLower.includes('trà sữa')) {
      detectedType = 'cafe';
    } else if (nameLower.includes('restaurant') || nameLower.includes('nhà hàng') || nameLower.includes('quán ăn') || nameLower.includes('buffet') || nameLower.includes('phở')) {
      detectedType = 'restaurant';
    } else if (nameLower.includes('museum') || nameLower.includes('bảo tàng')) {
      detectedType = 'museum';
    } else if (nameLower.includes('park') || nameLower.includes('công viên') || nameLower.includes('vườn')) {
      detectedType = 'park';
    } else if (nameLower.includes('shopping') || nameLower.includes('mall') || nameLower.includes('chợ') || nameLower.includes('siêu thị')) {
      detectedType = 'shopping';
    }

    setNewPlace({
      name: place.name,
      lat: place.lat.toString(),
      lng: place.lng.toString(),
      type: detectedType
    });
    setSuggestions([]);
  };

  const addPlace = () => {
    const lat = parseFloat(newPlace.lat);
    const lng = parseFloat(newPlace.lng);
    if (!newPlace.name.trim()) return setError('Vui lòng nhập tên địa điểm.');
    if (isNaN(lat) || isNaN(lng)) return setError('Vui lòng chọn địa điểm từ danh sách gợi ý tự động.');
    if (places.length >= 10) return setError('Tối đa 10 địa điểm.');

    setPlaces((prev) => [
      ...prev,
      { id: `place_${Date.now()}`, name: newPlace.name.trim(), lat, lng, type: newPlace.type },
    ]);
    setNewPlace({ name: '', lat: '', lng: '', type: 'default' });
    setSuggestions([]);
    setError(null);
  };

  const removePlace = (id) => setPlaces((prev) => prev.filter((p) => p.id !== id));

  const useCurrentLocation = () => {
    if (userLocation) {
      setNewPlace((prev) => ({
        ...prev,
        name: 'Vị trí của bạn',
        lat: userLocation.lat.toFixed(6),
        lng: userLocation.lng.toFixed(6),
      }));
      setSuggestions([]);
    }
  };

  const planTrip = async () => {
    if (places.length < 1) return setError('Thêm ít nhất 1 địa điểm để lên lịch trình.');
    setLoading(true);
    setError(null);
    setSchedule(null);

    try {
      const result = await planTripWithCSP(places, maxHours, startHour);
      setSchedule(result);

      // Gửi kết quả lên MapPage để vẽ polyline
      if (onRouteResult && result.schedule) {
        const waypoints = result.schedule.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));
        onRouteResult(waypoints);
      }
    } catch (err) {
      // api.js tự unwrap .data → lỗi trả về là Error object với .message
      setError(err.message || 'Lỗi khi lên lịch trình. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>🗺️ Smart Trip Planner</div>
            <div style={styles.headerSub}>Thuật toán CSP sắp xếp lịch trình tối ưu</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Cài đặt */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>⚙️ Cài đặt lịch trình</div>
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Giờ bắt đầu</label>
                <input
                  type="number"
                  min="6" max="12" value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Tổng thời gian (giờ)</label>
                <input
                  type="number"
                  min="2" max="14" value={maxHours}
                  onChange={(e) => setMaxHours(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Thêm địa điểm */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📍 Thêm địa điểm</div>
            <div style={styles.addForm}>
              
              {/* Ô tìm kiếm địa điểm có tự động gợi ý */}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  placeholder="Nhập tên địa điểm để tìm kiếm..."
                  value={newPlace.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{ ...styles.input, width: '100%', marginBottom: 0 }}
                />
                
                {suggestions.length > 0 && (
                  <div style={styles.dropdown}>
                    {suggestions.map((p) => (
                      <div 
                        key={p.placeId} 
                        onClick={() => selectSuggestion(p)}
                        style={styles.dropdownItem}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F7FE'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#2B3674' }}>{p.name}</div>
                        {p.address && <div style={{ fontSize: '11px', color: '#A3AED0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{p.address}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.row}>
                <select
                  value={newPlace.type}
                  onChange={(e) => setNewPlace((p) => ({ ...p, type: e.target.value }))}
                  style={{ ...styles.input, flex: 1 }}
                >
                  {PLACE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {userLocation && (
                  <button onClick={useCurrentLocation} style={styles.locationBtn} title="Dùng vị trí hiện tại">
                    📌 Vị trí tôi
                  </button>
                )}
                <button onClick={addPlace} style={styles.addBtn}>+ Thêm</button>
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {/* Danh sách địa điểm đã thêm */}
            {places.length > 0 && (
              <div style={styles.placeList}>
                {places.map((p, i) => (
                  <div key={p.id} style={styles.placeItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ ...styles.typeTag, backgroundColor: TYPE_COLORS[p.type] || '#4318FF' }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={styles.placeName}>{p.name}</div>
                        <div style={styles.placeCoord}>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                      </div>
                    </div>
                    <button onClick={() => removePlace(p.id)} style={styles.removeBtn}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nút lên lịch trình */}
          <button
            onClick={planTrip}
            disabled={loading || places.length === 0}
            style={{
              ...styles.planBtn,
              opacity: loading || places.length === 0 ? 0.6 : 1,
              cursor: loading || places.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Đang tính toán CSP...' : '🚀 Lên lịch trình thông minh'}
          </button>

          {/* Kết quả lịch trình */}
          {schedule && (
            <div style={styles.scheduleResult}>
              <div style={styles.sectionTitle}>
                📅 Lịch trình tối ưu
                <span style={styles.algoTag}>CSP Backtracking</span>
              </div>

              {schedule.aiSummary && (
                <div style={styles.aiSummary}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#2B3674', lineHeight: '1.6' }}>
                    {schedule.aiSummary}
                  </p>
                </div>
              )}

              <div style={styles.summaryBar}>
                <span>🕐 {schedule.summary.startTime} - {schedule.summary.endTime || '?'}</span>
                <span>📍 {schedule.summary.totalPlaces} địa điểm</span>
                <span>⏱️ {schedule.summary.totalDurationHours}h</span>
              </div>

              {/* Timeline */}
              <div style={styles.timeline}>
                {schedule.schedule.map((item, idx) => (
                  <div key={item.id} style={styles.timelineItem}>
                    {/* Connector line */}
                    {idx < schedule.schedule.length - 1 && (
                      <div style={styles.timelineConnector}>
                        {item.travelFromPrev > 0 && (
                          <div style={styles.travelBadge}>{item.travelFromPrev} phút 🚗</div>
                        )}
                      </div>
                    )}
                    <div style={styles.timelineDot}>
                      <div style={{ ...styles.dotInner, backgroundColor: TYPE_COLORS[item.type] || '#4318FF' }}>
                        {item.order}
                      </div>
                    </div>
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineTime}>
                        {item.arrivalTime} - {item.departureTime}
                      </div>
                      <div style={styles.timelineName}>{item.name}</div>
                      <div style={styles.timelineMeta}>
                        {PLACE_TYPES.find((t) => t.value === item.type)?.label || '📍 Địa điểm'}
                        {' · '}
                        {item.visitDuration} phút tham quan
                        {item.travelFromPrev > 0 && (
                          <span style={styles.travelInfo}> · {item.travelFromPrev}p di chuyển từ điểm trước</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!schedule.success && (
                <div style={styles.warningBox}>
                  ⚠️ Lưu ý: {schedule.reason} — Lịch trình được tối ưu tối đa có thể.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───
const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    backgroundColor: 'white', borderRadius: '20px', width: '600px', maxWidth: '95vw',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '24px 28px 20px', borderBottom: '1px solid #F0F2F8',
  },
  headerTitle: { fontSize: '20px', fontWeight: '800', color: '#2B3674', fontFamily: 'Inter, sans-serif' },
  headerSub: { fontSize: '12px', color: '#A3AED0', marginTop: '4px', fontFamily: 'Inter, sans-serif' },
  closeBtn: {
    background: '#F4F7FE', border: 'none', borderRadius: '50%',
    width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B3674',
  },
  body: { padding: '20px 28px 28px', overflowY: 'auto', flex: 1 },
  section: { marginBottom: '20px' },
  sectionTitle: {
    fontSize: '13px', fontWeight: '700', color: '#A3AED0', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: 'Inter, sans-serif',
  },
  row: { display: 'flex', gap: '10px' },
  inputGroup: { flex: 1 },
  label: { fontSize: '12px', color: '#A3AED0', fontWeight: '600', display: 'block', marginBottom: '4px' },
  input: {
    flex: 1, padding: '10px 14px', border: '1.5px solid #E0E5F2', borderRadius: '10px',
    fontSize: '14px', color: '#2B3674', fontFamily: 'Inter, sans-serif',
    outline: 'none', backgroundColor: '#FAFBFF',
  },
  addForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  addBtn: {
    padding: '10px 18px', backgroundColor: '#4318FF', color: 'white',
    border: 'none', borderRadius: '10px', cursor: 'pointer',
    fontWeight: '700', fontSize: '14px', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
  },
  locationBtn: {
    padding: '10px 14px', backgroundColor: '#F4F7FE', color: '#4318FF',
    border: '1.5px solid #E0E5F2', borderRadius: '10px', cursor: 'pointer',
    fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap',
  },
  placeList: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  placeItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 14px', backgroundColor: '#F8F9FF', borderRadius: '10px',
    border: '1px solid #E0E5F2',
  },
  typeTag: {
    width: '28px', height: '28px', borderRadius: '50%', color: 'white',
    fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  placeName: { fontSize: '14px', fontWeight: '700', color: '#2B3674' },
  placeCoord: { fontSize: '11px', color: '#A3AED0', marginTop: '2px' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#E31A1A', fontSize: '16px', padding: '4px', borderRadius: '50%',
  },
  planBtn: {
    width: '100%', padding: '16px', backgroundColor: '#4318FF', color: 'white',
    border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '15px',
    fontFamily: 'Inter, sans-serif', boxShadow: '0 8px 20px rgba(67,24,255,0.3)',
    transition: 'transform 0.2s',
    marginBottom: '20px',
  },
  scheduleResult: {
    backgroundColor: '#F8F9FF', borderRadius: '14px', padding: '20px',
    border: '1px solid #E0E5F2',
  },
  algoTag: {
    fontSize: '10px', backgroundColor: '#4318FF', color: 'white',
    padding: '3px 8px', borderRadius: '20px', fontWeight: '600', marginLeft: '8px',
    textTransform: 'none', letterSpacing: '0',
  },
  aiSummary: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px',
    marginBottom: '14px', border: '1px solid #E8E5FF',
  },
  summaryBar: {
    display: 'flex', gap: '16px', fontSize: '13px', color: '#4318FF', fontWeight: '700',
    marginBottom: '16px', flexWrap: 'wrap',
  },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0' },
  timelineItem: { display: 'flex', gap: '12px', position: 'relative', paddingBottom: '16px' },
  timelineConnector: {
    position: 'absolute', left: '13px', top: '28px',
    width: '2px', height: 'calc(100% - 12px)',
    backgroundColor: '#E0E5F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  travelBadge: {
    backgroundColor: '#F4F7FE', color: '#A3AED0', fontSize: '10px',
    padding: '2px 6px', borderRadius: '20px', whiteSpace: 'nowrap',
    position: 'absolute', left: '16px', top: '50%',
    transform: 'translateY(-50%)',
  },
  dotInner: {
    width: '28px', height: '28px', borderRadius: '50%', color: 'white',
    fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, zIndex: 1,
  },
  timelineDot: { flexShrink: 0 },
  timelineContent: { flex: 1, paddingBottom: '4px' },
  timelineTime: { fontSize: '13px', fontWeight: '800', color: '#4318FF', marginBottom: '2px' },
  timelineName: { fontSize: '15px', fontWeight: '700', color: '#2B3674', marginBottom: '4px' },
  timelineMeta: { fontSize: '12px', color: '#A3AED0' },
  travelInfo: { color: '#FF6B35' },
  error: {
    backgroundColor: '#FFF0F0', color: '#E31A1A', borderRadius: '10px',
    padding: '10px 14px', fontSize: '13px', marginTop: '8px',
  },
  warningBox: {
    backgroundColor: '#FFF8E6', color: '#B07D00', borderRadius: '10px',
    padding: '10px 14px', fontSize: '13px', marginTop: '12px',
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: '#ffffff', border: '1.5px solid #E0E5F2',
    borderRadius: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
    zIndex: 1000, maxHeight: '160px', overflowY: 'auto', marginTop: '4px',
    textAlign: 'left'
  },
  dropdownItem: {
    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F4F7FE',
    transition: 'background-color 0.2s',
  }
};
