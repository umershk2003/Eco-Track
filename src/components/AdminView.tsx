import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BinReport, UserProfile, CollectionSchedule, WasteScan } from '../types';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Activity, 
  Plus, 
  Trash, 
  Calendar, 
  Globe, 
  Sparkles, 
  TrendingUp, 
  Search, 
  Grid, 
  Clock, 
  Trash2,
  LogOut,
  Info,
  Sun,
  Moon,
  Flame
} from 'lucide-react';
import { i18n } from '../lib/i18n';
import WasteHeatmap from './WasteHeatmap';

interface AdminViewProps {
  profile: UserProfile;
  onSignOut: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function AdminView({ 
  profile, 
  onSignOut,
  darkMode = false,
  onToggleDarkMode
}: AdminViewProps) {
  const [reports, setReports] = useState<BinReport[]>([]);
  const [citizens, setCitizens] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [scans, setScans] = useState<WasteScan[]>([]);
  
  // Admin UI State
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'reports' | 'schedules' | 'citizens'>('overview');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePinDetail, setActivePinDetail] = useState<BinReport | null>(null);
  const [mapType, setMapType] = useState<'pins' | 'heatmap'>('heatmap');

  // Schedules form
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [areaName, setAreaName] = useState('Latifabad No. 7');
  const [wasteType, setWasteType] = useState<'organic' | 'recyclable' | 'general' | 'mixed'>('recyclable');
  const [daysOfWeekStr, setDaysOfWeekStr] = useState('Monday, Thursday');
  const [timeWindow, setTimeWindow] = useState('7:00 AM - 9:00 AM');

  // Load Real-time Collections
  useEffect(() => {
    // 1. Bin Reports
    const unsubReports = onSnapshot(query(collection(db, 'binReports'), orderBy('reportedAt', 'desc')), (snap) => {
      const list: BinReport[] = [];
      snap.forEach(d => list.push({ reportId: d.id, ...d.data() } as BinReport));
      setReports(list);
    });

    // 2. Citizens
    const unsubCitizens = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
      setCitizens(list);
    });

    // 3. Collection Schedules
    const unsubSchedules = onSnapshot(collection(db, 'collectionSchedules'), (snap) => {
      const list: CollectionSchedule[] = [];
      snap.forEach(d => list.push({ scheduleId: d.id, ...d.data() } as CollectionSchedule));
      setSchedules(list);
    });

    // 4. Waste Scans (for analytics)
    const unsubScans = onSnapshot(query(collection(db, 'scans'), limit(200)), (snap) => {
      const list: WasteScan[] = [];
      snap.forEach(d => list.push({ scanId: d.id, ...d.data() } as WasteScan));
      setScans(list);
    });

    return () => {
      unsubReports();
      unsubCitizens();
      unsubSchedules();
      unsubScans();
    };
  }, []);

  // Update report status (moderation dropdown)
  const handleUpdateStatus = async (reportId: string, status: 'reported' | 'acknowledged' | 'collected' | 'invalid') => {
    const reportRef = doc(db, 'binReports', reportId);
    const updates: any = { status };
    if (status === 'collected') {
      updates.resolvedAt = Timestamp.now();
    }
    await updateDoc(reportRef, updates);
  };

  const handleDeleteReport = async (reportId: string) => {
    await deleteDoc(doc(db, 'binReports', reportId));
  };

  // Add municipal schedule
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = daysOfWeekStr.split(',').map(s => s.trim());
    
    const newSched: Omit<CollectionSchedule, 'scheduleId'> = {
      areaName,
      city: 'Hyderabad',
      wasteType,
      collectorId: 'admin',
      daysOfWeek: days,
      timeWindow,
      active: true
    };

    await addDoc(collection(db, 'collectionSchedules'), newSched);
    setShowAddSchedule(false);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    await deleteDoc(doc(db, 'collectionSchedules', scheduleId));
  };

  // ----------------------------------------------------
  // ANALYTICS CALCULATIONS
  // ----------------------------------------------------
  const totalReportsCount = reports.length;
  const activeReportsCount = reports.filter(r => r.status !== 'collected').length;
  const resolvedReportsCount = reports.filter(r => r.status === 'collected').length;
  const totalCitizensCount = citizens.filter(c => c.role === 'citizen').length;

  // Calculate top hotspots (by area prefix)
  const hotspots: { [key: string]: number } = {};
  reports.forEach(r => {
    const area = r.address ? r.address.split(',')[0] : 'Unknown';
    hotspots[area] = (hotspots[area] || 0) + 1;
  });
  const sortedHotspots = Object.entries(hotspots)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Scans waste breakdown counts
  const wasteBreakdown: { [key: string]: number } = {
    paper: 0,
    plastic: 0,
    glass: 0,
    metal: 0,
    organic: 0,
    hazardous: 0
  };
  scans.forEach(s => {
    const cat = s.predictedCategory || '';
    if (cat.includes('paper')) wasteBreakdown.paper += 1;
    else if (cat.includes('plastic')) wasteBreakdown.plastic += 1;
    else if (cat.includes('glass')) wasteBreakdown.glass += 1;
    else if (cat.includes('metal')) wasteBreakdown.metal += 1;
    else if (cat.includes('organic')) wasteBreakdown.organic += 1;
    else wasteBreakdown.hazardous += 1;
  });

  const totalScansAnalyzed = scans.length;

  // Top citizen list ranked by points
  const topCitizens = [...citizens]
    .filter(c => c.role === 'citizen')
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-natural-bg flex font-sans text-stone-800">
      
      {/* Sidebar portal Admin layout */}
      <aside className="w-64 bg-natural-dark text-white flex flex-col justify-between shrink-0 p-6 sticky top-0 h-screen shadow-xl">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-natural-light rounded-xl flex items-center justify-center text-natural-dark font-bold text-xl">
              <Globe size={20} />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block">EcoTrack</span>
              <span className="text-[10px] text-natural-light font-bold uppercase tracking-wide block">Hyderabad Admin</span>
            </div>
          </div>

          <div className="bg-natural-medium border border-natural-light/20 rounded-xl p-4 text-xs space-y-1">
            <div className="flex items-center gap-1 text-natural-light font-bold uppercase">
              <Sparkles size={12} />
              <span>Admin Account</span>
            </div>
            <h4 className="font-extrabold truncate text-white">{profile.displayName || 'Super Admin'}</h4>
            <span className="text-[10px] text-natural-pale/85 font-medium block">Municipal Authority</span>
          </div>

          {/* Nav Links */}
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
              { id: 'reports', label: 'Bin overflow reports', icon: AlertTriangle },
              { id: 'schedules', label: 'Manage Schedules', icon: Calendar },
              { id: 'citizens', label: 'Registered Citizens', icon: Users }
            ].map((sub) => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id as any)}
                  className={`w-full py-3 px-4 rounded-xl text-left text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                    activeSubTab === sub.id 
                      ? 'bg-natural-medium text-white shadow shadow-natural-medium/10' 
                      : 'text-natural-light hover:bg-[#2d6a4f]/30'
                  }`}
                >
                  <Icon size={18} />
                  {sub.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Night Mode & Logout */}
        <div className="flex flex-col gap-2">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              title="Toggle High Contrast Night Mode"
              className="w-full py-3 border border-[#2d6a4f] hover:bg-[#2d6a4f]/30 text-natural-light hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {darkMode ? (
                <>
                  <Sun size={16} className="text-amber-300 animate-pulse" />
                  <span>Day Mode</span>
                </>
              ) : (
                <>
                  <Moon size={16} className="text-blue-200" />
                  <span>Night Mode</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={onSignOut}
            className="w-full py-3 border border-[#2d6a4f] hover:bg-[#2d6a4f]/30 text-natural-light hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} />
            Sign Out Portal
          </button>
        </div>
      </aside>

      {/* Main Admin View dashboard Container */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8">
        
        {/* OVERVIEW SUB-TAB */}
        {activeSubTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Stats Overview banner counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Active Overflowing Reports", count: activeReportsCount, sub: "Action required", icon: AlertTriangle, color: "text-red-500 bg-red-50 border-red-100" },
                { label: "Resolved Reports", count: resolvedReportsCount, sub: "HMC successfully cleared", icon: CheckCircle2, color: "text-natural-medium bg-natural-straw/30 border-natural-straw/50" },
                { label: "AI Scans Logged", count: totalScansAnalyzed, sub: "Citizens sorting trash", icon: Activity, color: "text-natural-dark bg-natural-pale/40 border-natural-pale/60" },
                { label: "Active Citizens", count: totalCitizensCount, sub: "Hyderabad residents", icon: Users, color: "text-stone-700 bg-stone-100 border-stone-200" }
              ].map((st, i) => {
                const Icon = st.icon;
                return (
                  <div key={i} className="bg-white p-5 rounded-[32px] border border-stone-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">{st.label}</span>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-natural-dark">{st.count}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-semibold">{st.sub}</p>
                    </div>
                    <div className={`p-3.5 rounded-2xl shrink-0 border ${st.color}`}>
                      <Icon size={22} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map View Switcher Banner */}
            <div className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={15} className="text-emerald-600 animate-pulse" />
                  Hyderabad Trash Telemetry Portal
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  Switch between standard spatial coordinates pin density tracking and active AI/D3 contour heat mapping.
                </p>
              </div>
              <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 shrink-0 border border-gray-200/40">
                <button
                  onClick={() => setMapType('heatmap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    mapType === 'heatmap' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Flame size={13} className="text-rose-500" />
                  D3 Route Heatmap
                </button>
                <button
                  onClick={() => setMapType('pins')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    mapType === 'pins' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <MapPin size={13} className="text-emerald-600" />
                  Live Pin Map
                </button>
              </div>
            </div>

            {mapType === 'heatmap' ? (
              <WasteHeatmap reports={reports} />
            ) : (
              /* Simulated Live Map Preview & Hotspots Grid */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Custom SVG/Interactive simulated map panel */}
                <div className="lg:col-span-8 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-extrabold text-base text-gray-900">Hyderabad Live Trash Overflow Map</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Simulated real-time GIS telemetry showing crowdsourced citizens reports.</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Live Tracking
                    </span>
                  </div>

                  {/* Simulated Geographic Grid of Hyderabad (Latifabad / Qasimabad / Saddar) */}
                  <div className="h-[320px] bg-slate-100 rounded-2xl relative overflow-hidden border border-gray-200/50 flex items-center justify-center">
                    
                    {/* Styled streets abstract backdrop */}
                    <div className="absolute inset-0 bg-grid-slate-200 opacity-30 flex flex-wrap gap-4 p-8 pointer-events-none">
                      <div className="h-full w-0.5 bg-gray-300 absolute left-1/3"></div>
                      <div className="h-full w-0.5 bg-gray-300 absolute left-2/3"></div>
                      <div className="w-full h-0.5 bg-gray-300 absolute top-1/2"></div>
                      <div className="w-full h-0.5 bg-gray-300 absolute top-1/4"></div>
                    </div>

                    {/* Labels */}
                    <span className="absolute top-8 left-12 font-bold text-gray-400 text-xs">Qasimabad</span>
                    <span className="absolute bottom-8 right-16 font-bold text-gray-400 text-xs">Latifabad No. 7</span>
                    <span className="absolute top-1/3 right-1/3 font-bold text-gray-400 text-xs">Saddar Cantt</span>

                    {/* Active pins in Hyderabad */}
                    {reports.filter(r => r.status !== 'collected').slice(0, 15).map((rep, idx) => {
                      // Seed random offset positions within map container for simulation preview
                      const topPercent = 20 + ((rep.latitude || 25.39) % 0.05) * 1200;
                      const leftPercent = 15 + ((rep.longitude || 68.35) % 0.05) * 1200;
                      
                      return (
                        <button
                          key={rep.reportId}
                          onClick={() => setActivePinDetail(rep)}
                          className="absolute h-8 w-8 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center hover:scale-115 active:scale-90 shadow-lg cursor-pointer transition-transform"
                          style={{ top: `${Math.min(85, Math.max(10, topPercent))}%`, left: `${Math.min(85, Math.max(10, leftPercent))}%` }}
                        >
                          <AlertTriangle size={16} className="animate-pulse" />
                        </button>
                      );
                    })}

                    {/* Overlay detail modal when clicked on map pin */}
                    {activePinDetail && (
                      <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl p-4 border border-gray-100 flex gap-4 items-center animate-fade-in z-20">
                        <img 
                          src={activePinDetail.imageUrl} 
                          alt="Overflowing bin" 
                          referrerPolicy="no-referrer"
                          className="h-16 w-16 object-cover rounded-lg bg-gray-100 shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-black uppercase">{activePinDetail.severity}</span>
                          <h4 className="text-xs font-black text-gray-900 mt-1 truncate">{activePinDetail.address}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Reported by: {activePinDetail.reporterName || 'Citizen'}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              handleUpdateStatus(activePinDetail.reportId, 'collected');
                              setActivePinDetail(null);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition"
                          >
                            Clear Issue
                          </button>
                          <button 
                            onClick={() => setActivePinDetail(null)}
                            className="px-2.5 py-1 border border-gray-200 text-gray-400 text-[10px] rounded-lg hover:bg-gray-50 text-center"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hotspots leaderboard / chart */}
                <div className="lg:col-span-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">City Hotspots</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Hyderabad locations with highest overflowing waste incidents.</p>
                  </div>

                  <div className="space-y-4 my-6">
                    {sortedHotspots.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center">No reports active yet.</p>
                    ) : (
                      sortedHotspots.map(([area, count], idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-1">
                              <span className="font-black text-emerald-600">#{idx + 1}</span> {area}
                            </span>
                            <span className="font-extrabold text-gray-900">{count} reports</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full" 
                              style={{ width: `${Math.min(100, (count / totalReportsCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 flex items-center gap-1">
                    <Info size={14} className="text-slate-400" />
                    <span>Ranked dynamically by total reported bin count.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom SVG Analytics charts and Citizen Leaders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Waste breakdown Custom Pie chart */}
              <div className="bg-white border border-stone-100 rounded-[40px] p-6 shadow-sm">
                <h3 className="font-bold text-[#1b4332] text-base">AI Waste sorting breakdown</h3>
                <p className="text-xs text-stone-400 mt-0.5">Distribution of scanned materials by citizens using server-side Grok.</p>

                <div className="flex flex-col sm:flex-row items-center gap-8 my-6">
                  {/* Render Custom SVG Doughnut chart */}
                  <div className="h-44 w-44 shrink-0 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* We'll draw concentric sectors or simple structured slices */}
                      {/* For simplicity and 100% bug-free rendering, we'll draw concentric rings with custom dasharrays */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f5f2ed" strokeWidth="12" />
                      
                      {/* Organic: green ring */}
                      <circle 
                        cx="50" cy="50" r="40" fill="transparent" stroke="#1b4332" strokeWidth="12" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={`${251.2 - (Math.max(1, Math.min(251, (wasteBreakdown.organic / (totalScansAnalyzed || 1)) * 251.2)))}`} 
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-natural-dark">{totalScansAnalyzed}</span>
                      <span className="text-[9px] font-bold text-stone-400 uppercase">Total Scans</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 w-full text-xs">
                    {[
                      { key: "organic", label: "Organic (Food)", color: "bg-natural-dark", count: wasteBreakdown.organic },
                      { key: "plastic", label: "Plastic Bottles", color: "bg-blue-500", count: wasteBreakdown.plastic },
                      { key: "paper", label: "Cardboard/Paper", color: "bg-indigo-500", count: wasteBreakdown.paper },
                      { key: "metal", label: "Metal Cans", color: "bg-amber-500", count: wasteBreakdown.metal },
                      { key: "glass", label: "Glass Jars", color: "bg-sky-400", count: wasteBreakdown.glass },
                      { key: "hazardous", label: "Hazardous", color: "bg-rose-500", count: wasteBreakdown.hazardous }
                    ].map((lg, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${lg.color} shrink-0`} />
                        <span className="text-stone-500 truncate">{lg.label}:</span>
                        <span className="font-extrabold text-stone-900 ml-auto">{lg.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Citizen Leaderboard */}
              <div className="bg-white border border-stone-100 rounded-[40px] p-6 shadow-sm">
                <h3 className="font-bold text-[#1b4332] text-base">Hyderabad Top Citizens Leaderboard</h3>
                <p className="text-xs text-stone-400 mt-0.5">Top-performing citizens who accumulated points through active scanning & reporting.</p>

                <div className="space-y-3 my-6">
                  {topCitizens.map((cit, idx) => (
                    <div key={cit.uid} className="flex items-center justify-between p-3.5 rounded-3xl border border-stone-100 bg-[#fdfcfb] shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="font-black text-xs h-6 w-6 bg-natural-pale text-natural-dark rounded-full flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-900">{cit.displayName}</h4>
                          <span className="text-[10px] text-stone-400">Scans: {cit.scanCount || 0} | Reports: {cit.reportCount || 0}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-natural-dark bg-natural-straw border border-natural-sage/20 px-3 py-1 rounded-lg">
                        {cit.points || 0} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* High Fidelity Bottom Summary Grid */}
            <section className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 bg-white rounded-[40px] border border-stone-100 flex flex-wrap items-center p-6 md:px-8 justify-between gap-4 shadow-sm">
                {topCitizens.slice(0, 3).map((cit, idx) => (
                  <div key={cit.uid} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${idx === 0 ? 'bg-natural-straw text-natural-dark' : 'bg-stone-100 text-stone-400'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 truncate max-w-[120px]">{cit.displayName}</p>
                      <p className="text-[10px] text-stone-400 font-medium">{cit.points || 0} Points • {idx === 0 ? 'Eco Champion' : 'Gold Badge'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full md:w-80 bg-natural-dark rounded-[32px] flex items-center p-6 text-white justify-between shadow-sm shrink-0">
                <div>
                  <p className="text-xs font-bold opacity-80">Voucher Distribution</p>
                  <p className="text-xl font-bold">452 <span className="text-xs font-normal opacity-60">Claimed Today</span></p>
                </div>
                <div className="w-12 h-12 bg-natural-light/20 rounded-2xl flex items-center justify-center text-xl">🎫</div>
              </div>
            </section>

          </div>
        )}

        {/* REPORTS SUB-TAB MANAGEMENT */}
        {activeSubTab === 'reports' && (
          <div className="bg-white border border-stone-100 rounded-[40px] p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-stone-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-natural-dark">Reported Bins Table Management</h2>
                <p className="text-xs text-stone-400 mt-0.5">Moderate overflowing waste or validate cleaned locations reported by citizens.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                {['all', 'reported', 'acknowledged', 'collected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSeverityFilter(st)}
                    className={`py-1.5 px-3 border rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                      severityFilter === st ? 'bg-natural-medium text-white border-transparent' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold">
                    <th className="py-3.5 px-4">Photo</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Upvotes</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reports
                    .filter(r => severityFilter === 'all' || r.status === severityFilter)
                    .map((rep) => (
                      <tr key={rep.reportId} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <img 
                            src={rep.imageUrl} 
                            alt="Bin" 
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 object-cover rounded-lg bg-gray-50 border border-gray-200/50" 
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">{rep.address}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded">
                            {rep.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 font-medium">{rep.reporterName || 'Citizen'}</td>
                        <td className="py-3 px-4 font-bold text-gray-400">{rep.upvotes || 0}</td>
                        <td className="py-3 px-4">
                          <select
                            value={rep.status}
                            onChange={(e) => handleUpdateStatus(rep.reportId, e.target.value as any)}
                            className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1 outline-none font-bold"
                          >
                            <option value="reported">Reported</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="collected">Collected / Cleaned</option>
                            <option value="invalid">Invalid</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteReport(rep.reportId)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHEDULE MANAGEMENT SUB-TAB */}
        {activeSubTab === 'schedules' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[40px] p-6 border border-stone-100 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-natural-dark">Manage Area pickup Schedules</h2>
                <p className="text-xs text-stone-400 mt-1">Register when collection trucks gather recycling materials in Hyderabad</p>
              </div>
              <button
                onClick={() => setShowAddSchedule(!showAddSchedule)}
                className="py-2.5 px-4 bg-natural-medium hover:bg-natural-dark text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow cursor-pointer transition shrink-0"
              >
                <Plus size={16} /> Add Schedule Route
              </button>
            </div>

            {showAddSchedule && (
              <form onSubmit={handleAddSchedule} className="bg-white rounded-[32px] border border-natural-pale p-6 shadow-md space-y-4">
                <h3 className="font-extrabold text-sm text-natural-dark">Configure pickup Schedule Route</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Target Area</label>
                    <select
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="Latifabad No. 7">Latifabad No. 7</option>
                      <option value="Qasimabad Phase 1">Qasimabad Phase 1</option>
                      <option value="Saddar Cantt">Saddar Cantt</option>
                      <option value="Unit 6 Latifabad">Unit 6 Latifabad</option>
                      <option value="Unit 10 Latifabad">Unit 10 Latifabad</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Waste Category</label>
                    <select
                      value={wasteType}
                      onChange={(e) => setWasteType(e.target.value as any)}
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="organic">Organic Waste</option>
                      <option value="recyclable">Recyclable Waste</option>
                      <option value="general">General Waste (Landfill)</option>
                      <option value="mixed">Mixed Waste</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Collection Days (Comma separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monday, Wednesday"
                      value={daysOfWeekStr}
                      onChange={(e) => setDaysOfWeekStr(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-natural-medium transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Time Slot</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7:00 AM - 9:00 AM"
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-natural-medium transition font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowAddSchedule(false)}
                    className="py-2 px-4 border border-stone-200 text-stone-500 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-natural-medium hover:bg-natural-dark text-white font-bold rounded-xl text-xs"
                  >
                    Publish Route
                  </button>
                </div>
              </form>
            )}

            {/* List Active Schedules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schedules.map((sch) => (
                <div key={sch.scheduleId} className="bg-white rounded-3xl border border-stone-100 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-natural-pale/40 text-natural-dark rounded-xl shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black text-natural-dark bg-natural-straw border border-natural-sage/20 px-2 py-0.5 rounded">
                          {sch.wasteType}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                          <MapPin size={12} className="text-rose-500" />
                          {sch.areaName}
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSchedule(sch.scheduleId)}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="bg-stone-50/50 border border-stone-100 p-3 rounded-2xl flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-600">Days: <span className="text-stone-800 font-black">{sch.daysOfWeek.join(', ')}</span></span>
                    <span className="font-mono text-[10px] text-stone-400">{sch.timeWindow}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGISTERED CITIZENS SUB-TAB */}
        {activeSubTab === 'citizens' && (
          <div className="bg-white border border-stone-100 rounded-[40px] p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-natural-dark">Registered citizens Directory</h2>
              <p className="text-xs text-stone-400 mt-0.5">Browse through the eco-citizens participating in Hyderabad's FYP waste tracking network.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold">
                    <th className="py-3.5 px-4">Citizen Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Area / City</th>
                    <th className="py-3.5 px-4 text-center">AI Scans Logged</th>
                    <th className="py-3.5 px-4 text-center">Bin Reports Logged</th>
                    <th className="py-3.5 px-4 text-right">Points Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {citizens
                    .filter(c => c.role === 'citizen')
                    .map((cit) => (
                      <tr key={cit.uid} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-bold text-gray-900">{cit.displayName}</td>
                        <td className="py-3 px-4 text-gray-500 font-medium">{cit.email}</td>
                        <td className="py-3 px-4 text-gray-500 font-semibold">{cit.address}, {cit.city}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{cit.scanCount || 0}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{cit.reportCount || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            {cit.points || 0} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
