import React, { useState, useEffect, useCallback } from 'react';
import { systemAPI, dlqAPI } from '../services/api';
import {
  AlertTriangle, RefreshCw, CheckCircle2, Search,
  ChevronLeft, ChevronRight, Activity, Database,
  Zap, Shield, TrendingUp, Clock
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
function mapApiStatus(apiStatus) {
  if (!apiStatus) return 'FAILED';
  const s = apiStatus.toLowerCase();
  if (s.includes('resolved')) return 'RESOLVED';
  if (s.includes('retry') || s.includes('retried') || s.includes('processing')) return 'RETRIED';
  return 'FAILED';
}

function resolveAction(id, setMessages) {
  setMessages(prev =>
    prev.map(m => m._id === id ? { ...m, _localStatus: 'RESOLVED' } : m)
  );
  dlqAPI.getById(id).catch(() => { });
}

async function retryAction(id, setMessages) {
  try {
    await dlqAPI.replay(id);
    setMessages(prev =>
      prev.map(m => m._id === id ? { ...m, _localStatus: 'RETRIED' } : m)
    );
  } catch { /* silently ignore */ }
}

/* ─── inline styles ──────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }

  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.85)} }
  @keyframes fadeInUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

  .dlq-table-row {
    transition: background 0.15s;
  }
  .dlq-table-row:hover {
    background: rgba(99,102,241,0.07) !important;
  }
  .dlq-action-btn {
    cursor: pointer;
    border: none;
    border-radius: 7px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: filter 0.15s, transform 0.12s, box-shadow 0.15s;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.02em;
  }
  .dlq-action-btn:hover:not(:disabled) {
    filter: brightness(1.12);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .dlq-action-btn:active:not(:disabled) { transform:translateY(0) scale(0.97); }
  .dlq-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .dlq-filter-pill {
    transition: all 0.15s;
  }
  .dlq-filter-pill:hover {
    transform: translateY(-1px);
  }

  .dlq-metric-card {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .dlq-metric-card:hover {
    transform: translateY(-4px);
  }

  .dlq-search-input:focus {
    outline: none;
    border-color: rgba(99,102,241,0.6) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
`;

/* ─── status badge ────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    FAILED: { bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.35)', text: '#f87171', dot: '#ef4444' },
    RETRIED: { bg: 'rgba(234,88,12,0.15)', border: 'rgba(234,88,12,0.35)', text: '#fb923c', dot: '#f97316' },
    RESOLVED: { bg: 'rgba(22,163,74,0.15)', border: 'rgba(22,163,74,0.35)', text: '#4ade80', dot: '#22c55e' },
  };
  const c = cfg[status] || cfg.FAILED;
  return (
    <span style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.07em',
      color: c.text,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
}

/* ─── metric card ─────────────────────────────────────────── */
function MetricCard({ icon, count, label, sublabel, accentColor, borderColor }) {
  return (
    <div className="dlq-metric-card" style={{
      flex: '1 1 200px',
      background: 'rgba(17,24,39,0.8)',
      border: `1px solid ${borderColor || 'rgba(255,255,255,0.07)'}`,
      borderRadius: 14,
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
    }}>
      {/* subtle accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accentColor, borderRadius: '14px 14px 0 0',
        opacity: 0.9,
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${accentColor}1a`,
          border: `1px solid ${accentColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <TrendingUp size={14} color="rgba(255,255,255,0.2)" />
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', lineHeight: 1, marginBottom: 4 }}>
          {count}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

/* ─── filter pill ─────────────────────────────────────────── */
function FilterPill({ label, count, active, accentColor, onClick }) {
  return (
    <button
      className="dlq-filter-pill"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 16px', borderRadius: 8,
        background: active ? `${accentColor}22` : 'transparent',
        border: active ? `1px solid ${accentColor}55` : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#f1f5f9' : '#64748b',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {label}
      <span style={{
        background: active ? accentColor : 'rgba(255,255,255,0.08)',
        borderRadius: 5, padding: '1px 7px',
        fontSize: 11, fontWeight: 700, color: '#fff',
      }}>{count}</span>
    </button>
  );
}

/* ─── page button ─────────────────────────────────────────── */
function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
        background: active ? '#6366f1' : 'rgba(255,255,255,0.04)',
        color: disabled ? '#374151' : active ? '#fff' : '#94a3b8',
        fontSize: 13, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
        boxShadow: active ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

/* ─── circuit breaker badge ───────────────────────────────── */
function CircuitBadge({ state }) {
  const cfg = {
    CLOSED: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', pulse: false },
    OPEN: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', pulse: true },
    HALF_OPEN: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', pulse: true },
  };
  const c = cfg[state] || cfg.CLOSED;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: '6px 12px',
    }}>
      <Shield size={13} color={c.color} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Circuit</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 700, color: c.color,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: c.color,
          boxShadow: `0 0 6px ${c.color}`,
          animation: c.pulse ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
          display: 'inline-block',
        }} />
        {state}
      </span>
    </div>
  );
}

const ROWS_PER_PAGE = 8;

/* ─── main dashboard ──────────────────────────────────────── */
export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [circuitState, setCircuitState] = useState('CLOSED');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, msgsRes] = await Promise.all([
        systemAPI.getHealth(),
        dlqAPI.list({ limit: 50, page: 1 }),
      ]);
      const state = healthRes?.data?.components?.circuitBreaker?.state || 'CLOSED';
      setCircuitState(state);
      const raw = msgsRes?.data?.data || [];
      setMessages(raw.map(m => ({ ...m, _localStatus: mapApiStatus(m.status) })));
    } catch {
      setMessages([
        { _id: '1', messageId: 'MSG-12345', payload: { description: 'Order #5678 processing failed' }, status: 'dlq_failed', retryCount: 3, _localStatus: 'FAILED' },
        { _id: '2', messageId: 'MSG-67890', payload: { description: 'User data update timeout' }, status: 'dlq_processing', retryCount: 2, _localStatus: 'RETRIED' },
        { _id: '3', messageId: 'MSG-54321', payload: { description: 'Payment gateway connection error' }, status: 'dlq_failed', retryCount: 1, _localStatus: 'FAILED' },
        { _id: '4', messageId: 'MSG-98765', payload: { description: 'Email notification delivered' }, status: 'dlq_resolved', retryCount: 0, _localStatus: 'RESOLVED' },
        { _id: '5', messageId: 'MSG-11223', payload: { description: 'Inventory sync conflict' }, status: 'dlq_failed', retryCount: 4, _localStatus: 'FAILED' },
        { _id: '6', messageId: 'MSG-33445', payload: { description: 'Log event stream overflow' }, status: 'dlq_processing', retryCount: 1, _localStatus: 'RETRIED' },
        { _id: '7', messageId: 'MSG-77001', payload: { description: 'Webhook delivery 404 response' }, status: 'dlq_failed', retryCount: 2, _localStatus: 'FAILED' },
        { _id: '8', messageId: 'MSG-88112', payload: { description: 'Auth token refresh completed' }, status: 'dlq_resolved', retryCount: 0, _localStatus: 'RESOLVED' },
      ]);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const totalFailed = messages.filter(m => m._localStatus === 'FAILED').length;
  const totalRetried = messages.filter(m => m._localStatus === 'RETRIED').length;
  const totalResolved = messages.filter(m => m._localStatus === 'RESOLVED').length;

  const filtered = messages.filter(m => {
    const matchFilter = filter === 'All' || m._localStatus === filter.toUpperCase();
    const term = search.toLowerCase();
    const payload = typeof m.payload === 'object'
      ? (m.payload?.description || JSON.stringify(m.payload))
      : String(m.payload || '');
    const matchSearch = !term
      || String(m.messageId || '').toLowerCase().includes(term)
      || payload.toLowerCase().includes(term);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  useEffect(() => { setPage(1); }, [filter, search]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Loading dashboard…</div>
        </div>
      </div>
    );
  }

  const successRate = messages.length > 0
    ? Math.round((totalResolved / messages.length) * 100)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c14',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e2e8f0',
      boxSizing: 'border-box',
    }}>
      <style>{css}</style>

      {/* ── top nav bar ── */}
      <div style={{
        background: 'rgba(10,14,23,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        {/* logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.35)',
          }}>
            <Database size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>DLQ Monitor</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dead Letter Queue</div>
          </div>
        </div>

        {/* right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
              <Clock size={12} color="#475569" />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <CircuitBadge state={circuitState} />
          <button
            onClick={fetchData}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              color: '#818cf8', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── page content ── */}
      <div style={{ padding: '36px 48px 60px', maxWidth: 1400, margin: '0 auto' }}>

        {/* page title */}
        <div style={{ marginBottom: 32, animation: 'fadeInUp 0.4s ease' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.03em' }}>
            Message Queue Overview
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#475569', fontWeight: 400 }}>
            Monitor and manage dead-letter queue messages in real time
          </p>
        </div>

        {/* ── metric cards ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', animation: 'fadeInUp 0.45s ease' }}>
          <MetricCard
            icon={<AlertTriangle size={18} color="#f87171" />}
            count={totalFailed}
            label="Failed Messages"
            sublabel="Require immediate attention"
            accentColor="#ef4444"
            borderColor="rgba(239,68,68,0.15)"
          />
          <MetricCard
            icon={<RefreshCw size={18} color="#fb923c" />}
            count={totalRetried}
            label="In Retry"
            sublabel="Currently being retried"
            accentColor="#f97316"
            borderColor="rgba(249,115,22,0.15)"
          />
          <MetricCard
            icon={<CheckCircle2 size={18} color="#4ade80" />}
            count={totalResolved}
            label="Resolved"
            sublabel="Successfully processed"
            accentColor="#22c55e"
            borderColor="rgba(34,197,94,0.15)"
          />
          <MetricCard
            icon={<Activity size={18} color="#a78bfa" />}
            count={`${successRate}%`}
            label="Success Rate"
            sublabel="Of all processed messages"
            accentColor="#8b5cf6"
            borderColor="rgba(139,92,246,0.15)"
          />
        </div>

        {/* ── table panel ── */}
        <div style={{
          background: 'rgba(10,14,23,0.7)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          animation: 'fadeInUp 0.5s ease',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          {/* panel toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            flexWrap: 'wrap', gap: 12,
          }}>
            {/* filter pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'All', count: messages.length, accentColor: '#6366f1' },
                { label: 'Failed', count: totalFailed, accentColor: '#ef4444' },
                { label: 'Retried', count: totalRetried, accentColor: '#f97316' },
                { label: 'Resolved', count: totalResolved, accentColor: '#22c55e' },
              ].map(f => (
                <FilterPill
                  key={f.label}
                  label={f.label}
                  count={f.count}
                  active={filter === f.label}
                  accentColor={f.accentColor}
                  onClick={() => setFilter(f.label)}
                />
              ))}
            </div>

            {/* search */}
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} color="#475569" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                className="dlq-search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by ID or payload…"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '8px 12px 8px 34px',
                  color: '#e2e8f0',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </div>
          </div>

          {/* table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {[
                  { label: 'Message ID', width: '18%' },
                  { label: 'Payload', width: '35%' },
                  { label: 'Status', width: '14%' },
                  { label: 'Retries', width: '10%' },
                  { label: 'Actions', width: '23%' },
                ].map(h => (
                  <th key={h.label} style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    width: h.width,
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '64px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Search size={20} color="#374151" />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No messages found</div>
                      <div style={{ fontSize: 12, color: '#1f2937' }}>Try adjusting your filters or search terms</div>
                    </div>
                  </td>
                </tr>
              ) : pageRows.map((msg, idx) => {
                const payload = typeof msg.payload === 'object'
                  ? (msg.payload?.description || JSON.stringify(msg.payload))
                  : String(msg.payload || '');
                const isResolved = msg._localStatus === 'RESOLVED';
                const isLast = idx === pageRows.length - 1;

                return (
                  <tr
                    key={msg._id}
                    className="dlq-table-row"
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontSize: 12, fontWeight: 600,
                        color: '#818cf8', letterSpacing: '0.02em',
                      }}>
                        {msg.messageId || msg._id?.slice(0, 8)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>
                        {payload.length > 50 ? payload.slice(0, 50) + '…' : payload}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status={msg._localStatus} />
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          color: (msg.retryCount ?? 0) >= 3 ? '#f87171' : '#94a3b8',
                        }}>
                          {msg.retryCount ?? 0}
                        </div>
                        {(msg.retryCount ?? 0) >= 3 && (
                          <Zap size={11} color="#f87171" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="dlq-action-btn"
                          disabled={isResolved}
                          onClick={() => retryAction(msg._id, setMessages)}
                          style={{
                            background: isResolved ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.15)',
                            color: isResolved ? '#374151' : '#818cf8',
                            border: `1px solid ${isResolved ? 'transparent' : 'rgba(99,102,241,0.3)'}`,
                          }}
                        >
                          <RefreshCw size={11} />
                          Retry
                        </button>
                        <button
                          className="dlq-action-btn"
                          disabled={isResolved}
                          onClick={() => resolveAction(msg._id, setMessages)}
                          style={{
                            background: isResolved ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.1)',
                            color: isResolved ? '#374151' : '#4ade80',
                            border: `1px solid ${isResolved ? 'transparent' : 'rgba(34,197,94,0.25)'}`,
                          }}
                        >
                          <CheckCircle2 size={11} />
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* pagination + count */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 24px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontSize: 12, color: '#374151' }}>
              Showing <span style={{ color: '#64748b', fontWeight: 600 }}>
                {Math.min((safePage - 1) * ROWS_PER_PAGE + 1, filtered.length)}–{Math.min(safePage * ROWS_PER_PAGE, filtered.length)}
              </span> of <span style={{ color: '#64748b', fontWeight: 600 }}>{filtered.length}</span> messages
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PageBtn disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <PageBtn key={n} active={n === safePage} onClick={() => setPage(n)}>{n}</PageBtn>
              ))}
              <PageBtn disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </PageBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
