import React, { useEffect, useState } from 'react';
import { getProfile } from '../services/storageService';
import { StudentProfile, SubjectName, Chapter, Concept } from '../types';
import { SUPPORTED_SUBJECTS } from '../constants';
import { TrendingUp, Award, Zap } from 'lucide-react';

const ProgressPage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
    // Update every few seconds in case background updates happen
    const interval = setInterval(() => setProfile(getProfile()), 2000);
    return () => clearInterval(interval);
  }, []);

  if (!profile) return null;

  const getSubjectColor = (subject: SubjectName) => {
      switch(subject) {
          case 'Hindi': return { color: 'bg-pink-500', bg: 'bg-pink-100' };
          case 'Science': return { color: 'bg-teal-500', bg: 'bg-teal-100' };
          case 'SST': return { color: 'bg-blue-500', bg: 'bg-blue-100' };
          case 'Kannada': return { color: 'bg-orange-500', bg: 'bg-orange-100' };
          case 'Computer Science': return { color: 'bg-indigo-500', bg: 'bg-indigo-100' };
          default: return { color: 'bg-slate-500', bg: 'bg-slate-100' };
      }
  };

  const calculateMastery = (subject: SubjectName) => {
      const subjectData = profile!.subjects[subject];
      if (!subjectData) return 0;

      let totalMastery = 0;
      let conceptCount = 0;

      Object.values(subjectData.chapters).forEach((chapter: Chapter) => {
          Object.values(chapter.concepts).forEach((concept: Concept) => {
              totalMastery += concept.mastery;
              conceptCount++;
          });
      });

      return conceptCount === 0 ? 0 : Math.round(totalMastery / conceptCount);
  };

  const subjects = SUPPORTED_SUBJECTS.map(name => ({
      name,
      ...getSubjectColor(name),
      progress: calculateMastery(name)
  }));

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="soft-card p-4 bg-indigo-600 text-white">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Total XP</span>
                </div>
                <p className="text-3xl font-black fun-font">{profile.totalPoints}</p>
            </div>
            <div className="soft-card p-4 bg-white">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Badges</span>
                </div>
                <p className="text-3xl font-black text-slate-800 fun-font">{profile.badges.length}</p>
            </div>
        </div>

        {/* Mastery Bars */}
        <div className="soft-card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-6 fun-font">Subject Mastery</h3>
            <div className="space-y-6">
                {subjects.map(sub => (
                    <div key={sub.name}>
                        <div className="flex justify-between mb-2">
                            <span className="font-bold text-sm text-slate-700">{sub.name}</span>
                            <span className="font-bold text-xs text-slate-400">{sub.progress}%</span>
                        </div>
                        <div className={`h-3 w-full rounded-full ${sub.bg} overflow-hidden`}>
                            <div className={`h-full rounded-full ${sub.color} transition-all duration-1000 ease-out`} style={{ width: `${sub.progress}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Recent Achievements */}
        <div>
            <h3 className="font-bold text-lg text-slate-800 mb-4 px-2 fun-font">Trophy Room</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 pb-2">
                {profile.badges.length > 0 ? profile.badges.map((badge, idx) => (
                    <div key={idx} className="min-w-[120px] bg-white rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-3">
                            <Award className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-center text-slate-700">{badge}</p>
                    </div>
                )) : (
                    <div className="text-sm text-slate-400 italic px-2">No badges yet. Keep learning!</div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProgressPage;