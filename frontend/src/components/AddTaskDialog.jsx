import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useData } from "@/context/DataContext";
import { DAY_NAMES } from "@/lib/dates";
import { Plus } from "lucide-react";

export default function AddTaskDialog({ defaultDay, defaultDate, trigger }) {
  const { sections, addTask, addSection } = useData();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [newSection, setNewSection] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [recurrence, setRecurrence] = useState(defaultDay !== undefined ? "weekly" : "once");
  const [dayOfWeek, setDayOfWeek] = useState(defaultDay ?? 0);
  const [date, setDate] = useState(defaultDate || "");
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setStart(""); setEnd(""); setNewSection(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      let sid = sectionId || null;
      if (newSection.trim()) {
        const s = await addSection(newSection.trim(), "#D97706");
        sid = s.id;
      }
      await addTask({
        title: title.trim(),
        section_id: sid,
        start_time: start || null,
        end_time: end || null,
        recurrence,
        day_of_week: recurrence === "weekly" ? Number(dayOfWeek) : null,
        date: recurrence === "once" ? date : null,
      });
      reset(); setOpen(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" data-testid="add-task-trigger">
            <Plus className="w-4 h-4 mr-1" /> Add task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="add-task-dialog">
        <DialogHeader><DialogTitle className="font-serif">Add task</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" data-testid="task-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning workout" required />
          </div>
          <div>
            <Label>Section (optional)</Label>
            <div className="flex gap-2">
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger data-testid="task-section-select"><SelectValue placeholder="Pick section" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="or new" value={newSection} onChange={(e) => setNewSection(e.target.value)} data-testid="task-section-new" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Start time</Label>
              <Input id="start" data-testid="task-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end">End time</Label>
              <Input id="end" data-testid="task-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Repeat</Label>
            <RadioGroup value={recurrence} onValueChange={setRecurrence} className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="weekly" data-testid="rec-weekly" /> Every week
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="once" data-testid="rec-once" /> One time
              </label>
            </RadioGroup>
          </div>
          {recurrence === "weekly" ? (
            <div>
              <Label>Day of week</Label>
              <Select value={String(dayOfWeek)} onValueChange={setDayOfWeek}>
                <SelectTrigger data-testid="task-dow"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" data-testid="task-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full" data-testid="task-submit">{busy ? "..." : "Add task"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
