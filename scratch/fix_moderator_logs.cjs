const fs = require('fs');
const path = require('path');
const routesPath = path.join(process.cwd(), 'server', 'routes.ts');
let c = fs.readFileSync(routesPath, 'utf8');

c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Created show: \$\{show\.title\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Create Show\', `Created show: ${show.title}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Updated show: \$\{show\.title\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Update Show\', `Updated show: ${show.title}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Created movie: \$\{movie\.title\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Create Movie\', `Created movie: ${movie.title}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Updated movie: \$\{movie\.title\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Update Movie\', `Updated movie: ${movie.title}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Created anime: \$\{anime\.title\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Create Anime\', `Created anime: ${anime.title}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Updated anime: \$\{anime\.title\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Update Anime\', `Updated anime: ${anime.title}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Updated anime episode: \$\{episode\.title \|\| "Episode " \+ episode\.episodeNumber\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Update Anime Episode\', `Updated anime episode: ${episode.title || "Episode " + episode.episodeNumber}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Created episode: \$\{episode\.title \|\| "Episode " \+ episode\.episodeNumber\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Create Episode\', `Created episode: ${episode.title || "Episode " + episode.episodeNumber}`);');
c = c.replace(/await storage\.logModeratorAction\(\(req as any\)\.user\.id, `Updated episode: \$\{episode\.title \|\| "Episode " \+ episode\.episodeNumber\}`\);/g, 'await storage.logModeratorAction((req as any).user.id, \'Update Episode\', `Updated episode: ${episode.title || "Episode " + episode.episodeNumber}`);');

fs.writeFileSync(routesPath, c);
console.log('Fixed logModeratorAction calls');
