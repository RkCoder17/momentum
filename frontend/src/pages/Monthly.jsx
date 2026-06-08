import { useState } from "react";
import { useData } from "@/context/DataContext";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  startOfWeek, endOfMonth, startOfMonth, eachDayOfInterval, isoDate, tasksForDate, isCompleted,
  startOfYear, endOfYear, getISOWeek, format, addDays,
} from "@/lib/dates";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function computeRange(tasks, completions, days) {
  let total = 0, done = 0;
  days.forEach((d) => {
    const iso = isoDate(d);
    const dt = tasksForDate(tasks, d);
    total += dt.length;
    done += dt.filter((t) => isCompleted(completions, t.id, iso)).length;
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function bySection(tasks, completions, sections, days) {
  const map = {};
  sections.forEach((s) => { map[s.id] = { name: s.name, color: s.color, total: 0, done: 0 }; });
  map._none = { name: "Uncategorized", color: "#94a3b8", total: 0, done: 0 };
  days.forEach((d) => {
    const iso = isoDate(d);
    tasksForDate(tasks, d).forEach((t) => {
      const k = t.section_id || "_none";
      map[k] ||= { name: "Uncategorized", color: "#94a3b8", total: 0, done: 0 };
      map[k].total++;
      if (isCompleted(completions, t.id, iso)) map[k].done++;
    });
  });
  return Object.values(map).filter((m) => m.total > 0);
}

export default function Monthly() {
  const { tasks, completions, sections } = useData();
  const [anchor] = useState(new Date());

  // Today
  const today = [new Date()];
  const todayStats = computeRange(tasks, completions, today);
  const todaySections = bySection(tasks, completions, sections, today);

  // Week (Mon-Sun current)
  const wkDays = eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 6) });
  const weekStats = computeRange(tasks, completions, wkDays);
  const weekSections = bySection(tasks, completions, sections, wkDays);

  // Month
  const monDays = eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) });
  const monthStats = computeRange(tasks, completions, monDays);
  const monthSections = bySection(tasks, completions, sections, monDays);

  // Year
  const yrDays = eachDayOfInterval({ start: startOfYear(anchor), end: endOfYear(anchor) });
  const yearStats = computeRange(tasks, completions, yrDays);
  const yearSections = bySection(tasks, completions, sections, yrDays);

  // Weekly breakdown for the year (last 12 weeks)
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const ws = startOfWeek(addDays(new Date(), -i * 7), { weekStartsOn: 1 });
    const ds = eachDayOfInterval({ start: ws, end: addDays(ws, 6) });
    weeks.push({ label: `W${getISOWeek(ws)}`, ...computeRange(tasks, completions, ds) });
  }
  const maxW = Math.max(1, ...weeks.map((w) => w.total));

  const renderBlock = (label, stats, secStats) => (
    <Card className="p-5 space-y-4" data-testid={`block-${label.toLowerCase()}`}>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex items-end justify-between">
          <span className="font-serif text-4xl">{stats.pct}%</span>
          <span className="text-sm text-muted-foreground">{stats.done}/{stats.total}</span>
        </div>
        <Progress value={stats.pct} className="mt-2" />
      </div>
      {secStats.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          {secStats.map((s, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="text-muted-foreground">{s.done}/{s.total}</span>
              </div>
              <Progress value={s.total ? (s.done / s.total) * 100 : 0} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-serif text-3xl md:text-4xl mb-1">Progress</h1>
      <p className="text-sm text-muted-foreground mb-6">Track how you&apos;re doing across time and sections.</p>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="trend" data-testid="tab-trend">Weekly trend</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {renderBlock("Today", todayStats, todaySections)}
            {renderBlock("This Week", weekStats, weekSections)}
            {renderBlock("This Month", monthStats, monthSections)}
            {renderBlock("This Year", yearStats, yearSections)}
          </div>
        </TabsContent>

        <TabsContent value="trend">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Last 12 weeks</p>
            <div className="flex items-end justify-between gap-2 h-48">
              {weeks.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" data-testid={`bar-${i}`}>
                  <div className="w-full flex flex-col-reverse items-center" style={{ height: 160 }}>
                    <div
                      className="w-full bg-primary/80 rounded-t-md transition-all"
                      style={{ height: `${(w.pct / 100) * 160}px`, minHeight: w.total ? 4 : 0 }}
                      title={`${w.pct}%`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{w.label}</span>
                  <span className="text-[10px] font-medium">{w.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
