// Arranque.
Save.load();
try { Sound.muted = localStorage.getItem('rumorMute') === '1'; } catch (e) { }
const go = () => menu();
if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, sleep(800)]).then(go); else go();
