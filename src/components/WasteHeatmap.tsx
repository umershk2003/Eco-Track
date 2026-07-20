import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BinReport } from '../types';
import { 
  Flame, 
  MapPin, 
  Navigation, 
  Settings, 
  Grid, 
  Activity, 
  TrendingUp, 
  Sliders, 
  Truck, 
  Filter, 
  Info, 
  RefreshCw 
} from 'lucide-react';

interface WasteHeatmapProps {
  reports: BinReport[];
}

interface GridCell {
  xIndex: number;
  yIndex: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  count: number;
  weight: number;
  reports: BinReport[];
  centerLat: number;
  centerLon: number;
  areaName: string;
}

export default function WasteHeatmap({ reports }: WasteHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'smooth' | 'grid'>('smooth');
  const [blurRadius, setBlurRadius] = useState<number>(25);
  const [minSeverityWeight, setMinSeverityWeight] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });

  // Filtered reports for heatmap rendering (active only or all)
  const activeReports = reports.filter(r => r.status !== 'collected');

  // Hyderabad geographic boundaries
  const HYD_BOUNDS = {
    latMin: 25.350,
    latMax: 25.430,
    lonMin: 68.320,
    lonMax: 68.400
  };

  // Pre-defined key areas/hubs in Hyderabad with their coordinates
  const HUBS = [
    { name: 'Qasimabad Phase 1', lat: 25.405, lon: 68.338 },
    { name: 'Latifabad No. 7', lat: 25.365, lon: 68.375 },
    { name: 'Saddar Cantt', lat: 25.392, lon: 68.362 },
    { name: 'Unit 6 Latifabad', lat: 25.358, lon: 68.365 },
    { name: 'Unit 10 Latifabad', lat: 25.378, lon: 68.388 },
    { name: 'Gari Khata', lat: 25.388, lon: 68.372 },
    { name: 'Citizen Colony', lat: 25.398, lon: 68.345 },
    { name: 'Hirabad', lat: 25.402, lon: 68.378 }
  ];

  // Map area to coordinate-closest hub name
  const getNearestAreaName = (lat: number, lon: number): string => {
    let nearest = HUBS[0];
    let minDist = Infinity;
    HUBS.forEach(hub => {
      const dist = Math.hypot(hub.lat - lat, hub.lon - lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = hub;
      }
    });
    return nearest.name;
  };

  // Calculate severity weight for scaling
  const getSeverityWeight = (severity: string): number => {
    switch (severity) {
      case 'illegal-dumping': return 4;
      case 'overflowing': return 3;
      case 'full': return 2;
      case 'damaged': return 1;
      default: return 1;
    }
  };

  // Handle Resize of Container
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Keep standard height ratio
        const newWidth = Math.max(320, width);
        const newHeight = Math.min(500, Math.max(300, Math.floor(newWidth * 0.65)));
        setDimensions({ width: newWidth, height: newHeight });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute Heatmap Grid Cells
  const gridResolution = 10; // 10x10 grid
  const gridCells: GridCell[] = [];

  const latStep = (HYD_BOUNDS.latMax - HYD_BOUNDS.latMin) / gridResolution;
  const lonStep = (HYD_BOUNDS.lonMax - HYD_BOUNDS.lonMin) / gridResolution;

  // Initialize cells
  for (let y = 0; y < gridResolution; y++) {
    for (let x = 0; x < gridResolution; x++) {
      const latMax = HYD_BOUNDS.latMax - (y * latStep);
      const latMin = latMax - latStep;
      const lonMin = HYD_BOUNDS.lonMin + (x * lonStep);
      const lonMax = lonMin + lonStep;

      const cellReports = activeReports.filter(r => {
        const lat = r.latitude || 25.39;
        const lon = r.longitude || 68.35;
        return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;
      });

      const totalWeight = cellReports.reduce((sum, r) => sum + getSeverityWeight(r.severity), 0);
      const centerLat = latMin + (latStep / 2);
      const centerLon = lonMin + (lonStep / 2);

      gridCells.push({
        xIndex: x,
        yIndex: y,
        latMin,
        latMax,
        lonMin,
        lonMax,
        count: cellReports.length,
        weight: totalWeight,
        reports: cellReports,
        centerLat,
        centerLon,
        areaName: getNearestAreaName(centerLat, centerLon)
      });
    }
  }

  // Filter grid cells based on min severity weight slider
  const filteredGridCells = gridCells.filter(cell => cell.weight >= minSeverityWeight);

  // Generate prioritizing routes for collection trucks based on highest weight cells
  const prioritizedHotspots = [...gridCells]
    .filter(cell => cell.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const { width, height } = dimensions;
    const padding = { top: 30, right: 30, bottom: 30, left: 30 };

    // Set up D3 coordinate projection scales
    const xScale = d3.scaleLinear()
      .domain([HYD_BOUNDS.lonMin, HYD_BOUNDS.lonMax])
      .range([padding.left, width - padding.right]);

    const yScale = d3.scaleLinear()
      .domain([HYD_BOUNDS.latMin, HYD_BOUNDS.latMax])
      .range([height - padding.bottom, padding.top]); // Note: SVG Y starts top, Latitude increases North (up)

    // Draw grid map backdrop lines
    const gBackdrop = svg.append('g').attr('class', 'backdrop-grid');
    
    // Draw street grid simulation lines (longitudes)
    const lonGrid = d3.range(HYD_BOUNDS.lonMin, HYD_BOUNDS.lonMax + 0.001, 0.01);
    gBackdrop.selectAll('.lon-line')
      .data(lonGrid)
      .enter()
      .append('line')
      .attr('class', 'lon-line')
      .attr('x1', d => xScale(d))
      .attr('y1', padding.top)
      .attr('x2', d => xScale(d))
      .attr('y2', height - padding.bottom)
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4');

    // Draw street grid simulation lines (latitudes)
    const latGrid = d3.range(HYD_BOUNDS.latMin, HYD_BOUNDS.latMax + 0.001, 0.01);
    gBackdrop.selectAll('.lat-line')
      .data(latGrid)
      .enter()
      .append('line')
      .attr('class', 'lat-line')
      .attr('x1', padding.left)
      .attr('y1', d => yScale(d))
      .attr('x2', width - padding.right)
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4');

    // Draw Hub Labels / Anchors on the map
    const gHubs = svg.append('g').attr('class', 'hubs');
    gHubs.selectAll('.hub-point')
      .data(HUBS)
      .enter()
      .append('circle')
      .attr('cx', h => xScale(h.lon))
      .attr('cy', h => yScale(h.lat))
      .attr('r', 3)
      .attr('fill', '#94a3b8');

    gHubs.selectAll('.hub-label')
      .data(HUBS)
      .enter()
      .append('text')
      .attr('x', h => xScale(h.lon) + 6)
      .attr('y', h => yScale(h.lat) + 3)
      .text(h => h.name)
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('pointer-events', 'none');

    // Render Mode 1: SMOOTH DENSITY HEATMAP
    if (viewMode === 'smooth') {
      // Create SVG Filter for beautiful gooey/smooth heatmap blur blend
      const defs = svg.append('defs');
      const filter = defs.append('filter')
        .attr('id', 'heatmap-blur-matrix')
        .attr('x', '-20%')
        .attr('y', '-20%')
        .attr('width', '140%')
        .attr('height', '140%');

      // 1. Gaussian Blur to blend points
      filter.append('feGaussianBlur')
        .attr('stdDeviation', blurRadius)
        .attr('result', 'blur');

      // 2. Color matrix multiplier to sharpen alpha edges and create distinct contour blobs
      filter.append('feColorMatrix')
        .attr('in', 'blur')
        .attr('type', 'matrix')
        .attr('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -4`) // Boost alpha contrast
        .attr('result', 'matrix');

      // Color Interpolator scale
      const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([0, 15]);

      // Draw heat-emitting source points on background layer
      const gHeatSources = svg.append('g')
        .attr('class', 'heat-sources')
        .attr('filter', 'url(#heatmap-blur-matrix)')
        .attr('opacity', 0.85);

      // Map reports with custom size corresponding to report severity weights
      gHeatSources.selectAll('.heat-point')
        .data(activeReports)
        .enter()
        .append('circle')
        .attr('class', 'heat-point')
        .attr('cx', r => xScale(r.longitude || 68.35))
        .attr('cy', r => yScale(r.latitude || 25.39))
        .attr('r', r => getSeverityWeight(r.severity) * 12)
        .attr('fill', r => colorScale(getSeverityWeight(r.severity) * 3));

      // Draw tiny discrete actual report markers over the heat (so they are hoverable)
      const gPinPoints = svg.append('g').attr('class', 'pin-points');
      const rippleRadius = 6;

      gPinPoints.selectAll('.pin-ripple')
        .data(activeReports)
        .enter()
        .append('circle')
        .attr('cx', r => xScale(r.longitude || 68.35))
        .attr('cy', r => yScale(r.latitude || 25.39))
        .attr('r', rippleRadius * 1.8)
        .attr('fill', '#ef4444')
        .attr('opacity', 0.15)
        .attr('class', 'animate-pulse');

      gPinPoints.selectAll('.pin-center')
        .data(activeReports)
        .enter()
        .append('circle')
        .attr('cx', r => xScale(r.longitude || 68.35))
        .attr('cy', r => yScale(r.latitude || 25.39))
        .attr('r', 4)
        .attr('fill', r => {
          if (r.severity === 'illegal-dumping') return '#be123c'; // rose-700
          if (r.severity === 'overflowing') return '#ef4444'; // red-500
          if (r.severity === 'full') return '#f97316'; // orange-500
          return '#eab308'; // yellow-500
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('r', 7)
            .attr('stroke-width', 2);
          
          // Trigger mock tooltip/selection
          const matchingCell = gridCells.find(cell => 
            (d.latitude || 25.39) >= cell.latMin && 
            (d.latitude || 25.39) <= cell.latMax && 
            (d.longitude || 68.35) >= cell.lonMin && 
            (d.longitude || 68.35) <= cell.lonMax
          );
          if (matchingCell) {
            setSelectedCell(matchingCell);
          }
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('r', 4)
            .attr('stroke-width', 1);
        });

    } 
    // Render Mode 2: DISCRETE BINNED GRID HEATMAP
    else {
      const cellWidth = (width - padding.left - padding.right) / gridResolution;
      const cellHeight = (height - padding.top - padding.bottom) / gridResolution;

      // Color scale from neutral slate-green to deep warning crimson
      const maxGridWeight = d3.max(gridCells, d => d.weight) || 1;
      const gridColorScale = d3.scaleSequential()
        .domain([0, maxGridWeight])
        .interpolator(d3.interpolateYlOrRd);

      const gGrid = svg.append('g').attr('class', 'binned-grid');

      gGrid.selectAll('.grid-tile')
        .data(filteredGridCells)
        .enter()
        .append('rect')
        .attr('class', 'grid-tile')
        .attr('x', d => xScale(d.lonMin))
        .attr('y', d => yScale(d.latMax))
        .attr('width', cellWidth - 1.5)
        .attr('height', cellHeight - 1.5)
        .attr('rx', 3)
        .attr('fill', d => d.weight > 0 ? gridColorScale(d.weight) : '#f8fafc')
        .attr('stroke', d => selectedCell && selectedCell.xIndex === d.xIndex && selectedCell.yIndex === d.yIndex ? '#0f172a' : 'transparent')
        .attr('stroke-width', 1.5)
        .attr('opacity', d => d.weight > 0 ? 0.8 : 0.25)
        .attr('cursor', 'pointer')
        .on('click', (event, d) => {
          setSelectedCell(d);
        })
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('opacity', 1);
        })
        .on('mouseout', function(event, d) {
          if (!selectedCell || selectedCell.xIndex !== d.xIndex || selectedCell.yIndex !== d.yIndex) {
            d3.select(this)
              .transition()
              .duration(100)
              .attr('opacity', d.weight > 0 ? 0.8 : 0.25);
          }
        });
    }

    // Legend drawing inside SVG
    const gLegend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 160}, ${height - 25})`);

    const legendWidth = 100;
    const legendHeight = 8;

    // Draw gradient bar
    const legendDef = gLegend.append('defs');
    const linearGradient = legendDef.append('linearGradient')
      .attr('id', 'legend-gradient');

    linearGradient.selectAll('stop')
      .data([
        { offset: '0%', color: '#fef08a' }, // yellow-200
        { offset: '50%', color: '#f97316' }, // orange-500
        { offset: '100%', color: '#be123c' } // rose-700
      ])
      .enter()
      .append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    gLegend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('rx', 2);

    gLegend.append('text')
      .attr('x', -24)
      .attr('y', 7)
      .text('Low')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'sans-serif');

    gLegend.append('text')
      .attr('x', legendWidth + 6)
      .attr('y', 7)
      .text('Critical')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('fill', '#e11d48')
      .attr('font-family', 'sans-serif');

  }, [dimensions, viewMode, blurRadius, minSeverityWeight, activeReports.length, selectedCell]);

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Heatmap Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
              <Flame size={18} className="animate-pulse" />
            </span>
            <h3 className="font-extrabold text-base text-gray-900">D3 Municipal Waste Heatmap</h3>
          </div>
          <p className="text-xs text-gray-400">
            Analyzing density coordinates across Hyderabad's districts to formulate optimal cleaning paths.
          </p>
        </div>

        {/* Action Toggle controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode switch */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => { setViewMode('smooth'); setSelectedCell(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'smooth' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Activity size={13} />
              Smooth Density
            </button>
            <button
              onClick={() => { setViewMode('grid'); setSelectedCell(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Grid size={13} />
              Binned Grid
            </button>
          </div>
        </div>
      </div>

      {/* Main visualization grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Heatmap Canvas container */}
        <div className="lg:col-span-8 space-y-4">
          <div 
            ref={containerRef} 
            className="relative bg-slate-50 border border-gray-200/40 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]"
          >
            {/* Background compass design */}
            <div className="absolute top-4 right-4 text-gray-200 font-mono text-[9px] pointer-events-none flex flex-col items-center select-none">
              <span className="font-bold text-gray-300">N ▲</span>
              <span>HYD REGION</span>
            </div>

            {/* SVG Render Element */}
            <svg 
              ref={svgRef} 
              width={dimensions.width} 
              height={dimensions.height}
              className="w-full h-full block max-w-full"
            />

            {/* Empty state overlay */}
            {activeReports.length === 0 && (
              <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl mb-2">
                  <Truck size={24} />
                </div>
                <h4 className="text-sm font-extrabold text-gray-800">No Active Waste Reports</h4>
                <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                  All bins across Hyderabad are currently cleared! Heatmap will populate when citizens log new issues.
                </p>
              </div>
            )}
          </div>

          {/* Interactive Sliders config drawer */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            {viewMode === 'smooth' ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Sliders size={12} /> Heat Spread Radius
                  </span>
                  <span className="font-bold text-gray-900">{blurRadius}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  value={blurRadius}
                  onChange={(e) => setBlurRadius(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Filter size={12} /> Min Intensity Threshold
                  </span>
                  <span className="font-bold text-gray-900">{minSeverityWeight} points</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={minSeverityWeight}
                  onChange={(e) => setMinSeverityWeight(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
              <Info size={16} className="text-blue-500 shrink-0" />
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                {viewMode === 'smooth' 
                  ? 'Gooey blurs are generated dynamically via D3 feeding standard-deviation matrix transformations to SVG alpha-mats.' 
                  : 'Discrete matrix grids bundle overlapping GPS coordinates together into weighted risk values.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Tooltip / AI Routing Recommendation Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5">
          
          {/* Top Panel: Hotspot Details */}
          <div className="bg-slate-50 border border-gray-200/40 rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-rose-500" /> Selected Area Details
              </h4>

              {selectedCell ? (
                <div className="space-y-3">
                  <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-xs">
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase">
                      {selectedCell.weight >= 8 ? 'Extreme Priority' : selectedCell.weight >= 4 ? 'High Priority' : 'Regular Clearance'}
                    </span>
                    <h5 className="font-bold text-sm text-gray-900 mt-1.5 flex items-center gap-1">
                      <MapPin size={13} className="text-rose-500 shrink-0" />
                      {selectedCell.areaName} Region
                    </h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Grid coordinates: {selectedCell.centerLat.toFixed(4)}N, {selectedCell.centerLon.toFixed(4)}E
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white border border-gray-100 p-3 rounded-xl">
                      <span className="text-[10px] text-gray-400 block font-bold">Overflowing Bins</span>
                      <span className="text-lg font-black text-rose-500">{selectedCell.count}</span>
                    </div>
                    <div className="bg-white border border-gray-100 p-3 rounded-xl">
                      <span className="text-[10px] text-gray-400 block font-bold">Accumulated Risk</span>
                      <span className="text-lg font-black text-gray-700">{selectedCell.weight} <span className="text-[9px] font-semibold text-gray-400">pts</span></span>
                    </div>
                  </div>

                  {selectedCell.reports.length > 0 && (
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                      <span className="text-[10px] text-gray-400 font-bold block">Active Incidents inside:</span>
                      {selectedCell.reports.map((rep) => (
                        <div key={rep.reportId} className="bg-white text-[10px] p-2 rounded-lg border border-gray-100 flex justify-between items-center">
                          <span className="font-bold truncate text-gray-700 max-w-[130px]">{rep.address.split(',')[0]}</span>
                          <span className="font-black text-rose-600 uppercase shrink-0 text-[8px] bg-rose-50 px-1.5 py-0.5 rounded">
                            {rep.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Grid size={24} className="text-slate-300 stroke-1.5" />
                  <p className="text-[11px] font-medium max-w-[180px] leading-normal">
                    {viewMode === 'grid' 
                      ? 'Click on any binned coordinate block in the matrix to load telemetry and risk weighting details.' 
                      : 'Hover over or click on any discrete warning point in the smooth heatmap density to preview regional data.'}
                  </p>
                </div>
              )}
            </div>

            {selectedCell && (
              <button
                onClick={() => setSelectedCell(null)}
                className="w-full text-center py-2 border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-800 text-[10px] font-bold rounded-xl transition cursor-pointer mt-4"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Bottom Panel: Smart Routing Optimizer */}
          <div className="bg-[#1b4332] text-white rounded-2xl p-5 space-y-3 flex flex-col justify-between shadow-md">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                <Navigation size={14} className="animate-pulse" /> AI Collection Dispatch Routes
              </h4>
              <p className="text-[10px] text-stone-200/80 leading-normal">
                Suggested dispatch priorities computed from active cluster density matrices.
              </p>
            </div>

            <div className="space-y-2.5 my-3">
              {prioritizedHotspots.length === 0 ? (
                <div className="text-center py-4 text-emerald-300/60 text-[11px]">
                  No dispatch required. All areas cleared.
                </div>
              ) : (
                prioritizedHotspots.map((cell, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                    onClick={() => setSelectedCell(cell)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-[10px] font-bold truncate text-white">{cell.areaName}</h5>
                        <p className="text-[9px] text-emerald-300/80 font-medium">Accumulated Weight: {cell.weight}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {cell.weight >= 8 ? 'DISPATCH NOW' : 'HIGH PRIORITY'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="text-[9px] text-stone-300/80 font-semibold flex items-center gap-1.5 pt-2 border-t border-white/10">
              <Truck size={11} className="text-emerald-400 shrink-0" />
              <span>Prioritizing larger capacity vehicles to higher weight clusters.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
