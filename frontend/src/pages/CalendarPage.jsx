import { useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Plus, Calendar as CalIcon, Trash2 } from "lucide-react";
import { isoDate, tasksForDate, isCompleted, format } from "@/lib/dates";

export default function CalendarPage() {
  const { tasks, completions, events, addEvent, removeEvent } = useData();
  const [selected, setSelected] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [desc, setDesc] = useState("");

  const selIso = isoDate(selected);
  const dayTasks = tasksForDate(tasks, selected);
  const done = dayTasks.filter((t) => isCompleted(completions, t.id, selIso)).length;
  const pct = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;
  const dayEvents = events.filter((e) => e.date === selIso);

  // Modifiers to colour calendar by completion
  const modifiers = useMemo(() => {
    const high = []; const mid = []; const low = []; const hasEvt = [];
    // Sample only last 60 + next 60 days to keep light
    const today = new Date();
    for (let i = -60; i <= 60; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const iso = isoDate(d);
      const dt = tasksForDate(tasks, d);
      if (dt.length) {
        const p = dt.filter((t) => isCompleted(completions, t.id, iso)).length / dt.length;
        if (p >= 0.8) high.push(d);
        else if (p >= 0.4) mid.push(d);
        else if (p > 0) low.push(d);
      }
      if (events.some((e) => e.date === iso)) hasEvt.push(d);
    }
    return { high, mid, low, hasEvt };
  }, [tasks, completions, events]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addEvent({ title: title.trim(), date: selIso, time: time || null, description: desc || null });
    setTitle(""); setTime(""); setDesc(""); setOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">View any day&apos;s progress, tasks and events.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-3 md:p-5 flex justify-center" data-testid="calendar-card">
          <CalendarComp
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            modifiers={modifiers}
            modifiersClassNames={{
              high: "bg-primary/80 text-primary-foreground rounded-md",
              mid: "bg-primary/40 rounded-md",
              low: "bg-primary/15 rounded-md",
              hasEvt: "ring-2 ring-primary/40",
            }}
            className="rounded-md"
          />
        </Card>

        <div className="space-y-4">
          <Card className="p-5" data-testid="day-summary">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{format(selected, "EEEE")}</p>
            <h2 className="font-serif text-2xl">{format(selected, "MMMM d, yyyy")}</h2>
            <div className="flex items-end justify-between mt-3">
              <span className="text-sm text-muted-foreground">{done} of {dayTasks.length} tasks done</span>
              <span className="font-serif text-3xl">{pct}%</span>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">Tasks</h3>
            </div>
            {dayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks scheduled.</p>
            ) : (
              dayTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm py-1" data-testid={`cal-task-${t.id}`}>
                  <span className={`w-2 h-2 rounded-full ${isCompleted(completions, t.id, selIso) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <span className={isCompleted(completions, t.id, selIso) ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                  {t.start_time && <span className="ml-auto text-xs text-muted-foreground">{t.start_time}</span>}
                </div>
              ))
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg flex items-center gap-2"><CalIcon className="w-4 h-4" /> Events</h3>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="add-event-btn"><Plus className="w-3 h-3 mr-1" /> Add</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="font-serif">Add event on {format(selected, "MMM d")}</DialogTitle></DialogHeader>
                  <form onSubmit={submit} className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="event-title" />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="event-time" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="event-desc" />
                    </div>
                    <Button type="submit" className="w-full" data-testid="event-submit">Add event</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events on this day.</p>
            ) : dayEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-sm p-2 bg-secondary/40 rounded-md" data-testid={`event-row-${e.id}`}>
                <CalIcon className="w-4 h-4 mt-0.5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{e.title}</p>
                  {e.time && <p className="text-xs text-muted-foreground">{e.time}</p>}
                  {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeEvent(e.id)} data-testid={`event-delete-${e.id}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
