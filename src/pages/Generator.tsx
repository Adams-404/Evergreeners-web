import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { FloatingNav } from "@/components/FloatingNav";
import { Section } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { githubService } from "@/lib/githubService";
import { geminiService } from "@/lib/geminiService";
import { FileText, Wand2, GitBranch, Github, CodeSquare, GitPullRequest, BarChart3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Generator() {
    const { data: session } = useSession();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [repos, setRepos] = useState<any[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [owner, setOwner] = useState("");
    const [repo, setRepo] = useState("");
    const [docType, setDocType] = useState<'readme' | 'contributing' | 'issue_template'>('readme');
    const [generatedDoc, setGeneratedDoc] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);

    useEffect(() => {
        async function fetchRepos() {
            if (session?.session?.token) {
                setIsLoadingRepos(true);
                try {
                    const data = await githubService.getUserRepos(session.session.token);
                    if (Array.isArray(data)) {
                        setRepos(data);
                    }
                } catch (e) {
                    console.error("Failed to fetch repos", e);
                } finally {
                    setIsLoadingRepos(false);
                }
            }
        }
        fetchRepos();
    }, [session?.session?.token]);

    const handleGenerate = async () => {
        if (!owner || !repo) {
            toast({ title: "Validation Error", description: "Owner and Repo are required", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        try {
            const token = session?.session?.token || "DUMMY_TOKEN";

            let manifestContent = "";
            try {
                const pkgData = await githubService.getFileContent(token, owner, repo, "package.json");
                manifestContent = pkgData.content;
            } catch (err) {
                console.log("package.json not found, proceeding without it");
            }

            const repoContext = { name: repo, description: "A generic project description.", language: "TypeScript" };
            try {
                const repoData = await githubService.getRepo(token, owner, repo);
                repoContext.description = repoData.description || "";
                repoContext.language = repoData.language || "";
            } catch (e) { }

            const doc = await geminiService.autoWriteDocumentation(repoContext, manifestContent, docType);

            setGeneratedDoc(doc);
            toast({ title: "Success", description: "Documentation generated successfully!" });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const deployToGithub = async () => {
        if (!generatedDoc || !owner || !repo) return;

        setIsDeploying(true);
        try {
            const token = session?.session?.token || "DUMMY_TOKEN";
            const branchName = `docs/auto-generate-${Date.now()}`;

            const fileNameMap = {
                readme: 'README.md',
                contributing: 'CONTRIBUTING.md',
                issue_template: '.github/ISSUE_TEMPLATE/feature_request.md' // example path
            };

            const filepath = fileNameMap[docType];

            // Create branch
            await githubService.createBranch(token, owner, repo, branchName, "main");

            // Create/Update file
            await githubService.createOrUpdateFile(
                token,
                owner,
                repo,
                filepath,
                generatedDoc,
                `docs: auto-generated ${docType}`,
                branchName
            );

            // Open PR
            await githubService.openPullRequest(
                token,
                owner,
                repo,
                `Docs: Auto-Generated ${docType}`,
                `This PR adds an AI-generated ${docType} via Evergreeners.`,
                branchName,
                "main"
            );

            toast({ title: "Success", description: "Pull request opened successfully!" });

        } catch (e: any) {
            toast({ title: "Deployment Error", description: e.message, variant: "destructive" });
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="min-h-screen bg-background custom-scrollbar">
            <Header />
            <main className="container pt-24 pb-32 md:pb-12 space-y-8 animate-fade-in">
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <Wand2 className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold text-gradient">AI Generator</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Build missing documentation, pull requests, and standard files in seconds.
                    </p>
                </section>

                <div className="grid md:grid-cols-2 gap-8">
                    <Section title="Target Repository" className="h-fit">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Repository</label>
                                    <Select
                                        onValueChange={(val) => {
                                            const [o, r] = val.split('/');
                                            setOwner(o);
                                            setRepo(r);
                                        }}
                                        value={owner && repo ? `${owner}/${repo}` : undefined}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingRepos ? "Loading schemas..." : "Select a repository"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {repos.map((r) => (
                                                <SelectItem key={r.full_name} value={r.full_name}>
                                                    {r.full_name}
                                                </SelectItem>
                                            ))}
                                            {repos.length === 0 && !isLoadingRepos && (
                                                <SelectItem value="none" disabled>No repositories found.</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium">Document Type</label>
                                <div className="flex gap-2 flex-wrap">
                                    {(['readme', 'contributing', 'issue_template'] as const).map(type => (
                                        <Button
                                            key={type}
                                            variant={docType === type ? 'default' : 'outline'}
                                            onClick={() => setDocType(type)}
                                            className="capitalize"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            {type.replace('_', ' ')}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-2">
                                <Button onClick={handleGenerate} disabled={isGenerating || !owner || !repo} className="w-full">
                                    {isGenerating ? "Generating..." : "Generate Documentation"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/repo/${owner}/${repo}`)}
                                    disabled={!owner || !repo}
                                    className="w-full"
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    View Repository Health Analytics
                                </Button>
                            </div>
                        </div>
                    </Section>

                    <Section title="Preview & Deploy" className="flex flex-col">
                        <Textarea
                            className="flex-grow min-h-[300px] mb-4 font-mono text-sm"
                            placeholder="Your generated markdown will appear here..."
                            value={generatedDoc}
                            onChange={(e) => setGeneratedDoc(e.target.value)}
                        />

                        {generatedDoc && (
                            <Button onClick={deployToGithub} disabled={isDeploying} variant="secondary" className="w-full gap-2">
                                <GitPullRequest className="w-4 h-4" />
                                {isDeploying ? "Deploying..." : "Create PR for Changes"}
                            </Button>
                        )}
                    </Section>
                </div>
            </main>
            <FloatingNav />
        </div>
    );
}
