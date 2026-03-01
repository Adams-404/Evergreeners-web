import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { FloatingNav } from "@/components/FloatingNav";
import { Section } from "@/components/Section";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { githubService } from "@/lib/githubService";
import { geminiService } from "@/lib/geminiService";
import { FileText, GitPullRequest, Wand2, GitBranch, Rocket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Generator() {
    const { data: session } = useSession();
    const { toast } = useToast();

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
            <main className="container pt-24 pb-32 md:pb-12 animate-fade-in space-y-10">

                {/* ── Hero ── */}
                <section className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary tracking-widest uppercase">
                        <Wand2 className="w-3 h-3" />
                        AI-Powered · Instant Documentation
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gradient leading-tight">
                        Generate Docs in Seconds
                    </h1>
                    <p className="text-muted-foreground max-w-xl leading-relaxed">
                        Pick a GitHub repository, choose what kind of document you need — a <strong className="text-foreground/80">README</strong>, a <strong className="text-foreground/80">CONTRIBUTING</strong> guide, or an <strong className="text-foreground/80">Issue Template</strong> — and let AI write it for you. Review it, tweak it, then open a pull request directly from here.
                    </p>

                    {/* Steps */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {[
                            {
                                icon: <GitBranch className="w-5 h-5 text-primary" />,
                                step: "01",
                                title: "Pick a Repository",
                                desc: "Select any of your connected GitHub repositories from the dropdown.",
                            },
                            {
                                icon: <Wand2 className="w-5 h-5 text-primary" />,
                                step: "02",
                                title: "Choose & Generate",
                                desc: "Select the document type and hit Generate. AI analyses your repo and writes the content.",
                            },
                            {
                                icon: <Rocket className="w-5 h-5 text-primary" />,
                                step: "03",
                                title: "Review & Deploy",
                                desc: "Edit the preview to your liking, then open a pull request directly to your repo.",
                            },
                        ].map(({ icon, step, title, desc }) => (
                            <div
                                key={step}
                                className="relative rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 flex gap-3 items-start hover:border-primary/20 hover:bg-primary/5 transition-colors duration-200"
                            >
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    {icon}
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono text-primary/60 mb-0.5">STEP {step}</p>
                                    <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">

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

                            <div className="pt-4">
                                <Button onClick={handleGenerate} disabled={isGenerating || !owner || !repo} className="w-full">
                                    {isGenerating ? "Generating..." : "Generate Documentation"}
                                </Button>
                            </div>
                        </div>
                    </Section>

                    <Section title="Preview & Deploy" className="flex flex-col">
                        <p className="text-xs text-muted-foreground mb-3">
                            Your AI-generated markdown will appear below. Feel free to edit it before opening a pull request.
                        </p>
                        <Textarea
                            className="flex-grow min-h-[300px] mb-4 font-mono text-sm"
                            placeholder="Your generated documentation will appear here..."
                            value={generatedDoc}
                            onChange={(e) => setGeneratedDoc(e.target.value)}
                        />

                        {generatedDoc ? (
                            <Button onClick={deployToGithub} disabled={isDeploying} variant="secondary" className="w-full gap-2">
                                <GitPullRequest className="w-4 h-4" />
                                {isDeploying ? "Deploying..." : "Create PR for Changes"}
                            </Button>
                        ) : (
                            <p className="text-center text-xs text-muted-foreground/50 mt-2">
                                ← Generate a document first, then deploy it here.
                            </p>
                        )}
                    </Section>
                </div>
            </main>
            <FloatingNav />
        </div>
    );
}
