import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Instagram, Twitter, Facebook, ExternalLink, ChevronLeft, MapPin, Calendar, Film, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { SEO } from "@/components/seo";

export default function PersonDetail() {
    const [, params] = useRoute("/person/:name");
    const name = params?.name ? decodeURIComponent(params.name) : null;
    const [isBioExpanded, setIsBioExpanded] = useState(false);

    const { data: person, isLoading, error } = useQuery<any>({
        queryKey: [`/api/person/${name}`],
        enabled: !!name,
        retry: 1,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background container mx-auto px-4 py-8">
                <Skeleton className="w-32 h-8 mb-6" />
                <div className="flex flex-col md:flex-row gap-8">
                    <Skeleton className="w-full md:w-1/3 aspect-[2/3] rounded-lg" />
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-2/3" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !person) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold mb-2">Person Not Found</h1>
                <p className="text-muted-foreground mb-4">
                    Could not find profile for "{name}".
                </p>
                <Link href="/">
                    <Button>Go Home</Button>
                </Link>
            </div>
        );
    }

    // Calculate age if birthday exists
    const getAge = (birthday: string) => {
        if (!birthday) return null;
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = getAge(person.birthday);
    const canonicalUrl = `https://streamvault.live/person/${encodeURIComponent(person.name)}`;
    const personDescription = person.biography
        ? `${person.biography.slice(0, 155)}${person.biography.length > 155 ? '...' : ''}`
        : `Learn more about ${person.name}, their biography, and movies/shows they have featured in.`;
    const personStructuredData = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": person.name,
        "url": canonicalUrl,
        "image": person.profileUrl,
        "description": personDescription,
        "jobTitle": person.knownForDepartment,
        "birthDate": person.birthday,
        "birthPlace": person.placeOfBirth,
    };

    return (
        <div className="min-h-screen bg-background">
            <SEO
                title={`${person.name} - Cast Profile`}
                description={personDescription}
                canonical={canonicalUrl}
                image={person.profileUrl || undefined}
                type="profile"
                keywords={[person.name, person.knownForDepartment, "cast profile", "actor biography"].filter(Boolean)}
                structuredData={personStructuredData}
            />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <Button variant="ghost" className="gap-2" onClick={() => window.history.back()}>
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] gap-8">
                    {/* Sidebar (Photo & Personal Info) */}
                    <div className="space-y-6">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-xl bg-card">
                            {person.profileUrl ? (
                                <img
                                    src={person.profileUrl}
                                    alt={person.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                    <Users className="w-20 h-20" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold hidden md:block">Personal Info</h3>

                            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                                {person.knownForDepartment && (
                                    <div>
                                        <span className="block text-sm font-medium text-muted-foreground">Known For</span>
                                        <span>{person.knownForDepartment}</span>
                                    </div>
                                )}

                                {person.birthday && (
                                    <div>
                                        <span className="block text-sm font-medium text-muted-foreground">Born</span>
                                        <span>{person.birthday} {age !== null && `(Age ${age})`}</span>
                                    </div>
                                )}

                                {person.placeOfBirth && (
                                    <div>
                                        <span className="block text-sm font-medium text-muted-foreground">Place of Birth</span>
                                        <span>{person.placeOfBirth}</span>
                                    </div>
                                )}

                                {person.deathday && (
                                    <div>
                                        <span className="block text-sm font-medium text-muted-foreground">Died</span>
                                        <span>{person.deathday}</span>
                                    </div>
                                )}
                            </div>

                            {/* Social Links */}
                            <div className="flex gap-3 pt-2">
                                {person.socials.instagram && (
                                    <a
                                        href={`https://instagram.com/${person.socials.instagram}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-pink-600 rounded-full text-white hover:opacity-90 transition-opacity"
                                        title="Instagram"
                                    >
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                )}
                                {person.socials.twitter && (
                                    <a
                                        href={`https://twitter.com/${person.socials.twitter}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-black rounded-full text-white hover:opacity-90 transition-opacity"
                                        title="X (Twitter)"
                                    >
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                )}
                                {person.socials.facebook && (
                                    <a
                                        href={`https://facebook.com/${person.socials.facebook}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-blue-600 rounded-full text-white hover:opacity-90 transition-opacity"
                                        title="Facebook"
                                    >
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                )}
                                {person.socials.imdb && (
                                    <a
                                        href={`https://imdb.com/name/${person.socials.imdb}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-yellow-500 rounded-full text-black hover:opacity-90 transition-opacity"
                                        title="IMDb"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content (Bio & Credits) */}
                    <div className="space-y-8">
                        <h1 className="text-4xl md:text-5xl font-bold">{person.name}</h1>

                        {/* Biography */}
                        {person.biography && (
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Biography</h2>
                                <div className={`text-muted-foreground leading-relaxed ${!isBioExpanded ? 'line-clamp-6' : ''}`}>
                                    {person.biography.split('\n').map((paragraph: string, i: number) => (
                                        <p key={i} className="mb-2">{paragraph}</p>
                                    ))}
                                </div>
                                {person.biography.length > 500 && (
                                    <Button
                                        variant="ghost"
                                        className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/80"
                                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                                    >
                                        {isBioExpanded ? "Read Less" : "Read More"}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Known For (Credits) */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Film className="w-6 h-6" />
                                Known For
                            </h2>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                                {person.credits.map((credit: any) => (
                                    <Link key={`${credit.mediaType}-${credit.id}`} href={`/search?q=${encodeURIComponent(credit.title)}`}>
                                        <Card className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group h-full flex flex-col">
                                            <div className="relative aspect-[2/3] bg-muted">
                                                {credit.posterUrl ? (
                                                    <img
                                                        src={credit.posterUrl}
                                                        alt={credit.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4 text-center text-xs">
                                                        No Image
                                                    </div>
                                                )}
                                                {credit.voteAverage > 0 && (
                                                    <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-bold">
                                                        ★ {credit.voteAverage.toFixed(1)}
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Search on StreamVault
                                                </div>
                                            </div>
                                            <div className="p-3 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={credit.title}>
                                                        {credit.title}
                                                    </h3>
                                                    {credit.character && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            as {credit.character}
                                                        </p>
                                                    )}
                                                </div>
                                                {credit.date && (
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {new Date(credit.date).getFullYear()}
                                                    </p>
                                                )}
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {person.credits.length === 0 && (
                                <p className="text-muted-foreground">No known credits found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
