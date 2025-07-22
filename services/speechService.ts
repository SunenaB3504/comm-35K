
import { Speaker } from '../types';

export class SpeechService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private neilVoice: SpeechSynthesisVoice | null = null;
  private kanishqVoice: SpeechSynthesisVoice | null = null;
  private narratorVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    // Clear any leftover speech from a previous page load
    this.synthesis.cancel();
    
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = this.loadVoices;
    }
    this.loadVoices();
  }

  private loadVoices = () => {
    const voices = this.synthesis.getVoices();
    if (voices.length === 0) {
      return;
    }
    this.voices = voices;

    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));

    // If there are no English voices, fall back to the first available voice for all roles.
    if (englishVoices.length === 0) {
      const defaultVoice = this.voices[0] || null;
      this.neilVoice = defaultVoice;
      this.kanishqVoice = defaultVoice;
      this.narratorVoice = defaultVoice;
      return;
    }

    const maleVoices = englishVoices.filter(v => v.name.toLowerCase().includes('male'));

    // Kanishq's voice is good, so let's keep that logic: prioritize a non-US male voice.
    this.kanishqVoice = maleVoices.find(v => v.lang === 'en-GB') // British is distinct
        || maleVoices.find(v => !v.lang.startsWith('en-US')) // Any non-US male
        || maleVoices[0] // First available male
        || englishVoices[0]; // Any english voice as last resort

    // Neil's voice needs to be good and different from Kanishq's.
    // Prioritize a US male voice that is not the same as Kanishq's.
    this.neilVoice = maleVoices.find(v => v.lang === 'en-US' && v !== this.kanishqVoice)
        // Then any male voice that is not Kanishq's
        || maleVoices.find(v => v !== this.kanishqVoice)
        // If all male voices are the same as Kanishq's (i.e., only one available), we must reuse it.
        || this.kanishqVoice;

    // Narrator: Try for a female voice for contrast.
    this.narratorVoice = englishVoices.find(v => v.name.toLowerCase().includes('female'))
        || englishVoices.find(v => v !== this.neilVoice && v !== this.kanishqVoice)
        || this.kanishqVoice;
  }

  public speak(text: string, speaker: Speaker, onEnd: () => void) {
    if (this.voices.length === 0) {
      this.loadVoices();
      setTimeout(() => this.speak(text, speaker, onEnd), 150);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      // The 'interrupted' error is expected when the user stops playback manually.
      // We don't need to log it as a console error.
      if (event.error !== 'interrupted') {
        console.error('SpeechSynthesis Error:', event.error, event);
      }
      // Even on error, call onEnd to ensure the playback sequence can be terminated gracefully.
      onEnd();
    };

    switch (speaker) {
      case Speaker.Neil:
        utterance.voice = this.neilVoice;
        utterance.pitch = 1.2; // Higher pitch to sound younger
        utterance.rate = 1;
        break;
      case Speaker.Kanishq:
        utterance.voice = this.kanishqVoice;
        utterance.pitch = 1.3; // Slightly different pitch for variety
        utterance.rate = 1.05;
        break;
      case Speaker.Narrator:
        utterance.voice = this.narratorVoice;
        utterance.pitch = 1;
        utterance.rate = 1;
        break;
      case Speaker.System:
        utterance.voice = this.neilVoice;
        utterance.pitch = 1.1;
        utterance.rate = 0.95; // Slower for system messages/rules
        break;
      default:
        utterance.voice = this.neilVoice;
    }
    
    this.synthesis.speak(utterance);
  }

  public cancel() {
    if (this.synthesis) {
        this.synthesis.cancel();
    }
  }

  public pause() {
    if (this.synthesis) {
        this.synthesis.pause();
    }
  }

  public resume() {
    if (this.synthesis) {
        this.synthesis.resume();
    }
  }

  public isPaused(): boolean {
      return this.synthesis ? this.synthesis.paused : false;
  }
}
