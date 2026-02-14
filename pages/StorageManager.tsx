import React, { useEffect, useState } from 'react';
import { getStoredImages, getProfile, deleteChapter, clearStoredImages } from '../services/storageService';
import { GeneratedImage, StudentProfile, SubjectName, Chapter, SubjectData } from '../types';
import { Trash2, Image as ImageIcon, Download, Search, FileText, BookOpen, XCircle } from 'lucide-react';

type Tab = 'materials' | 'gallery';

const StorageManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setImages(getStoredImages());
    setProfile(getProfile());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearGallery = () => {
    if (confirm("Clear all generated visuals?")) {
      clearStoredImages();
      loadData();
    }
  };

  const handleDeleteChapter = (subject: SubjectName, chapterName: string) => {
    if (confirm(`Delete "${chapterName}"? You will need to re-upload it to study again.`)) {
        deleteChapter(subject, chapterName);
        loadData();
    }
  };

  // Helper to flatten chapters for display
  const getAllChapters = () => {
      if (!profile) return [];
      const all: Array<{subject: SubjectName, data: Chapter}> = [];
      Object.entries(profile.subjects).forEach(([sub, data]) => {
          const subjectData = data as SubjectData;
          Object.values(subjectData.chapters).forEach(chap => {
              if (chap.name !== 'General' || Object.keys(chap.concepts).length > 0) {
                  all.push({ subject: sub as SubjectName, data: chap });
              }
          });
      });
      return all.filter(c => c.data.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Tabs */}
      <div className="flex p-1 bg-slate-200 rounded-xl">
          <button 
            onClick={() => setActiveTab('materials')} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'materials' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            Study Materials
          </button>
          <button 
            onClick={() => setActiveTab('gallery')} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'gallery' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            Visual Gallery
          </button>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex gap-3">
         <div className="flex-1 bg-white h-12 rounded-xl flex items-center px-4 shadow-sm border border-slate-100">
             <Search className="w-5 h-5 text-slate-400 mr-2" />
             <input 
                type="text" 
                placeholder={activeTab === 'materials' ? "Search chapters..." : "Search visuals..."} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" 
             />
         </div>
         {activeTab === 'gallery' && (
            <button onClick={handleClearGallery} className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                <Trash2 className="w-5 h-5" />
            </button>
         )}
      </div>

      {/* MATERIALS TAB */}
      {activeTab === 'materials' && (
        <div className="space-y-3">
            {getAllChapters().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-indigo-300" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">No Materials Yet</h3>
                    <p className="text-sm">Upload PDFs in Tutor Mode to save them here.</p>
                </div>
            ) : (
                getAllChapters().map((item, idx) => (
                    <div key={idx} className="soft-card p-4 flex items-center gap-4 bg-white group">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{item.subject}</span>
                                <span className="text-[10px] text-slate-400">{(item.data.content?.length || 0) / 1000}kb stored</span>
                            </div>
                            <h4 className="font-bold text-slate-800 truncate">{item.data.name}</h4>
                        </div>
                        <button 
                            onClick={() => handleDeleteChapter(item.subject, item.data.name)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))
            )}
        </div>
      )}

      {/* GALLERY TAB */}
      {activeTab === 'gallery' && (
        <>
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 text-indigo-300" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">Gallery Empty</h3>
                    <p className="text-sm">Visuals from tutor sessions appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {images.filter(img => img.concept.toLowerCase().includes(searchTerm.toLowerCase())).map((img) => (
                        <div key={img.id} className="soft-card p-2 bg-white group">
                            <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-2 relative">
                                <img src={`data:image/png;base64,${img.base64}`} alt={img.concept} className="w-full h-full object-cover" />
                                <a href={`data:image/png;base64,${img.base64}`} download className="absolute bottom-2 right-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm text-indigo-600">
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                            <div className="px-1 mb-1">
                                <p className="font-bold text-slate-800 text-sm leading-tight truncate">{img.concept}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(img.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default StorageManager;