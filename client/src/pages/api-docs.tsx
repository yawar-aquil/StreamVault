import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Key, Zap, Globe, Lock, Terminal } from "lucide-react";
import { Link } from "wouter";

export default function ApiDocs() {
    const baseUrl = window.location.origin;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    StreamVault API Documentation
                </h1>
                <p className="text-lg text-muted-foreground">
                    Integrate StreamVault's vast library of movies, shows, and anime into your own applications.
                    Secure, fast, and easy to use.
                </p>
                <div className="flex justify-center gap-4 pt-4">
                    <Link href="/settings">
                        <Button size="lg" className="gap-2">
                            <Key className="w-4 h-4" />
                            Get Your API Key
                        </Button>
                    </Link>
                    <a href="#endpoints">
                        <Button variant="outline" size="lg">
                            View Endpoints
                        </Button>
                    </a>
                </div>
            </div>

            {/* Key Concepts Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Authentication
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            All public API requests must include your API key in the header.
                        </p>
                        <div className="bg-muted p-3 rounded-md font-mono text-sm border border-border">
                            x-api-key: YOUR_API_KEY
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Rate Limits
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            To ensure fair usage and prevent abuse:
                        </p>
                        <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
                            <li className="font-semibold text-foreground">1000 requests per day</li>
                            <li className="font-semibold text-foreground">60 requests per minute</li>
                            <li>Daily limit resets at midnight UTC</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            Base URL
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            All endpoints are relative to the API base URL:
                        </p>
                        <div className="bg-muted p-3 rounded-md font-mono text-xs border border-border break-all">
                            {baseUrl}/api
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Getting Started Guide */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        Quick Start
                    </CardTitle>
                    <CardDescription>
                        How to make your first request
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Go to <Link href="/settings" className="text-primary hover:underline font-medium">Settings &gt; API Keys</Link> to generate your unique key.</li>
                        <li>Copy your new API key (it won't be shown again!).</li>
                        <li>Make a GET request to <code>/api/trending</code> with your key header.</li>
                    </ol>

                    <Tabs defaultValue="curl" className="w-full">
                        <TabsList>
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                            <TabsTrigger value="js">JavaScript (Fetch)</TabsTrigger>
                            <TabsTrigger value="python">Python</TabsTrigger>
                        </TabsList>
                        <TabsContent value="curl">
                            <pre className="bg-black/80 text-white p-4 rounded-lg overflow-x-auto border border-border font-mono text-sm">
                                {`curl "${baseUrl}/api/trending" \\
  -H "x-api-key: YOUR_API_KEY_HERE"`}
                            </pre>
                        </TabsContent>
                        <TabsContent value="js">
                            <pre className="bg-black/80 text-white p-4 rounded-lg overflow-x-auto border border-border font-mono text-sm">
                                {`fetch('${baseUrl}/api/trending', {
  headers: {
    'x-api-key': 'YOUR_API_KEY_HERE'
  }
})
.then(response => response.json())
.then(data => console.log(data));`}
                            </pre>
                        </TabsContent>
                        <TabsContent value="python">
                            <pre className="bg-black/80 text-white p-4 rounded-lg overflow-x-auto border border-border font-mono text-sm">
                                {`import requests

url = "${baseUrl}/api/trending"
headers = {
    "x-api-key": "YOUR_API_KEY_HERE"
}

response = requests.get(url, headers=headers)
print(response.json())`}
                            </pre>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Endpoints Reference */}
            <div id="endpoints" className="space-y-6">
                <h2 className="text-2xl font-bold">API Reference</h2>

                <Tabs defaultValue="movies" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="movies">Movies</TabsTrigger>
                        <TabsTrigger value="shows">Shows</TabsTrigger>
                        <TabsTrigger value="other">Other</TabsTrigger>
                    </TabsList>

                    {/* Movies Content */}
                    <TabsContent value="movies" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Movie Endpoints</CardTitle>
                                <CardDescription>Access movie metadata and search</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <EndpointItem
                                        method="GET"
                                        path="/api/movies"
                                        desc="Get all movies. (Max 1 item for external keys)"
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/movies/search?q={query}"
                                        desc="Search movies by title. (Max 1 item for external keys)"
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/content/movies/{id}"
                                        desc="Get detailed information for a specific movie by ID."
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/movies/{slug}"
                                        desc="Get movie details by URL slug."
                                    />
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Shows Content */}
                    <TabsContent value="shows" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>TV Show Endpoints</CardTitle>
                                <CardDescription>Access series, episodes, and seasons</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <EndpointItem
                                        method="GET"
                                        path="/api/shows"
                                        desc="Get all TV shows. (Max 1 item for external keys)"
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/shows/search?q={query}"
                                        desc="Search TV shows by title. (Max 1 item for external keys)"
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/content/shows/{id}"
                                        desc="Get specific show details by ID."
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/episodes/{showId}"
                                        desc="Get all episodes for a specific show."
                                    />
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Other Content */}
                    <TabsContent value="other" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>General & Utility</CardTitle>
                                <CardDescription>Trending content, people, and categories</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <EndpointItem
                                        method="GET"
                                        path="/api/trending"
                                        desc="Get currently trending content across all categories. (Max 1 item for external keys)"
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/person/{name}"
                                        desc="Get cast/crew member details by name."
                                    />
                                    <EndpointItem
                                        method="GET"
                                        path="/api/categories"
                                        desc="List all available content categories."
                                    />
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Authenticated Endpoints</AlertTitle>
                <AlertDescription>
                    Endpoints related to user data (Profiles, Watchlist, Friends) require a session cookie and are not currently accessible via API Key. This API is strictly for fetching <strong>public content data</strong>.
                </AlertDescription>
            </Alert>

        </div>
    );
}

function EndpointItem({ method, path, desc }: { method: string, path: string, desc: string }) {
    return (
        <AccordionItem value={path}>
            <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 text-left">
                    <Badge variant={method === "GET" ? "default" : "secondary"} className="w-16 justify-center">
                        {method}
                    </Badge>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{path}</code>
                </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground ml-20">
                {desc}
            </AccordionContent>
        </AccordionItem>
    );
}
