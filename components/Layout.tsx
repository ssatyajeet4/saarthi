import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mic, BookOpen, TrendingUp, Lock, Unlock, Zap, ShieldCheck } from 'lucide-react';
import { getProfile } from '../services/storageService';

// Parent Mode Context (Simple implementation for UI)
export const ParentContext = React.createContext({ isParentMode: false, toggleParentMode: () => {} });

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isParentMode, setIsParentMode] = useState(false);
  const location = useLocation();
  const profile = getProfile();

  const handleParentToggle = () => {
    if (!isParentMode) {
      const pin = prompt("Enter Parent PIN (Try: 1234)");
      if (pin === "1234") setIsParentMode(true);
      else alert("Incorrect PIN");
    } else {
      setIsParentMode(false);
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/tutor', icon: Mic, label: 'Tutor' },
    { path: '/storage', icon: BookOpen, label: 'Library' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
  ];

  return (
    <ParentContext.Provider value={{ isParentMode, toggleParentMode: handleParentToggle }}>
      <div className="h-full flex flex-col max-w-md mx-auto bg-slate-50 relative shadow-2xl md:max-w-full md:shadow-none overflow-hidden">
        
        {/* Top Bar */}
        <header className={`px-6 pt-6 pb-2 flex justify-between items-center bg-white/80 backdrop-blur-md z-10 transition-colors duration-300 ${isParentMode ? 'border-b-2 border-slate-900' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg transform transition-transform hover:scale-105 ${isParentMode ? 'bg-slate-800' : 'bg-gradient-to-tr from-indigo-500 to-purple-500'}`}>
              {isParentMode ? <ShieldCheck className="w-5 h-5" /> : <img src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profile.name}`} alt="Avatar" className="w-full h-full rounded-full" />}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none fun-font tracking-wide">
                {isParentMode ? 'Parent Dashboard' : 'Saarthi AI'}
              </h1>
              {!isParentMode && (
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-0.5">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{profile.currentStreak} Day Streak</span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleParentToggle}
            className={`p-2.5 rounded-xl transition-all ${isParentMode ? 'bg-slate-200 text-slate-900' : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'}`}
          >
            {isParentMode ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-2">
          {children}
        </main>

        {/* Bottom Navigation - Fixed Uniform Layout */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-2 py-2 flex justify-around items-center pb-6 z-20 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink 
                key={item.path} 
                to={item.path} 
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-all duration-200 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className={`relative flex items-center justify-center w-12 h-8 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                    <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

      </div>
    </ParentContext.Provider>
  );
};

export default Layout;