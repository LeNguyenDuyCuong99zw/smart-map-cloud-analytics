import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// URL API Lambda Analytics
const ANALYTICS_API_URL = import.meta.env.VITE_AWS_ANALYTICS_URL || '';

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // KIỂM TRA QUYỀN ADMIN
  const ADMIN_EMAIL = "admin@gmail.com"; 

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.email !== ADMIN_EMAIL) {
      alert("Bạn không có quyền truy cập trang quản trị!");
      navigate('/');
      return;
    }

    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (!ANALYTICS_API_URL) {
        throw new Error("Chưa cấu hình URL API Analytics trong .env");
      }
      const response = await axios.get(ANALYTICS_API_URL);
      if (response.data && response.data.error === true) {
         throw new Error(response.data.message || "Lỗi xử lý từ Lambda");
      }
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F4F7FE', color: '#2B3674', fontFamily: 'sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #E0E5F2', borderTop: '4px solid #4318FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', fontSize: '16px', fontWeight: '700' }}>Loading Dashboard...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F7FE', color: '#2B3674', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      
      {/* ─── FLOATING SIDEBAR (DRIBBBLE STYLE) ─── */}
      <div style={{ width: '280px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', padding: '30px 20px', margin: '20px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
        <div style={{ padding: '0 10px', marginBottom: '40px' }}>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#2B3674', letterSpacing: '-0.5px' }}>
            MAP<span style={{color: '#4318FF'}}>VIT</span>
          </h2>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Active Menu Item */}
          <div style={{ padding: '14px 20px', backgroundColor: '#4318FF', color: 'white', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 20px rgba(67, 24, 255, 0.2)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
            Dashboard
          </div>
          {/* Inactive Menu Item */}
          <div onClick={() => navigate('/')} style={{ padding: '14px 20px', color: '#A3AED0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color='#2B3674'; e.currentTarget.style.backgroundColor='#F4F7FE'; e.currentTarget.style.borderRadius='12px'; }} onMouseLeave={(e) => { e.currentTarget.style.color='#A3AED0'; e.currentTarget.style.backgroundColor='transparent'; }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
            Return to Map
          </div>
        </nav>
        {/* Footer / Logout */}
        <div style={{ marginTop: 'auto' }}>
           <button onClick={logout} style={{ width: '100%', padding: '14px 20px', backgroundColor: '#FFF0F0', color: '#E31A1A', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log Out
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex: 1, padding: '40px 40px 40px 10px', overflowY: 'auto' }}>
        
        {/* TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#A3AED0', fontWeight: '500', marginBottom: '4px' }}>Pages / Dashboard</div>
            <h1 style={{ margin: 0, fontSize: '34px', color: '#2B3674', fontWeight: '800', letterSpacing: '-1px' }}>Main Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', padding: '10px 20px', borderRadius: '30px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
            <button onClick={fetchAnalytics} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4318FF', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }} title="Refresh Data">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#E0E5F2' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#4318FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
               <span style={{ color: '#2B3674', fontWeight: '700', fontSize: '14px' }}>{user.email}</span>
            </div>
          </div>
        </div>

        {error ? (
          <div style={{ backgroundColor: '#FFF0F0', borderLeft: '4px solid #E31A1A', padding: '20px', borderRadius: '12px', color: '#E31A1A', marginBottom: '30px' }}>
             <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Error Fetching Data</h3>
             <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{error}</p>
          </div>
        ) : (
          <div>
            {/* 3 STATS CARDS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
               
               {/* Card 1 */}
               <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#F4F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4318FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </div>
                  <div>
                     <div style={{ fontSize: '14px', color: '#A3AED0', fontWeight: '500', marginBottom: '4px' }}>Total Requests</div>
                     <div style={{ fontSize: '28px', color: '#2B3674', fontWeight: '800' }}>{data?.totalRequests || 0}</div>
                  </div>
               </div>
               
               {/* Card 2 */}
               <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#E6F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#01B574" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div>
                     <div style={{ fontSize: '14px', color: '#A3AED0', fontWeight: '500', marginBottom: '4px' }}>Tracked Locations</div>
                     <div style={{ fontSize: '28px', color: '#2B3674', fontWeight: '800' }}>{data?.topPlaces?.length || 0}</div>
                  </div>
               </div>

                {/* Card 3 */}
               <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#EFFFEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#01B574" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div>
                     <div style={{ fontSize: '14px', color: '#A3AED0', fontWeight: '500', marginBottom: '4px' }}>System Status</div>
                     <div style={{ fontSize: '24px', color: '#2B3674', fontWeight: '800' }}>Online</div>
                  </div>
               </div>
            </div>

            {/* TOP PLACES TABLE */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', color: '#2B3674', fontWeight: '800' }}>Popular Destinations</h2>
                  <div style={{ fontSize: '14px', color: '#A3AED0', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F4F7FE', padding: '8px 16px', borderRadius: '20px' }}>
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                     Sync: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('vi-VN') : '--'}
                  </div>
               </div>

               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E0E5F2' }}>
                      <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '13px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rank</th>
                      <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '13px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location Name</th>
                      <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '13px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engagement</th>
                      <th style={{ padding: '16px 8px', textAlign: 'right', fontSize: '13px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.topPlaces?.length > 0 ? (
                      data.topPlaces.map((item, index) => {
                         const percentage = data.totalRequests > 0 ? ((item.count / data.totalRequests) * 100).toFixed(1) : 0;
                         return (
                          <tr key={index} style={{ borderBottom: '1px solid #F4F7FE' }}>
                            <td style={{ padding: '20px 8px', color: '#2B3674', fontWeight: '800', fontSize: '15px' }}>#{index + 1}</td>
                            <td style={{ padding: '20px 8px', color: '#2B3674', fontWeight: '700', fontSize: '15px' }}>{item.name}</td>
                            <td style={{ padding: '20px 8px', width: '40%' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                 <div style={{ fontSize: '14px', color: '#2B3674', fontWeight: '800', width: '45px' }}>{percentage}%</div>
                                 <div style={{ flex: 1, height: '8px', backgroundColor: '#E0E5F2', borderRadius: '4px', overflow: 'hidden' }}>
                                   <div style={{ height: '100%', backgroundColor: '#4318FF', width: `${percentage}%`, borderRadius: '4px' }}></div>
                                 </div>
                               </div>
                            </td>
                            <td style={{ padding: '20px 8px', textAlign: 'right', color: '#2B3674', fontWeight: '800', fontSize: '15px' }}>{item.count}</td>
                          </tr>
                         );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#A3AED0', fontWeight: '700', fontSize: '16px' }}>No data available yet</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
