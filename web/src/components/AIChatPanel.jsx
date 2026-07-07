import { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/api';

export default function AIChatPanel({ userLocation, handleVoiceNavigation, isListening }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Chào bạn! Mình là MAPVIT AI (🧠 Goal-based Agent). Mình nhớ được ngữ cảnh hội thoại để trả lời chính xác hơn. Bạn cần giúp gì nào?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null); // Multi-turn session
  const [turnCount, setTurnCount] = useState(0);    // Số lượt hội thoại
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // Gửi kèm sessionId để backend duy trì lịch sử hội thoại (Multi-turn)
      const response = await chatWithAI(userMsg, userLocation, sessionId);
      
      // Lưu sessionId từ server trả về (lần đầu tiên sẽ được cấp)
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }
      if (response.turnCount !== undefined) {
        setTurnCount(response.turnCount);
      }

      setMessages(prev => [...prev, { role: 'ai', text: response.reply }]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, hiện tại mình không thể trả lời. Vui lòng cấu hình API Key hoặc thử lại sau.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Xóa session — Bắt đầu cuộc hội thoại mới
  const clearSession = () => {
    setSessionId(null);
    setTurnCount(0);
    setMessages([
      { role: 'ai', text: 'Đã bắt đầu hội thoại mới! Mình quên hết ngữ cảnh cũ rồi. Bạn cần giúp gì nào? 🔄' }
    ]);
  };

  return (
    <div className="ai-chat-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Header với Turn Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          {turnCount > 0 ? (
            <span>🧠 <strong style={{ color: '#3A82F7' }}>Goal-based Agent</strong> · {turnCount} lượt hội thoại</span>
          ) : (
            <span>🤖 MAPVIT AI</span>
          )}
        </div>
        {turnCount > 0 && (
          <button onClick={clearSession} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px' }}>
            🔄 Cuộc trò chuyện mới
          </button>
        )}
      </div>
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 4px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#3A82F7' : '#2A2A2A',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '16px',
            borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
            borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
            maxWidth: '85%',
            lineHeight: '1.4',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            backgroundColor: '#2A2A2A',
            padding: '10px 14px',
            borderRadius: '16px',
            borderBottomLeftRadius: '4px',
            fontSize: '14px',
            color: '#aaa'
          }}>
            Đang nghĩ...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {handleVoiceNavigation && (
        <div 
          onClick={handleVoiceNavigation}
          style={{
            background: isListening ? '#ff4757' : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: isListening ? '0 0 15px rgba(255, 71, 87, 0.6)' : '0 4px 15px rgba(255, 142, 83, 0.3)',
            animation: isListening ? 'voicePulse 1.5s infinite' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', display: 'flex' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{isListening ? 'Đang lắng nghe...' : 'Chỉ đường bằng giọng nói'}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Bấm vào đây và nói địa điểm bạn muốn đến</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Nhập câu hỏi cho AI..."
          className="modern-input"
          style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
          disabled={loading || isListening}
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim() || isListening}
          style={{
            backgroundColor: '#3A82F7',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0 16px',
            cursor: 'pointer',
            opacity: loading || !input.trim() || isListening ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
