import { getSettings } from './settings';

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/maze_sounds1.mp3');
    audio.loop = true;
    audio.volume = 0.3;
  }
  return audio;
}

export function startBackgroundMusic(): void {
  if (!getSettings().soundEnabled) return;
  getAudio().play().catch(() => {});
}

export function resumeBackgroundMusic(): void {
  if (!getSettings().soundEnabled) return;
  getAudio().play().catch(() => {});
}

export function pauseBackgroundMusic(): void {
  if (audio) audio.pause();
}

export function syncBackgroundMusic(soundEnabled: boolean): void {
  if (soundEnabled) {
    getAudio().play().catch(() => {});
  } else {
    pauseBackgroundMusic();
  }
}
