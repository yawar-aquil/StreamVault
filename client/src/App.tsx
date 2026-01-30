import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Chatbot } from "@/components/chatbot";
import { AdBanner } from "@/components/ad-banner";
import { AdBlockDetector } from "@/components/adblock-detector";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationPrompt } from "@/components/notification-prompt";
import Home from "@/pages/home";
import ShowDetail from "@/pages/show-detail";
import Watch from "@/pages/watch";
import MovieDetail from "@/pages/movie-detail";
import WatchMovie from "@/pages/watch-movie";
import Search from "@/pages/search";
import Category from "@/pages/category";
import Watchlist from "@/pages/watchlist";
import Admin from "@/pages/admin";
import DownloadsPage from "@/pages/downloads";
import AdminLogin from "@/pages/admin-login";
import Privacy from "@/pages/privacy";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import DMCA from "@/pages/dmca";
import Help from "@/pages/help";
import FAQ from "@/pages/faq";
import Report from "@/pages/report";
import Request from "@/pages/request";
import SeriesPage from "@/pages/series";
import Movies from "@/pages/movies";
import Anime from "@/pages/anime";
import AnimeDetail from "@/pages/anime-detail";
import WatchAnime from "@/pages/watch-anime";
import BrowseShows from "@/pages/browse-shows";
import BrowseMovies from "@/pages/browse-movies";
import BrowseAnime from "@/pages/browse-anime";
import Trending from "@/pages/trending";
import Sitemap from "@/pages/sitemap";
import Browse from "@/pages/browse";
import ContinueWatching from "@/pages/continue-watching";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import WatchTogether from "@/pages/watch-together";
import WatchRooms from "@/pages/watch-rooms";
import CreateRoom from "@/pages/create-room";
import WidgetDashboard from "@/pages/widget-dashboard";
import SiteAnalytics from "@/pages/site-analytics";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import NotFound from "@/pages/not-found";
import PersonDetail from "@/pages/person-detail";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Friends from "@/pages/friends";
import NotificationsPage from "@/pages/notifications";
import Leaderboard from "@/pages/leaderboard";
import Calendar from "@/pages/calendar";
import AchievementsPage from "@/pages/achievements";
import ChallengesPage from "@/pages/challenges";
import PollsPage from "@/pages/polls";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { FriendsProvider } from "@/contexts/friends-context";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

function Router() {
  // Hide header/footer on watch-together routes
  const [location] = useLocation();
  const isWatchTogether = location.startsWith('/watch-together');

  useKeyboardShortcuts();

  return (
    <>
      {!isWatchTogether && <Header />}
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/show/:slug" component={ShowDetail} />
          <Route path="/watch/:slug" component={Watch} />
          <Route path="/movie/:slug" component={MovieDetail} />
          <Route path="/watch-movie/:slug" component={WatchMovie} />
          <Route path="/person/:name" component={PersonDetail} />
          <Route path="/anime" component={Anime} />
          <Route path="/anime/:slug" component={AnimeDetail} />
          <Route path="/watch-anime/:slug" component={WatchAnime} />
          <Route path="/search" component={Search} />
          <Route path="/category/:slug" component={Category} />
          <Route path="/watchlist" component={Watchlist} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/widget" component={WidgetDashboard} />
          <Route path="/admin/analytics" component={SiteAnalytics} />
          <Route path="/admin" component={Admin} />
          <Route path="/downloads" component={DownloadsPage} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/terms" component={Terms} />
          <Route path="/dmca" component={DMCA} />
          <Route path="/help" component={Help} />
          <Route path="/faq" component={FAQ} />
          <Route path="/report" component={Report} />
          <Route path="/request" component={Request} />
          <Route path="/series" component={SeriesPage} />
          <Route path="/movies" component={Movies} />
          <Route path="/browse/shows" component={BrowseShows} />
          <Route path="/browse/movies" component={BrowseMovies} />
          <Route path="/browse/anime" component={BrowseAnime} />
          <Route path="/trending" component={Trending} />
          <Route path="/sitemap" component={Sitemap} />
          <Route path="/browse" component={Browse} />
          <Route path="/continue-watching" component={ContinueWatching} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:type/:slug" component={BlogPost} />
          <Route path="/watch-rooms" component={WatchRooms} />
          <Route path="/watch-together/:roomCode" component={WatchTogether} />
          <Route path="/create-room" component={CreateRoom} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/friends" component={Friends} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/achievements" component={AchievementsPage} />
          <Route path="/challenges" component={ChallengesPage} />
          <Route path="/polls" component={PollsPage} />
          <Route path="/calendar" component={Calendar} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isWatchTogether && (
        <div className="container mx-auto px-4">
          <AdBanner />
        </div>
      )}
      {!isWatchTogether && <Footer />}
      {!isWatchTogether && <Chatbot />}
      <InstallPrompt />
      <NotificationPrompt />
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationsProvider>
            <FriendsProvider>
              <ThemeProvider defaultTheme="dark">
                <TooltipProvider>
                  <Toaster />
                  <AdBlockDetector />
                  <AnalyticsTracker />
                  <Router />
                </TooltipProvider>
              </ThemeProvider>
            </FriendsProvider>
          </NotificationsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
