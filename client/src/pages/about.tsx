import { Play, Users, Tv, Heart, Shield, Globe, Star, Zap, Gamepad2, MonitorPlay, MessageSquare, Download, Code } from "lucide-react";
import { SEO } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="About StreamVault"
        description="Learn about StreamVault - your premium destination for streaming movies and TV shows in HD quality. Free, fast, and user-friendly."
        canonical="https://streamvault.live/about"
      />
      <div className="container mx-auto px-4 py-12 space-y-16">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
            Our Story
          </Badge>
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              <rect width="100" height="100" rx="24" fill="#DC2626"/>
              <path d="M35 25 L35 75 L75 50 Z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            About StreamVault
          </h1>
          <p className="text-xl text-muted-foreground pt-2">
            Your premium destination for streaming the best web series, TV shows, and movies in HD quality.
          </p>
        </div>

        {/* Mission Section */}
        <Card className="max-w-4xl mx-auto border-border/50 bg-card/60 backdrop-blur-sm shadow-xl text-center overflow-hidden">
          <CardContent className="p-8 md:p-12 space-y-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
               <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              StreamVault was created with a simple mission: to provide entertainment lovers with easy access 
              to their favorite web series and shows. We believe that great content should be accessible to everyone, 
              which is why we've built a platform that's completely free, blazingly fast, and incredibly user-friendly.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Whether you're looking to binge-watch the latest season of Game of Thrones, discover new anime, 
              or explore trending theater movies, StreamVault has you covered.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Why StreamVault?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Tv className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>HD Quality</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <p className="text-muted-foreground text-sm">
                  Stream all content in high-definition quality with fast load times for the ultimate viewing experience.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-purple-500/30 transition-all duration-300 flex flex-col text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Play className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle>Unlimited Access</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <p className="text-muted-foreground text-sm">
                  Watch as much as you want, whenever you want. No strict limits, no hidden paywalls.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-pink-500/30 transition-all duration-300 flex flex-col text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-6 h-6 text-pink-500" />
                </div>
                <CardTitle>Community Driven</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <p className="text-muted-foreground text-sm">
                  Join watch parties, chat with friends, and leave comments as part of our massive community.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Heart className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle>Personalized</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <p className="text-muted-foreground text-sm">
                  Track your progress, build your watchlist, and level up your profile by exploring the site.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center">
          <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm shadow-lg overflow-hidden">
            <CardContent className="p-8">
              <div className="text-5xl font-bold bg-gradient-to-br from-primary to-purple-500 bg-clip-text text-transparent mb-2">1M+</div>
              <div className="text-muted-foreground font-medium uppercase tracking-wider text-sm">Movies & Episodes</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm shadow-lg overflow-hidden">
            <CardContent className="p-8">
              <div className="text-5xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">4K</div>
              <div className="text-muted-foreground font-medium uppercase tracking-wider text-sm">Quality Streaming</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm shadow-lg overflow-hidden">
            <CardContent className="p-8">
              <div className="text-5xl font-bold bg-gradient-to-br from-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">0$</div>
              <div className="text-muted-foreground font-medium uppercase tracking-wider text-sm">Subscription Fee</div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Ecosystem */}
        <div className="max-w-5xl mx-auto pt-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Platform Ecosystem</h2>
            <p className="text-muted-foreground mt-2 text-lg">Everything you need for the ultimate streaming and social experience.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Web Series & Shows</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  From ongoing epics to completed masterpieces, access the most popular and trending web series worldwide.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <Tv className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Movies</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                   Discover a massive library of movies across all genres, continuously updated with the latest releases.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <Gamepad2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Anime Dedicated Hub</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                   Track, watch, and discover anime with dedicated metadata, seasons, and dynamic episodes management.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <MonitorPlay className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Watch Together</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Create private rooms, invite your friends, and watch videos synced securely with live speaking indicators and text chat.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Gamification & Store</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Earn XP by watching content, unlock achievements, buy items from the store, and climb the leaderboard.
                </p>
              </div>
            </div>

             <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <MessageSquare className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Community & Friends</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Add friends, view their activities, leave comments on episodes, and explore the global community feed.
                </p>
              </div>
            </div>

             <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <Download className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Downloads & Subtitles</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Download items directly for offline viewing and rely on our centralized robust Subtitle Service for perfect captions.
                </p>
              </div>
            </div>

             <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-md flex gap-4 items-start hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                 <Code className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Developer API & Tools</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Access our powerful developer API to build your own streaming integrations and query StreamVault analytics.
                </p>
              </div>
            </div>
            
          </div>
        </div>


        {/* Contact CTA */}
        <div className="max-w-3xl mx-auto text-center bg-card/40 border border-border/50 rounded-3xl p-10 backdrop-blur-sm shadow-xl mt-12 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
            Have questions, suggestions, or want to report a bug? We're always listening to our community.
          </p>
          <a href="/contact">
            <Button size="lg" className="px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold">
              Contact Support
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
