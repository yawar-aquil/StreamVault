const fs = require('fs');

const listenAndRemove = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Add the useEffect for toggleCinemaMode
  if (!content.includes("toggleCinemaMode")) {
    const hookInject = `    useEffect(() => {
        const handleCinemaToggle = () => setIsCinemaMode(prev => !prev);
        window.addEventListener('toggleCinemaMode', handleCinemaToggle);
        return () => window.removeEventListener('toggleCinemaMode', handleCinemaToggle);
    }, []);\n\n`;

    // Inject after the isCinemaMode hook
    content = content.replace(/(const \[isCinemaMode, setIsCinemaMode\] = useState\(false\);)/, '$1\n' + hookInject);
  }

  // Remove the external button
  content = content.replace(/<Button\s+variant="outline"\s+size="sm"\s+onClick=\{\(\) => setIsCinemaMode\(!isCinemaMode\)\}\s+className="hidden md:flex gap-2"\s*>[\s\S]*?<\/Button>/g, '');

  fs.writeFileSync(file, content);
};

['client/src/pages/watch.tsx', 'client/src/pages/watch-anime.tsx', 'client/src/pages/watch-movie.tsx'].forEach(listenAndRemove);

const patchPlayer = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix stretching issue that caused video clipping
  content = content.replace(/stretching: 'fill',/g, "stretching: 'uniform',");

  // Add JWPlayer button
  const jwBtnCode = `
        player.on('ready', () => {
            const cinemaIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M22,6H2C0.9,6,0,6.9,0,8v8c0,1.1,0.9,2,2,2h20c1.1,0,2-0.9,2-2V8C24,6.9,23.1,6,22,6z M22,16H2V8h20V16z"/></svg>';
            try {
                player.addButton(
                  cinemaIcon,
                  "Wide View Mode",
                  () => { window.dispatchEvent(new CustomEvent("toggleCinemaMode")); },
                  "cinema-mode-button",
                  "jw-btn jw-icon"
                );
            } catch(e) { console.error("Error adding cinema button", e); }
`;
  if (!content.includes("toggleCinemaMode")) {
      content = content.replace(/player\.on\('ready', \(\) => {/, jwBtnCode);
  }

  // Add overlay for non-jwplayer fallback, if it's not already added
  if (!content.includes("playerType !== 'direct'")) {
      const overlayBtn = `
                {playerType !== 'direct' && (
                    <div className="absolute bottom-20 right-4 z-40 bg-black/60 rounded backdrop-blur-sm">
                        <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("toggleCinemaMode"))} className="text-white hover:bg-white/20">
                            Wide View
                        </Button>
                    </div>
                )}
                {renderAudioMenu()}`;
      content = content.replace(/\{renderAudioMenu\(\)\}/g, overlayBtn);
  }

  fs.writeFileSync(file, content);
};
patchPlayer('client/src/components/video-player.tsx');
console.log('Patch complete.');
