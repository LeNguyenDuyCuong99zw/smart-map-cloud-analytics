import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, Popup, Source, Layer, GeolocateControl, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAuth } from '../context/AuthContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import AIChatPanel from '../components/AIChatPanel';
import {
  searchPlaces,
  getDirections,
  addFavorite,
  saveHistory,
  getPlaceDetails,
  suggestRouteWithAI,
  narrateRouteWithAI,
  getRecommendations
} from "../services/api";
const AWS_MAP_API_KEY = import.meta.env.VITE_AWS_MAP_API_KEY;
const AWS_MAP_NAME = import.meta.env.VITE_AWS_MAP_NAME || 'Map';
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'ap-southeast-1';

const MAP_STYLE = `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${AWS_MAP_NAME}/style-descriptor?key=${AWS_MAP_API_KEY}`;
const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

function CustomMarker({ place, isSelected, onClick }) {
  return (
    <Marker
      longitude={place.lng}
      latitude={place.lat}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(place);
      }}
    >
      <div className={`custom-marker ${isSelected ? 'marker-selected' : ''}`}>
        <div className="marker-pulse"></div>
        <div className="marker-core">
          <DotLottieReact
            src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
            loop
            autoplay
          />
        </div>
      </div>
    </Marker>
  );
}

export default function MapPage() {
  const [recommendations, setRecommendations] = useState([]);

const loadRecommendations = async () => {
    try {
        const data = await getRecommendations();
        setRecommendations(data.recommendations || []);
    } catch (err) {
        console.log(err);
    }
};

useEffect(() => {
    loadRecommendations();
}, []);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [places, setPlaces] = useState([]);
  const [directions, setDirections] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [clickedPos, setClickedPos] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [suggestions, setSuggestions] = useState({ origin: [], destination: [] });
  const [activeInput, setActiveInput] = useState(null); // 'origin' or 'destination'
  const [originCoords, setOriginCoords] = useState('');
  const [destinationCoords, setDestinationCoords] = useState('');
  const [detailedInfo, setDetailedInfo] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [aiRoutePrompt, setAiRoutePrompt] = useState('');
  const [aiRouteResult, setAiRouteResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedPos, setSimulatedPos] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState('chat');
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const [viewState, setViewState] = useState({
    longitude: DEFAULT_CENTER.lng,
    latitude: DEFAULT_CENTER.lat,
    zoom: 13
  });

  const searchTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchPlaces(query);
      setPlaces(data.places || []);
      
      if (data.places && data.places.length > 0) {
        setViewState(prev => ({
          ...prev,
          longitude: data.places[0].lng,
          latitude: data.places[0].lat,
          zoom: 14,
          transitionDuration: 1200
        }));
      }

      // Lưu log với tiền tố Search: để phân biệt ở trang Admin
      if (data.places && data.places.length > 0) {
    const firstPlace = data.places[0];

    await saveHistory({
        query,
        placeId: firstPlace.placeId,
        name: firstPlace.name,
        lat: firstPlace.lat,
        lng: firstPlace.lng,
        category: firstPlace.category
    });
    await loadRecommendations();
}

      if (data.places.length === 0) showToast('Không tìm thấy địa điểm');
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceNavigation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Safari.');
      return;
    }

    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText('Đang nghe...');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(`"${transcript}"`);
      setIsListening(false);
      
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          setLoading(true);
          const originObj = { lat: latitude, lng: longitude };
          const data = await suggestRouteWithAI(transcript, originObj);
          
          let newDirections = null;
          let destName = '';

          if (data.route && data.route.geometry) {
            newDirections = {
              distance: { text: data.route.distanceText },
              duration: { text: data.route.durationText },
              geometry: data.route.geometry
            };
            setDirections(newDirections);
            setOrigin('Vị trí của bạn');
            destName = data.stops[data.stops.length - 1].name;
            setDestination(destName);
            setActiveTab('directions');
          }
          
          if (data.stops) {
            setPlaces(data.stops);
            setViewState(prev => ({
              ...prev,
              longitude: data.stops[0].lng,
              latitude: data.stops[0].lat,
              zoom: 13,
              transitionDuration: 1200
            }));
          }

          if (newDirections) {
             setShowAIPanel(false); // Close the AI panel to see the map
             startSimulation(newDirections, 'Vị trí của bạn', destName);
          }

        } catch (err) {
          showToast(err.message || "Lỗi khi tạo lộ trình bằng giọng nói");
        } finally {
          setLoading(false);
          setVoiceText('');
        }
      }, (error) => {
        setIsListening(false);
        setVoiceText('');
        showToast('Không lấy được vị trí hiện tại. Vui lòng cho phép quyền Vị trí.');
      });
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceText('');
      showToast('Lỗi nhận diện giọng nói: ' + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleInputChange = (type, val) => {
    if (type === 'origin') {
      setOrigin(val);
      setOriginCoords(''); // Xóa tọa độ ẩn khi người dùng tự nhập tay
    } else {
      setDestination(val);
      setDestinationCoords(''); // Xóa tọa độ ẩn khi người dùng tự nhập tay
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.length > 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const data = await searchPlaces(val);
          setSuggestions(prev => ({ ...prev, [type]: data.places || [] }));
          setActiveInput(type);
        } catch (err) {
          console.error(err);
        }
      }, 400); // Đợi 400ms sau khi ngừng gõ mới gọi API
    } else {
      setSuggestions(prev => ({ ...prev, [type]: [] }));
    }
  };

  const selectSuggestion = (type, place) => {
    const coords = `${place.lat},${place.lng}`;
    if (type === 'origin') {
      setOrigin(place.name);
      setOriginCoords(coords);
    } else {
      setDestination(place.name);
      setDestinationCoords(coords);
    }
    setSuggestions(prev => ({ ...prev, [type]: [] }));
    setActiveInput(null);
  };

  const handleDirections = async (e) => {
    e.preventDefault();
    const start = originCoords || origin;
    const end = destinationCoords || destination;
    if (!start || !end) return;
    setLoading(true);
    try {
      const data = await getDirections(start, end);
      setDirections(data);
      setPlaces([]); 
      
      // Gửi log Cloud khi tìm đường thành công
      await saveHistory({ 
        query: `Route: ${origin} to ${destination}`, 
        name: `Search: Directions to ${destination}` 
      });


      if (data.geometry && data.geometry.length > 0) {
        setViewState(prev => ({
          ...prev,
          longitude: data.geometry[0][0],
          latitude: data.geometry[0][1],
          zoom: 13,
          transitionDuration: 1200
        }));
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFavorite = async (place) => {
    try {
      await addFavorite({
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      });
      showToast(`🤍 Đã lưu "${place.name}"`);
    } catch (err) {
      showToast(err.message);
    }
  };

  // Fetch enriched details when a place is selected
  const fetchEnrichedDetails = async (place) => {
    if (!place) return;
    setIsDetailLoading(true);
    setDetailedInfo(null);
    try {
      const data = await getPlaceDetails(place.name, place.lat, place.lng);
      setDetailedInfo(data);
    } catch (err) {
      console.error('Detail fetch error:', err);
      setDetailedInfo({ ...place, rating: 4.0, photos: [] });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handlePlaceSelect = (place) => {
    setSelectedPlace(place);
    setClickedPos(null);
    fetchEnrichedDetails(place);
    
    setViewState(prev => ({
      ...prev,
      longitude: place.lng,
      latitude: place.lat,
      zoom: 16,
      transitionDuration: 1200
    }));

    // Log history
    saveHistory({ 
      query: query || 'Select', 
      name: `Place: ${place.name}`, 
      lat: place.lat, 
      lng: place.lng 
    });
  };

  const handleSuggestRoute = async (e) => {
    e.preventDefault();
    const start = originCoords || origin;
    if (!start || !aiRoutePrompt) return;
    setLoading(true);
    setAiRouteResult(null);
    setPlaces([]);
    setDirections(null);

    try {
      let originObj = { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng };
      if (typeof start === 'string' && start.includes(',')) {
        const parts = start.split(',');
        originObj = { lat: Number(parts[0]), lng: Number(parts[1]) };
      } else {
        originObj = { lat: viewState.latitude, lng: viewState.longitude };
      }

      const data = await suggestRouteWithAI(aiRoutePrompt, originObj);
      setAiRouteResult(data);
      
      if (data.route && data.route.geometry) {
        setDirections({
          distance: { text: data.route.distanceText },
          duration: { text: data.route.durationText },
          geometry: data.route.geometry
        });
      }
      
      if (data.stops) {
        setPlaces(data.stops);
        setViewState(prev => ({
          ...prev,
          longitude: data.stops[0].lng,
          latitude: data.stops[0].lat,
          zoom: 13,
          transitionDuration: 1200
        }));
      }

      await saveHistory({ 
        query: `AI Route: ${aiRoutePrompt}`, 
        name: `AI Route: ${aiRoutePrompt}` 
      });

    } catch (err) {
      showToast(err.message || "Lỗi khi tạo lộ trình AI");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const vnVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (vnVoice) utterance.voice = vnVoice;
    window.speechSynthesis.speak(utterance);
  };

  const startSimulation = async (customDirections = null, customOrigin = null, customDestination = null) => {
    const dir = customDirections || directions;
    if (!dir?.geometry || dir.geometry.length < 2) return;
    setIsSimulating(true);
    showToast("Đang chuẩn bị lộ trình...");
    
    let scripts = {
      start: "Bắt đầu lộ trình. Đi cẩn thận nhé.",
      mid1: "Tiếp tục di chuyển theo đường hiện tại.",
      mid2: "Sắp tới điểm đến rồi.",
      end: "Bạn đã đến nơi."
    };
    
    try {
      const oName = customOrigin || origin || 'Điểm xuất phát';
      const dName = customDestination || destination || 'Điểm đến';
      const data = await narrateRouteWithAI(oName, dName, dir.distance?.text, dir.duration?.text);
      if (data) scripts = data;
    } catch (e) {
      console.error("AI Narration error:", e);
    }
    
    const coords = dir.geometry;
    let i = 0;
    const totalSteps = coords.length;
    
    speak(scripts.start);
    
    const interval = setInterval(() => {
      if (i >= totalSteps) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulatedPos(null);
        speak(scripts.end);
        return;
      }
      
      setSimulatedPos({ lng: coords[i][0], lat: coords[i][1] });
      setViewState(prev => ({
        ...prev,
        longitude: coords[i][0],
        latitude: coords[i][1],
        zoom: 16,
        transitionDuration: 100
      }));
      
      if (i === Math.floor(totalSteps / 3)) speak(scripts.mid1);
      else if (i === Math.floor((totalSteps * 2) / 3)) speak(scripts.mid2);
      
      i += 3; // jump 3 coords for faster simulation
    }, 500);
  };

  const routeGeojson = useMemo(() => {
    if (!directions?.geometry) return null;
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: directions.geometry }
    };
  }, [directions]);

  return (
    <div className="map-app-container">
      {/* ── MAP LAYER ───────────────────────────────── */}
      <div className="map-layer">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLE}
          onClick={(e) => {
            if (e.lngLat) {
              setClickedPos({ lat: e.lngLat.lat, lng: e.lngLat.lng });
              setSelectedPlace(null);
              setPlaces([]); // Xóa danh sách tìm kiếm khi chọn điểm mới trên bản đồ
            }
          }}
        >
          <GeolocateControl 
            position="bottom-right" 
            trackUserLocation={true} 
            onGeolocate={(e) => {
              // Khi định vị được vị trí người dùng, cập nhật viewState để bản đồ di chuyển tới đó
              setViewState(prev => ({
                ...prev,
                longitude: e.coords.longitude,
                latitude: e.coords.latitude,
                zoom: 15,
                transitionDuration: 1000
              }));
            }}
          />
          <NavigationControl position="bottom-right" showCompass={false} />

          {selectedPlace && (
            <Popup
              longitude={selectedPlace.lng}
              latitude={selectedPlace.lat}
              anchor="top"
              onClose={() => setSelectedPlace(null)}
              closeButton={false}
              maxWidth="300px"
            >
              <div className="modern-popup">
                <div className="popup-name">{selectedPlace.name}</div>
                <div className="popup-address">{selectedPlace.address}</div>
                <div className="popup-actions">
                  <button className="popup-btn" onClick={() => {
                    setOrigin('Vị trí của bạn');
                    setDestination(`${selectedPlace.lat},${selectedPlace.lng}`);
                    setActiveTab('directions');
                  }}>
                    Chỉ đường
                  </button>
                </div>
              </div>
            </Popup>
          )}

          {places.map(place => (
            <CustomMarker
              key={place.placeId}
              place={place}
              isSelected={selectedPlace?.placeId === place.placeId}
              onClick={(p) => handlePlaceSelect(p)}
            />
          ))}

          {clickedPos && (
            <Marker longitude={clickedPos.lng} latitude={clickedPos.lat}>
              <div style={{ fontSize: '24px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>📍</div>
            </Marker>
          )}

          {routeGeojson && (
            <Source id="route-source" type="geojson" data={routeGeojson}>
              <Layer
                id="route-layer"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': '#EAFF00',
                  'line-width': 6,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}

          {simulatedPos && (
            <Marker longitude={simulatedPos.lng} latitude={simulatedPos.lat} anchor="center">
              <div style={{ width: 60, height: 60, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
                <DotLottieReact
                  src="https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie"
                  loop
                  autoplay
                />
              </div>
            </Marker>
          )}

          {/* HIỂN THỊ ĐIỂM ĐI VÀ ĐIỂM ĐẾN KHI CÓ ĐƯỜNG ĐI */}
          {directions?.geometry?.length > 0 && (
            <>
              {/* Điểm Đi (Origin) */}
              <Marker 
                longitude={directions.geometry[0][0]} 
                latitude={directions.geometry[0][1]}
                anchor="bottom"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#10B981', color: 'white', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    A - Điểm đi
                  </div>
                  <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white', marginTop: '-1px' }}></div>
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.4)', marginTop: '-2px' }}></div>
                </div>
              </Marker>

              {/* Điểm Đến (Destination) */}
              <Marker 
                longitude={directions.geometry[directions.geometry.length - 1][0]} 
                latitude={directions.geometry[directions.geometry.length - 1][1]}
                anchor="bottom"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#EF4444', color: 'white', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    B - Điểm đến
                  </div>
                  <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white', marginTop: '-1px' }}></div>
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#EF4444', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.4)', marginTop: '-2px' }}></div>
                </div>
              </Marker>
            </>
          )}
        </Map>
      </div>

      {/* ── PLACE DETAIL SIDE PANEL ──────────────────── */}
      <div className={`place-detail-panel ${!selectedPlace ? 'hidden' : ''}`}>
        {isDetailLoading ? (
          <div className="detail-content">
            <div className="shimmer" style={{ height: 200, borderRadius: 12, marginBottom: 20 }}></div>
            <div className="shimmer" style={{ height: 30, width: '70%', marginBottom: 10 }}></div>
            <div className="shimmer" style={{ height: 20, width: '40%', marginBottom: 30 }}></div>
            <div className="shimmer" style={{ height: 60, width: '100%', marginBottom: 20 }}></div>
          </div>
        ) : selectedPlace && (
          <>
            <div className="detail-hero">
              <button className="btn-close-detail" onClick={() => setSelectedPlace(null)}>✕</button>
              <img 
                src={detailedInfo?.photos?.[0] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"} 
                alt={selectedPlace.name} 
                className="detail-hero-img"
              />
            </div>
            <div className="detail-content">
              <h2 className="detail-name">{selectedPlace.name}</h2>
              <div className="detail-rating-row">
                <div className="stars-wrap">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>{i < Math.floor(detailedInfo?.rating || 4) ? '★' : '☆'}</span>
                  ))}
                </div>
                <span className="rating-val">{detailedInfo?.rating?.toFixed(1) || '4.0'}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>ĐANG MỞ CỬA</span>
              </div>

              <div className="detail-actions">
                <button className="action-btn-circle" onClick={() => {
                   setOrigin('Vị trí của bạn');
                   setDestination(`${selectedPlace.lat},${selectedPlace.lng}`);
                   setActiveTab('directions');
                }}>
                  <div className="action-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                  </div>
                  <span className="action-lbl">Đường đi</span>
                </button>
                <button className="action-btn-circle" onClick={() => handleSaveFavorite(selectedPlace)}>
                  <div className="action-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <span className="action-lbl">Lưu lại</span>
                </button>
                <button className="action-btn-circle">
                  <div className="action-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </div>
                  <span className="action-lbl">Gần đó</span>
                </button>
                <button className="action-btn-circle">
                  <div className="action-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  </div>
                  <span className="action-lbl">Chia sẻ</span>
                </button>
              </div>

              <div className="detail-info-item">
                <div className="info-icon">📍</div>
                <div className="info-text">{selectedPlace.address}</div>
              </div>
              
              {detailedInfo?.tel && (
                <div className="detail-info-item">
                  <div className="info-icon">📞</div>
                  <div className="info-text">{detailedInfo.tel}</div>
                </div>
              )}

              {detailedInfo?.website && (
                <div className="detail-info-item">
                  <div className="info-icon">🌐</div>
                  <a href={detailedInfo.website} target="_blank" rel="noreferrer" className="info-text" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {detailedInfo.website.replace('http://', '').replace('https://', '').split('/')[0]}
                  </a>
                </div>
              )}

              {detailedInfo?.description && (
                <div className="detail-info-item" style={{ marginTop: 20 }}>
                  <div className="info-text" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    "{detailedInfo.description}"
                  </div>
                </div>
              )}

              {detailedInfo?.photos?.length > 1 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Hình ảnh từ khách hàng</div>
                  <div className="photo-gallery">
                    {detailedInfo.photos.slice(1, 5).map((img, idx) => (
                      <img key={idx} src={img} alt="gallery" className="gallery-img" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── UI LAYER ────────────────────────────────── */}
      <div className="ui-layer">
          <div className="floating-widget-container">
            <div className="floating-widget-panel">
              <div style={{ width: 120, height: 120 }}>
                <DotLottieReact
                  src="https://lottie.host/59ef4efc-bad7-4d4b-bf67-88638a7d6d3b/9MJF1B7EEV.lottie"
                  loop
                  autoplay
                />
              </div>
              <div className="widget-info">
                <div className="widget-title">THÔNG TIN THỜI TIẾT</div>
                <div className="widget-status">Đang hoạt động ✦</div>
              </div>
            </div>
          </div>

          <div className="floating-panel">
          
          <div className="panel-header">
            <div className="brand-header-row">
              <div className="brand-logo" style={{ gap: '4px' }}>
                <div style={{ width: 40, height: 40 }}>
                  <DotLottieReact
                    src="https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie"
                    loop
                    autoplay
                  />
                </div>
                <span>MAPVIT</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {user?.email === 'admin@gmail.com' && (
                  <button className="btn-icon-sm" onClick={() => navigate('/analytics')} title="Cloud Analytics" style={{ color: '#3A82F7' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  </button>
                )}
                <button className="btn-icon-sm" onClick={logout} title="Đăng xuất">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            </div>
            
            <div className="pill-tabs">
              <button 
                className={`pill-tab ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                Tìm kiếm
              </button>
              <button 
                className={`pill-tab ${activeTab === 'directions' ? 'active' : ''}`}
                onClick={() => setActiveTab('directions')}
              >
                Chỉ đường
              </button>
            </div>
          </div>
<div className="recommend-box">
    <h3>⭐ Gợi ý cho bạn</h3>

    {recommendations.length === 0 ? (
        <p>Chưa có gợi ý</p>
    ) : (
        recommendations.map(place => (
            <div
                key={place.placeId}
                className="recommend-item"
                onClick={() => {
                    setSelectedPlace(place);

                    setViewState(prev => ({
                        ...prev,
                        longitude: place.lng,
                        latitude: place.lat,
                        zoom: 15,
                        transitionDuration: 1000
                    }));
                }}
            >
                <strong>{place.name}</strong>
                <br />
                <small>{place.address}</small>
            </div>
        ))
    )}
</div>
          <div className="panel-content">
            {activeTab === 'search' && (
              <form onSubmit={handleSearch} className="modern-search-row">
                <div className="modern-input-wrapper">
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Tìm địa điểm, cà phê..."
                    style={{ paddingLeft: '16px' }}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-lottie-search" disabled={loading || !query.trim()}>
                  <div style={{ width: 44, height: 44 }}>
                    <DotLottieReact
                      src="https://lottie.host/30d42053-e9dc-425e-a36e-383873fc86ac/ZDCzXZTXU2.lottie"
                      loop
                      autoplay
                    />
                  </div>
                </button>
              </form>
            )}

            {activeTab === 'directions' && (
              <form onSubmit={handleDirections} className="modern-input-group">
                <div style={{ position: 'relative' }}>
                  <div className="modern-input-wrapper">
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="Điểm xuất phát..."
                      style={{ paddingLeft: '16px' }}
                      value={origin}
                      onChange={e => handleInputChange('origin', e.target.value)}
                    />
                  </div>
                  {activeInput === 'origin' && suggestions.origin.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestions.origin.map(p => (
                        <div key={p.placeId} className="suggestion-item" onClick={() => selectSuggestion('origin', p)}>
                          <div className="suggestion-lottie">
                            <DotLottieReact
                              src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
                              loop
                              autoplay
                            />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-name">{p.name}</div>
                            {p.address && <div className="suggestion-address">{p.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <div className="modern-input-wrapper">
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="Điểm đến..."
                      style={{ paddingLeft: '16px' }}
                      value={destination}
                      onChange={e => handleInputChange('destination', e.target.value)}
                    />
                  </div>
                  {activeInput === 'destination' && suggestions.destination.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestions.destination.map(p => (
                        <div key={p.placeId} className="suggestion-item" onClick={() => selectSuggestion('destination', p)}>
                          <div className="suggestion-lottie">
                            <DotLottieReact
                              src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
                              loop
                              autoplay
                            />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-name">{p.name}</div>
                            {p.address && <div className="suggestion-address">{p.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button type="submit" className="btn-art" disabled={loading || !origin || !destination}>
                  {loading ? 'Đang tính toán...' : 'Chỉ đường đi'}
                </button>
              </form>
            )}

            {directions && (
              <div className="directions-result-container">
                <div className="route-summary">
                  <div className="route-stat">
                    <div className="route-val">{directions.distance?.text}</div>
                    <div className="route-lbl">Khoảng cách</div>
                  </div>
                  <div className="route-stat">
                    <div className="route-val">{directions.duration?.text}</div>
                    <div className="route-lbl">Thời gian</div>
                  </div>
                </div>
                <button 
                  className="btn-art" 
                  style={{ width: '100%', marginTop: '12px', backgroundColor: isSimulating ? '#ff4757' : '#2ed573' }}
                  onClick={() => {
                    if (isSimulating) {
                       window.speechSynthesis.cancel();
                       setIsSimulating(false);
                       setSimulatedPos(null);
                    } else {
                       startSimulation();
                    }
                  }}
                >
                  {isSimulating ? 'Dừng đi đường' : '🎙️ Bắt đầu đi (VietMap AI)'}
                </button>
              </div>
            )}

            {/* Empty State / Welcome Animation for Search Tab */}
            {activeTab === 'search' && places.length === 0 && !clickedPos && !loading && (
              <div className="search-empty-state">
                <div style={{ width: 300, height: 300 }}>
                  <DotLottieReact
                    src="https://lottie.host/4b1ad8af-d769-4676-a2d6-686a7cc49d82/yF3dvgO9XZ.lottie"
                    loop
                    autoplay
                  />
                </div>
                <div className="empty-state-text">
                  Bắt đầu khám phá thế giới cùng MAPVIT
                </div>
              </div>
            )}

            {places.length > 0 && (
              <div className="results-container">
                <div className="results-header">
                  <span>{places.length} KẾT QUẢ</span>
                  <span style={{cursor: 'pointer', color: '#3A82F7'}} onClick={() => setPlaces([])}>Xóa</span>
                </div>
                {places.map(place => (
                  <div 
                    key={place.placeId} 
                    className="art-place-item"
                    onClick={() => handlePlaceSelect(place)}

                  >
                    <div className="place-icon-wrap">✧</div>
                    <div className="place-info">
                      <div className="place-name">{place.name}</div>
                      <div className="place-addr">{place.address}</div>
                    </div>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); handleSaveFavorite(place); }}
                      title="Lưu yêu thích"
                    >
                      ♡
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── VOICE NAVIGATION OVERLAYS ────────────────────────── */}
      {isListening && (
        <div className="voice-overlay">
          <div style={{ width: 300, height: 300 }}>
            <DotLottieReact
              src="https://lottie.host/5f7bd89e-1125-48f5-a55c-1235af709fce/rzz7e7XQZm.lottie"
              loop
              autoplay
            />
          </div>
          <h2>Đang nghe...</h2>
          <p>Hãy nói: "Chỉ đường đến Bến xe Chợ Lớn"</p>
        </div>
      )}
      
      {voiceText && !isListening && (
         <div className="voice-overlay" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <h2>{voiceText}</h2>
            <p>Đang xử lý lộ trình AI...</p>
         </div>
      )}

      {/* ── AI Floating Button ──────────────────────── */}
      {!showAIPanel && (
        <div 
          className="ai-floating-btn"
          onClick={() => setShowAIPanel(true)}
        >
          <dotlottie-wc
            src="https://lottie.host/2d26d578-a5b0-488e-94ec-2e0a67739026/rc4VOfvp8V.lottie"
            style={{ width: "100%", height: "100%" }}
            autoplay
            loop
          ></dotlottie-wc>
        </div>
      )}

      {/* ── AI Floating Panel ───────────────────────── */}
      {showAIPanel && (
        <div className="ai-floating-panel">
          <div className="panel-header" style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="brand-logo" style={{ fontSize: '16px' }}>
              <span>MAPVIT AI</span>
            </div>
            <button className="btn-icon-sm" onClick={() => setShowAIPanel(false)}>✕</button>
          </div>
          <div className="pill-tabs" style={{ margin: '0 16px 16px 16px' }}>
            <button 
              className={`pill-tab ${aiActiveTab === 'chat' ? 'active' : ''}`}
              onClick={() => setAiActiveTab('chat')}
              style={{ background: aiActiveTab === 'chat' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' : undefined, color: aiActiveTab === 'chat' ? 'white' : undefined, border: 'none' }}
            >
              Trợ lý AI ✧
            </button>
            <button 
              className={`pill-tab ${aiActiveTab === 'route' ? 'active' : ''}`}
              onClick={() => setAiActiveTab('route')}
              style={{ background: aiActiveTab === 'route' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' : undefined, color: aiActiveTab === 'route' ? 'white' : undefined, border: 'none' }}
            >
              Lộ trình AI ✧
            </button>
          </div>
          <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 16px 16px', overflow: 'hidden' }}>
            {aiActiveTab === 'route' && (
              <form onSubmit={handleSuggestRoute} className="modern-input-group" style={{ paddingTop: 0 }}>
                <div style={{ position: 'relative' }}>
                  <div className="modern-input-wrapper">
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="Điểm xuất phát..."
                      style={{ paddingLeft: '16px' }}
                      value={origin}
                      onChange={e => handleInputChange('origin', e.target.value)}
                    />
                  </div>
                  {activeInput === 'origin' && suggestions.origin.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestions.origin.map(p => (
                        <div key={p.placeId} className="suggestion-item" onClick={() => selectSuggestion('origin', p)}>
                          <div className="suggestion-lottie">
                            <DotLottieReact
                              src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
                              loop
                              autoplay
                            />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-name">{p.name}</div>
                            {p.address && <div className="suggestion-address">{p.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modern-input-wrapper" style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Bạn muốn đi đâu? (VD: ăn vặt buổi tối)..."
                    style={{ paddingLeft: '16px' }}
                    value={aiRoutePrompt}
                    onChange={e => setAiRoutePrompt(e.target.value)}
                  />
                </div>
                
                <button type="submit" className="btn-art" disabled={loading || !origin || !aiRoutePrompt}>
                  {loading ? 'AI đang thiết kế...' : 'Tạo lộ trình AI ✧'}
                </button>

                {aiRouteResult && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', lineHeight: '1.5' }}>
                    <div style={{ color: '#FF8E53', fontWeight: 'bold', marginBottom: '8px' }}>Gợi ý từ AI:</div>
                    {aiRouteResult.explanation}
                  </div>
                )}
              </form>
            )}

            {aiActiveTab === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <AIChatPanel 
                  userLocation={{ lat: viewState.latitude, lng: viewState.longitude }} 
                  handleVoiceNavigation={handleVoiceNavigation}
                  isListening={isListening}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="art-toast">{toast}</div>}
    </div>
  );
}
