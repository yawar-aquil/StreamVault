const fs = require('fs');
let content = fs.readFileSync('server/storage.ts', 'utf8');

const regex = /private async enrichCommentsWithBadges[\s\S]*?return \{ \.\.\.comment, authorBadges \};\n    \}\)\);\n  \}/g;

const replacement = `private async enrichCommentsWithBadges(comments: Comment[]): Promise<CommentWithBadges[]> {
    return Promise.all(comments.map(async comment => {
      let authorBadges: Badge[] = [];
      let isModerator = false;
      let isAdmin = comment.userName && comment.userName.toLowerCase() === (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
      if (comment.userId) {
        const commentUser = await this.getUserById(comment.userId);
        if (commentUser) isModerator = commentUser.isModerator || false;

        // Find equipped user badges
        const userBadges = Array.from(this.userBadges.values())
          .filter(ub => ub.userId === comment.userId && ub.equipped);

        // Get badge details
        authorBadges = userBadges
          .map(ub => {
            const badge = this.badges.get(ub.badgeId);
            return badge ? { ...badge, equippedAt: ub.equippedAt } : null;
          })
          .filter((b): b is Badge & { equippedAt: any } => !!b)
          // Sort by display priority (descending)
          .sort((a, b) => (b.displayPriority || 0) - (a.displayPriority || 0));
      }
      return { ...comment, authorBadges, isAdmin, isModerator };
    }));
  }`;

content = content.replace(regex, replacement);

const regex2 = /private enrichCommentsWithBadges[\s\S]*?return \{ \.\.\.comment, authorBadges \};\n    \}\);\n  \}/g;

content = content.replace(regex2, replacement);

fs.writeFileSync('server/storage.ts', content);
