import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StainGuideItem } from '../types';
import { STAIN_GUIDE } from '../data/initialData';

interface StainExpertGuideProps {
  onAskAiAboutStain: (stainName: string) => void;
}

export const StainExpertGuide: React.FC<StainExpertGuideProps> = ({ onAskAiAboutStain }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(STAIN_GUIDE[0].id);

  const filteredStains = STAIN_GUIDE.filter(
    (s) =>
      s.stainNamePa.toLowerCase().includes(search.toLowerCase()) ||
      s.stainNameEn.toLowerCase().includes(search.toLowerCase()) ||
      s.recommendedChemicals.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
      s.safeFabricsPa.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FlaskConical className="w-4 h-4" />
            <span>Master Dry Clean ਦਾਗ਼ ਰਿਮੂਵਲ ਮਾਹਿਰ (Stain Removal Expert)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            ਦਾਗ਼-ਧੱਬੇ ਸਾਫ਼ ਕਰਨ ਦੀ ਪੇਸ਼ੇਵਰ ਕੈਮੀਕਲ ਗਾਈਡ
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            ਤੇਲ, ਗਰੀਸ, ਸਿਆਹੀ, ਹਲਦੀ, ਚਾਹ, ਕੌਫ਼ੀ ਜਾਂ ਖੂਨ ਦੇ ਪੱਕੇ ਦਾਗ਼ ਹਟਾਉਣ ਦੇ ਵਿਗਿਆਨਕ ਅਤੇ ਸੁਰੱਖਿਅਤ
            ਤਰੀਕੇ
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ਦਾਗ਼ ਜਾਂ ਕੈਮੀਕਲ ਖੋਜੋ..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-hidden focus:bg-white/20"
            />
          </div>
        </div>
      </div>

      {/* Pro Spotting Chemicals Quick Reference Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-2 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ਮੁੱਖ ਪੇਸ਼ੇਵਰ ਕੈਮੀਕਲਜ਼ (Essential Dry Cleaning Chemicals):</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold">Perchloroethylene (Perc)</strong>
            <span className="text-[11px] text-slate-500">ਤੇਲ, ਗਰੀਸ ਅਤੇ ਮੋਟਰ ਆਇਲ ਲਈ</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold">Isopropyl Alcohol (IPA)</strong>
            <span className="text-[11px] text-slate-500">ਸਿਆਹੀ, ਬਾਲ ਪੈੱਨ, ਮਾਰਕਰ ਲਈ</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold">Oxalic Acid</strong>
            <span className="text-[11px] text-slate-500">ਜੰਗਾਲ ਅਤੇ ਫਾਊਂਟੇਨ ਪੈੱਨ ਸਿਆਹੀ ਲਈ</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold">Liquid Emulsifier / Petrol</strong>
            <span className="text-[11px] text-slate-500">ਚਿਕਨਾਈ ਤੇ ਕਾਲਖ਼ ਤੋੜਨ ਲਈ</span>
          </div>
        </div>
      </div>

      {/* Stains Accordion List */}
      <div className="space-y-4">
        {filteredStains.map((stain) => {
          const isExpanded = expandedId === stain.id;
          return (
            <div
              key={stain.id}
              className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                isExpanded ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-slate-200'
              }`}
            >
              {/* Card Accordion Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : stain.id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                    🧼
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {stain.stainNamePa}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {stain.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{stain.stainNameEn}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskAiAboutStain(stain.stainNamePa);
                    }}
                    className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI ਨੂੰ ਪੁੱਛੋ</span>
                  </button>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body if Expanded */}
              {isExpanded && (
                <div className="p-4 sm:p-6 pt-0 border-t border-slate-100 space-y-4">
                  {/* Chemicals Required */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-xs font-bold text-slate-700 block mb-1.5">
                      ਲੋੜੀਂਦੇ ਪੇਸ਼ੇਵਰ ਕੈਮੀਕਲ (Recommended Chemicals):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {stain.recommendedChemicals.map((chem, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold shadow-2xs font-mono"
                        >
                          🧪 {chem}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step by Step instructions in Punjabi */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      ਸਾਫ਼ ਕਰਨ ਦਾ ਪੜਾਅਵਾਰ ਤਰੀਕਾ (Step-by-Step Procedure):
                    </h4>
                    <div className="space-y-2">
                      {stain.stepByStepPa.map((step, idx) => (
                        <div
                          key={idx}
                          className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-2 border-l-2 border-emerald-500 py-0.5"
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Safety & Fabric Compatibility Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>ਸੁਰੱਖਿਅਤ ਫੈਬਰਿਕ (Safe Fabrics):</span>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium">{stain.safeFabricsPa}</p>
                    </div>

                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-rose-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>ਜ਼ਰੂਰੀ ਸਾਵਧਾਨੀ (Fabric Warning):</span>
                      </div>
                      <p className="text-xs text-rose-800 font-medium">{stain.fabricWarningsPa}</p>
                    </div>
                  </div>

                  {/* Pro Tip */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                    <span className="font-bold text-base leading-none">💡</span>
                    <div>
                      <strong className="font-bold">ਉਸਤਾਦ ਟਿਪ (Pro Tip):</strong> {stain.proTipPa}
                    </div>
                  </div>

                  {/* Action on Mobile */}
                  <div className="sm:hidden pt-2">
                    <button
                      type="button"
                      onClick={() => onAskAiAboutStain(stain.stainNamePa)}
                      className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ਇਸ ਦਾਗ਼ ਬਾਰੇ AI ਨਾਲ ਗੱਲ ਕਰੋ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
