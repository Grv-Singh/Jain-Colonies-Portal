import React, { useState, useRef, useEffect, useMemo } from 'react';
import './App.css';
import { gsInfraPlots } from './data/gsInfraData';
import { cheeranjiviPlots } from './data/cheeranjiviData';
import gsInfraCoords from './data/gsInfraCoords.json';
import cheerCoords from './data/cheeranjiviCoords.json';

const COLONIES = {
  GS_INFRA: {
    id: 'GS_INFRA',
    name: 'GS Infra City',
    subtitle: 'Kh. No. 285, Kishangarh (Arain Road)',
    rera: 'Approved Colony Layout Plan',
    mapImage: './gs_infra_map.webp',
    originalSize: { width: 1755, height: 1240 },
    data: gsInfraPlots,
    coords: gsInfraCoords,
    defaultRate: 11500,
    locationLink: 'https://maps.google.com/?q=Kishangarh+Arain+Road'
  },
  CHEERANJIVI: {
    id: 'CHEERANJIVI',
    name: 'Cheeranjivi Vatika',
    subtitle: 'Integrated Township & Garden Enclave',
    rera: 'RAJ/P/2026/5332',
    mapImage: './cheeranjivi_map.webp',
    originalSize: { width: 2554, height: 1078 },
    data: cheeranjiviPlots,
    coords: cheerCoords,
    defaultRate: 14500,
    locationLink: 'https://rera.rajasthan.gov.in/'
  }
};

export default function App() {
  const [activeColonyId, setActiveColonyId] = useState('GS_INFRA');
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'table'
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ratePerSqYd, setRatePerSqYd] = useState(12000);
  
  // Pan & Zoom
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  // Mapping Mode state
  const [mappingMode, setMappingMode] = useState(false);
  const [customCoords, setCustomCoords] = useState({});

  const colony = COLONIES[activeColonyId];

  // Sync rate and coords when switching colonies
  useEffect(() => {
    setRatePerSqYd(colony.defaultRate);
    setSelectedPlot(null);
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setCustomCoords({});
    // Reset view
    setZoom(activeColonyId === 'GS_INFRA' ? 0.75 : 0.65);
    setPan({ x: 20, y: 20 });
  }, [activeColonyId]);

  // Merge default coordinates with any user mapped coordinates
  const activeCoords = useMemo(() => {
    return { ...colony.coords, ...customCoords };
  }, [colony, customCoords]);

  // Filtered Plots
  const filteredPlots = useMemo(() => {
    return colony.data.filter(plot => {
      const matchesSearch = 
        plot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plot.sqYds && plot.sqYds.toString().includes(searchQuery));
      
      const matchesStatus = statusFilter === 'ALL' || plot.status.toUpperCase() === statusFilter;
      const matchesCategory = 
        categoryFilter === 'ALL' || 
        (categoryFilter === 'Commercial' && plot.category === 'Commercial') ||
        (categoryFilter === 'Residential' && plot.category === 'Residential') ||
        (categoryFilter === 'Corner' && plot.type && plot.type.toLowerCase().includes('cor'));

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [colony, searchQuery, statusFilter, categoryFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalUnits = colony.data.length;
    const available = colony.data.filter(p => p.status === 'Available').length;
    const sold = colony.data.filter(p => p.status === 'Sold').length;
    const hold = colony.data.filter(p => p.status === 'Hold').length;
    const totalSqYds = colony.data.reduce((acc, p) => acc + (p.sqYds || 0), 0);
    return { totalUnits, available, sold, hold, totalSqYds: Math.round(totalSqYds) };
  }, [colony]);

  // Map drag handlers
  const handleMouseDown = (e) => {
    if (mappingMode) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev * zoomFactor, 3.5));
    } else {
      setZoom(prev => Math.max(prev / zoomFactor, 0.3));
    }
  };

  // Mapping Mode Click Handler
  const handleMapClick = (e) => {
    if (!mappingMode || !selectedPlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;
    setCustomCoords(prev => ({
      ...prev,
      [selectedPlot.id]: { x: Math.round(clickX), y: Math.round(clickY) }
    }));
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const sharePlotOnWhatsApp = (plot) => {
    const totalVal = Math.round((plot.sqYds || 0) * ratePerSqYd);
    const msg = encodeURIComponent(
      `Hello, I am interested in ${colony.name} - ${plot.name} (${plot.category}).\n` +
      `Area: ${plot.sqYds} Sq. Yds (${plot.sqMtr} Sq. Mtr)\n` +
      `Status: ${plot.status}\n` +
      `Road Width: ${plot.road || 'Standard'}\n` +
      `Est. Value: ${formatCurrency(totalVal)}\n` +
      `Please share brochure and site visit details.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="top-header">
        <div className="brand-section">
          <div className="brand-icon">JP</div>
          <div className="brand-text">
            <h1>Jain Colonies Portal</h1>
            <p>Interactive Plot Availability & Master Plan</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="tabs-wrapper">
          <button 
            className={`tab-btn ${activeColonyId === 'GS_INFRA' ? 'active' : ''}`}
            onClick={() => setActiveColonyId('GS_INFRA')}
          >
            🏛️ GS Infra City
            <span className="tab-badge">88 Units</span>
          </button>
          <button 
            className={`tab-btn ${activeColonyId === 'CHEERANJIVI' ? 'active' : ''}`}
            onClick={() => setActiveColonyId('CHEERANJIVI')}
          >
            🌳 Cheeranjivi Vatika
            <span className="tab-badge">50 Plots</span>
          </button>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          <button 
            className={`action-btn ${mappingMode ? 'active-mode' : ''}`}
            onClick={() => setMappingMode(!mappingMode)}
            title="Toggle pin coordinate mapper"
          >
            📍 {mappingMode ? 'Mapping: ON' : 'Map Mode'}
          </button>
          <a 
            href={colony.locationLink}
            target="_blank" 
            rel="noopener noreferrer" 
            className="action-btn"
          >
            🗺️ Open Map
          </a>
        </div>
      </header>

      {/* Mapping mode banner */}
      {mappingMode && (
        <div className="mapping-banner">
          <span>
            📍 <strong>Mapping Mode Active:</strong> Select a plot from the list/search, then click anywhere on the blueprint to place its pin marker.
          </span>
          <button 
            className="action-btn" 
            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            onClick={() => {
              const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeCoords, null, 2));
              const a = document.createElement('a');
              a.href = str;
              a.download = `${activeColonyId.toLowerCase()}_coords.json`;
              a.click();
            }}
          >
            Export JSON
          </button>
        </div>
      )}

      {/* Colony Subheader */}
      <div className="colony-info-bar">
        <div className="colony-meta">
          <span className="meta-pill">
            📍 <strong>Location:</strong> {colony.subtitle}
          </span>
          <span className="meta-pill">
            📜 <strong>RERA / Plan:</strong> {colony.rera}
          </span>
          <span className="meta-pill">
            🛣️ <strong>Roads:</strong> 30 ft, 40 ft & Main Highways
          </span>
        </div>
        <div className="meta-pill" style={{ borderColor: '#3b82f6' }}>
          🏷️ Base Rate: <strong>₹{ratePerSqYd.toLocaleString('en-IN')} / Sq.Yd</strong>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Total Inventory</span>
          <span className="metric-value">{metrics.totalUnits}</span>
          <span className="metric-sub">{colony.id === 'GS_INFRA' ? '64 Plots + 24 Shops' : 'Residential Plots'}</span>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--color-available)' }}>
          <span className="metric-label">Available Plots</span>
          <span className="metric-value" style={{ color: 'var(--color-available)' }}>{metrics.available}</span>
          <span className="metric-sub">Open for booking</span>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--color-sold)' }}>
          <span className="metric-label">Sold Units</span>
          <span className="metric-value" style={{ color: 'var(--color-sold)' }}>{metrics.sold}</span>
          <span className="metric-sub">Confirmed registry</span>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--color-hold)' }}>
          <span className="metric-label">Hold / Reserved</span>
          <span className="metric-value" style={{ color: 'var(--color-hold)' }}>{metrics.hold}</span>
          <span className="metric-sub">In token process</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Layout Area</span>
          <span className="metric-value">{metrics.totalSqYds.toLocaleString()}</span>
          <span className="metric-sub">Sq. Yards (~{Math.round(metrics.totalSqYds * 0.8361).toLocaleString()} Sq.M)</span>
        </div>
      </div>

      {/* Controls & Search Toolbar */}
      <div className="controls-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text"
            className="search-input"
            placeholder="Search Plot/Shop (e.g. 15, S-04, 200)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="filter-group">
          {['ALL', 'AVAILABLE', 'SOLD', 'HOLD'].map(s => (
            <button 
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'ALL' ? 'All Status' : s}
            </button>
          ))}

          <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 4px' }} />

          {['ALL', 'Residential', 'Commercial', 'Corner'].map(c => (
            <button 
              key={c}
              className={`filter-chip ${categoryFilter === c ? 'active' : ''}`}
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="view-toggle">
          <button 
            className={`view-toggle-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            🗺️ Map View
          </button>
          <button 
            className={`view-toggle-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📋 List View
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'map' ? (
          <div className="map-panel">
            {/* Zoom Controls */}
            <div className="map-controls">
              <button 
                className="map-zoom-btn" 
                title="Zoom In"
                onClick={() => setZoom(z => Math.min(z * 1.25, 3.5))}
              >
                ➕
              </button>
              <button 
                className="map-zoom-btn" 
                title="Zoom Out"
                onClick={() => setZoom(z => Math.max(z / 1.25, 0.3))}
              >
                ➖
              </button>
              <button 
                className="map-zoom-btn" 
                title="Reset View"
                onClick={() => {
                  setZoom(activeColonyId === 'GS_INFRA' ? 0.75 : 0.65);
                  setPan({ x: 20, y: 20 });
                }}
              >
                🔄
              </button>
            </div>

            {/* Interactive Viewport */}
            <div 
              className={`map-viewport ${mappingMode ? 'mapping-cursor' : ''}`}
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div 
                className="map-canvas-inner"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  width: colony.originalSize.width,
                  height: colony.originalSize.height
                }}
                onClick={handleMapClick}
              >
                {/* Blueprint Background */}
                <img 
                  src={colony.mapImage} 
                  alt={colony.name} 
                  className="map-base-img"
                  style={{ width: colony.originalSize.width, height: colony.originalSize.height }}
                />

                {/* SVG Overlay with Pins */}
                <svg 
                  className="map-svg-overlay" 
                  viewBox={`0 0 ${colony.originalSize.width} ${colony.originalSize.height}`}
                >
                  {colony.data.map(plot => {
                    const pos = activeCoords[plot.id];
                    if (!pos) return null;

                    const isMatch = filteredPlots.some(p => p.id === plot.id);
                    const isSelected = selectedPlot?.id === plot.id;

                    let pinColor = '#10b981'; // available
                    if (plot.category === 'Commercial') pinColor = '#8b5cf6';
                    else if (plot.status === 'Sold') pinColor = '#ef4444';
                    else if (plot.status === 'Hold') pinColor = '#f59e0b';

                    const opacity = isMatch ? 1 : 0.2;

                    return (
                      <g 
                        key={plot.id} 
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className={`plot-badge ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlot(plot);
                        }}
                        opacity={opacity}
                      >
                        {/* Outer Glow on select */}
                        {isSelected && (
                          <circle r="22" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.8" />
                        )}

                        {/* Pin Background */}
                        <circle 
                          r="16" 
                          fill={pinColor} 
                          stroke="#ffffff" 
                          strokeWidth="2"
                        />

                        {/* Label */}
                        <text 
                          textAnchor="middle" 
                          dy="4.5" 
                          fontSize="11" 
                          fontWeight="bold" 
                          fill="#ffffff"
                        >
                          {plot.plotNo}
                        </text>

                        {/* Title Tooltip */}
                        <title>
                          {`${plot.name} (${plot.status})\n${plot.sqYds} Sq.Yds - ${plot.type}`}
                        </title>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Map Legend */}
            <div className="legend-overlay">
              <div className="legend-pill">
                <div className="legend-dot" style={{ background: 'var(--color-available)' }} />
                <span>Available</span>
              </div>
              <div className="legend-pill">
                <div className="legend-dot" style={{ background: 'var(--color-sold)' }} />
                <span>Sold</span>
              </div>
              <div className="legend-pill">
                <div className="legend-dot" style={{ background: 'var(--color-hold)' }} />
                <span>Hold</span>
              </div>
              {colony.id === 'GS_INFRA' && (
                <div className="legend-pill">
                  <div className="legend-dot" style={{ background: 'var(--color-commercial)' }} />
                  <span>Commercial Shop</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="table-container">
            <table className="plots-table">
              <thead>
                <tr>
                  <th>Unit ID</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Area (Sq. Yd)</th>
                  <th>Area (Sq. Mtr)</th>
                  <th>Road Width</th>
                  <th>Status</th>
                  <th>Est. Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlots.map(p => {
                  const estVal = Math.round((p.sqYds || 0) * ratePerSqYd);
                  const isSel = selectedPlot?.id === p.id;
                  return (
                    <tr 
                      key={p.id} 
                      className={isSel ? 'selected' : ''}
                      onClick={() => setSelectedPlot(p)}
                    >
                      <td><strong>{p.name}</strong></td>
                      <td>{p.category}</td>
                      <td>{p.type}</td>
                      <td><strong>{p.sqYds}</strong> Sq.Yds</td>
                      <td>{p.sqMtr} Sq.M</td>
                      <td>{p.road || '30 ft'}</td>
                      <td>
                        <span className={`status-tag ${p.status.toLowerCase()}`}>
                          {p.status}
                        </span>
                      </td>
                      <td><strong>{formatCurrency(estVal)}</strong></td>
                      <td>
                        <button 
                          className="action-btn"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            sharePlotOnWhatsApp(p);
                          }}
                        >
                          💬 Inquire
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Plot Details Sidebar */}
        <aside className="details-sidebar">
          {selectedPlot ? (
            <>
              <div className="details-header">
                <div className="details-title">
                  <h3>{selectedPlot.name}</h3>
                  <span>{colony.name} • {selectedPlot.category}</span>
                </div>
                <span className={`status-tag ${selectedPlot.status.toLowerCase()}`}>
                  {selectedPlot.status}
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="info-grid">
                <div className="info-box">
                  <div className="info-box-label">Area (Sq. Yards)</div>
                  <div className="info-box-val">{selectedPlot.sqYds} Sq.Yd</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">Area (Sq. Meters)</div>
                  <div className="info-box-val">{selectedPlot.sqMtr} m²</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">Road Width</div>
                  <div className="info-box-val">{selectedPlot.road || '30 ft Road'}</div>
                </div>
                <div className="info-box">
                  <div className="info-box-label">Facing / Type</div>
                  <div className="info-box-val">{selectedPlot.type || 'Standard'}</div>
                </div>
              </div>

              {/* Live Price Calculator */}
              <div className="calc-card">
                <div className="calc-title">
                  <span>Price Calculator</span>
                  <span>₹{ratePerSqYd.toLocaleString()}/Sq.Yd</span>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="35000" 
                  step="500"
                  value={ratePerSqYd} 
                  onChange={(e) => setRatePerSqYd(Number(e.target.value))}
                  className="calc-slider"
                />
                <div className="calc-price">
                  {formatCurrency(Math.round((selectedPlot.sqYds || 0) * ratePerSqYd))}
                  <small>Est. Total Valuation</small>
                </div>
              </div>

              {/* Action Buttons */}
              <button 
                className="whatsapp-btn"
                onClick={() => sharePlotOnWhatsApp(selectedPlot)}
              >
                💬 Inquire on WhatsApp
              </button>

              <button 
                className="action-btn"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${colony.name} - ${selectedPlot.name} | ${selectedPlot.sqYds} Sq.Yd | Status: ${selectedPlot.status} | Road: ${selectedPlot.road}`
                  );
                  alert('Plot details copied to clipboard!');
                }}
              >
                📋 Copy Details
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Select a Plot</h4>
              <p style={{ fontSize: '0.85rem' }}>Click any plot pin on the blueprint or select from the list view to see full dimensions, pricing, and WhatsApp inquiry options.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
