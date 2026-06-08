import { useState } from "react";
import { useData } from "@/context/DataContext";
import { DAY_NAMES, weekDays, isoDate, tasksForDate, isCompleted, todayIso } from "@/lib/dates";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trash2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import AddTaskDialog from "@/components/AddTaskDialog";
import { addDays, format } from "date-fns";

export default function Week() {
  const { tasks, completions, sections, toggleCompletion, removeTask } = useData();
  const [anchor, setAnchor] = useState(new Date());
  const days = weekDays(anchor);
  const today = todayIso();
  const [activeTab, setActiveTab] = useState(() => {
    const todayDay = days.findIndex((d) => isoDate(d) === today);
    return String(todayDay >= 0 ? todayDay : 0);
  });

  const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s]));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">This week</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, -7))} data-testid="prev-week"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())} data-testid="this-week">Today</Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, 7))} data-testid="next-week"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 mb-5 h-auto bg-secondary/60 p-1">
          {days.map((d, i) => {
            const dayTasks = tasksForDate(tasks, d);
            const done = dayTasks.filter((t) => isCompleted(completions, t.id, isoDate(d))).length;
            const pct = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;
            return (
              <TabsTrigger key={i} value={String(i)} data-testid={`day-tab-${i}`} className="flex flex-col py-2">
                <span className="text-xs">{DAY_NAMES[i].slice(0, 3)}</span>
                <span className="font-serif text-base">{format(d, "d")}</span>
                <span className="text-[10px] text-muted-foreground">{pct}%</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {days.map((d, i) => {
          const iso = isoDate(d);
          const dayTasks = tasksForDate(tasks, d).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
          const done = dayTasks.filter((t) => isCompleted(completions, t.id, iso)).length;
          const pct = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;

          // Group by section
          const groups = {};
          dayTasks.forEach((t) => {
            const key = t.section_id || "_none";
            (groups[key] ||= []).push(t);
          });

          return (
            <TabsContent key={i} value={String(i)} className="space-y-4">
              <Card className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="font-serif text-xl">{DAY_NAMES[i]}, {format(d, "MMM d")}</h2>
                    <p className="text-xs text-muted-foreground">{done} of {dayTasks.length} done</p>
                  </div>
                  <AddTaskDialog defaultDay={i} defaultDate={iso} />
                </div>
                <Progress value={pct} data-testid={`day-progress-${i}`} />
              </Card>

              {dayTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm" data-testid="empty-day">
                  No tasks for {DAY_NAMES[i]}. Add one above.
                </div>
              )}

              {Object.entries(groups).map(([sid, items]) => {
                const sec = sectionMap[sid];
                return (
                  <div key={sid} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: sec?.color || "#94a3b8" }}
                      />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {sec?.name || "Uncategorized"}
                      </span>
                    </div>
                    {items.map((t) => {
                      const isDone = isCompleted(completions, t.id, iso);
                      return (
                        <Card key={t.id} className={`p-3 flex items-center gap-3 transition-all ${isDone ? "bg-primary/5" : ""}`} data-testid={`task-row-${t.id}`}>
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={(v) => toggleCompletion(t.id, iso, !!v)}
                            data-testid={`task-check-${t.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                            {(t.start_time || t.end_time) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Clock className="w-3 h-3" />
                                {t.start_time || "--"} {t.end_time ? `– ${t.end_time}` : ""}
                              </div>
                            )}
                          </div>
                          {t.recurrence === "weekly" && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:inline">weekly</span>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => removeTask(t.id)} data-testid={`task-delete-${t.id}`}>
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
