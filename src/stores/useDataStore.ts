import { create } from 'zustand';
import * as api from '../services/api';

// --- THE FIX IS IN THIS INTERFACE ---
interface DataStoreState {
  // Routines Data
  routines: api.Routine[];
  habits: api.Habit[];
  habitLogs: api.HabitLog[];
  // Goals & Tasks Data
  goals: api.Goal[];
  tasks: api.Task[];
  
  // Loading State
  isLoadingGoals: boolean;
  isLoadingRoutines: boolean;

  // --- ADD THESE TWO LINES BACK ---
  routinesVersion: number;
  triggerRoutinesRefresh: () => void;
  
  // Actions
  fetchRoutinesAndHabits: () => Promise<void>;
  fetchGoalsAndTasks: () => Promise<void>;
  
  // Mutation Actions
  addHabit: (name: string, routine_id: number) => Promise<void>;
  toggleHabit: (habitId: number, isCompleted: boolean) => Promise<void>;
  deleteHabit: (habitId: number) => Promise<void>;
  deleteRoutine: (routineId: number) => Promise<void>;
  addGoal: (title: string, description?: string) => Promise<void>;
  updateGoal: (id: number, title: string, description?: string) => Promise<void>;
  deleteGoal: (goalId: number) => Promise<void>;
  addTask: (content: string, goalId?: number) => Promise<void>;
  toggleTask: (task: api.Task) => Promise<void>;
  updateTask: (taskId: number, content: string) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  // Initial State
  routines: [],
  habits: [],
  habitLogs: [],
  goals: [],
  tasks: [],
  isLoadingGoals: true,
  isLoadingRoutines: true,
  routinesVersion: 0, // <-- Add initial value for the trigger

  // --- ACTIONS ---

  // Simple action that increments the version counter.
  // This is the "bell" that other components can ring.
  triggerRoutinesRefresh: () => set(state => ({ routinesVersion: state.routinesVersion + 1 })),

  fetchRoutinesAndHabits: async () => {
    try {
      if (!get().isLoadingRoutines) set({ isLoadingRoutines: true });
      
      let routinesData = await api.getRoutines();
      let routinesWereCreated = false;
      if (!routinesData.find(r => r.time_of_day === 'morning')) {
        await api.addRoutine('The Morning Ritual', 'morning');
        routinesWereCreated = true;
      }
      if (!routinesData.find(r => r.time_of_day === 'evening')) {
        await api.addRoutine('The Evening Ritual', 'evening');
        routinesWereCreated = true;
      }
      if (routinesWereCreated) routinesData = await api.getRoutines();

      const [habitsData, logsData] = await Promise.all([api.getHabits(), api.getHabitLogs()]);
      
      set({ routines: routinesData, habits: habitsData, habitLogs: logsData, isLoadingRoutines: false });
    } catch (error) {
      console.error("Failed to fetch routines and habits", error);
      set({ isLoadingRoutines: false });
    }
  },

  fetchGoalsAndTasks: async () => {
    try {
        if (!get().isLoadingGoals) set({ isLoadingGoals: true });
        const [goalsData, tasksData] = await Promise.all([api.getGoals(), api.getTasks()]);
        set({ goals: goalsData, tasks: tasksData, isLoadingGoals: false });
    } catch (error) {
        console.error("Failed to fetch goals and tasks", error);
        set({ isLoadingGoals: false });
    }
  },

  // --- MUTATION ACTIONS (they always re-fetch) ---

  // Goals
  addGoal: async (title, description) => { await api.addGoal(title, description); await get().fetchGoalsAndTasks(); },
  updateGoal: async (id, title, description) => { await api.updateGoal(id, title, description); await get().fetchGoalsAndTasks(); },
  deleteGoal: async (goalId) => { await api.deleteGoal(goalId); await get().fetchGoalsAndTasks(); },

  // Tasks
  addTask: async (content, goalId) => { await api.addTask(content, goalId); await get().fetchGoalsAndTasks(); },
  toggleTask: async (task) => { await api.updateTaskCompletion(task.id, !task.is_completed); await get().fetchGoalsAndTasks(); },
  updateTask: async (taskId, content) => { await api.updateTaskContent(taskId, content); await get().fetchGoalsAndTasks(); },
  deleteTask: async (taskId) => { await api.deleteTask(taskId); await get().fetchGoalsAndTasks(); },

  // Routines & Habits
  addHabit: async (name, routine_id) => { await api.addHabit(name, routine_id); await get().fetchRoutinesAndHabits(); },
  toggleHabit: async (habitId, isCompleted) => {
    await api.toggleHabitLogForToday(habitId, isCompleted);
    const logsData = await api.getHabitLogs();
    set({ habitLogs: logsData });
  },
  deleteHabit: async (habitId) => { await api.deleteHabit(habitId); await get().fetchRoutinesAndHabits(); },
  deleteRoutine: async (routineId) => { await api.deleteRoutine(routineId); await get().fetchRoutinesAndHabits(); },
}));