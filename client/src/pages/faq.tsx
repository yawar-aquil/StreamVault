import { ChevronDown, Mail, MessageCircleQuestion } from "lucide-react";
import { SEO } from "@/components/seo";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      category: "General",
      questions: [
        {
          q: "What is StreamVault?",
          a: "StreamVault is a free streaming platform that provides access to popular web series, TV shows, and movies in HD quality. We aggregate content from various sources to give you a seamless viewing experience.",
        },
        {
          q: "Is StreamVault really free?",
          a: "Yes! StreamVault is completely free to use. We're supported by advertisements, which allows us to keep the service free for all users.",
        },
        {
          q: "Do I need to create an account?",
          a: "No account is required to use StreamVault. Your watchlist and watch progress are automatically saved in your browser's local storage.",
        },
      ],
    },
    {
      category: "Watching Content",
      questions: [
        {
          q: "How do I watch a show or movie?",
          a: "Simply browse or search for the content you want to watch, click on it, and press the play button. The video will start streaming immediately.",
        },
        {
          q: "What video quality is available?",
          a: "Most content is available in HD quality (720p or 1080p). The video quality may vary depending on the source and your internet connection.",
        },
        {
          q: "Why isn't a video playing?",
          a: "If a video isn't playing, try refreshing the page, clearing your browser cache, or trying a different browser. If the issue persists, the video source may be temporarily unavailable.",
        },
        {
          q: "Can I download videos?",
          a: "No, StreamVault is a streaming-only platform. We don't offer download functionality to comply with content licensing and copyright regulations.",
        },
      ],
    },
    {
      category: "Features",
      questions: [
        {
          q: "How does the watchlist work?",
          a: "Click the '+' button on any show to add it to your watchlist. Your watchlist is saved locally in your browser and persists across sessions.",
        },
        {
          q: "Does StreamVault remember where I left off?",
          a: "Yes! Your watch progress is automatically saved. When you return to a show, you can continue from where you left off.",
        },
        {
          q: "How do I search for content?",
          a: "Use the search bar at the top of the page to find shows, movies, or specific episodes. You can also browse by category or genre.",
        },
        {
          q: "Can I request a show or movie?",
          a: "Yes! Visit our Contact page and send us your content request. We'll do our best to add it to our library.",
        },
      ],
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What browsers are supported?",
          a: "StreamVault works best on modern browsers like Chrome, Firefox, Safari, and Edge. Make sure your browser is updated to the latest version for the best experience.",
        },
        {
          q: "Does StreamVault work on mobile devices?",
          a: "Yes! StreamVault is fully responsive and works on smartphones and tablets. Simply visit our website from your mobile browser.",
        },
        {
          q: "Why is the video buffering?",
          a: "Buffering is usually caused by slow internet connection. Try lowering your video quality, pausing the video to let it buffer, or checking your internet speed.",
        },
        {
          q: "How do I clear my watch history?",
          a: "Your watch history is stored locally in your browser. To clear it, you can clear your browser's local storage or use your browser's privacy settings.",
        },
      ],
    },
    {
      category: "Content",
      questions: [
        {
          q: "How often is new content added?",
          a: "We regularly update our library with new episodes and shows. Popular series are updated as soon as new episodes are available.",
        },
        {
          q: "Where does the content come from?",
          a: "StreamVault aggregates content from various third-party sources and video hosting platforms. We don't host any content on our own servers.",
        },
        {
          q: "What if a show or episode is missing?",
          a: "If you notice missing content, please report it through our Contact page. We'll investigate and try to add it as soon as possible.",
        },
        {
          q: "Are subtitles available?",
          a: "Subtitle availability depends on the video source. Many videos come with embedded subtitles that you can enable in the video player.",
        },
      ],
    },
    {
      category: "Privacy & Safety",
      questions: [
        {
          q: "Is my data safe?",
          a: "Yes! We don't collect personal information. Your watchlist and preferences are stored locally in your browser and never transmitted to our servers.",
        },
        {
          q: "Do you use cookies?",
          a: "We use minimal cookies for essential functionality and analytics. See our Privacy Policy for more details.",
        },
        {
          q: "How do I report inappropriate content?",
          a: "If you encounter inappropriate content, please use the 'Report Issue' link in the footer to notify us immediately.",
        },
      ],
    },
  ];

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const index = categoryIndex * 100 + questionIndex;
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen">
      <SEO 
        title="FAQ - Frequently Asked Questions"
        description="Get answers to frequently asked questions about StreamVault. Learn about streaming, account features, content availability, and troubleshooting."
        canonical="https://streamvault.live/faq"
      />
      <div className="container mx-auto px-4 py-12 space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
            Questions?
          </Badge>
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
              <MessageCircleQuestion className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground pt-2">
            Find quick answers to common questions about StreamVault
          </p>
        </div>

        {/* Categories & Accordions */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-12">
            {faqs.map((category, categoryIndex) => (
              <div key={category.category} className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-primary to-purple-500 rounded-full"></div>
                  <h2 className="text-3xl font-bold">{category.category}</h2>
                </div>
                
                <div className="space-y-4 shadow-xl shadow-primary/5 rounded-2xl">
                  {category.questions.map((faq, questionIndex) => {
                    const index = categoryIndex * 100 + questionIndex;
                    const isOpen = openIndex === index;

                    return (
                      <Card
                        key={questionIndex}
                        className={`bg-card/60 border border-border/50 backdrop-blur-sm transition-all duration-300 overflow-hidden ${
                          isOpen ? 'border-primary/40 shadow-lg shadow-primary/10 bg-card/80' : 'hover:border-primary/30'
                        }`}
                      >
                        <button
                          onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                          className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <span className="font-semibold pr-4 text-lg">{faq.q}</span>
                          <div className={`p-2 rounded-full flex-shrink-0 transition-colors ${isOpen ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}>
                            <ChevronDown
                              className={`w-5 h-5 transition-transform duration-300 ${
                                isOpen ? "transform rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="px-6 pb-6 pt-0">
                              <p className="text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/30 ml-2">
                                {faq.a}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="max-w-3xl mx-auto text-center bg-card/40 border border-border/50 rounded-3xl p-10 backdrop-blur-sm shadow-xl mt-16 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
            Can't find the answer you're looking for? Reach out to our support team and we'll be happy to help.
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
