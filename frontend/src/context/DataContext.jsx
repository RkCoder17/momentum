import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [events, setEvents] = useState([]);
  const [goals, setGoals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [s, t, c, e, g, r] = await Promise.all([
      api.get("/sections"),
      api.get("/tasks"),
      api.get("/completions"),
      api.get("/events"),
      api.get("/goals"),
      api.get("/rewards"),
    ]);
    setSections(s.data); setTasks(t.data); setCompletions(c.data);
    setEvents(e.data); setGoals(g.data); setRewards(r.data);
    setLoaded(true);
  }, [user]);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  // Sections
  const addSection = async (name, color) => {
    const { data } = await api.post("/sections", { name, color });
    setSections((p) => [...p, data]); return data;
  };
  const removeSection = async (id) => {
    await api.delete(`/sections/${id}`);
    setSections((p) => p.filter((s) => s.id !== id));
    setTasks((p) => p.map((t) => t.section_id === id ? { ...t, section_id: null } : t));
  };

  // Tasks
  const addTask = async (payload) => {
    const { data } = await api.post("/tasks", payload);
    setTasks((p) => [...p, data]); return data;
  };
  const updateTask = async (id, patch) => {
    const { data } = await api.patch(`/tasks/${id}`, patch);
    setTasks((p) => p.map((t) => t.id === id ? data : t)); return data;
  };
  const removeTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks((p) => p.filter((t) => t.id !== id));
    setCompletions((p) => p.filter((c) => c.task_id !== id));
  };

  // Completions
  const toggleCompletion = async (task_id, date, completed) => {
    await api.post("/completions", { task_id, date, completed });
    if (completed) {
      const exists = completions.some((c) => c.task_id === task_id && c.date === date);
      if (!exists) setCompletions((p) => [...p, { id: `${task_id}:${date}`, task_id, date, user_id: user.id }]);
    } else {
      setCompletions((p) => p.filter((c) => !(c.task_id === task_id && c.date === date)));
    }
  };

  // Events
  const addEvent = async (payload) => {
    const { data } = await api.post("/events", payload);
    setEvents((p) => [...p, data]); return data;
  };
  const removeEvent = async (id) => {
    await api.delete(`/events/${id}`);
    setEvents((p) => p.filter((e) => e.id !== id));
  };

  // Goals
  const addGoal = async (payload) => {
    const { data } = await api.post("/goals", payload);
    setGoals((p) => [...p, data]); return data;
  };
  const updateGoal = async (id, patch) => {
    const { data } = await api.patch(`/goals/${id}`, patch);
    setGoals((p) => p.map((g) => g.id === id ? data : g)); return data;
  };
  const removeGoal = async (id) => {
    await api.delete(`/goals/${id}`);
    setGoals((p) => p.filter((g) => g.id !== id));
    setRewards((p) => p.filter((r) => r.goal_id !== id));
  };

  // Rewards
  const addReward = async (payload) => {
    const { data } = await api.post("/rewards", payload);
    setRewards((p) => [...p, data]); return data;
  };
  const claimReward = async (id) => {
    const { data } = await api.post(`/rewards/${id}/claim`);
    setRewards((p) => p.map((r) => r.id === id ? data : r));
  };
  const removeReward = async (id) => {
    await api.delete(`/rewards/${id}`);
    setRewards((p) => p.filter((r) => r.id !== id));
  };

  return (
    <DataCtx.Provider value={{
      loaded, sections, tasks, completions, events, goals, rewards, refresh,
      addSection, removeSection, addTask, updateTask, removeTask, toggleCompletion,
      addEvent, removeEvent, addGoal, updateGoal, removeGoal,
      addReward, claimReward, removeReward,
    }}>
      {children}
    </DataCtx.Provider>
  );
}

export const useData = () => useContext(DataCtx);
