import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { FloatingNav } from "@/components/FloatingNav";
import { Section } from "@/components/Section";
import { InsightCard } from "@/components/InsightCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { githubService } from "@/lib/githubService";
import { geminiService } from "@/lib/geminiService";
import {
    GitCommit, GitFork, Star, Eye, ShieldCheck, Sparkles, AlertCircle,
    ArrowLeft, Search
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RepoDetail() {
    const { owner, repo } = useParams();
    const { data: session } = useSession();
    const { toast } = useToast();

    const [repoInfo, setRepoInfo] = useState<any>(null);
    const [treeInfo, setTreeInfo] = useState<any>(null);
    const [isLoadingRepo, setIsLoadingRepo] = useState(true);

    // AI states
    const [healthScore, setHealthScore] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    useEffect(() => {
        async function fetchRepoDetails() {
            if (session?.session?.token && owner && repo) {
                setIsLoadingRepo(true);
                try {
                    const [repoData, treeData] = await Promise.all([
                        githubService.getRepo(session.session.token, owner, repo),
                        githubService.getRepoTree(session.session.token, owner, repo)
                    ]);
                    setRepoInfo(repoData);
                    setTreeInfo(treeData);
                } catch (e) {
                    console.error("Failed to load repo insights", e);
                } finally {
                    setIsLoadingRepo(false);
                }
            }
        }
        fetchRepoDetails();
    }, [owner, repo, session]);

    const runAiCheck = async () => {
        if (!repoInfo || !treeInfo) return;

        setIsAnalyzing(true);
        try {
            const [health, microSuggs] = await Promise.all([
                geminiService.analyzeRepoHealth(repoInfo, treeInfo),
                geminiService.generateSuggestions(repoInfo)
            ]);
            setHealthScore(health);
            setSuggestions(microSuggs);
            setHasAnalyzed(true);
            toast({ title: "Analysis Complete", description: "AI has successfully analyzed the repository." });
        } catch (e: any) {
            toast({ title: "Analysis Failed", description: e.message || "Failed to run AI check", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoadingRepo) {
        return (
            <div className="min-h-screen bg-background custom-scrollbar">
                <Header />
                <main className="container pt-24 pb-32 md:pb-12 space-y-8">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-40 w-full" />
                </main>
            </div>
        );
    }

    if (!repoInfo) {
        return (
            <div className="min-h-screen bg-background custom-scrollbar">
                <Header />
                <main className="container pt-24 pb-32 md:pb-12 flex flex-col items-center justify-center min-h-[60vh]">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold mb-2">Repository Not Found</h2>
                    <p className="text-muted-foreground mb-6">We couldn't load the details for this repository.</p>
                    <Button asChild><Link to="/analytics">Go Back</Link></Button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background custom-scrollbar">
            <Header />
            <main className="container pt-24 pb-32 md:pb-12 space-y-8">
                {/* Breadcrumb / Back */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" />
                    <Link to="/analytics">Back to Analytics</Link>
                </div>

                {/* Hero Section */}
                <section className="animate-fade-in p-6 md:p-10 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <Search className="w-8 h-8 text-primary" />
                            <h1 className="text-3xl font-bold text-gradient break-all">{repoInfo.name}</h1>
                        </div>
                        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                            {repoInfo.description || "No description provided."}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-6">
                            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50 text-sm">
                                <Star className="w-4 h-4 text-yellow-500" /> <span className="font-medium">{repoInfo.stargazers_count}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50 text-sm">
                                <GitFork className="w-4 h-4" /> <span className="font-medium">{repoInfo.forks_count}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50 text-sm">
                                <Eye className="w-4 h-4" /> <span className="font-medium">{repoInfo.watchers_count}</span>
                            </div>
                            {repoInfo.language && (
                                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50 text-sm">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                                    <span className="font-medium">{repoInfo.language}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={runAiCheck}
                        disabled={isAnalyzing}
                        size="lg"
                        className="w-full md:w-auto text-base gap-2 group whitespace-nowrap"
                    >
                        {isAnalyzing ? (
                            <span className="animate-pulse flex items-center gap-2">Analyzing...</span>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                                Analyze AI Health
                            </>
                        )}
                    </Button>
                </section>

                {/* AI Results Section */}
                {hasAnalyzed && healthScore && (
                    <Section title="AI Repository Diagnostics" className="animate-fade-up">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-4">
                                <div className="p-8 rounded-xl border border-border bg-secondary/10 flex flex-col items-center justify-center text-center shadow-inner">
                                    <ShieldCheck className="w-12 h-12 text-primary mb-3" />
                                    <h3 className="text-4xl font-bold mb-1">
                                        {healthScore.score || 0}<span className="text-xl text-muted-foreground">/100</span>
                                    </h3>
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-2">Overall Health Score</p>
                                </div>

                                <div className="p-6 rounded-xl border border-border bg-secondary/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                        <Sparkles className="w-24 h-24" />
                                    </div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" /> Analyst Insight
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed z-10 relative">
                                        {healthScore.insights || "No insight generated."}
                                    </p>
                                </div>

                                <div className="p-6 rounded-xl border border-border bg-secondary/10">
                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-4">Structure Validation</h4>
                                    {healthScore.missingFiles && healthScore.missingFiles.length > 0 ? (
                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">The AI identified missing standard files:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {healthScore.missingFiles.map((item: string) => (
                                                    <span key={item} className="text-sm font-mono bg-destructive/10 text-destructive px-3 py-1.5 rounded-md border border-destructive/20">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-green-500 font-medium">Excellent! All standard files (README, License, etc.) are present.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        Micro Improvements
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">Actionable items under 20 mins to boost your repo's health.</p>
                                </div>
                                <div className="grid gap-4">
                                    {suggestions.map((sugg, idx) => (
                                        <InsightCard
                                            key={idx}
                                            title={sugg.title}
                                            description={sugg.description}
                                            type="achievement"
                                        />
                                    ))}
                                    {suggestions.length === 0 && (
                                        <p className="text-sm text-muted-foreground p-6 bg-secondary/10 rounded-xl border border-border/50 text-center">
                                            Your repository is fully optimized! No suggestions needed right now.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Section>
                )}
            </main>
            <FloatingNav />
        </div>
    );
}
