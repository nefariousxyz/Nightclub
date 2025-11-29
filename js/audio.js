// Sound & Music System
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.musicEnabled = true;
        this.soundEnabled = true;
        this.musicVolume = 0.3;
        this.soundVolume = 0.5;
        this.audioContext = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generate sounds programmatically (no external files needed)
            this.sounds = {
                click: this.createClickSound(),
                cash: this.createCashSound(),
                purchase: this.createPurchaseSound(),
                achievement: this.createAchievementSound(),
                levelUp: this.createLevelUpSound(),
                error: this.createErrorSound(),
                notification: this.createNotificationSound()
            };

            // Create background music
            this.createBackgroundMusic();
            
            this.initialized = true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    createOscillator(freq, type = 'sine', duration = 0.1) {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = type;
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(this.soundVolume * 0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + duration);
        };
    }

    createClickSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.05);
            
            gain.gain.setValueAtTime(this.soundVolume * 0.2, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.05);
        };
    }

    createCashSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const now = this.audioContext.currentTime;
            
            // Coin sound - multiple quick tones
            [1200, 1400, 1600].forEach((freq, i) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, now + i * 0.05);
                gain.gain.linearRampToValueAtTime(this.soundVolume * 0.15, now + i * 0.05 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.1);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.1);
            });
        };
    }

    createPurchaseSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const now = this.audioContext.currentTime;
            
            // Satisfying purchase sound
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.value = 523.25; // C5
            osc2.frequency.value = 659.25; // E5
            
            gain.gain.setValueAtTime(this.soundVolume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc1.start();
            osc2.start();
            osc1.stop(now + 0.3);
            osc2.stop(now + 0.3);
        };
    }

    createAchievementSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const now = this.audioContext.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((freq, i) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(this.soundVolume * 0.25, now + i * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.4);
            });
        };
    }

    createLevelUpSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const now = this.audioContext.currentTime;
            
            // Ascending arpeggio
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
            
            notes.forEach((freq, i) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, now + i * 0.08);
                gain.gain.linearRampToValueAtTime(this.soundVolume * 0.2, now + i * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.3);
            });
        };
    }

    createErrorSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const now = this.audioContext.currentTime;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            
            gain.gain.setValueAtTime(this.soundVolume * 0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start();
            osc.stop(now + 0.2);
        };
    }

    createNotificationSound() {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;
            
            const now = this.audioContext.currentTime;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1100, now + 0.1);
            
            gain.gain.setValueAtTime(this.soundVolume * 0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start();
            osc.stop(now + 0.2);
        };
    }

    createBackgroundMusic() {
        // Create a simple looping beat
        this.musicLoop = null;
        this.isMusicPlaying = false;
    }

    startMusic() {
        if (!this.audioContext || !this.musicEnabled || this.isMusicPlaying) return;
        
        this.isMusicPlaying = true;
        this.playBeat();
    }

    playBeat() {
        if (!this.isMusicPlaying || !this.musicEnabled) return;
        
        const now = this.audioContext.currentTime;
        const bpm = 120;
        const beatDuration = 60 / bpm;
        
        // Kick drum
        this.playKick(now);
        this.playKick(now + beatDuration * 2);
        
        // Hi-hat
        for (let i = 0; i < 4; i++) {
            this.playHiHat(now + beatDuration * i);
            this.playHiHat(now + beatDuration * i + beatDuration * 0.5);
        }
        
        // Snare
        this.playSnare(now + beatDuration);
        this.playSnare(now + beatDuration * 3);
        
        // Bass line
        this.playBass(now, 110);
        this.playBass(now + beatDuration * 2, 130.81);
        
        // Loop
        this.musicLoop = setTimeout(() => this.playBeat(), beatDuration * 4 * 1000);
    }

    playKick(time) {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
        
        gain.gain.setValueAtTime(this.musicVolume * 0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(time);
        osc.stop(time + 0.15);
    }

    playHiHat(time) {
        if (!this.audioContext) return;
        
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
        }
        
        const source = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();
        
        source.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        
        gain.gain.setValueAtTime(this.musicVolume * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        source.start(time);
    }

    playSnare(time) {
        if (!this.audioContext) return;
        
        // Noise component
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseFilter = this.audioContext.createBiquadFilter();
        const noiseGain = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 3000;
        
        noiseGain.gain.setValueAtTime(this.musicVolume * 0.4, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noise.start(time);
        
        // Tone component
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
        
        oscGain.gain.setValueAtTime(this.musicVolume * 0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        
        osc.connect(oscGain);
        oscGain.connect(this.audioContext.destination);
        
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playBass(time, freq) {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(this.musicVolume * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(time);
        osc.stop(time + 0.4);
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicLoop) {
            clearTimeout(this.musicLoop);
            this.musicLoop = null;
        }
    }

    play(soundName) {
        if (!this.soundEnabled || !this.sounds[soundName]) return;
        
        try {
            // Resume audio context if suspended (browser autoplay policy)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.sounds[soundName]();
        } catch (e) {
            console.warn('Sound play failed:', e);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
        return this.musicEnabled;
    }

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
    }

    setSoundVolume(vol) {
        this.soundVolume = Math.max(0, Math.min(1, vol));
    }
}

export const audioManager = new AudioManager();
