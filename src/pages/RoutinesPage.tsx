import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import { supabase } from '../supabaseClient'; 
import HabitTracker from '../components/HabitTracker';
import { Tome } from '../components/Tome';
import { useDataStore } from '../stores/useDataStore';
import * as api from '../services/api';

import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Sparkles, Sunrise, Sunset } from 'lucide-react';

const RoutinesPage: React.FC = () => {
    // Get ALL state and actions from the central Zustand store
    const { 
        routines, 
        habits, 
        habitLogs, 
        isLoadingRoutines, 
        fetchRoutinesAndHabits, 
        addHabit,
        toggleHabit,
        deleteHabit,
        deleteRoutine 
    } = useDataStore();

    // Local state is only for UI elements on this page
    const [generatingRoutineId, setGeneratingRoutineId] = useState<number | null>(null);

    // Fetch the initial data when the component mounts
    useEffect(() => {
        fetchRoutinesAndHabits();
    }, [fetchRoutinesAndHabits]);

    const handleGenerateHabits = async (routine: api.Routine) => {
        setGeneratingRoutineId(routine.id);
        const promise = supabase.functions.invoke('generate-routine', { body: { timeOfDay: routine.time_of_day } })
            .then(async ({ error, data }) => {
                if (error) throw error;
                // Tell the store to refetch after the AI is done
                fetchRoutinesAndHabits(); 
                return data;
            });

        toast.promise(promise, {
            loading: 'Consulting the ether for new rituals...',
            success: (data: any) => data.message || 'The ether has whispered new rituals!',
            error: (err) => err.message || 'The divination failed.',
        });
        
        promise.finally(() => setGeneratingRoutineId(null));
    };
    
    // Handlers now call the store's actions, which handle both the API call and state update
    const handleAddHabit = (name: string, routine_id: number) => {
        toast.promise(addHabit(name, routine_id), {
            loading: 'Inscribing ritual...',
            success: 'Ritual inscribed!',
            error: 'Failed to inscribe ritual.',
        });
    };

    const handleToggleHabit = (habitId: number, isCompleted: boolean) => {
        toggleHabit(habitId, isCompleted); // Optimistic, no toast
    };

    const handleDeleteHabit = (habitId: number) => {
        toast.promise(deleteHabit(habitId), {
            loading: 'Erasing ritual...',
            success: 'Ritual erased.',
            error: 'Failed to erase ritual.',
        });
    };

    const handleDeleteRoutine = (routineId: number) => {
        toast.promise(deleteRoutine(routineId), {
            loading: 'Clearing the tome...',
            success: 'The tome has been cleared!',
            error: 'Failed to clear the tome.',
        });
    };

    if (isLoadingRoutines) { 
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>; 
    }
    
    const morningRoutine = routines.find(r => r.time_of_day === 'morning');
    const eveningRoutine = routines.find(r => r.time_of_day === 'evening');

    if (!morningRoutine || !eveningRoutine) { 
        return <div className="text-center text-muted-foreground">The ancient tomes could not be found. Please try refreshing the page.</div>; 
    }

    const renderRoutineCard = (routine: api.Routine, delay: string) => (
        <div className="animate-slide-up-fade" style={{ animationDelay: delay }}>
            <Tome 
                title={routine.name} 
                icon={routine.time_of_day === 'morning' ? <Sunrise className="h-8 w-8" /> : <Sunset className="h-8 w-8" />}
            >
                <HabitTracker 
                    habits={habits.filter(h => h.routine_id === routine.id)}
                    habitLogs={habitLogs}
                    onAddHabit={(name) => handleAddHabit(name, routine.id)}
                    onToggleHabit={handleToggleHabit}
                    onDeleteHabit={handleDeleteHabit}
                />
            </Tome>
            <div className="flex justify-between mt-4 px-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Clear Tome</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Clear this tome?</AlertDialogTitle><AlertDialogDescription>This will erase all inscribed rituals from your {routine.time_of_day} tome.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRoutine(routine.id)}>Clear All</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" onClick={() => handleGenerateHabits(routine)} disabled={!!generatingRoutineId}>
                    {generatingRoutineId === routine.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Divine Rituals
                </Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-display font-bold tracking-tight">The Daily Rituals</h2>
                <p className="text-muted-foreground">Forge consistency through daily practice and incantation.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2">
                {morningRoutine && renderRoutineCard(morningRoutine, "0s")}
                {eveningRoutine && renderRoutineCard(eveningRoutine, "0.2s")}
            </div>
        </div>
    );
};

export default RoutinesPage;