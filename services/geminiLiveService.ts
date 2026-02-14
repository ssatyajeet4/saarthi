
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { createPcmBlob, base64ToUint8Array, pcmToAudioBuffer } from './audioUtils';
import { SYSTEM_INSTRUCTION } from '../constants';
import { updatePointsAndMastery } from './storageService';
import { SubjectName } from '../types';

// Tool Definition for updating progress
const updateProgressTool: FunctionDeclaration = {
  name: 'updateProgress',
  description: 'Update student points and concept mastery after an answer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING, description: 'Subject name (e.g. Science, Hindi)' },
      points: { type: Type.NUMBER, description: 'Points to award (10 for correct, 5 for retry)' },
      conceptName: { type: Type.STRING, description: 'Name of the concept practiced' },
      masteryIncrease: { type: Type.NUMBER, description: 'Percentage to increase mastery by (e.g. 10)' }
    },
    required: ['subject', 'points']
  }
};

// Tool Definition for generating visuals
const createVisualTool: FunctionDeclaration = {
  name: 'createVisual',
  description: 'Generate a visual diagram or illustration to help explain a concept.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'Description of the image to generate' },
      concept: { type: Type.STRING, description: 'The concept being illustrated' }
    },
    required: ['prompt', 'concept']
  }
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private sessionPromise: Promise<any> | null = null;
  private nextStartTime = 0;
  private cleanup: (() => void) | null = null;
  private onStatusChange: (status: string) => void;
  private onToolCalled: () => void; // Callback to refresh UI
  private onTranscript: (text: string) => void; // Callback for text output
  private onVisualRequest: (prompt: string, concept: string) => void;

  constructor(
    apiKey: string, 
    onStatusChange: (s: string) => void, 
    onToolCalled: () => void,
    onTranscript: (text: string) => void,
    onVisualRequest: (prompt: string, concept: string) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onStatusChange = onStatusChange;
    this.onToolCalled = onToolCalled;
    this.onTranscript = onTranscript;
    this.onVisualRequest = onVisualRequest;
  }

  async connect(initialContext?: string) {
    this.onStatusChange('Connecting...');
    
    // Check if Mic is supported/allowed (detects insecure origin)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.onStatusChange('HTTPS Required');
        return;
    }

    // Audio Context Setup
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Config setup
    let finalSystemInstruction = SYSTEM_INSTRUCTION;
    if (initialContext) {
      finalSystemInstruction += `\n\nCURRENT SESSION CONTEXT (FROM UPLOADED CONTENT): ${initialContext}`;
    }

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onclose: () => this.onStatusChange('Disconnected'),
        onerror: (e: ErrorEvent) => {
            console.error(e);
            this.onStatusChange('Error');
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {}, // Enable text transcription of the AI response
        systemInstruction: finalSystemInstruction,
        tools: [{ functionDeclarations: [updateProgressTool, createVisualTool] }],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    };

    // Connect
    this.sessionPromise = this.ai.live.connect(config);
  }

  private async handleOpen() {
    this.onStatusChange('Active');
    
    // Start Mic Stream
    if (!this.inputAudioContext) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = this.inputAudioContext.createMediaStreamSource(stream);
        const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const blob = createPcmBlob(inputData);
            this.sessionPromise?.then(session => session.sendRealtimeInput({ media: blob }));
        };

        source.connect(processor);
        processor.connect(this.inputAudioContext.destination);

        this.cleanup = () => {
            source.disconnect();
            processor.disconnect();
            stream.getTracks().forEach(t => t.stop());
        };
    } catch (err) {
        console.error("Mic Error", err);
        this.onStatusChange('Mic Permission Denied');
    }
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
        const audioBytes = base64ToUint8Array(audioData);
        const audioBuffer = pcmToAudioBuffer(audioBytes, this.outputAudioContext);
        
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
    }

    // 2. Handle Text Transcription
    if (message.serverContent?.outputTranscription?.text) {
        this.onTranscript(message.serverContent.outputTranscription.text);
    }

    // 3. Handle Tool Calls
    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            let result = 'Success';
            
            if (fc.name === 'updateProgress') {
                const { subject, points, conceptName, masteryIncrease } = fc.args as any;
                updatePointsAndMastery(subject as SubjectName, points, conceptName, masteryIncrease);
                this.onToolCalled(); 
                result = 'Progress updated successfully';
            } 
            else if (fc.name === 'createVisual') {
                const { prompt, concept } = fc.args as any;
                this.onVisualRequest(prompt as string, concept as string);
                result = 'Visual generation triggered';
            }

            // Send response back to model
            this.sessionPromise?.then(session => {
                session.sendToolResponse({
                    functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: result }
                    }
                });
            });
        }
    }
    
    // 4. Handle Interruption
    if (message.serverContent?.interrupted) {
        this.nextStartTime = this.outputAudioContext?.currentTime || 0;
    }
  }

  async disconnect() {
    if (this.cleanup) this.cleanup();
    
    // Check state before closing to prevent "Cannot close a closed AudioContext" error
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
        try {
            await this.inputAudioContext.close();
        } catch (e) {
            console.error("Error closing input context:", e);
        }
    }
    
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
        try {
            await this.outputAudioContext.close();
        } catch (e) {
             console.error("Error closing output context:", e);
        }
    }
  }
}
