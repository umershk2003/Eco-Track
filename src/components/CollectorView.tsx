import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, CollectionSchedule, MarketplaceListing } from '../types';
import { i18n } from '../lib/i18n';
import { 
  Building, 
  Calendar, 
  Plus, 
  Trash, 
  Clock, 
  ShoppingBag, 
  Phone, 
  LogOut, 
  CheckCircle2, 
  MapPin, 
  List, 
  ShieldAlert,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

interface CollectorViewProps {
  profile: UserProfile;
  onSignOut: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function CollectorView({ 
  profile, 
  onSignOut,
  darkMode = false,
  onToggleDarkMode
}: CollectorViewProps) {
  const [activeTab, setActiveTab] = useState<'schedules' | 'market'>('schedules');
  const t = i18n[profile.language || 'en'];

  // Schedules State
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [areaName, setAreaName] = useState('Latifabad No. 7');
  const [wasteType, setWasteType] = useState<'organic' | 'recyclable' | 'general' | 'mixed'>('organic');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [timeWindow, setTimeWindow] = useState('8:00 AM - 10:00 AM');

  // Marketplace State
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [showPostMarket, setShowPostMarket] = useState(false);
  const [mWasteType, setMWasteType] = useState('cardboard');
  const [mQuantity, setMQuantity] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [revealedPhones, setRevealedPhones] = useState<string[]>([]);

  // Subscriptions
  useEffect(() => {
    // 1. Load collector schedules
    const qSched = query(
      collection(db, 'collectionSchedules'),
      where('collectorId', '==', profile.uid)
    );
    const unsubSched = onSnapshot(qSched, (snap) => {
      const list: CollectionSchedule[] = [];
      snap.forEach(d => list.push({ scheduleId: d.id, ...d.data() } as CollectionSchedule));
      setSchedules(list);
    });

    // 2. Load all marketplace listings
    const qListings = query(collection(db, 'marketplaceListings'), orderBy('createdAt', 'desc'));
    const unsubListings = onSnapshot(qListings, (snap) => {
      const list: MarketplaceListing[] = [];
      snap.forEach(d => list.push({ listingId: d.id, ...d.data() } as MarketplaceListing));
      setListings(list);
    });

    return () => {
      unsubSched();
      unsubListings();
    };
  }, [profile.uid]);

  // Handle Day selector checklist
  const toggleDay = (day: string) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(prev => prev.filter(d => d !== day));
    } else {
      setDaysOfWeek(prev => [...prev, day]);
    }
  };

  // Add Schedule
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (daysOfWeek.length === 0) return;

    const newSched: Omit<CollectionSchedule, 'scheduleId'> = {
      areaName,
      city: profile.city || 'Hyderabad',
      wasteType,
      collectorId: profile.uid,
      daysOfWeek,
      timeWindow,
      active: true
    };

    await addDoc(collection(db, 'collectionSchedules'), newSched);
    setShowAddSchedule(false);
    setDaysOfWeek([]);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    await deleteDoc(doc(db, 'collectionSchedules', scheduleId));
  };

  // Marketplace Listings
  const handlePostListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mQuantity || !mPhone || !mDesc) return;

    const newListing: Omit<MarketplaceListing, 'listingId'> = {
      posterId: profile.uid,
      posterName: profile.businessName || profile.displayName || 'Collector',
      posterType: 'collector',
      wasteType: mWasteType,
      quantityEstimate: mQuantity,
      description: mDesc,
      imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=300&q=80',
      location: {
        latitude: 25.396,
        longitude: 68.3578,
        address: `${profile.address}, ${profile.city}`
      },
      status: 'open',
      createdAt: Timestamp.now(),
      contactPhone: mPhone
    };

    await addDoc(collection(db, 'marketplaceListings'), newListing);
    setShowPostMarket(false);
    setMQuantity('');
    setMPhone('');
    setMDesc('');
  };

  const claimListing = async (listingId: string) => {
    await updateDoc(doc(db, 'marketplaceListings', listingId), { status: 'claimed' });
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col lg:flex-row font-sans text-stone-800">
      
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-64 bg-natural-dark text-white flex flex-col justify-between shrink-0 p-6 shadow-xl lg:sticky lg:top-0 lg:h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-natural-medium p-2.5 rounded-xl text-natural-light flex items-center justify-center">
              <Building size={24} />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block">EcoTrack</span>
              <span className="text-[10px] text-natural-light font-bold uppercase tracking-wider block">Collector Portal</span>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-natural-medium border border-natural-light/10 rounded-xl p-4 space-y-1">
            <h4 className="text-xs text-natural-light font-bold uppercase tracking-wide block">Collector Account</h4>
            <h3 className="font-extrabold text-sm truncate text-white">{profile.businessName || profile.displayName}</h3>
            <p className="text-[11px] text-natural-pale/70 truncate">{profile.email}</p>
          </div>

          {/* Tabs Nav */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`w-full py-3 px-4 rounded-xl text-left text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'schedules' ? 'bg-[#2d6a4f] text-white shadow' : 'text-natural-light hover:bg-[#2d6a4f]/30'
              }`}
            >
              <Calendar size={18} />
              Manage Pickups
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`w-full py-3 px-4 rounded-xl text-left text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'market' ? 'bg-[#2d6a4f] text-white shadow' : 'text-natural-light hover:bg-[#2d6a4f]/30'
              }`}
            >
              <ShoppingBag size={18} />
              Business Marketplace
            </button>
          </nav>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 mt-6">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              title="Toggle High Contrast Night Mode"
              className="w-full py-3 px-4 border border-[#2d6a4f] hover:bg-[#2d6a4f]/30 text-natural-light hover:text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
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
            className="w-full py-3 px-4 border border-[#2d6a4f] hover:bg-[#2d6a4f]/30 text-natural-light hover:text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} />
            {t.sign_out}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-10 space-y-6 max-w-4xl">
        
        {/* SCHEDULES TAB */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Manage Area pickup Schedules</h2>
                <p className="text-xs text-gray-500 mt-1">Register when your collection trucks will gather recycling materials in Hyderabad</p>
              </div>
              <button
                onClick={() => setShowAddSchedule(!showAddSchedule)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow cursor-pointer transition shrink-0"
              >
                <Plus size={16} /> Add Pickup Route
              </button>
            </div>

            {/* Add Schedule Expandable form */}
            {showAddSchedule && (
              <form onSubmit={handleAddSchedule} className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-md space-y-4">
                <h3 className="font-extrabold text-sm text-gray-900">Configure Pickup Route</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Target Area</label>
                    <select
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="Latifabad No. 7">Latifabad No. 7</option>
                      <option value="Qasimabad Phase 1">Qasimabad Phase 1</option>
                      <option value="Saddar Cantt">Saddar Cantt</option>
                      <option value="Unit 6 Latifabad">Unit 6 Latifabad</option>
                      <option value="Unit 10 Latifabad">Unit 10 Latifabad</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Waste Category</label>
                    <select
                      value={wasteType}
                      onChange={(e) => setWasteType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="organic">Organic Waste</option>
                      <option value="recyclable">Recyclable Waste</option>
                      <option value="general">General Waste (Landfill)</option>
                      <option value="mixed">Mixed Waste</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Time Slot</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7:00 AM - 9:00 AM"
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-emerald-500 transition font-semibold"
                    />
                  </div>
                </div>

                {/* Day of Week Selector checklist */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Collection Days</label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                      const isSelected = daysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`py-1.5 px-3 border rounded-lg text-xs font-bold transition ${
                            isSelected ? 'bg-emerald-600 text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddSchedule(false)}
                    className="py-2 px-4 border border-gray-200 text-gray-500 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={daysOfWeek.length === 0}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-40"
                  >
                    Publish Route
                  </button>
                </div>
              </form>
            )}

            {/* List Routes */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">Active schedules ({schedules.length})</h3>
              
              {schedules.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-xs text-gray-400">
                  No collection routes active. Create one above to notify residents of Hyderabad.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schedules.map((sch) => (
                    <div key={sch.scheduleId} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            sch.wasteType === 'organic' ? 'bg-emerald-50 text-emerald-600' :
                            sch.wasteType === 'recyclable' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Calendar size={20} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                              {sch.wasteType}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-rose-500" />
                              {sch.areaName}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSchedule(sch.scheduleId)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center text-xs border border-gray-100">
                        <span className="font-bold text-gray-600">Days: <span className="text-emerald-700 font-extrabold">{sch.daysOfWeek.join(', ')}</span></span>
                        <span className="font-mono text-[10px] text-gray-400 font-bold">{sch.timeWindow}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MARKETPLACE TAB */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Local Waste-to-Resource Marketplace</h2>
                <p className="text-xs text-gray-500 mt-1">Claim bulk materials posted by Hyderabad businesses or list your recycled stocks</p>
              </div>
              <button
                onClick={() => setShowPostMarket(!showPostMarket)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow cursor-pointer transition shrink-0"
              >
                <Plus size={16} /> Post Stock
              </button>
            </div>

            {/* Post Listing Form */}
            {showPostMarket && (
              <form onSubmit={handlePostListing} className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-md space-y-4">
                <h3 className="font-extrabold text-sm text-gray-900">Post Recycled Material Batch</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Material Type</label>
                    <select
                      value={mWasteType}
                      onChange={(e) => setMWasteType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="cardboard">Cardboard Sheets</option>
                      <option value="plastic-bottles">PET Plastic Stocks</option>
                      <option value="metal-cans">Aluminium Cans</option>
                      <option value="compost">Organic Compost</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Bulk Weight / Quantity</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 100 kg, 12 large sacks"
                      value={mQuantity}
                      onChange={(e) => setMQuantity(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="0300-1234567"
                      value={mPhone}
                      onChange={(e) => setMPhone(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Material details / description</label>
                  <textarea
                    rows={3}
                    required
                    value={mDesc}
                    onChange={(e) => setMDesc(e.target.value)}
                    placeholder="Washed cardboard packages, ready for recycling warehouse pickup..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowPostMarket(false)}
                    className="py-2 px-4 border border-gray-200 text-gray-500 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                  >
                    Publish Material
                  </button>
                </div>
              </form>
            )}

            {/* List Catalog */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((item) => (
                <div key={item.listingId} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded font-black uppercase tracking-wider">
                        {item.wasteType}
                      </span>
                      <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase ${
                        item.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.status === 'open' ? 'Available' : 'Claimed'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Estimated Stock</h4>
                      <h3 className="font-black text-gray-900 text-base mt-0.5">{item.quantityEstimate}</h3>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MapPin size={12} className="text-rose-500" />
                      <span>{item.location.address}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 border-t border-gray-100 p-4 flex justify-between items-center text-xs">
                    <span className="text-xs font-bold text-gray-500">
                      Posted: <span className="font-black text-gray-700">{item.posterName || 'Eco Generator'}</span>
                    </span>

                    {item.status === 'open' && (
                      <div className="flex gap-2">
                        {revealedPhones.includes(item.listingId) ? (
                          <a
                            href={`tel:${item.contactPhone}`}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                          >
                            <Phone size={12} /> {item.contactPhone}
                          </a>
                        ) : (
                          <button
                            onClick={() => setRevealedPhones(prev => [...prev, item.listingId])}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                          >
                            Reveal Contact
                          </button>
                        )}

                        {item.posterId === profile.uid && (
                          <button
                            onClick={() => claimListing(item.listingId)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                          >
                            Mark Claimed
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
