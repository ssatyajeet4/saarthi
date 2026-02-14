
import { StudentProfile, SubjectName, GameBadge, GeneratedImage, Chapter } from '../types';
import { SUPPORTED_SUBJECTS } from '../constants';

const PROFILE_KEY = 'shiksha_student_profile';
const IMAGES_KEY = 'shiksha_generated_images';

const INITIAL_PROFILE: StudentProfile = {
  name: 'Saachi',
  subjects: SUPPORTED_SUBJECTS.reduce((acc, subject) => {
    acc[subject] = { chapters: {}, streak: 0 };
    return acc;
  }, {} as Record<SubjectName, any>),
  totalPoints: 0,
  badges: [],
  currentStreak: 0,
  lastActive: new Date().toISOString(),
  activityLog: []
};

// Helper to get YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

const updateActivityLog = (profile: StudentProfile) => {
    const today = getTodayDate();
    if (!profile.activityLog) profile.activityLog = [];
    
    if (!profile.activityLog.includes(today)) {
        profile.activityLog.push(today);
        profile.activityLog.sort();
    }
    
    // Recalculate Streak
    let streak = 0;
    const d = new Date();
    // Check today
    if (profile.activityLog.includes(d.toISOString().split('T')[0])) {
        // Active today
    } else {
        // Not active today, check yesterday
        d.setDate(d.getDate() - 1);
        if (!profile.activityLog.includes(d.toISOString().split('T')[0])) {
            // Not active yesterday either
            profile.currentStreak = 0;
            return;
        }
    }
    
    // Count backwards
    // Reset d to today to start clean loop or yesterday if today missed?
    // Safer: Just iterate unique dates backwards from today
    // Logic: Look for continuous block ending at today or yesterday
    
    const uniqueDates = new Set(profile.activityLog);
    let currentCheck = new Date();
    let currentStr = currentCheck.toISOString().split('T')[0];
    
    // If not active today, start check from yesterday
    if (!uniqueDates.has(currentStr)) {
        currentCheck.setDate(currentCheck.getDate() - 1);
        currentStr = currentCheck.toISOString().split('T')[0];
    }
    
    while (uniqueDates.has(currentStr)) {
        streak++;
        currentCheck.setDate(currentCheck.getDate() - 1);
        currentStr = currentCheck.toISOString().split('T')[0];
    }
    
    profile.currentStreak = streak;
    
    // Badge Logic for Streak
    if (streak >= 7 && !profile.badges.includes(GameBadge.SEVEN_DAY_STREAK)) {
        profile.badges.push(GameBadge.SEVEN_DAY_STREAK);
    }
};

export const getProfile = (): StudentProfile => {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) return INITIAL_PROFILE;
  try {
    const profile = JSON.parse(stored);
    // Migration: Update name from default 'Student' to 'Saachi'
    if (profile.name === 'Student') {
      profile.name = 'Saachi';
    }
    // Migration: Ensure activityLog exists
    if (!profile.activityLog) {
        profile.activityLog = [];
    }
    return profile;
  } catch {
    return INITIAL_PROFILE;
  }
};

export const saveProfile = (profile: StudentProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

// --- Chapter Management ---

export const saveUploadedChapter = (
  subject: SubjectName, 
  chapterName: string, 
  summary: string, 
  content: string, 
  difficulty: string = 'Normal'
) => {
  const profile = getProfile();
  
  if (!profile.subjects[subject]) {
    profile.subjects[subject] = { chapters: {}, streak: 0 };
  }

  const existingChapter = profile.subjects[subject].chapters[chapterName];
  
  profile.subjects[subject].chapters[chapterName] = {
    name: chapterName,
    summary: summary,
    content: content, // Save full text content
    difficulty: difficulty,
    concepts: existingChapter ? existingChapter.concepts : {}, // Preserve existing concepts if re-uploading
    lastStudied: new Date().toISOString()
  };

  profile.lastActive = new Date().toISOString();
  updateActivityLog(profile);
  saveProfile(profile);
};

export const deleteChapter = (subject: SubjectName, chapterName: string) => {
  const profile = getProfile();
  if (profile.subjects[subject]?.chapters[chapterName]) {
    delete profile.subjects[subject].chapters[chapterName];
    saveProfile(profile);
  }
};

// --- Image Storage Logic ---

export const getStoredImages = (): GeneratedImage[] => {
  const stored = localStorage.getItem(IMAGES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveStoredImage = (image: GeneratedImage) => {
  const images = getStoredImages();
  images.unshift(image);
  if (images.length > 20) {
    images.pop(); 
  }
  localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
};

export const clearStoredImages = () => {
    localStorage.removeItem(IMAGES_KEY);
}

export const getStorageUsage = (): { usedBytes: number, count: number } => {
    const images = getStoredImages();
    const usedBytes = images.reduce((acc, img) => acc + img.sizeBytes, 0);
    return { usedBytes, count: images.length };
};

// --- Profile Logic ---

export const updatePointsAndMastery = (
  subject: SubjectName,
  pointsToAdd: number,
  conceptName?: string,
  masteryIncrease?: number
): StudentProfile => {
  const profile = getProfile();
  
  // Update points
  profile.totalPoints += pointsToAdd;
  profile.lastActive = new Date().toISOString();
  updateActivityLog(profile);

  // Basic Badge Logic
  if (profile.totalPoints > 100 && !profile.badges.includes('Beginner Scholar')) {
    profile.badges.push('Beginner Scholar');
  }
  if (profile.totalPoints > 500 && !profile.badges.includes(GameBadge.TOP_PERFORMER)) {
    profile.badges.push(GameBadge.TOP_PERFORMER);
  }

  // Update Mastery if provided
  if (conceptName) {
     const subjectData = profile.subjects[subject];
     
     let targetChapterName = 'General';
     const chapterKeys = Object.keys(subjectData.chapters);
     if (chapterKeys.length > 0) {
         // Sort by lastStudied to find most recent
         chapterKeys.sort((a,b) => {
             const ca = subjectData.chapters[a];
             const cb = subjectData.chapters[b];
             return (cb.lastStudied || '').localeCompare(ca.lastStudied || '');
         });
         targetChapterName = chapterKeys[0];
     } else {
         subjectData.chapters['General'] = { name: 'General', concepts: {} };
     }
     
     const chapter = subjectData.chapters[targetChapterName];
     
     if (!chapter.concepts[conceptName]) {
        chapter.concepts[conceptName] = { 
            id: conceptName, 
            name: conceptName, 
            mastery: 0, 
            attempts: 0 
        };
     }
     
     const concept = chapter.concepts[conceptName];
     concept.attempts += 1;
     if (masteryIncrease) {
        concept.mastery = Math.min(100, concept.mastery + masteryIncrease);
     }
     
     if (concept.mastery >= 90 && !profile.badges.includes(GameBadge.CONCEPT_MASTER)) {
         profile.badges.push(GameBadge.CONCEPT_MASTER);
     }
  }

  saveProfile(profile);
  return profile;
};
