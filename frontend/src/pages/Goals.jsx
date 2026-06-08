import { useState } from "react";
import { useData } from "@/context/DataContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Plus, Trash2, Gift, Check, Minus } from "lucide-react";

function GoalCard({ goal }) {
  const { updateGoal, removeGoal, rewards, addReward, claimReward, removeReward } = useData();
  const [rewardTitle, setRewardTitle] = useState("");
  const [showReward, setShowReward] = useState(false);
  const pct = goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

  const goalRewards = rewards.filter((r) => r.goal_id === goal.id).sort((a, b) => a.order - b.order);

  const adjust = (delta) => {
    const next = Math.max(0, Math.min(goal.target, goal.current + delta));
    updateGoal(goal.id, { current: next });
  };

  return (
    <Card className="p-5 md:p-6 space-y-4" data-testid={`goal-card-${goal.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-2xl truncate">{goal.title}</h2>
          </div>
          {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id)} data-testid={`goal-delete-${goal.id}`}>
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Progress</span>
          <span className="text-sm font-medium">{goal.current} / {goal.target}</span>
        </div>
        <Progress value={pct} data-testid={`goal-progress-${goal.id}`} />
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => adjust(-1)} data-testid={`goal-minus-${goal.id}`}><Minus className="w-3 h-3" /></Button>
            <Button variant="outline" size="sm" onClick={() => adjust(1)} data-testid={`goal-plus-${goal.id}`}><Plus className="w-3 h-3" /></Button>
          </div>
          <span className="font-serif text-2xl">{pct}%</span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Rewards</span>
          <Button variant="ghost" size="sm" onClick={() => setShowReward(!showReward)} data-testid={`add-reward-toggle-${goal.id}`}>
            <Gift className="w-3 h-3 mr-1" /> Add reward
          </Button>
        </div>
        {showReward && (
          <div className="flex gap-2">
            <Input value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} placeholder="e.g. Buy yourself coffee" data-testid={`reward-input-${goal.id}`} />
            <Button size="sm" onClick={async () => {
              if (!rewardTitle.trim()) return;
              await addReward({ title: rewardTitle.trim(), goal_id: goal.id, order: goalRewards.length });
              setRewardTitle(""); setShowReward(false);
            }} data-testid={`reward-add-${goal.id}`}>Add</Button>
          </div>
        )}
        {goalRewards.map((r) => (
          <div key={r.id} className={`flex items-center gap-2 p-2 rounded-md ${r.claimed ? "bg-primary/5" : "bg-secondary/40"}`} data-testid={`reward-row-${r.id}`}>
            <Gift className={`w-4 h-4 ${r.claimed ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`flex-1 text-sm ${r.claimed ? "line-through text-muted-foreground" : ""}`}>{r.title}</span>
            {!r.claimed ? (
              <Button size="sm" variant="outline" onClick={() => claimReward(r.id)} data-testid={`reward-claim-${r.id}`}>
                <Check className="w-3 h-3 mr-1" /> Claim
              </Button>
            ) : (
              <span className="text-xs text-primary">Claimed</span>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeReward(r.id)} data-testid={`reward-delete-${r.id}`}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Goals() {
  const { goals, addGoal } = useData();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState(100);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addGoal({ title: title.trim(), description: desc, target: Number(target) || 100, current: 0 });
    setTitle(""); setDesc(""); setTarget(100); setOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">One goal per card — earn rewards along the way.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-goal-btn"><Plus className="w-4 h-4 mr-1" /> New goal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-serif">New goal</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="gt">Title</Label>
                <Input id="gt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 12 books" required data-testid="goal-title-input" />
              </div>
              <div>
                <Label htmlFor="gd">Description</Label>
                <Textarea id="gd" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Why does this matter?" rows={2} data-testid="goal-desc-input" />
              </div>
              <div>
                <Label htmlFor="gtar">Target (number)</Label>
                <Input id="gtar" type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="goal-target-input" />
              </div>
              <Button type="submit" className="w-full" data-testid="goal-submit">Create goal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center" data-testid="goals-empty">
          <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-serif text-xl mb-1">No goals yet</p>
          <p className="text-sm text-muted-foreground">Create your first goal to start tracking progress.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  );
}
