import { Search, Play, Bookmark, Settings, HelpCircle, Mail, LifeBuoy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/seo";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const helpTopics = [
    {
      icon: Play,
      title: "Getting Started",
      description: "Learn how to use StreamVault",
      articles: [
        "How to watch shows and movies",
        "Creating and managing your watchlist",
        "Understanding video quality options",
        "Keyboard shortcuts and controls",
      ],
    },
    {
      icon: Search,
      title: "Finding Content",
      description: "Discover shows and movies",
      articles: [
        "How to search for content",
        "Browse by category and genre",
        "Using filters and sorting",
        "Trending and popular content",
      ],
    },
    {
      icon: Bookmark,
      title: "Watchlist & Progress",
      description: "Manage your viewing",
      articles: [
        "Adding shows to your watchlist",
        "Tracking watch progress",
        "Removing items from watchlist",
        "Continue watching feature",
      ],
    },
    {
      icon: Settings,
      title: "Account & Settings",
      description: "Customize your experience",
      articles: [
        "Browser compatibility",
        "Clearing cache and cookies",
        "Video playback issues",
        "Mobile device support",
      ],
    },
  ];

  const faqs = [
    // Getting Started
    {
      question: "How to watch shows and movies",
      answer: "Browse or search for content, click on a show or movie, then click the Play button. The video will start streaming immediately. You can pause, rewind, or fast-forward using the video controls.",
    },
    {
      question: "Creating and managing your watchlist",
      answer: "Click the '+' button on any show card to add it to your watchlist. Access your watchlist from the navigation menu. To remove items, click the checkmark button on the show card or use the remove button in your watchlist.",
    },
    {
      question: "Understanding video quality options",
      answer: "Most content is available in HD quality (720p or 1080p). Video quality automatically adjusts based on your internet speed. For best quality, ensure you have a stable internet connection of at least 5 Mbps.",
    },
    {
      question: "Keyboard shortcuts and controls",
      answer: "Use Space to play/pause, Arrow keys to skip forward/backward, F for fullscreen, M to mute/unmute, and +/- to adjust volume. These shortcuts work when the video player is focused.",
    },
    // Finding Content
    {
      question: "How to search for content",
      answer: "Use the search bar at the top of the page. Type the show name, actor, or genre. Results appear as you type. Click on any result to view details or start watching.",
    },
    {
      question: "Browse by category and genre",
      answer: "Click on 'Categories' in the navigation menu to see all available genres (Action, Drama, Comedy, etc.). Each category page shows all shows in that genre, sorted by popularity.",
    },
    {
      question: "Using filters and sorting",
      answer: "On category pages, you can sort by popularity, newest, or rating. Use the filter options to narrow down results by year, rating, or content type.",
    },
    {
      question: "Trending and popular content",
      answer: "Visit the 'Trending' page to see what's popular right now. The homepage also features trending shows and new releases. Popular content is updated daily based on viewing activity.",
    },
    // Watchlist & Progress
    {
      question: "Adding shows to your watchlist",
      answer: "Click the '+' icon on any show card. The icon will change to a checkmark to confirm it's added. Your watchlist is saved locally in your browser and persists across sessions.",
    },
    {
      question: "Tracking watch progress",
      answer: "Your watch progress is automatically saved as you watch. When you return to a show, you'll see a progress bar and can continue from where you left off. Progress is saved every 10 seconds.",
    },
    {
      question: "Removing items from watchlist",
      answer: "Click the checkmark icon on a show card to remove it from your watchlist. You can also manage your watchlist from the Watchlist page, where you can remove multiple items at once.",
    },
    {
      question: "Continue watching feature",
      answer: "Shows you've started watching appear in the 'Continue Watching' section on the homepage. Click any show to resume from where you left off. Progress is shown as a percentage bar.",
    },
    // Account & Settings
    {
      question: "Browser compatibility",
      answer: "StreamVault works on Chrome, Firefox, Safari, Edge, and other modern browsers. For best experience, use the latest browser version. Mobile browsers are also fully supported.",
    },
    {
      question: "Clearing cache and cookies",
      answer: "To clear cache: Chrome (Ctrl+Shift+Delete), Firefox (Ctrl+Shift+Delete), Safari (Cmd+Option+E). Note: Clearing cache will remove your watchlist and watch progress.",
    },
    {
      question: "Video playback issues",
      answer: "If videos won't play: 1) Refresh the page, 2) Clear browser cache, 3) Try a different browser, 4) Check your internet connection, 5) Disable browser extensions. If issues persist, report it to us.",
    },
    {
      question: "Mobile device support",
      answer: "StreamVault is fully responsive and works on all mobile devices. Simply visit the website from your mobile browser. For best experience on mobile, use landscape mode for watching videos.",
    },
    // General
    {
      question: "Is StreamVault free to use?",
      answer: "Yes! StreamVault is completely free. We're supported by advertisements to keep the service free for everyone.",
    },
    {
      question: "Do I need to create an account?",
      answer: "No account is required! Your watch progress and watchlist are saved locally in your browser.",
    },
    {
      question: "Why isn't a video playing?",
      answer: "Try refreshing the page or clearing your browser cache. If the issue persists, the video source may be temporarily unavailable.",
    },
    {
      question: "Can I download content?",
      answer: "StreamVault is a streaming-only platform. We don't offer download functionality at this time.",
    },
    {
      question: "How often is new content added?",
      answer: "We regularly update our library with new episodes and shows. Check back often for the latest content!",
    },
    {
      question: "What browsers are supported?",
      answer: "StreamVault works best on modern browsers like Chrome, Firefox, Safari, and Edge. Make sure your browser is up to date.",
    },
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <SEO 
        title="Help Center"
        description="Get help with StreamVault. Find answers to common questions about streaming, playback issues, watchlist management, and more."
        canonical="https://streamvault.live/help"
      />
      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
            Support
          </Badge>
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
              <LifeBuoy className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Help Center
          </h1>
          <p className="text-xl text-muted-foreground pt-2">
            Find answers to common questions and learn how to use StreamVault
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative mt-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors z-10" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-full bg-card/60 border-border/50 backdrop-blur-sm text-lg shadow-lg focus-visible:ring-primary/50"
            />
          </div>
        </div>

        {/* Help Topics */}
        {searchQuery === "" && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Browse Topics</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {helpTopics.map((topic) => (
                <Card 
                  key={topic.title}
                  className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-primary/30 transition-all duration-300 hover:shadow-primary/5 flex flex-col"
                >
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/10">
                      <topic.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      {topic.description}
                    </p>
                    <ul className="space-y-3">
                      {topic.articles.map((article) => (
                        <li key={article}>
                          <button
                            onClick={() => setSearchQuery(article)}
                            className="text-sm text-muted-foreground hover:text-primary hover:underline text-left flex items-start gap-2 transition-colors"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 flex-shrink-0" />
                            {article}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">
              {searchQuery ? "Search Results" : "Frequently Asked Questions"}
            </h2>
          </div>
          <div className="space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq, index) => (
                <Card 
                  key={index}
                  className="bg-card/40 border-border/50 backdrop-blur-sm hover:border-primary/20 transition-colors shadow-md"
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-3 flex items-start gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-md mt-0.5 border border-primary/20 flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-primary" />
                      </div>
                      <span className="mt-1">{faq.question}</span>
                    </h3>
                    <p className="text-muted-foreground pl-11 leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-card/40 border border-border/50 rounded-2xl backdrop-blur-sm shadow-md">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-xl text-muted-foreground">
                  No results found for "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="max-w-3xl mx-auto text-center bg-card/40 border border-border/50 rounded-3xl p-10 backdrop-blur-sm shadow-xl mt-16 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
            Can't find what you're looking for? Our support team is here to assist you with any questions.
          </p>
          <a href="/contact">
            <Button size="lg" className="px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold">
              Get in Touch
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
