import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Calendar, Clock, User, ChevronLeft, Share2, Film, Tv, Award, DollarSign, Lightbulb, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { useToast } from "@/hooks/use-toast";
import type { BlogPost } from "@shared/schema";

export default function BlogPostDetail() {
  const [, params] = useRoute("/blog/post/:slug");
  const slug = params?.slug;
  const { toast } = useToast();

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/blog/${slug}`],
    enabled: !!slug,
  });

  const handleShare = async () => {
    if (!post) return;

    const shareData = {
      title: `${post.title} - StreamVault Blog`,
      text: `Read about ${post.title} on StreamVault`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied!",
        description: "Article link copied to clipboard.",
      });
    }
  };

  // Parse JSON fields
  let boxOfficeData: Record<string, string> = {};
  let triviaData: string[] = [];
  
  if (post?.boxOffice) {
    try {
      boxOfficeData = JSON.parse(post.boxOffice);
    } catch {}
  }
  
  if (post?.trivia) {
    try {
      triviaData = JSON.parse(post.trivia);
    } catch {}
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[50vh]" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={`${post.title} - StreamVault Blog`}
        description={post.excerpt}
        canonical={`https://streamvault.live/blog/post/${slug}`}
        image={post.featuredImage}
      />

      {/* Hero Section */}
      <div className="relative">
        <div className="aspect-[21/9] md:aspect-[3/1] relative">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link href="/blog">
            <Button variant="secondary" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <Badge className="mb-3" variant="default">
              {post.contentType === "movie" ? <Film className="w-3 h-3 mr-1" /> : <Tv className="w-3 h-3 mr-1" />}
              {post.contentType === "movie" ? "Movie" : "TV Show"} Review
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-2">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.ceil(post.content.length / 1000)} min read
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Share Button */}
          <div className="flex justify-end mb-6">
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share Article
            </Button>
          </div>

          {/* Excerpt */}
          <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg mb-8">
            <p className="text-lg text-foreground italic">{post.excerpt}</p>
          </div>

          {/* Main Content */}
          <article className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {post.content}
            </div>
          </article>

          {/* Plot Summary Section */}
          {post.plotSummary && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Film className="w-6 h-6 text-primary" />
                Plot Summary
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.plotSummary}
                </p>
              </div>
            </section>
          )}

          {/* Review Section */}
          {post.review && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                Our Review
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.review}
                </p>
              </div>
            </section>
          )}

          {/* Box Office Section */}
          {Object.keys(boxOfficeData).length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-primary" />
                Box Office
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(boxOfficeData).map(([key, value]) => (
                    <div key={key} className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-xl font-bold text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Awards Section */}
          {post.awards && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                Awards & Recognition
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.awards}
                </p>
              </div>
            </section>
          )}

          {/* Trivia Section */}
          {triviaData.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-primary" />
                Fun Facts & Trivia
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <ul className="space-y-3">
                  {triviaData.map((fact, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Behind The Scenes Section */}
          {post.behindTheScenes && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clapperboard className="w-6 h-6 text-primary" />
                Behind The Scenes
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.behindTheScenes}
                </p>
              </div>
            </section>
          )}

          {/* Back to Blog CTA */}
          <div className="text-center py-8 border-t border-border">
            <p className="text-muted-foreground mb-4">Enjoyed this article?</p>
            <Link href="/blog">
              <Button size="lg">
                Explore More Articles
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
