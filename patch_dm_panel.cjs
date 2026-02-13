
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'client/src/components/dm-panel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetBlock = `                            return (
                                <div
                                    key={msg.id}
                                    className={\`flex gap-2 w-full \${isMe ? 'justify-end' : 'justify-start'} \${marginBottom} group/msg\`}
                                >
                                    {!isMe && (
                                        <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                                            {showAvatar ? (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden ring-1 ring-border shadow-sm">
                                                    {friend?.avatarUrl ? (
                                                        <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="w-full h-full flex items-center justify-center text-xs font-medium">
                                                            {friend?.username?.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <div className="w-8" />}
                                        </div>
                                    )}

                                    <div className={\`flex flex-col \${isMe ? 'items-end' : 'items-start'} max-w-[70%]\`}>
                                        <div
                                            className={\`px-4 py-2 shadow-sm relative group-hover/msg:shadow-md transition-shadow \${borderRadiusClass} \${isMe
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                                } \${msg.attachmentType ? 'p-2' : ''}\`}
                                        >
                                            {msg.message && (
                                                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                                            )}
                                            {renderAttachment(msg)}
                                        </div>

                                        {/* Timestamps & Status - Only show for last in group or if hovered */}
                                        {isLastInGroup && (
                                            <div className={\`flex items-center gap-1.5 mt-1 px-1 \${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300\`}>
                                                <span className="text-[10px] opacity-70">
                                                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                                </span>
                                                {isMe && msg.read && (
                                                    <span className="text-[10px] text-primary font-medium">• Seen</span>
                                                )}
                                                {isMe && !msg.read && (
                                                    <span className="text-[10px] opacity-50">• Sent</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );`;

const replacementBlock = `                            return (
                                <div
                                    key={msg.id}
                                    className={\`flex flex-col w-full \${isMe ? 'items-end' : 'items-start'} \${marginBottom} group/msg\`}
                                >
                                    <div className={\`flex gap-2 max-w-[70%] \${isMe ? 'justify-end' : 'justify-start'}\`}>
                                        {!isMe && (
                                            <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                                                {showAvatar ? (
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden ring-1 ring-border shadow-sm">
                                                        {friend?.avatarUrl ? (
                                                            <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="w-full h-full flex items-center justify-center text-xs font-medium">
                                                                {friend?.username?.slice(0, 2).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <div className="w-8" />}
                                            </div>
                                        )}

                                        <div
                                            className={\`px-4 py-2 shadow-sm relative group-hover/msg:shadow-md transition-shadow \${borderRadiusClass} \${isMe
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                                } \${msg.attachmentType ? 'p-2' : ''}\`}
                                        >
                                            {msg.message && (
                                                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                                            )}
                                            {renderAttachment(msg)}
                                        </div>
                                    </div>

                                    {/* Timestamps & Status - Outside the flex row to not affect avatar alignment */}
                                    {isLastInGroup && (
                                        <div className={\`flex items-center gap-1.5 mt-1 px-1 \${isMe ? 'mr-1 justify-end' : 'ml-10 justify-start'} animate-in fade-in duration-300\`}>
                                            <span className="text-[10px] opacity-70">
                                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                            </span>
                                            {isMe && msg.read && (
                                                <span className="text-[10px] text-primary font-medium">• Seen</span>
                                            )}
                                            {isMe && !msg.read && (
                                                <span className="text-[10px] opacity-50">• Sent</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );`;

// Normalize line endings and whitespace for matching
function normalize(str) {
    return str.replace(/\r\n/g, '\n').trim();
}

// Simple string replacement didn't work due to whitespace, trying flexible search
// We will replace the block starting from 'return (' to ');' inside the map
const startIndex = content.indexOf('messages.map((msg, index) => {');
if (startIndex === -1) {
    console.error('Could not find map start');
    process.exit(1);
}

const mapContent = content.substring(startIndex);
const returnStart = mapContent.indexOf('return (');
const relativeStart = startIndex + returnStart;

// Find the end of the return block (semicolon after closing paren)
// This is brittle, but better than strict string match.
// We know it ends with `                            );`
const endMarker = `                            );`;
const returnEnd = content.indexOf(endMarker, relativeStart);

if (returnStart !== -1 && returnEnd !== -1) {
    const fullEnd = returnEnd + endMarker.length;
    const before = content.substring(0, relativeStart);
    const after = content.substring(fullEnd);

    // Check if the content we are replacing looks roughly like what we expect
    const toReplace = content.substring(relativeStart, fullEnd);
    if (!toReplace.includes('<div') || !toReplace.includes('key={msg.id}')) {
        console.error('Target block verification failed');
        console.log('Found:', toReplace.substring(0, 100) + '...');
        process.exit(1);
    }

    const newContent = before + replacementBlock + after;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully patched dm-panel.tsx');
} else {
    console.error('Could not find return block boundaries');
    process.exit(1);
}
