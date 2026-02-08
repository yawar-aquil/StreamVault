import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-lg">
        {/* Large 404 */}
        <h1 className="text-[150px] md:text-[200px] font-bold leading-none text-primary select-none drop-shadow-[0_0_25px_rgba(220,38,38,0.5)] animate-pulse">
          404
        </h1>
        
        {/* Message */}
        <div className="-mt-8 md:-mt-12 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2 w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Link href="/browse">
            <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
              <Search className="w-4 h-4" />
              Browse
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
