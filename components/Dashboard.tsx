
import React, { useEffect, useState, useContext } from 'react';
import { getProfile } from '../services/storageService';
import { StudentProfile, SubjectData, Chapter } from '../types';
import { ParentContext } from './Layout';
import { Trophy, Flame, Star, ChevronRight, PlayCircle, Clock, Brain, Map, Upload, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simple Circular Progress Component
const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
        <circle 
          cx="50%" cy="50%" r={radius} 
          stroke={color} 
          strokeWidth="8" 
          fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black text-slate-800">{percentage}%</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const { isParentMode } = useContext(ParentContext);
  const navigate = useNavigate();

  useEffect(() => {
    setProfile(getProfile());
    const interval = setInterval(() => setProfile(getProfile()), 2000);
    return () => clearInterval(interval);
  }, []);

  if (!profile) return <div className="p-10 text-center font-bold text-slate-400">Loading...</div>;

  // Collect all uploaded chapters across subjects
  const allChapters: Array<{subject: string, data: Chapter}> = [];
  Object.entries(profile.subjects).forEach(([subject, d]) => {
      const data = d as SubjectData;
      Object.values(data.chapters).forEach(chapter => {
          if (chapter.name !== 'General' || Object.keys(chapter.concepts).length > 0) {
              allChapters.push({ subject, data: chapter });
          }
      });
  });

  // Sort by last studied (newest first)
  allChapters.sort((a, b) => {
      return (b.data.lastStudied || '').localeCompare(a.data.lastStudied || '');
  });

  // Calculate Progress
  const totalConcepts = 20; // Goal per week
  const masteredConcepts = (Object.values(profile.subjects) as SubjectData[]).reduce((acc: number, sub: SubjectData) => 
    acc + Object.values(sub.chapters).reduce((cAcc: number, chap: Chapter) => cAcc + Object.values(chap.concepts).length, 0)
  , 0);
  const dailyProgress = Math.min(100, Math.round((masteredConcepts / 5) * 100)); // Mock daily goal logic based on 5 concepts/day
  
  // Estimate time spent (approx 15 mins per mastered concept + generic practice)
  const estimatedHours = (masteredConcepts * 0.25).toFixed(1);
  
  // Calculate Level: Start at 1, every 100 XP adds a level
  const currentLevel = Math.floor(profile.totalPoints / 100) + 1;

  // --- Week Calendar Logic ---
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    // Generate last 6 days + today for a 7-day view
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(d);
    }
    return days;
  };
  
  const weekDays = getWeekDays();
  const activitySet = new Set(profile.activityLog || []);

  const getSubjectColor = (subject: string) => {
      switch(subject) {
          case 'Science': return { bg: 'bg-teal-50', border: 'border-l-teal-400', text: 'text-teal-600', btn: 'bg-teal-400' };
          case 'Hindi': return { bg: 'bg-pink-50', border: 'border-l-pink-400', text: 'text-pink-600', btn: 'bg-pink-400' };
          case 'SST': return { bg: 'bg-blue-50', border: 'border-l-blue-400', text: 'text-blue-600', btn: 'bg-blue-400' };
          default: return { bg: 'bg-indigo-50', border: 'border-l-indigo-400', text: 'text-indigo-600', btn: 'bg-indigo-400' };
      }
  };

  const handleChapterClick = (subject: string, chapter: Chapter) => {
    navigate('/tutor', { state: { subject, chapter } });
  };

  if (isParentMode) {
    return (
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
           <h2 className="text-2xl font-bold mb-1">Parent Overview</h2>
           <p className="text-slate-400 text-sm">Monitor {profile.name}'s progress safely.</p>
           
           <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white/10 p-4 rounded-2xl">
                 <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Est. Study Time</p>
                 <p className="text-2xl font-bold">{estimatedHours} Hrs</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl">
                 <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Concepts</p>
                 <p className="text-2xl font-bold">{masteredConcepts}</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Welcome Card */}
      <div className="soft-card p-6 flex items-center justify-between bg-gradient-to-br from-indigo-500 to-violet-600 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-100 font-medium text-sm mb-1">Good Morning,</p>
          <h2 className="text-3xl font-black fun-font tracking-tight">{profile.name}</h2>
          <p className="text-xs font-bold bg-white/20 inline-block px-3 py-1 rounded-full mt-3 backdrop-blur-sm">
            Level {currentLevel} Scholar
          </p>
        </div>
        <div className="absolute right-0 top-0 opacity-10">
           <Trophy className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-4" />
        </div>
      </div>

      {/* 2. Enhanced Stats Row */}
      <div className="flex gap-4">
          
          {/* Daily Goal */}
          <div className="soft-card p-5 flex flex-col items-center justify-center min-w-[120px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Daily Goal</p>
            <CircularProgress percentage={dailyProgress} color="#6366f1" />
            <p className="text-[10px] font-bold text-indigo-500 mt-3">{masteredConcepts}/5 Concepts</p>
          </div>

          {/* New Weekly Streak & Stats */}
          <div className="flex-1 flex flex-col gap-3">
              
              {/* Streak Calendar */}
              <div className="flex-1 soft-card p-4 flex flex-col justify-between bg-orange-50 border border-orange-100">
                   <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-1.5 text-orange-600">
                          <Flame className="w-5 h-5 fill-orange-500" />
                          <span className="font-bold text-sm">Streak</span>
                       </div>
                       <span className="text-2xl font-black text-slate-800 leading-none">{profile.currentStreak} <span className="text-xs font-bold text-slate-400">Days</span></span>
                   </div>
                   
                   {/* Week Dots */}
                   <div className="flex justify-between items-center">
                       {weekDays.map((date, i) => {
                           const dateStr = date.toISOString().split('T')[0];
                           const isActive = activitySet.has(dateStr);
                           const isToday = i === 6;
                           const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                           
                           return (
                               <div key={i} className="flex flex-col items-center gap-1">
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${isActive ? 'bg-orange-500 border-orange-500 text-white' : (isToday ? 'bg-white border-orange-300 text-orange-300 border-dashed' : 'bg-white border-orange-200 text-orange-200')}`}>
                                       {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : dayName}
                                   </div>
                               </div>
                           )
                       })}
                   </div>
              </div>

              {/* Total XP */}
              <div className="h-14 soft-card px-4 flex items-center justify-between bg-yellow-50 border-yellow-100">
                 <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Star className="w-4 h-4 text-yellow-600 fill-current" />
                     </div>
                     <span className="font-bold text-slate-700 text-sm">Total XP</span>
                 </div>
                 <span className="text-xl font-black text-slate-800">{profile.totalPoints}</span>
              </div>
          </div>
      </div>

      {/* 3. Your Chapters (Only Uploaded Ones) */}
      <div>
        <div className="flex justify-between items-end px-2 mb-4">
            <h3 className="text-xl font-bold text-slate-800 fun-font">Your Chapters</h3>
        </div>
        
        {allChapters.length === 0 ? (
            <div className="soft-card p-8 flex flex-col items-center text-center gap-4 border-dashed border-2 border-indigo-200">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 animate-bounce">
                    <Upload className="w-8 h-8" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-slate-800">No Chapters Yet!</h4>
                    <p className="text-slate-500 text-sm">Upload a PDF or Image in the Tutor tab to start learning.</p>
                </div>
                <button onClick={() => navigate('/tutor')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center gap-2">
                    Go to Tutor <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-2 pb-4">
                {allChapters.map((item, idx) => {
                    const colors = getSubjectColor(item.subject);
                    return (
                        <div 
                          key={idx} 
                          className={`min-w-[180px] soft-card p-4 bg-white border-l-4 ${colors.border} relative group active:scale-95 transition-transform cursor-pointer`} 
                          onClick={() => handleChapterClick(item.subject, item.data)}
                        >
                            <div className="mb-8">
                                <span className={`px-2 py-1 ${colors.bg} ${colors.text} text-[10px] font-bold rounded-lg`}>{item.subject}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-2">{item.data.name}</h4>
                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mt-2">
                                <Clock className="w-3 h-3" /> Started {new Date(item.data.lastStudied || '').toLocaleDateString()}
                            </div>
                            <button className={`absolute bottom-3 right-3 w-8 h-8 rounded-full ${colors.btn} flex items-center justify-center text-white shadow-lg`}>
                                <PlayCircle className="w-5 h-5 fill-current" />
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* 4. Gamification Banner */}
      {profile.badges.length > 0 && (
          <div className="soft-card p-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white flex items-center justify-between">
             <div>
                <h4 className="font-bold text-lg fun-font">Latest Badge</h4>
                <p className="text-xs font-medium text-yellow-50 opacity-90">{profile.badges[profile.badges.length-1]}</p>
             </div>
             <Trophy className="w-10 h-10 text-white fill-current animate-bounce" />
          </div>
      )}

    </div>
  );
};

export default Dashboard;
