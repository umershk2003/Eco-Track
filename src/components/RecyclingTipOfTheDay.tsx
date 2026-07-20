import React, { useState, useEffect } from 'react';
import { Leaf, Zap, Info, Sparkles, Lightbulb, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';

interface RecyclingTip {
  id: number;
  category: string;
  binColor: string;
  icon: string;
  title: {
    en: string;
    ur: string;
    sd: string;
  };
  description: {
    en: string;
    ur: string;
    sd: string;
  };
}

interface RecyclingTipOfTheDayProps {
  language: Language;
}

export default function RecyclingTipOfTheDay({ language }: RecyclingTipOfTheDayProps) {
  const [tip, setTip] = useState<RecyclingTip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchTip = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/tips/today');
        if (!response.ok) {
          throw new Error('Failed to fetch guidelines');
        }
        const data = await response.json();
        if (isMounted) {
          setTip(data);
        }
      } catch (err: any) {
        console.error('Error fetching recycling tip:', err);
        if (isMounted) {
          setError(err.message || 'Could not load tips');
          // Fallback to a hardcoded local tip if API fails to guarantee a flawless UI
          setTip({
            id: 1,
            category: 'recyclable-plastic',
            binColor: 'Blue Bin',
            icon: 'Leaf',
            title: {
              en: 'PET Bottles Preparation',
              ur: 'پلاسٹک کی بوتلیں تیار کرنا',
              sd: 'پلاسٽڪ جي بوتلن کي تيار ڪرڻ'
            },
            description: {
              en: 'Empty and crush plastic bottles like PET soda bottles before placing them in the Blue Bin. This saves up to 70% space in collection trucks driving through Latifabad!',
              ur: 'پلاسٹک کی بوتلوں (جیسے کولڈ ڈرنک کی بوتلیں) کو نیلے ڈبے میں ڈالنے سے پہلے خالی کریں اور کچل دیں۔ اس سے لطیف آباد میں کچرا جمع کرنے والی گاڑیوں میں 70% جگہ بچتی ہے!',
              sd: 'پلاسٽڪ جي بوتلن (جيئن ڪولڊ ڊرنڪ جي بوتل) کي نيري دٻي ۾ وجهڻ کان اڳ خالي ڪريو ۽ چيڀاٽيو. ان سان لطيف آباد ۾ ڪچرو کڻندڙ گاڏين ۾ 70٪ جڳهه بچي ٿي!'
            }
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTip();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Helper to get localized text
  const getLocalized = (obj: { en: string; ur: string; sd: string }) => {
    if (!obj) return '';
    return obj[language] || obj.en;
  };

  // Helper to map icon string to Lucide React component
  const renderIcon = (iconName: string) => {
    const props = { size: 24, className: "text-emerald-600 dark:text-emerald-400" };
    switch (iconName) {
      case 'Leaf':
        return <Leaf {...props} />;
      case 'Zap':
        return <Zap {...props} className="text-amber-500 dark:text-amber-400" />;
      case 'Sparkles':
        return <Sparkles {...props} className="text-purple-500 dark:text-purple-400" />;
      case 'Info':
        return <Info {...props} className="text-blue-500 dark:text-blue-400" />;
      default:
        return <Lightbulb {...props} className="text-amber-500 dark:text-amber-400" />;
    }
  };

  // Setup bin color styling
  const getBinStyle = (binColor: string) => {
    const normalized = binColor.toLowerCase();
    if (normalized.includes('blue')) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40';
    }
    if (normalized.includes('green')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40';
    }
    if (normalized.includes('red')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/40';
  };

  const getLocalizedBinLabel = (binColor: string) => {
    const normalized = binColor.toLowerCase();
    if (normalized.includes('blue')) {
      return language === 'ur' ? 'نیلا ڈبہ (ری سائیکل ایبل)' : language === 'sd' ? 'نيرو دٻو (ري سائڪل)' : 'Blue Bin (Recyclable)';
    }
    if (normalized.includes('green')) {
      return language === 'ur' ? 'سبز ڈبہ (نامیاتی)' : language === 'sd' ? 'سائو دٻو (نامياتي)' : 'Green Bin (Organic)';
    }
    if (normalized.includes('red')) {
      return language === 'ur' ? 'سرخ ڈبہ (خصوصی ہینڈلنگ)' : language === 'sd' ? 'ڳاڙهو دٻو (خاص نيڪال)' : 'Red Bin (Special Handling)';
    }
    return binColor;
  };

  const isRtl = language === 'ur' || language === 'sd';

  return (
    <div className="w-full" id="recycling-tip-container">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-md border border-gray-100 dark:border-zinc-800 transition-all">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Lightbulb size={16} />
            </span>
            <span className={`text-[11px] font-extrabold tracking-wide text-emerald-600 dark:text-emerald-400 uppercase`}>
              {language === 'ur' ? 'آج کی کارآمد ٹپ' : language === 'sd' ? 'اڄ جي ڪارائتي ٽپ' : 'Tip of the Day'}
            </span>
          </div>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loading}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            title={language === 'ur' ? 'نئی ٹپ دیکھیں' : language === 'sd' ? 'نيون ٽپ ڏسو' : 'Show another tip'}
            id="refresh-tip-btn"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 flex flex-col items-center justify-center text-center"
            >
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-[10px] text-gray-400">{language === 'ur' ? 'معلومات حاصل کی جا رہی ہے...' : language === 'sd' ? 'معلومات حاصل ڪئي پئي وڃي...' : 'Fetching daily guideline...'}</p>
            </motion.div>
          ) : tip ? (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/25 rounded-2xl shrink-0 flex items-center justify-center self-start">
                {renderIcon(tip.icon)}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className={`flex flex-wrap items-center gap-2 ${isRtl ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
                  <h4 className="font-bold text-gray-900 dark:text-zinc-100 text-xs">
                    {getLocalized(tip.title)}
                  </h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${getBinStyle(tip.binColor)}`}>
                    {getLocalizedBinLabel(tip.binColor)}
                  </span>
                </div>

                <p className={`text-[11px] leading-relaxed text-gray-600 dark:text-zinc-300 font-medium ${isRtl ? 'font-urdu' : 'font-sans'}`}>
                  {getLocalized(tip.description)}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-4 text-red-500 flex flex-col items-center gap-1">
              <AlertTriangle size={20} />
              <p className="text-xs font-semibold">Error displaying tips</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
