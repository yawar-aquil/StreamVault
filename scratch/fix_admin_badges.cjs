const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('client/src', function(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // This regex looks for `<RoleBadge role={varName.username.toLowerCase() === 'admin' ? 'admin' : ...`
    // and changes it to `<RoleBadge role={(varName.username.toLowerCase() === 'admin' || (varName as any).isAdmin) ? 'admin' : ...`
    
    const regex1 = /<RoleBadge role=\{([a-zA-Z0-9_\.]+)\.username\.toLowerCase\(\)\s*===\s*["']admin["']\s*\?\s*["']admin["']\s*:\s*\(([a-zA-Z0-9_\.]+)\s*as\s*any\)\.isModerator/g;
    content = content.replace(regex1, (match, var1, var2) => {
        modified = true;
        return `<RoleBadge role={(${var1}.username.toLowerCase() === 'admin' || (${var1} as any).isAdmin) ? 'admin' : (${var2} as any).isModerator`;
    });

    const regex2 = /<RoleBadge role=\{([a-zA-Z0-9_\.]+)\.username\.toLowerCase\(\)\s*===\s*["']admin["']\s*\?\s*["']admin["']\s*:\s*([a-zA-Z0-9_\.]+)\.isModerator/g;
    content = content.replace(regex2, (match, var1, var2) => {
        modified = true;
        return `<RoleBadge role={(${var1}.username.toLowerCase() === 'admin' || (${var1} as any).isAdmin) ? 'admin' : ${var2}.isModerator`;
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
});
