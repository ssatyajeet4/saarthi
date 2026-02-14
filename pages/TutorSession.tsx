
import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { saveUploadedChapter, saveStoredImage } from '../services/storageService';
import AudioVisualizer from '../components/AudioVisualizer';
import { GoogleGenAI, Type } from '@google/genai';
import { Upload, Mic, MicOff, X, Sparkles, Loader2, Camera, HelpCircle, RefreshCcw, BookOpen, GraduationCap, Eye, ImageIcon, AlertTriangle } from 'lucide-react';
import { GeneratedImage, SubjectName } from '../types';
import { useLocation } from 'react-router-dom';

const TutorSession: React.FC = () => {
  const [apiKey] = useState(process.env.API_KEY || '');
  const [status, setStatus] = useState('Idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [extractedContext, setExtractedContext] = useState('');
  
  // UI State for Active Learning Context
  const [activeSource, setActiveSource] = useState<{title: string, subtitle: string, type: 'chapter' | 'upload', rawContent?: string} | null>(null);
  const [analyzingContent, setAnalyzingContent] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showContentModal, setShowContentModal] = useState(false);

  // Generated Visual State
  const [generatedVisual, setGeneratedVisual] = useState<GeneratedImage | null>(null);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const location = useLocation();

  // 1. Handle incoming navigation state (From Dashboard)
  useEffect(() => {
    if (location.state?.chapter && location.state?.subject) {
      const { subject, chapter } = location.state;
      // Use full content if available, otherwise fall back to summary
      const contextContent = chapter.content 
          ? `FULL TEXT CONTENT:\n${chapter.content}` 
          : `SUMMARY:\n${chapter.summary || 'No summary available.'}`;

      setExtractedContext(`Subject: ${subject}. Chapter: ${chapter.name}.\n${contextContent}`);
      setActiveSource({
        title: chapter.name,
        subtitle: subject,
        type: 'chapter',
        rawContent: chapter.content || chapter.summary
      });
    }
  }, [location.state]);

  useEffect(() => {
    return () => {
      liveServiceRef.current?.disconnect();
    };
  }, []);

  // --- Visual Generation Logic ---
  const handleVisualRequest = async (prompt: string, concept: string) => {
    setGeneratingVisual(true);
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use gemini-2.5-flash-image for generation (standard image model)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });

        // Find the image part
        let base64 = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    base64 = part.inlineData.data;
                    break;
                }
            }
        }

        if (base64) {
            const newImage: GeneratedImage = {
                id: crypto.randomUUID(),
                concept: concept,
                base64: base64,
                createdAt: new Date().toISOString(),
                sizeBytes: base64.length
            };
            saveStoredImage(newImage); // Persistent Save
            setGeneratedVisual(newImage);
        }
    } catch (e) {
        console.error("Visual generation failed", e);
    } finally {
        setGeneratingVisual(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset current active source to indicate loading
    setActiveSource(null);
    setAnalyzingContent(true);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const cleanBase64 = base64String.split(',')[1];
      
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Defined Schema for categorization
        const analysisSchema = {
             type: Type.OBJECT,
             properties: {
                 subject: { 
                     type: Type.STRING, 
                     enum: ['Hindi', 'SST', 'Science', 'Computer Science', 'Kannada'],
                     description: "The school subject this content belongs to."
                 },
                 chapterName: { type: Type.STRING, description: "A short, clear name for the chapter/topic." },
                 summary: { type: Type.STRING, description: "A concise summary of the key concepts." },
                 extractedText: { type: Type.STRING, description: "The full extracted text content from the document image/pdf." },
                 difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
             },
             required: ["subject", "chapterName", "summary", "extractedText"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type, data: cleanBase64 } },
                    { text: "Analyze this study material for a Grade 4 student. Identify the Subject, Chapter Name. Write a summary. IMPORTANT: Extract the FULL visible text content into 'extractedText' field." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema
            }
        });
        
        const jsonText = response.text || "{}";
        const result = JSON.parse(jsonText);
        
        if (result.subject && result.chapterName) {
            // Save to Persistent Storage with CONTENT
            saveUploadedChapter(
                result.subject as SubjectName, 
                result.chapterName, 
                result.summary, 
                result.extractedText || result.summary, // Fallback to summary if extraction fails
                result.difficulty
            );
            
            // Set context for the live session
            setExtractedContext(`Subject: ${result.subject}. Chapter: ${result.chapterName}. FULL TEXT CONTENT: ${result.extractedText || result.summary}`);
            setActiveSource({
              title: result.chapterName,
              subtitle: result.subject,
              type: 'upload',
              rawContent: result.extractedText || result.summary
            });
        } else {
             setExtractedContext("Content analyzed but format was unclear. Proceeding with general context.");
             setActiveSource({ title: "General Discussion", subtitle: "General Knowledge", type: 'upload' });
        }

      } catch (err) {
        console.error(err);
        setExtractedContext("Error processing file. Please try again.");
      } finally {
        setAnalyzingContent(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleSession = async () => {
    if (isSessionActive) {
      await liveServiceRef.current?.disconnect();
      setIsSessionActive(false);
      setStatus('Idle');
    } else {
      if (!apiKey) return alert("API Key missing");
      setTranscript(''); 
      const service = new GeminiLiveService(
        apiKey, 
        (s) => setStatus(s),
        () => {}, 
        (text) => setTranscript(prev => text),
        handleVisualRequest
      );
      liveServiceRef.current = service;
      try {
        await service.connect(extractedContext);
        setIsSessionActive(true);
      } catch (err) {
        console.error(err);
        setStatus('Connection Failed');
      }
    }
  };

  return (
    <div className="min-h-full flex flex-col pt-4 pb-32 relative">
      
      {/* 1. Header Area: Active Context Display */}
      <div className="flex-1 flex flex-col items-center p-4 relative z-10">
        
        {/* Active Source Card */}
        <div className={`w-full max-w-sm rounded-2xl p-4 mb-6 flex items-center gap-4 shadow-sm border transition-all duration-500 relative overflow-hidden ${isSessionActive ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSessionActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-500'}`}>
               {analyzingContent ? <Loader2 className="w-6 h-6 animate-spin" /> : <BookOpen className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0 z-10">
               <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isSessionActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                   {analyzingContent ? "Scanning..." : (activeSource?.subtitle || "No Content Selected")}
               </p>
               <h3 className="font-bold text-lg leading-tight truncate">
                   {activeSource?.title || "Ready to Learn"}
               </h3>
            </div>
            {/* View Content Button */}
            {activeSource && !analyzingContent && (
               <button 
                onClick={() => setShowContentModal(true)}
                className={`p-2 rounded-full z-10 transition-colors ${isSessionActive ? 'text-indigo-200 hover:bg-white/20' : 'text-slate-400 hover:bg-slate-100'}`}
               >
                   <Eye className="w-5 h-5" />
               </button>
            )}
            
            {activeSource && !isSessionActive && (
               <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            )}
        </div>

        {/* Content Modal */}
        {showContentModal && activeSource && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl">
                    <div className="p-6 border-b flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-xl">{activeSource.title}</h3>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{activeSource.subtitle} Content</p>
                        </div>
                        <button onClick={() => setShowContentModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                            {activeSource.rawContent || "No text content available."}
                        </pre>
                    </div>
                </div>
            </div>
        )}

        {/* The "AI Persona" Visual */}
        <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-200 flex items-center justify-center transition-all duration-500 ${isSessionActive ? 'scale-110 animate-pulse ring-4 ring-indigo-100' : 'scale-100'}`}>
                {analyzingContent ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                    <GraduationCap className="w-16 h-16 text-white" />
                )}
            </div>
            
            {/* Live Audio Visualizer */}
            <div className="h-16 w-full max-w-[200px] mt-6 flex items-center justify-center">
                 <AudioVisualizer isActive={status === 'Active'} color="#6366f1" />
            </div>
        </div>

        {/* Live Transcript Bubble */}
        <div className={`mt-2 px-6 py-4 bg-white/60 backdrop-blur-sm rounded-2xl border max-w-sm w-full min-h-[80px] text-center flex items-center justify-center transition-all shadow-sm ${status === 'HTTPS Required' || status === 'Mic Permission Denied' ? 'border-red-300 bg-red-50' : 'border-white/50'}`}>
            <p className={`font-medium leading-relaxed text-sm ${status === 'HTTPS Required' || status === 'Mic Permission Denied' ? 'text-red-600' : 'text-slate-600'}`}>
                {status === 'HTTPS Required' 
                    ? "Microphone blocked! Please use HTTPS or USB Debugging." 
                    : status === 'Mic Permission Denied' 
                    ? "Microphone access denied. Please enable it in browser settings."
                    : analyzingContent 
                    ? "Reading & Extracting full text..." 
                    : (transcript || (isSessionActive ? "Listening..." : "Tap the mic to start your session."))
                }
            </p>
        </div>
      </div>
      
      {/* Visual Aid Overlay */}
      {(generatedVisual || generatingVisual) && (
          <div className="absolute inset-x-4 top-24 z-30 bg-white p-2 rounded-2xl shadow-2xl border border-indigo-100 animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-2 px-2">
                 <div className="flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-indigo-500 fill-current" />
                     <span className="text-xs font-bold text-indigo-600">AI Visual Aid</span>
                 </div>
                 <button onClick={() => setGeneratedVisual(null)} disabled={generatingVisual} className="p-1 hover:bg-slate-100 rounded-full">
                     <X className="w-4 h-4 text-slate-400" />
                 </button>
             </div>
             <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                 {generatingVisual ? (
                     <div className="flex flex-col items-center gap-2">
                         <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                         <span className="text-xs font-bold text-slate-400">Drawing...</span>
                     </div>
                 ) : (
                     <img src={`data:image/png;base64,${generatedVisual?.base64}`} alt="Visual Aid" className="w-full h-full object-cover" />
                 )}
             </div>
             {generatedVisual && (
                 <p className="text-center text-xs font-bold text-slate-700 mt-2">{generatedVisual.concept}</p>
             )}
          </div>
      )}

      {/* 2. Controls Area */}
      <div className="w-full bg-white rounded-t-[2.5rem] shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.05)] p-8 pb-10 z-20 mt-auto">
          
          {/* Helper Buttons */}
          <div className="flex justify-center gap-6 mb-8">
               <button disabled={!isSessionActive} className="flex flex-col items-center gap-2 text-slate-400 disabled:opacity-30 active:scale-95 transition-transform">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                       <HelpCircle className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-bold">Hint</span>
               </button>
               
               <button disabled={!isSessionActive} className="flex flex-col items-center gap-2 text-slate-400 disabled:opacity-30 active:scale-95 transition-transform">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                       <RefreshCcw className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-bold">Explain</span>
               </button>

               <label className="flex flex-col items-center gap-2 text-slate-400 cursor-pointer group active:scale-95 transition-transform">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-transparent group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                       <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                       <Camera className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-bold">New Scan</span>
               </label>
          </div>

          {/* Main Mic Button */}
          <div className="flex justify-center">
             <button 
                onClick={toggleSession}
                disabled={analyzingContent}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 bouncy-btn ${
                    isSessionActive 
                    ? 'bg-red-500 text-white shadow-red-200 scale-100' 
                    : 'bg-indigo-600 text-white shadow-indigo-300 pulse-ring hover:scale-105'
                } ${analyzingContent ? 'opacity-50 grayscale' : ''}`}
             >
                {status === 'HTTPS Required' ? <AlertTriangle className="w-8 h-8 text-white" /> : (
                    isSessionActive ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />
                )}
             </button>
          </div>
          <p className="text-center mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {status === 'HTTPS Required' ? "Security Error" : (isSessionActive ? "Tap to Stop" : "Start Session")}
          </p>
      </div>
    </div>
  );
};

export default TutorSession;
