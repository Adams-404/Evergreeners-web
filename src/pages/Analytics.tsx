import { Header } from "@/components/Header";
import { FloatingNav } from "@/components/FloatingNav";
import { Section } from "@/components/Section";
import { ActivityGrid } from "@/components/ActivityGrid";
import { InsightCard } from "@/components/InsightCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, AreaChart, Area
} from "recharts";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Calendar, GitCommit, GitPullRequest, Clock, Search, Star, GitBranch, GitFork, ArrowRight, ShieldCheck, Info } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { format, subMonths, parseISO, getDay } from "date-fns";
import { getApiUrl } from "@/lib/api-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { githubService } from "@/lib/githubService";

type TimeRange = "week" | "month" | "year";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [activeTab, setActiveTab] = useState("overview");

  const [repos, setRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  const { data: session, isPending: isSessionLoading } = useSession();
  const navigate = useNavigate();

  // Fetch repositories when switching to the repositories tab
  useEffect(() => {
    if (activeTab === "repositories" && repos.length === 0 && session?.session?.token) {
      setIsLoadingRepos(true);
      githubService.getUserRepos(session.session.token)
        .then(data => {
          if (Array.isArray(data)) setRepos(data);
        })
        .catch(err => console.error("Failed to fetch repos", err))
        .finally(() => setIsLoadingRepos(false));
    }
  }, [activeTab, session?.session?.token, repos.length]);

  // Fetch User Profile using React Query
  const { data: user, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const url = getApiUrl("/api/user/profile");
      const res = await fetch(url, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    enabled: !!session?.session,
  });

  // Only show fullscreen loader if no data at all (first visit before prefetch)
  const shouldShowLoader = (isLoading || isSessionLoading) && !user;

  // Process Data with useMemo
  const { stats, monthlyData, weeklyCommits, languageData, activityData, insights } = useMemo(() => {
    if (!user) {
      return {
        stats: [
          { label: "Commits", value: "0", change: "0%", trend: "up", icon: GitCommit, description: "" },
          { label: "Pull Requests", value: "0", change: "0%", trend: "up", icon: GitPullRequest, description: "" },
          { label: "Active Days", value: "0", change: "0%", trend: "down", icon: Calendar, description: "" },
          { label: "Avg. Daily", value: "0", change: "0%", trend: "up", icon: Clock, description: "" },
        ],
        monthlyData: [],
        weeklyCommits: [],
        languageData: [],
        activityData: [],
        insights: []
      };
    }

    const calendar = user.contributionData || [];
    // Ensure chronological order for processing
    const sortedCalendar = [...calendar].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Determine Start Date based on Range
    const now = new Date();
    let startDate = subMonths(now, 12);
    if (timeRange === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
    if (timeRange === 'month') startDate = subMonths(new Date(), 1);

    // Filtered data for stats/charts
    const filteredData = sortedCalendar.filter((d: any) => new Date(d.date) >= startDate);

    // Calculate Stats
    const totalCommitsInRange = filteredData.reduce((acc: number, d: any) => acc + d.contributionCount, 0);
    const activeDaysInRange = filteredData.filter((d: any) => d.contributionCount > 0).length;
    const totalPRs = user.totalPullRequests || user.total_prs || 0;

    const daysCount = filteredData.length || 1;
    const avgDaily = (totalCommitsInRange / daysCount).toFixed(1);

    const newStats = [
      {
        label: "Commits",
        value: totalCommitsInRange.toLocaleString(),
        change: "",
        trend: "up",
        icon: GitCommit,
        description: "Total commits pushed to GitHub in this period."
      },
      {
        label: "Pull Requests",
        value: totalPRs.toLocaleString(),
        change: "",
        trend: "up",
        icon: GitPullRequest,
        description: "Total Pull Requests opened (All time)."
      },
      {
        label: "Active Days",
        value: activeDaysInRange.toString(),
        change: "",
        trend: "up",
        icon: Calendar,
        description: "Days with at least one contribution in this period."
      },
      {
        label: "Avg. Daily",
        value: avgDaily,
        change: "",
        trend: "up",
        icon: Clock,
        description: "Average commits per day in this period."
      },
    ];

    // Charts Data
    let newMonthlyData: any[] = [];
    if (timeRange === 'week' || timeRange === 'month') {
      newMonthlyData = filteredData.map((d: any) => ({
        month: format(parseISO(d.date), "MMM d"),
        commits: d.contributionCount
      }));
    } else {
      const monthly: Record<string, number> = {};
      const monthsInOrder: string[] = [];
      filteredData.forEach((d: any) => {
        const date = parseISO(d.date);
        const monthStr = format(date, "MMM");
        if (!monthsInOrder.includes(monthStr)) monthsInOrder.push(monthStr);
        monthly[monthStr] = (monthly[monthStr] || 0) + d.contributionCount;
      });
      newMonthlyData = monthsInOrder.map(m => ({
        month: m,
        commits: monthly[m]
      }));
    }

    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    filteredData.forEach((d: any) => {
      const date = parseISO(d.date);
      weekdayCounts[getDay(date)] += d.contributionCount;
    });

    const newWeeklyCommits = [
      { day: "Mon", commits: weekdayCounts[1] },
      { day: "Tue", commits: weekdayCounts[2] },
      { day: "Wed", commits: weekdayCounts[3] },
      { day: "Thu", commits: weekdayCounts[4] },
      { day: "Fri", commits: weekdayCounts[5] },
      { day: "Sat", commits: weekdayCounts[6] },
      { day: "Sun", commits: weekdayCounts[0] },
    ];

    // Languages
    let newLanguageData: any[] = [];
    if (user.languages || user.languages_data) {
      newLanguageData = (user.languages || user.languages_data).map((l: any) => ({
        name: l.name,
        value: l.value || l.size,
        color: l.color
      }));
    }

    // Activity Grid: Always show full year context
    const newActivityData = [...sortedCalendar].reverse();

    // Insights
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const maxDayIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts));
    const bestDay = weekdayNames[maxDayIndex];

    const newInsights = [
      `Your most productive day in this period is ${bestDay}.`,
      `You were active on ${activeDaysInRange} days.`,
      `Averaging ${avgDaily} commits per day.`
    ];

    return {
      stats: newStats,
      monthlyData: newMonthlyData,
      weeklyCommits: newWeeklyCommits,
      languageData: newLanguageData,
      activityData: newActivityData,
      insights: newInsights
    };
  }, [user, timeRange]);

  if (shouldShowLoader) {
    return (
      <div className="min-h-screen bg-background custom-scrollbar">
        <Header />
        <main className="container pt-24 pb-32 md:pb-12 space-y-8">
          {/* Page Header Skeleton */}
          <section className="animate-fade-in">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </section>

          {/* Time Range Skeleton */}
          <div className="flex gap-2 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>

          {/* Stats Grid Skeleton */}
          <Section className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </Section>

          {/* Monthly Trend Skeleton */}
          <Section title="Monthly Trend (Commits)" className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <Skeleton className="h-64 w-full" />
          </Section>

          {/* Weekly Distribution Skeleton */}
          <Section title="Activity by Day" className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Skeleton className="h-64 w-full" />
          </Section>

          {/* Two Column Charts Skeleton */}
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Languages" className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <Skeleton className="h-48 w-full" />
            </Section>
            <Section title="AI Insights" className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </Section>
          </div>

          {/* Year in Code Skeleton */}
          <Section title="Year in Code" className="animate-fade-up" style={{ animationDelay: "0.35s" }}>
            <Skeleton className="h-32 w-full" />
          </Section>
        </main>
        <FloatingNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background custom-scrollbar">
      <Header />

      <main className="container pt-24 pb-32 md:pb-12 space-y-8">
        {/* Page Header */}
        <section className="animate-fade-in">
          <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your coding patterns</p>
        </section>

        {/* Tabs for Overview / Repositories */}
        <Tabs defaultValue="overview" className="space-y-8" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center sm:flex-row flex-col gap-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <TabsList className="bg-secondary/50 p-1">
              <TabsTrigger value="overview" className="px-6 rounded-md">Overview</TabsTrigger>
              <TabsTrigger value="repositories" className="px-6 rounded-md">Repositories</TabsTrigger>
            </TabsList>

            {activeTab === "overview" && (
              <div className="flex gap-2">
                {(["week", "month", "year"] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                      timeRange === range
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <TabsContent value="overview" className="space-y-8 outline-none">
            {/* Stats Grid */}
            <Section className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <TooltipProvider>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-all duration-300 group relative"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 text-muted-foreground transition-colors">
                            <Info className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{(stat as any).description}</p>
                        </TooltipContent>
                      </Tooltip>

                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold">{stat.value}</span>
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          stat.trend === "up" ? "text-primary" : "text-destructive"
                        )}>
                          {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {stat.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </Section>

            {/* Monthly Trend */}
            <Section title="Monthly Trend (Commits)" className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="commits"
                      stroke="hsl(142, 71%, 45%)"
                      fillOpacity={1}
                      fill="url(#colorCommits)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* Weekly Distribution */}
            <Section title="Activity by Day" className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyCommits}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }}
                    />
                    <Bar
                      dataKey="commits"
                      fill="hsl(142, 71%, 45%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* Two Column Charts: Languages & Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Languages */}
              <Section title="Languages" className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
                {languageData.length > 0 ? (
                  <>
                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={languageData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {languageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || 'hsl(142, 71%, 45%)'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {languageData.map((lang: any) => (
                        <div key={lang.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                          <span className="text-muted-foreground">{lang.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    No language data available
                  </div>
                )}
              </Section>

              {/* AI Insights */}
              <Section title="AI Insights" className="animate-fade-up space-y-3" style={{ animationDelay: "0.3s" }}>
                <div className="grid gap-4">
                  {insights.map((insight, i) => (
                    <InsightCard
                      key={i}
                      title="Pattern Detected"
                      description={insight}
                      type="trend"
                    />
                  ))}
                </div>
              </Section>
            </div>

            {/* Year in Code */}
            <Section title="Year in Code" className="animate-fade-up" style={{ animationDelay: "0.35s" }}>
              <ActivityGrid data={activityData} weeks={57} />
            </Section>

          </TabsContent>

          <TabsContent value="repositories" className="space-y-6 animate-fade-in mt-0 outline-none">
            {isLoadingRepos ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : repos.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map((repo) => (
                  <div key={repo.id} className="p-5 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all group flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg truncate pr-2 group-hover:text-primary transition-colors flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          {repo.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full border border-border">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {repo.stargazers_count}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {repo.description || "No description provided."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        {repo.language && (
                          <span className="text-xs flex items-center gap-1.5 font-medium">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                            {repo.language}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count}
                        </span>
                      </div>
                      <Link
                        to={`/repo/${repo.owner.login}/${repo.name}`}
                        className="text-xs flex items-center gap-1 font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        Analyze <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-secondary/10 border border-border rounded-xl">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-bold mb-1">No Repositories Found</h3>
                <p className="text-sm text-muted-foreground">We couldn't load any repositories. Make sure your GitHub is connected.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <FloatingNav />
    </div>
  );
}
