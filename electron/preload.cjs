const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spotlocalDesktop', {
  isDesktop: true,
  getMusicDir: () => ipcRenderer.invoke('spotlocal:get-music-dir'),
  openMusicDir: () => ipcRenderer.invoke('spotlocal:open-music-dir'),
  pickAudioFiles: () => ipcRenderer.invoke('spotlocal:pick-audio-files'),
});
