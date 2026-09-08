import React, { useState, useRef, useEffect, useMemo } from 'react';
import './App.css';
import { gsInfraPlots } from './data/gsInfraData';
import { cheeranjiviPlots } from './data/cheeranjiviData';
import gsInfraCoords from './data/gsInfraCoords.json';
import cheerCoords from './data/cheeranjiviCoords.json';

const ADMIN_PIN = '2321';
const MANOJ_JAIN_PHONE = '918619193305';

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
    locationLink: 'https://maps.google.com/?q=Kishangarh+Arain+Road',
    gallery: [
      { src: './gs_map_master.webp', caption: 'GS Infra City – Master Layout' },
      { src: './gs_area_1.webp',    caption: 'Area Sheet (Residential Plots 1–48)' },
      { src: './gs_area_2.webp',    caption: 'Area Sheet (Residential Plots 49+)' },
      { src: './gs_area_3.webp',    caption: 'Commercial Shops Area Sheet' },
    ],
    brochures: [
      { label: '📐 Layout Plan (PDF)', file: './gs_infra_layout.pdf' },
      { label: '📊 Area Sheet (PDF)',  file: './gs_infra_area_sheet.pdf' },
    ]
  },
  CHEERANJIVI: {
    id: 'CHEERANJIVI',
    name: 'Cheeranjivi Vatika',
    subtitle: 'Integrated Township & Garden Enclave',
    rera: 'RAJ/P/2026/5332',
    mapImage: './cheeranjivi_map.webp',
    originalSize: { width: 2554, height: 1078 },
    gallery: [
      { src: './cheer_site_1.webp', caption: 'Cheeranjivi Vatika – Site View 1' },
      { src: './cheer_site_2.webp', caption: 'Site View 2' },
      { src: './cheer_site_3.webp', caption: 'Site View 3' },
      { src: './cheer_site_4.webp', caption: 'Site View 4' },
      { src: './cheer_site_5.webp', caption: 'Site View 5' },
      { src: './cheer_site_6.webp', caption: 'RERA Layout Overview' },
    ],
    brochures: [
      { label: '📐 Layout Plan (PDF)', file: './cheeranjivi_layout.pdf' },
    ],
    data: cheeranjiviPlots,

    coords: cheerCoords,
    defaultRate: 14500,
    locationLink: 'https://rera.rajasthan.gov.in/'
  }
};

export default function App() {
  const [activeColonyId, setActiveColonyId] = useState('GS_INFRA');
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'split' | 'table'
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ratePerSqYd, setRatePerSqYd] = useState(11500);

  // Status Overrides (Persistent via localStorage)
  const [statusOverrides, setStatusOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jain_colonies_status_overrides') || '{}');
    } catch {
      return {};
    }
  });

  // Admin Mode
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('jain_admin_auth') === 'true';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

  // Pan & Zoom
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  // Mapping Mode state
  const [mappingMode, setMappingMode] = useState(false);
  const [customCoords, setCustomCoords] = useState({});

  const colony = COLONIES[activeColonyId];

  // Merge base plot data with persistent status overrides
  const currentPlots = useMemo(() => {
    const colonyOverrides = statusOverrides[activeColonyId] || {};
    return colony.data.map(plot => {
      if (colonyOverrides[plot.id]) {
        return { ...plot, status: colonyOverrides[plot.id] };
      }
      return plot;
    });
  }, [colony, statusOverrides, activeColonyId]);

  // Sync rate and coords when switching colonies
  useEffect(() => {
    setRatePerSqYd(colony.defaultRate);
    setSelectedPlot(null);
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setCustomCoords({});
    setZoom(activeColonyId === 'GS_INFRA' ? 0.75 : 0.65);
    setPan({ x: 20, y: 20 });
  }, [activeColonyId]);

  // Merge default coordinates with any user mapped coordinates
  const activeCoords = useMemo(() => {
    return { ...colony.coords, ...customCoords };
  }, [colony, customCoords]);

  // Filtered Plots
  const filteredPlots = useMemo(() => {
    return currentPlots.filter(plot => {
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
  }, [currentPlots, searchQuery, statusFilter, categoryFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalUnits = currentPlots.length;
    const available = currentPlots.filter(p => p.status === 'Available').length;
    const sold = currentPlots.filter(p => p.status === 'Sold').length;
    const hold = currentPlots.filter(p => p.status === 'Hold').length;
    const totalSqYds = currentPlots.reduce((acc, p) => acc + (p.sqYds || 0), 0);
    return { totalUnits, available, sold, hold, totalSqYds: Math.round(totalSqYds) };
  }, [currentPlots]);

  // Update plot status (Admin only)
  const updatePlotStatus = (colonyId, plotId, newStatus) => {
    if (!isAdmin) {
      setShowAdminModal(true);
      return;
    }
    const nextOverrides = {
      ...statusOverrides,
      [colonyId]: {
        ...(statusOverrides[colonyId] || {}),
        [plotId]: newStatus
      }
    };
    setStatusOverrides(nextOverrides);
    try {
      localStorage.setItem('jain_colonies_status_overrides', JSON.stringify(nextOverrides));
    } catch (e) {
      console.error('Failed to save status overrides', e);
    }
    // Update selectedPlot if matching
    if (selectedPlot?.id === plotId) {
      setSelectedPlot(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  // Focus & highlight plot on drawing
  const focusPlotOnMap = (plot, switchToMap = true) => {
    setSelectedPlot(plot);
    if (switchToMap && activeTab === 'table') {
      setActiveTab('map');
    }

    const coord = activeCoords[plot.id];
    if (coord && viewportRef.current) {
      const vpW = viewportRef.current.clientWidth || 800;
      const vpH = viewportRef.current.clientHeight || 600;
      const targetZoom = 1.15;
      setZoom(targetZoom);
      setPan({
        x: Math.round(vpW / 2 - coord.x * targetZoom),
        y: Math.round(vpH / 2 - coord.y * targetZoom)
      });
    }
  };

  // Admin PIN verification
  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setIsAdmin(true);
      sessionStorage.setItem('jain_admin_auth', 'true');
      setShowAdminModal(false);
      setPinInput('');
      setAdminError('');
    } else {
      setAdminError('Invalid PIN! Please enter 2321');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('jain_admin_auth');
  };

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
      `Hello Manoj ji, I am interested in ${colony.name} - ${plot.name} (${plot.category}).\n` +
      `Area: ${plot.sqYds} Sq. Yds (${plot.sqMtr} Sq. Mtr)\n` +
      `Status: ${plot.status}\n` +
      `Road Width: ${plot.road || 'Standard'}\n` +
      `Est. Value: ${formatCurrency(totalVal)}\n` +
      `Please share brochure and site visit details.`
    );
    window.open(`https://wa.me/${MANOJ_JAIN_PHONE}?text=${msg}`, '_blank');
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
          {isAdmin ? (
            <div className="admin-status-indicator">
              <span className="admin-badge-pill">🔓 Admin Mode</span>
              <button 
                className="action-btn logout-btn" 
                onClick={handleAdminLogout}
                title="Logout from Admin Mode"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              className="action-btn admin-login-btn"
              onClick={() => { setShowAdminModal(true); setAdminError(''); setPinInput(''); }}
              title="Admin Login to change plot statuses"
            >
              🔒 Admin Login
            </button>
          )}

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

      {/* Admin Mode Alert Banner */}
      {isAdmin && (
        <div className="admin-banner">
          <span>
            🔑 <strong>Admin Mode Active (PIN: 2321):</strong> You have edit privileges to toggle plot statuses (Available / Hold / Sold). Changes persist locally.
          </span>
          <button 
            className="action-btn"
            style={{ padding: '2px 8px', fontSize: '0.75rem', borderColor: '#f59e0b', color: '#f59e0b' }}
            onClick={() => {
              if (confirm('Reset all status overrides back to default sheet?')) {
                localStorage.removeItem('jain_colonies_status_overrides');
                setStatusOverrides({});
              }
            }}
          >
            Reset Overrides
          </button>
        </div>
      )}

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
            📞 <strong>Contact:</strong> Manoj Jain (<a href={`tel:${MANOJ_JAIN_PHONE}`} style={{ color: 'inherit', textDecoration: 'none' }}>8619193305</a>)
          </span>
        </div>
        <div className="meta-pill" style={{ borderColor: '#3b82f6' }}>
          💡 <strong>Tip:</strong> Click any plot in the table or cards to locate & highlight on the map drawing!
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Total Units</span>
          <span className="metric-value">{metrics.totalUnits}</span>
          <span className="metric-sub">{colony.name}</span>
        </div>
        <div className="metric-card available">
          <span className="metric-label">Available</span>
          <span className="metric-value">{metrics.available}</span>
          <span className="metric-sub">Ready for Booking</span>
        </div>
        <div className="metric-card sold">
          <span className="metric-label">Sold</span>
          <span className="metric-value">{metrics.sold}</span>
          <span className="metric-sub">Confirmed Registry</span>
        </div>
        <div className="metric-card hold">
          <span className="metric-label">Hold / Token</span>
          <span className="metric-value">{metrics.hold}</span>
          <span className="metric-sub">In token process</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Layout Area</span>
          <span className="metric-value">{metrics.totalSqYds.toLocaleString()}</span>
          <span className="metric-sub">Sq. Yards (~{Math.round(metrics.totalSqYds * 0.8361).toLocaleString()} Sq.M)</span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
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

        <div className="filter-group">
          {['ALL', 'AVAILABLE', 'SOLD', 'HOLD'].map(st => (
            <button 
              key={st}
              className={`filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 4px' }} />
          {['ALL', 'Residential', 'Commercial', 'Corner'].map(cat => (
            <button 
              key={cat}
              className={`filter-chip ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
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
            className={`view-toggle-btn ${activeTab === 'split' ? 'active' : ''}`}
            onClick={() => setActiveTab('split')}
          >
            ⚡ Split View
          </button>
          <button 
            className={`view-toggle-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📋 List View
          </button>
        </div>
      </div>

      {/* Horizontal Plot Selector Strip (Easy Tabular Cards) */}
      <div className="plot-cards-strip">
        <div className="strip-header">
          <span>⚡ <strong>Quick Plot Selector:</strong> Click any plot to highlight on drawing</span>
          <span className="strip-count">{filteredPlots.length} Plots</span>
        </div>
        <div className="strip-scroll">
          {filteredPlots.map(p => {
            const isSel = selectedPlot?.id === p.id;
            return (
              <div 
                key={p.id}
                className={`strip-card ${isSel ? 'selected' : ''} ${p.status.toLowerCase()}`}
                onClick={() => focusPlotOnMap(p, false)}
              >
                <div className="strip-card-top">
                  <span className="strip-plot-no">{p.plotNo}</span>
                  <span className={`strip-dot ${p.status.toLowerCase()}`} />
                </div>
                <div className="strip-plot-size">{p.sqYds} Yd</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`main-content ${activeTab === 'split' ? 'split-view' : ''}`}>
        {(activeTab === 'map' || activeTab === 'split') && (
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

            {/* Viewport */}
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
                {/* Blueprint Drawing Base Image */}
                <img 
                  src={colony.mapImage} 
                  alt={colony.name} 
                  className="map-base-img"
                  style={{
                    width: colony.originalSize.width,
                    height: colony.originalSize.height
                  }}
                />

                {/* SVG Overlay for Coordinates & Highlights */}
                <svg 
                  className="map-svg-overlay"
                  viewBox={`0 0 ${colony.originalSize.width} ${colony.originalSize.height}`}
                >
                  {colony.data.map(plot => {
                    const coord = activeCoords[plot.id];
                    if (!coord) return null;

                    // Check if current plot is filtered out
                    const isVisible = filteredPlots.some(p => p.id === plot.id);
                    const isSel = selectedPlot?.id === plot.id;
                    
                    // Status colors
                    let fillColor = '#10b981'; // Available
                    if (plot.category === 'Commercial') {
                      fillColor = '#8b5cf6';
                    } else if (plot.status === 'Sold') {
                      fillColor = '#ef4444';
                    } else if (plot.status === 'Hold') {
                      fillColor = '#f59e0b';
                    }

                    const opacity = isVisible ? 1 : 0.25;

                    return (
                      <g 
                        key={plot.id}
                        transform={`translate(${coord.x}, ${coord.y})`}
                        className={`plot-badge ${isSel ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          focusPlotOnMap(plot, false);
                        }}
                        opacity={opacity}
                      >
                        {/* Highlighting reticle / radar pulse when selected */}
                        {isSel && (
                          <g className="highlight-reticle">
                            <circle r="46" className="radar-wave" fill="rgba(59, 130, 246, 0.25)" stroke="#38bdf8" strokeWidth="2.5" />
                            <circle r="32" className="radar-wave-delayed" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="5 3" />
                            <circle r="20" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.9" />
                          </g>
                        )}

                        {/* Outer Pin Circle */}
                        <circle 
                          r="16" 
                          fill={fillColor} 
                          stroke="#ffffff" 
                          strokeWidth="2" 
                        />
                        
                        {/* Text Label */}
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
        )}

        {(activeTab === 'table' || activeTab === 'split') && (
          <div className="table-container">
            <div className="table-top-bar">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredPlots.length}</strong> units • Click any row to highlight on drawing
              </span>
            </div>
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
                      onClick={() => focusPlotOnMap(p, activeTab === 'table')}
                    >
                      <td><strong>{p.name}</strong></td>
                      <td>{p.category}</td>
                      <td>{p.type}</td>
                      <td><strong>{p.sqYds}</strong> Sq.Yds</td>
                      <td>{p.sqMtr} Sq.M</td>
                      <td>{p.road || '30 ft'}</td>
                      <td>
                        {isAdmin ? (
                          <select 
                            className={`status-select ${p.status.toLowerCase()}`}
                            value={p.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePlotStatus(colony.id, p.id, e.target.value);
                            }}
                          >
                            <option value="Available">Available</option>
                            <option value="Hold">Hold</option>
                            <option value="Sold">Sold</option>
                          </select>
                        ) : (
                          <span className={`status-tag ${p.status.toLowerCase()}`}>
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td><strong>{formatCurrency(estVal)}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="action-btn"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              focusPlotOnMap(p, true);
                            }}
                            title="Highlight on map drawing"
                          >
                            🗺️ Map
                          </button>
                          <button 
                            className="action-btn"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#10b981', color: '#fff', border: 'none' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              sharePlotOnWhatsApp(p);
                            }}
                            title="Inquire on WhatsApp"
                          >
                            💬
                          </button>
                        </div>
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

              {/* Admin Status Changer */}
              {isAdmin ? (
                <div className="admin-status-box">
                  <div className="admin-status-title">
                    <span>⚡ Admin: Change Status</span>
                  </div>
                  <div className="status-btn-group">
                    {['Available', 'Hold', 'Sold'].map(st => (
                      <button
                        key={st}
                        className={`status-btn-pill ${st.toLowerCase()} ${selectedPlot.status === st ? 'active' : ''}`}
                        onClick={() => updatePlotStatus(colony.id, selectedPlot.id, st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button 
                  className="admin-unlock-hint"
                  onClick={() => { setShowAdminModal(true); setPinInput(''); setAdminError(''); }}
                >
                  🔒 Edit Plot Status (Admin PIN Required)
                </button>
              )}

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
                💬 Inquire on WhatsApp (Manoj Jain)
              </button>

              <button 
                className="action-btn"
                style={{ justifyContent: 'center' }}
                onClick={() => focusPlotOnMap(selectedPlot, true)}
              >
                🎯 Re-center on Map Drawing
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
              <p style={{ fontSize: '0.85rem' }}>Click any plot pin on the blueprint or select from the list/quick-selector to see full dimensions, pricing, and highlight on drawing.</p>
            </div>
          )}
        </aside>
      </main>

      {/* Admin Login PIN Modal */}
      {showAdminModal && (
        <div className="modal-backdrop" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔒 Admin Access</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAdminModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Enter Admin Security PIN to enable status editing for plots:
            </p>
            <form onSubmit={handleAdminAuth}>
              <input 
                type="password"
                className="pin-modal-input"
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setAdminError('');
                }}
                autoFocus
                maxLength={8}
              />
              {adminError && <div className="pin-error-msg">{adminError}</div>}
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="action-btn"
                  onClick={() => setShowAdminModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="action-btn submit-pin-btn"
                >
                  Unlock Admin Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery & Brochures Section */}
      <section className="gallery-section">
        <div className="gallery-header">
          <h2 className="gallery-title">📸 Photos &amp; Brochures — {colony.name}</h2>
          <div className="brochure-btns">
            {colony.brochures && colony.brochures.map((b, i) => (
              <a
                key={i}
                href={b.file}
                download
                className="brochure-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                {b.label}
              </a>
            ))}
          </div>
        </div>

        <div className="gallery-grid">
          {colony.gallery && colony.gallery.map((img, i) => (
            <div
              key={i}
              className="gallery-card"
              onClick={() => window.open(img.src, '_blank')}
              title={img.caption}
            >
              <img
                src={img.src}
                alt={img.caption}
                className="gallery-img"
                loading="lazy"
              />
              <div className="gallery-caption">{img.caption}</div>
            </div>
          ))}
        </div>
      </section>

    </div>

  );
}
