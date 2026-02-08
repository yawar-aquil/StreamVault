# ⚡ StreamVault - Quick Setup Guide

## 🚀 Get Started in 5 Minutes!

### Step 1: Install Dependencies (2 minutes)
```bash
cd C:\Users\yawar\Downloads\StreamVault\StreamVault
npm install
```

### Step 2: Start Development Server (1 minute)
```bash
npm run dev
```

### Step 3: Open in Browser
```
http://localhost:5000
```

**That's it! Your StreamVault is running!** 🎉

---

## 🎬 What You Have

✅ **Professional streaming platform** (Netflix-inspired)  
✅ **React + TypeScript** (Modern tech stack)  
✅ **Beautiful UI** (shadcn/ui + TailwindCSS)  
✅ **Backend API** (Express.js)  
✅ **Database ready** (Drizzle ORM)  
✅ **Responsive design** (Mobile-first)  

---

## 📁 Project Structure

```
StreamVault/
├── client/               # Frontend React app
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── index.html
├── server/              # Backend Express API
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   └── storage.ts       # Data storage
├── shared/              # Shared types
│   └── schema.ts        # Database schema
└── package.json
```

---

## 🛠️ Available Commands

### Development
```bash
npm run dev          # Start dev server (http://localhost:5000)
npm run check        # Type check TypeScript
```

### Database
```bash
npm run db:push      # Push schema to database
```

### Production
```bash
npm run build        # Build for production
npm start            # Start production server
```

---

## 🎯 Quick Improvements (Do Now!)

### 1. Add Working Video (5 minutes)

Open `server/storage.ts` and update the sample data:

```typescript
// Find the shows array and update driveUrl:
driveUrl: "https://drive.google.com/file/d/1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd/preview"
```

### 2. Add More Sample Shows (10 minutes)

Add more shows to the `shows` array in `server/storage.ts`:

```typescript
{
  id: "new-show-id",
  title: "Your Show Name",
  slug: "your-show-name",
  description: "Description here",
  posterUrl: "https://images.unsplash.com/photo-...",
  backdropUrl: "https://images.unsplash.com/photo-...",
  year: 2024,
  rating: "TV-MA",
  imdbRating: 8.5,
  genres: ["Action", "Drama"],
  language: "English",
  totalSeasons: 1,
  cast: ["Actor 1", "Actor 2"],
  creators: ["Creator Name"],
  featured: true,
  trending: true,
  category: "action"
}
```

### 3. Customize Branding (5 minutes)

**Change Site Name:**
- Open `client/src/components/header.tsx`
- Find "StreamVault" and replace with your name

**Change Colors:**
- Open `client/src/index.css`
- Modify CSS variables under `:root`

---

## 🎨 Customization

### Colors (Netflix Theme)
```css
/* In client/src/index.css */
:root {
  --primary: 0 0% 8%;        /* Netflix Black */
  --accent: 0 91% 47%;       /* Netflix Red */
}
```

### Logo
Replace the logo in `client/src/components/header.tsx`

### Images
Use Unsplash for free high-quality images:
```
https://images.unsplash.com/photo-XXXXXX?w=1920&h=1080
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in vite.config.ts
server: { port: 3000 }
```

### Dependencies Not Installing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Run type check
npm run check
```

---

## 📚 Learn More

- **Full Architecture:** See `replit.md`
- **Design System:** See `design_guidelines.md`
- **Improvements:** See `IMPROVEMENTS_PLAN.md`

---

## 🎉 You're Ready!

Your StreamVault platform is now running locally!

**Next Steps:**
1. ✅ Explore the app at http://localhost:5000
2. ✅ Add sample content
3. ✅ Customize branding
4. ✅ Read `IMPROVEMENTS_PLAN.md` for next features

---

**Happy Streaming! 🍿**
