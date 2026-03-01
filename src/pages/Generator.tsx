import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { FloatingNav } from "@/components/FloatingNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { githubService } from "@/lib/githubService";
import { geminiService } from "@/lib/geminiService";
import { FileText, GitPullRequest, Wand2, BookOpen, Users, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DOC_TYPES = [
    { id: "readme" as const, label: "README", icon: BookOpen, desc: "Project overview, setup & usage" },
    { id: "contributing" as const, label: "Contributing", icon: Users, desc: "Contribution guide & standards" },
    { id: "issue_template" as const, label: "Issue Template", icon: AlertCircle, desc: "Bug report & feature request form" },
];

const STEPS = [
    { n: 1, title: "Select Repository", hint: "Choose which GitHub repo to generate docs for." },
    { n: 2, title: "Choose Doc Type", hint: "Pick the kind of document you want to create." },
    { n: 3, title: "Generate", hint: "Let AI write the document based on your repo." },
    { n: 4, title: "Review & Deploy", hint: "Edit if needed, then open a pull request." },
];

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

    // Derive the active step
    const activeStep = generatedDoc ? 4 : isGenerating ? 3 : (owner && repo) ? 3 : 1;

    useEffect(() => {
        async function fetchRepos() {
            if (session?.session?.token) {
                setIsLoadingRepos(true);
                try {
                    const data = await githubService.getUserRepos(session.session.token);
                    if (Array.isArray(data)) setRepos(data);
                } catch (e) { console.error("Failed to fetch repos", e); }
                finally { setIsLoadingRepos(false); }
            }
        }
        fetchRepos();
    }, [session?.session?.token]);

    const handleGenerate = async () => {
        if (!owner || !repo) {
            toast({ title: "Select a repository first", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        try {
            const token = session?.session?.token || "DUMMY_TOKEN";
            let manifestContent = "";
            try { const p = await githubService.getFileContent(token, owner, repo, "package.json"); manifestContent = p.content; } catch { }
            const ctx = { name: repo, description: "", language: "TypeScript" };
            try { const r = await githubService.getRepo(token, owner, repo); ctx.description = r.description || ""; ctx.language = r.language || ""; } catch { }
            const doc = await geminiService.autoWriteDocumentation(ctx, manifestContent, docType);
            setGeneratedDoc(doc);
            toast({ title: "Done!", description: "Your document is ready to review." });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally { setIsGenerating(false); }
    };

    const deployToGithub = async () => {
        if (!generatedDoc || !owner || !repo) return;
        setIsDeploying(true);
        try {
            const token = session?.session?.token || "DUMMY_TOKEN";
            const branch = `docs/auto-generate-${Date.now()}`;
            const files: Record<string, string> = { readme: "README.md", contributing: "CONTRIBUTING.md", issue_template: ".github/ISSUE_TEMPLATE/feature_request.md" };
            await githubService.createBranch(token, owner, repo, branch, "main");
            await githubService.createOrUpdateFile(token, owner, repo, files[docType], generatedDoc, `docs: auto-generated ${docType}`, branch);
            await githubService.openPullRequest(token, owner, repo, `Docs: Auto-Generated ${docType}`, `This PR adds an AI-generated ${docType} via Evergreeners.`, branch, "main");
            toast({ title: "Pull Request Opened!", description: "Check your repository on GitHub." });
        } catch (e: any) {
            toast({ title: "Deployment Error", description: e.message, variant: "destructive" });
        } finally { setIsDeploying(false); }
    };

    const selectedType = DOC_TYPES.find(d => d.id === docType)!;

    return (
        <div className="min-h-screen bg-background custom-scrollbar overflow-x-hidden">
            <Header />

            {/* Ambient glow */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    background: "radial-gradient(ellipse 55% 35% at 50% 0%, hsl(142 71% 45% / 0.10) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 container max-w-6xl pt-28 pb-32 md:pb-20">

                {/* ── Page title ── */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gradient mb-2">Documentation Generator</h1>
                    <p className="text-muted-foreground text-sm">
                        AI-written docs for your GitHub repos — shipped as a pull request.
                    </p>
                </div>

                {/* ── Three-column layout ── */}
                <div className="flex gap-6 items-start">

                    {/* ════ SIDEBAR — Step tracker ════ */}
                    <aside className="hidden md:flex flex-col w-56 shrink-0">
                        <div
                            className="rounded-xl border border-white/[0.07] overflow-hidden"
                            style={{ background: "hsl(0 0% 5%)" }}
                        >
                            {/* Sidebar terminal header */}
                            <div
                                className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2"
                                style={{ background: "hsl(0 0% 7%)" }}
                            >
                                <span className="font-mono text-[11px] text-muted-foreground/40">~/workflow</span>
                            </div>

                            <div className="p-4">
                                <div className="space-y-0">
                                    {STEPS.map(({ n, title, hint }, idx) => {
                                        const isDone = n < activeStep;
                                        const isActive = n === activeStep;
                                        const isLast = idx === STEPS.length - 1;

                                        return (
                                            <div key={n} className="flex gap-3">
                                                {/* Line + circle column */}
                                                <div className="flex flex-col items-center">
                                                    {/* Circle */}
                                                    <div
                                                        className={[
                                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5",
                                                            isDone
                                                                ? "border-primary bg-primary"
                                                                : isActive
                                                                    ? "border-primary bg-primary/15 shadow-[0_0_10px_hsl(142_71%_45%/0.3)]"
                                                                    : "border-white/10 bg-transparent",
                                                        ].join(" ")}
                                                    >
                                                        {isDone ? (
                                                            <Check className="w-3 h-3 text-black" strokeWidth={3} />
                                                        ) : (
                                                            <span className={["text-[10px] font-bold font-mono", isActive ? "text-primary" : "text-muted-foreground/30"].join(" ")}>
                                                                {n}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Connector line */}
                                                    {!isLast && (
                                                        <div
                                                            className="w-px flex-1 my-1 rounded-full transition-colors duration-500"
                                                            style={{
                                                                background: isDone
                                                                    ? "hsl(142 71% 45% / 0.5)"
                                                                    : "hsl(0 0% 100% / 0.06)",
                                                                minHeight: "28px",
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Text */}
                                                <div className="pb-6">
                                                    <p className={[
                                                        "text-sm font-medium leading-tight mb-1 transition-colors duration-200",
                                                        isDone ? "text-primary/70" : isActive ? "text-foreground" : "text-muted-foreground/30",
                                                    ].join(" ")}>
                                                        {title}
                                                    </p>
                                                    {isActive && (
                                                        <p className="text-[11px] text-muted-foreground/50 leading-snug">
                                                            {hint}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* ════ MAIN — Terminal workspace ════ */}
                    <div className="flex-1 min-w-0">
                        <div
                            className="rounded-xl border border-white/[0.07] overflow-hidden"
                            style={{ background: "hsl(0 0% 5%)" }}
                        >
                            {/* Terminal header bar — no traffic lights */}
                            <div
                                className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]"
                                style={{ background: "hsl(0 0% 7%)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-primary/50">$</span>
                                    <span className="font-mono text-xs text-muted-foreground/40">
                                        evergreeners gen --repo <em className="text-primary/60 not-italic">{repo || "<select a repo>"}</em>
                                        {" "}--type <em className="text-primary/60 not-italic">{docType}</em>
                                    </span>
                                </div>
                                {isGenerating && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        running…
                                    </span>
                                )}
                                {generatedDoc && !isGenerating && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary/60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        output ready
                                    </span>
                                )}
                            </div>

                            {/* Two-pane body */}
                            <div className="grid md:grid-cols-[280px_1fr] divide-x divide-white/[0.06]">

                                {/* Left — controls */}
                                <div className="p-5 space-y-6">

                                    {/* Repo */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[0.12em]">
                                            <span className="text-primary/50">›</span> Repository
                                        </label>
                                        <Select
                                            onValueChange={(val) => {
                                                const [o, r] = val.split('/');
                                                setOwner(o); setRepo(r);
                                            }}
                                            value={owner && repo ? `${owner}/${repo}` : undefined}
                                        >
                                            <SelectTrigger className="border-white/[0.07] bg-white/[0.02] text-sm">
                                                <SelectValue placeholder={isLoadingRepos ? "Loading…" : "Select repository"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {repos.map((r) => (
                                                    <SelectItem key={r.full_name} value={r.full_name}>{r.full_name}</SelectItem>
                                                ))}
                                                {repos.length === 0 && !isLoadingRepos && (
                                                    <SelectItem value="none" disabled>No repositories found.</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Doc type */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[0.12em]">
                                            <span className="text-primary/50">›</span> Document Type
                                        </label>
                                        <div className="space-y-1.5">
                                            {DOC_TYPES.map(({ id, label, icon: Icon, desc }) => (
                                                <button
                                                    key={id}
                                                    onClick={() => setDocType(id)}
                                                    className={[
                                                        "w-full flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-all duration-150",
                                                        docType === id
                                                            ? "border-primary/25 bg-primary/8 text-primary"
                                                            : "border-white/[0.04] bg-transparent text-muted-foreground/50 hover:border-white/[0.08] hover:text-muted-foreground",
                                                    ].join(" ")}
                                                >
                                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="font-medium">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Generate */}
                                    <div className="pt-1">
                                        <Button
                                            onClick={handleGenerate}
                                            disabled={isGenerating || !owner || !repo}
                                            className="w-full gap-2"
                                        >
                                            <Wand2 className="w-4 h-4" />
                                            {isGenerating ? "Generating…" : "Generate"}
                                        </Button>
                                        {!owner && (
                                            <p className="mt-2 text-center text-[10px] text-muted-foreground/25">
                                                Select a repository to continue
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right — preview */}
                                <div className="flex flex-col">
                                    {/* Preview label */}
                                    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/[0.05]">
                                        <FileText className="w-3 h-3 text-muted-foreground/25" />
                                        <span className="text-[10px] font-mono text-muted-foreground/30">
                                            {selectedType.label.toLowerCase()}.md
                                        </span>
                                    </div>

                                    <Textarea
                                        className="flex-1 min-h-[420px] w-full font-mono text-sm resize-none border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground/75 placeholder:text-muted-foreground/15 px-5 py-4"
                                        placeholder={`# ${selectedType.label}\n\nGenerate documentation using the controls on the left.\nThe output will appear here ready for you to review and edit.`}
                                        value={generatedDoc}
                                        onChange={(e) => setGeneratedDoc(e.target.value)}
                                    />

                                    {generatedDoc && (
                                        <div className="p-4 border-t border-white/[0.05]">
                                            <Button
                                                onClick={deployToGithub}
                                                disabled={isDeploying}
                                                variant="secondary"
                                                className="w-full gap-2"
                                            >
                                                <GitPullRequest className="w-4 h-4" />
                                                {isDeploying ? "Opening Pull Request…" : "Create Pull Request on GitHub"}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                        <p className="mt-4 text-[11px] text-muted-foreground/25 text-center">
                            A new branch is created on your repo and a PR is opened — nothing is merged automatically.
                        </p>
                    </div>
                </div>
            </main>

            <FloatingNav />
        </div>
    );
}
