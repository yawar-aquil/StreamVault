import { Mail, MessageSquare, HelpCircle, Twitter, Instagram, Send, Facebook, Users } from "lucide-react";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact Us"
        description="Get in touch with StreamVault. Have questions, feedback, or need support? We're here to help you 24/7."
        canonical="https://streamvault.live/contact"
      />
      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
                24/7 Support
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Contact Us
            </h1>
            <p className="text-xl text-muted-foreground pt-2">
                Have questions, feedback, or need support? We're here to help you. Choose how you want to reach us.
            </p>
        </div>

        {/* Contact Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-8">
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col">
                <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-center">Email Us</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex flex-col justify-between flex-1">
                    <p className="text-muted-foreground text-sm mb-6">
                        Send us an email and we'll respond within 24-48 hours. General questions or business inquiries.
                    </p>
                    <a href="mailto:contact@streamvault.live" className="mt-auto">
                        <Button className="w-full gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                            <Mail className="w-4 h-4" />
                            Email Support
                        </Button>
                    </a>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-purple-500/30 transition-all duration-300 flex flex-col">
                <CardHeader>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <MessageSquare className="w-6 h-6 text-purple-500" />
                    </div>
                    <CardTitle className="text-center">Feedback</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex flex-col justify-between flex-1">
                    <p className="text-muted-foreground text-sm mb-6">
                        Share your thoughts, report issues, and help us improve the StreamVault experience.
                    </p>
                    <a href="mailto:contact@streamvault.live?subject=StreamVault%20Feedback" className="mt-auto">
                        <Button variant="outline" className="w-full gap-2 rounded-full border-purple-500/20 hover:bg-purple-500/10 hover:text-purple-500 transition-colors">
                            <MessageSquare className="w-4 h-4" />
                            Share Feedback
                        </Button>
                    </a>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-pink-500/30 transition-all duration-300 flex flex-col">
                <CardHeader>
                    <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <HelpCircle className="w-6 h-6 text-pink-500" />
                    </div>
                    <CardTitle className="text-center">Help Center</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex flex-col justify-between flex-1">
                    <p className="text-muted-foreground text-sm mb-6">
                        Need immediate assistance? Check out our knowledge base or reach out directly to our team.
                    </p>
                    <a href="mailto:contact@streamvault.live?subject=Support%20Request" className="mt-auto">
                        <Button variant="outline" className="w-full gap-2 rounded-full border-pink-500/20 hover:bg-pink-500/10 hover:text-pink-500 transition-colors">
                            <HelpCircle className="w-4 h-4" />
                            Get Support
                        </Button>
                    </a>
                </CardContent>
            </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto pt-10 space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
                <p className="text-muted-foreground text-lg">Quick answers to our most common questions</p>
            </div>
            
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl">
                <CardContent className="pt-6">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors text-left">Is StreamVault really free?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                                Yes! StreamVault is completely free to use. We're supported by advertisements to keep the service free for everyone. There are no hidden fees.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors text-left">Do I need to create an account?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                                No account is required! You can watch seamlessly without logging in. Your watch progress and watchlist are saved locally in your browser. However, creating an account unlocks cross-device syncing, the referral program, and more features.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors text-left">Can I request a show or movie?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                                Absolutely! Send us an email with your request and we'll do our best to source it and add it to our library as quickly as possible.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors text-left">Why isn't a video playing?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                                Usually, trying a different server from the player dropdown fixes the issue. Try refreshing the page, clearing your browser cache, or checking your internet connection. If the problem persists, please contact our support team.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors text-left">How often is new content added?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                                We regularly update our library with new episodes, movies, and shows multiple times a day. Check the home page often for the latest trending and recently added content!
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>

        {/* Social Links Community CTA */}
        <div className="max-w-4xl mx-auto text-center bg-card/40 border border-border/50 rounded-2xl p-10 backdrop-blur-sm shadow-xl mt-12 mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Join Our Community
            </h2>
            <p className="text-muted-foreground mb-10 max-w-2xl mx-auto text-lg">
                Stay connected with us on social media for the latest updates, platform maintenance announcements, exclusive giveaways, and more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <a href="https://x.streamvault.in" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all font-semibold">
                        <Twitter className="w-5 h-5" /> 
                        X (Twitter)
                    </Button>
                </a>
                <a href="https://instagram.streamvault.in" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2 rounded-full hover:bg-pink-500/10 hover:text-pink-500 hover:border-pink-500/50 transition-all font-semibold">
                        <Instagram className="w-5 h-5" /> 
                        Instagram
                    </Button>
                </a>
                <a href="https://telegram.streamvault.in" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50 transition-all font-semibold">
                        <Send className="w-5 h-5" /> 
                        Telegram
                    </Button>
                </a>
                <a href="https://facebook.streamvault.in" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2 rounded-full hover:bg-blue-600/10 hover:text-blue-600 hover:border-blue-600/50 transition-all font-semibold">
                        <Facebook className="w-5 h-5" /> 
                        Facebook
                    </Button>
                </a>
                <a href="https://whatsapp.streamvault.in/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2 rounded-full hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50 transition-all font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                            <path fill="currentColor" d="M20.52 3.48A11.77 11.77 0 0 0 12 0 11.94 11.94 0 0 0 .24 11.76 11.74 11.74 0 0 0 2.4 18.6L0 24l5.64-2.4A12.06 12.06 0 0 0 12 24h.01A11.93 11.93 0 0 0 24 12a11.8 11.8 0 0 0-3.48-8.52ZM12 21.8h-.01a9.76 9.76 0 0 1-4.98-1.37l-.36-.21-3.35 1.43L4 18.5l-.24-.38A9.77 9.77 0 0 1 2.2 12 9.8 9.8 0 0 1 12 2.2 9.72 9.72 0 0 1 21.8 12 9.78 9.78 0 0 1 12 21.8Zm5.36-7.34c-.29-.14-1.7-.84-1.96-.94s-.45-.14-.64.14-.74.94-.9 1.13-.33.21-.62.07a7.95 7.95 0 0 1-2.34-1.44 8.77 8.77 0 0 1-1.62-2.01c-.17-.29 0-.45.13-.59.14-.14.29-.33.43-.5s.19-.29.29-.48a.52.52 0 0 0 0-.5c-.07-.14-.64-1.54-.88-2.12s-.45-.48-.64-.48h-.54a1 1 0 0 0-.74.35 3.12 3.12 0 0 0-.97 2.31 5.46 5.46 0 0 0 1.14 2.91 12.5 12.5 0 0 0 4.79 4.26 5.5 5.5 0 0 0 3.29.69 2.79 2.79 0 0 0 1.86-1.31 2.27 2.27 0 0 0 .16-1.31c-.07-.14-.26-.21-.55-.35Z" />
                        </svg>
                        WhatsApp
                    </Button>
                </a>
            </div>
        </div>
      </div>
    </div>
  );
}

