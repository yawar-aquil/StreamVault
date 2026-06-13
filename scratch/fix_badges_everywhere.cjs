const fs = require('fs');
const path = require('path');

// 1. Fix server/routes.ts mapping
let routesPath = 'server/routes.ts';
let routesContent = fs.readFileSync(routesPath, 'utf8');

// Fix /api/leaderboard (main) mapping
routesContent = routesContent.replace(/currentStreak: u\.currentStreak \|\| 0\n        \}\)\);/g, "currentStreak: u.currentStreak || 0,\n          isModerator: u.isModerator || false\n        }));");

// Fix /api/leaderboard (period) mapping
routesContent = routesContent.replace(/currentStreak: 0\n        \}\)\);/g, "currentStreak: 0,\n          isModerator: u.isModerator || false\n        }));");

// Fix /api/users/:userId/profile (two occurrences)
routesContent = routesContent.replace(/level: user\.level,\n        badges: freshBadges,\n        socialLinks,/g, "level: user.level,\n        isModerator: user.isModerator || false,\n        badges: freshBadges,\n        socialLinks,");
routesContent = routesContent.replace(/level: user\.level,\n        badges: user\.badges/g, "level: user.level,\n        isModerator: user.isModerator || false,\n        badges: user.badges");

// Fix user search payload
routesContent = routesContent.replace(/badges: equipped,\n        \};\n      \}\)\);/g, "badges: equipped,\n          isModerator: u.isModerator || false,\n        };\n      }));");

fs.writeFileSync(routesPath, routesContent);

// 2. Fix server/storage.ts getLeaderboardByPeriod
let storagePath = 'server/storage.ts';
let storageContent = fs.readFileSync(storagePath, 'utf8');

storageContent = storageContent.replace(/Promise<\{ userId: string; username: string; avatarUrl: string \| null; xpGained: number; level: number \}\[\]>/g, "Promise<{ userId: string; username: string; avatarUrl: string | null; xpGained: number; level: number; isModerator?: boolean }[]>");

storageContent = storageContent.replace(/userId: user\.id,\n        username: user\.username,\n        avatarUrl: user\.avatarUrl,\n        xpGained: totalXp,\n        level: user\.level/g, "userId: user.id,\n        username: user.username,\n        avatarUrl: user.avatarUrl,\n        xpGained: totalXp,\n        level: user.level,\n        isModerator: user.isModerator || false");

fs.writeFileSync(storagePath, storageContent);

// 3. Inject RoleBadge into TSX files
function injectRoleBadge(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    let modified = false;

    // Check if we need to add the import
    if (!content.includes('import { RoleBadge }') && !content.includes('import {RoleBadge}')) {
        // Add import after the last import statement or at the top
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const nextNewLine = content.indexOf('\n', lastImportIndex);
            content = content.slice(0, nextNewLine) + "\nimport { RoleBadge } from '@/components/role-badge';" + content.slice(nextNewLine);
        } else {
            content = "import { RoleBadge } from '@/components/role-badge';\n" + content;
        }
        modified = true;
    }

    // Now let's try to find common patterns to inject RoleBadge
    // Leaderboard
    if (filePath.includes('leaderboard.tsx')) {
        content = content.replace(/\{user\.username\}\n\s*<\/h3>/g, "{user.username}\n                                </h3>\n                                <RoleBadge role={user.username.toLowerCase() === 'admin' ? 'admin' : (user as any).isModerator ? 'moderator' : null} />");
        content = content.replace(/\{user\.username\}\n\s*<\/span>\n\s*\{user\.badges/g, "{user.username}\n                                    </span>\n                                    <RoleBadge role={user.username.toLowerCase() === 'admin' ? 'admin' : (user as any).isModerator ? 'moderator' : null} />\n                                    {user.badges");
        modified = true;
    }

    // User Profile Modal
    if (filePath.includes('user-profile-modal.tsx')) {
        content = content.replace(/\{user\.username\}\n\s*<\/DialogTitle>/g, "{user.username}\n                            </DialogTitle>\n                            <RoleBadge role={user.username.toLowerCase() === 'admin' ? 'admin' : (user as any).isModerator ? 'moderator' : null} />");
        modified = true;
    }
    
    // Community Feed Item
    if (filePath.includes('feed-item.tsx')) {
        content = content.replace(/\{post\.user\.username\}\n\s*<\/span>\n\s*\{post\.user\.badges/g, "{post.user.username}\n                                </span>\n                                <RoleBadge role={post.user.username.toLowerCase() === 'admin' ? 'admin' : (post.user as any).isModerator ? 'moderator' : null} />\n                                {post.user.badges");
        content = content.replace(/\{activity\.user\.username\}\n\s*<\/span>\n\s*\{activity\.user\.badges/g, "{activity.user.username}\n                                </span>\n                                <RoleBadge role={activity.user.username.toLowerCase() === 'admin' ? 'admin' : (activity.user as any).isModerator ? 'moderator' : null} />\n                                {activity.user.badges");
        modified = true;
    }

    // Suggested Friends
    if (filePath.includes('suggested-friends.tsx')) {
        content = content.replace(/\{user\.username\}\n\s*<\/span>\n\s*\{user\.badges/g, "{user.username}\n                                    </span>\n                                    <RoleBadge role={user.username.toLowerCase() === 'admin' ? 'admin' : (user as any).isModerator ? 'moderator' : null} />\n                                    {user.badges");
        modified = true;
    }

    // Watch Together
    if (filePath.includes('watch-together.tsx')) {
        content = content.replace(/\{member\.username\}\n\s*<\/span>\n\s*\{member\.badges/g, "{member.username}\n                                                </span>\n                                                <RoleBadge role={member.username.toLowerCase() === 'admin' ? 'admin' : (member as any).isModerator ? 'moderator' : null} />\n                                                {member.badges");
        modified = true;
    }
    
    // Header
    if (filePath.includes('header.tsx')) {
         content = content.replace(/<span className="font-semibold">\{user\.username\}<\/span>\n\s*\{user\.badges/g, "<span className=\"font-semibold\">{user.username}</span>\n                                <RoleBadge role={user.username.toLowerCase() === 'admin' ? 'admin' : user.isModerator ? 'moderator' : null} />\n                                {user.badges");
         modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

const filesToUpdate = [
    'client/src/pages/leaderboard.tsx',
    'client/src/components/user-profile-modal.tsx',
    'client/src/components/community-feed/feed-item.tsx',
    'client/src/components/community-feed/suggested-friends.tsx',
    'client/src/pages/watch-together.tsx',
    'client/src/components/header.tsx'
];

filesToUpdate.forEach(injectRoleBadge);

console.log('Script completed.');
