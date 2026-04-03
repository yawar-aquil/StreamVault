import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Code, PenTool, Shield, Mail, Zap, Terminal, Heart } from "lucide-react";

export default function JoinTeam() {
    return (
        <>
        <Helmet>
            <title>Join The Team | StreamVault</title>
            <meta name="description" content="Join the StreamVault team! We're looking for Full Stack Developers, Community Moderators, and Content Curators to help build the next generation of streaming." />
            <link rel="canonical" href="https://streamvault.live/join-team" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content="Join The StreamVault Team — We're Hiring" />
            <meta property="og:description" content="Help us build the next generation of streaming. Open roles: Full Stack Developer, Community Moderator & Content Curator. Apply now at StreamVault." />
            <meta property="og:image" content="https://streamvault.live/og-join-team.png" />
            <meta property="og:url" content="https://streamvault.live/join-team" />
            <meta property="og:site_name" content="StreamVault" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Join The StreamVault Team — We're Hiring" />
            <meta name="twitter:description" content="Help us build the next generation of streaming. Open roles: Full Stack Dev, Community Mod & Content Curator." />
            <meta name="twitter:image" content="https://streamvault.live/og-join-team.png" />
        </Helmet>
        <div className="container mx-auto px-4 py-12 space-y-12">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
                    We're Hiring
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    Join the StreamVault Team
                </h1>
                <p className="text-xl text-muted-foreground pt-2">
                    Help us build the next generation of streaming. We're looking for passionate individuals who love movies, shows, and anime.
                </p>
                <div className="flex justify-center gap-4 pt-6">
                    <a href="mailto:contact@streamvault.live?subject=StreamVault%20Application">
                        <Button size="lg" className="gap-2 text-md px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                            <Mail className="w-5 h-5" />
                            Apply Now
                        </Button>
                    </a>
                </div>
            </div>

            {/* Why Join Us Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-8">
                <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-primary/30 transition-all duration-300">
                    <CardHeader>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle>Fast Paced</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">
                        Ship features daily to millions of users. See your contributions instantly impact the community.
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-purple-500/30 transition-all duration-300">
                    <CardHeader>
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                            <Terminal className="w-6 h-6 text-purple-500" />
                        </div>
                        <CardTitle>Modern Stack</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">
                        Work with the bleeding-edge technologies. React, Vite, WebSockets, and advanced streaming infrastructures.
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl hover:border-pink-500/30 transition-all duration-300">
                    <CardHeader>
                        <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mb-4">
                            <Heart className="w-6 h-6 text-pink-500" />
                        </div>
                        <CardTitle>Passionate Community</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">
                        Everything we do is for the watchers. Be part of a core team that puts the experience first.
                    </CardContent>
                </Card>
            </div>

            {/* Open Positions Section */}
            <div className="max-w-4xl mx-auto space-y-8 pt-8">
                <h2 className="text-3xl font-bold text-center mb-10">Open Positions</h2>
                
                <div className="space-y-6">
                    {/* Developer Position */}
                    <Card className="flex flex-col md:flex-row overflow-hidden border-border/50 bg-card shadow-lg hover:shadow-primary/5 transition-all">
                        <div className="bg-primary/5 p-6 md:w-64 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/50">
                            <Code className="w-12 h-12 text-primary mb-4" />
                            <h3 className="font-bold text-lg text-center">Full Stack Dev</h3>
                            <Badge className="mt-2" variant="secondary">Remote</Badge>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="font-semibold text-lg mb-2">About The Role</h4>
                                <p className="text-muted-foreground text-sm mb-4">
                                    You will be responsible for building out massive new features and optimizing StreamVault's core media streaming engine. Proficiency in React, Node, and WebSockets is highly desired.
                                </p>
                            </div>
                            <div className="flex md:justify-end mt-4">
                                <a href="mailto:contact@streamvault.live?subject=Full%20Stack%20Developer%20Application">
                                    <Button variant="outline" className="w-full md:w-auto hover:bg-primary/10 hover:text-primary border-primary/20">Apply for Developer</Button>
                                </a>
                            </div>
                        </div>
                    </Card>

                    {/* Content Moderator Position */}
                    <Card className="flex flex-col md:flex-row overflow-hidden border-border/50 bg-card shadow-lg hover:shadow-primary/5 transition-all">
                        <div className="bg-blue-500/5 p-6 md:w-64 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/50">
                            <Shield className="w-12 h-12 text-blue-500 mb-4" />
                            <h3 className="font-bold text-lg text-center">Community Mod</h3>
                            <Badge className="mt-2" variant="secondary">Remote</Badge>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="font-semibold text-lg mb-2">About The Role</h4>
                                <p className="text-muted-foreground text-sm mb-4">
                                    Help us keep the community safe and engaging! Moderators monitor the global live chats, Watch Together lobbies, and handle user reports to enforce our community guidelines.
                                </p>
                            </div>
                            <div className="flex justify-end mt-4">
                                <a href="mailto:contact@streamvault.live?subject=Community%20Moderator%20Application">
                                    <Button variant="outline" className="w-full md:w-auto hover:bg-blue-500/10 hover:text-blue-500 border-blue-500/20">Apply for Moderator</Button>
                                </a>
                            </div>
                        </div>
                    </Card>

                    {/* Uploader / Curator Position */}
                    <Card className="flex flex-col md:flex-row overflow-hidden border-border/50 bg-card shadow-lg hover:shadow-primary/5 transition-all">
                        <div className="bg-green-500/5 p-6 md:w-64 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/50">
                            <PenTool className="w-12 h-12 text-green-500 mb-4" />
                            <h3 className="font-bold text-lg text-center">Content Curator</h3>
                            <Badge className="mt-2" variant="secondary">Remote</Badge>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="font-semibold text-lg mb-2">About The Role</h4>
                                <p className="text-muted-foreground text-sm mb-4">
                                    If you love organizing content, adding subtitles, and making sure metadata looks crystal clean, this is for you. We need passionate organizers to help expand our library.
                                </p>
                            </div>
                            <div className="flex justify-end mt-4">
                                <a href="mailto:contact@streamvault.live?subject=Content%20Curator%20Application">
                                    <Button variant="outline" className="w-full md:w-auto hover:bg-green-500/10 hover:text-green-500 border-green-500/20">Apply for Curator</Button>
                                </a>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="max-w-3xl mx-auto text-center bg-card/40 border border-border/50 rounded-2xl p-8 backdrop-blur-sm mt-12 mb-8 shadow-xl">
                <Users className="w-12 h-12 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-4">Don't see a perfect fit?</h2>
                <p className="text-muted-foreground mb-6">
                    If you believe you can bring value to StreamVault in another way, we still want to hear from you! Send us an open application.
                </p>
                <a href="mailto:contact@streamvault.live?subject=Open%20Application">
                    <Button variant="secondary" size="lg" className="px-8 rounded-full">
                        Email Us Ideas
                    </Button>
                </a>
            </div>
        </div>
        </>
    );
}

