import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import * as api from '../services/api';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Book, Trash2, ChevronLeft, ChevronRight, PlusCircle, Trophy, List, PenSquare } from 'lucide-react';

const journalFormSchema = z.object({ content: z.string().min(10, { message: "Entry must be at least 10 characters." }), });
const detoxFormSchema = z.object({ duration: z.coerce.number().min(1, { message: "Duration must be at least 1 minute." }), });

type MobileView = 'contents' | 'page';

const JournalPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<api.Profile | null>(null);
    const [entries, setEntries] = useState<api.JournalEntry[]>([]);
    const [isWriting, setIsWriting] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isDetoxModalOpen, setIsDetoxModalOpen] = useState(false);
    const [mobileView, setMobileView] = useState<MobileView>('page');
    
    const journalForm = useForm<z.infer<typeof journalFormSchema>>({ resolver: zodResolver(journalFormSchema), defaultValues: { content: "" } });
    const detoxForm = useForm<z.infer<typeof detoxFormSchema>>({ resolver: zodResolver(detoxFormSchema) });

    const journalPrompts = "What was my biggest win today?\n\nWhat challenged me?\n\nWhat am I grateful for?";

    useEffect(() => {
        Promise.all([api.getProfile(), api.getJournalEntries()])
            .then(([profileData, entriesData]) => {
                setProfile(profileData);
                setEntries(entriesData);
                if (entriesData.length === 0) { setIsWriting(true); setMobileView('page'); } 
                else { setIsWriting(false); setMobileView('page'); }
            })
            .catch(() => toast.error("Failed to load journal data."))
            .finally(() => setLoading(false));
    }, []);

    const handleAddEntry = async (values: z.infer<typeof journalFormSchema>) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const newEntry = await api.addJournalEntry(values.content, today);
            const newEntries = [newEntry, ...entries];
            setEntries(newEntries);
            setActiveIndex(0);
            setIsWriting(false);
            setMobileView('page');
            journalForm.reset();
            toast.success("A new page has been written.");
        } catch { toast.error("The ink seems to have run dry. Please try again."); }
    };
    const handleDeleteEntry = async (id: number) => {
        try {
            await api.deleteJournalEntry(id);
            const newEntries = entries.filter(entry => entry.id !== id);
            setEntries(newEntries);
            setActiveIndex(prev => Math.min(prev, newEntries.length - 1));
            if (newEntries.length === 0) setIsWriting(true);
            toast.success("A page was carefully removed.");
        } catch { toast.error("Could not remove the page."); }
    };
    const handleLogDetox = async (values: z.infer<typeof detoxFormSchema>) => {
        const points = Math.round(values.duration / 6);
        try {
            const updatedProfile = await api.addClarityPoints(points);
            setProfile(updatedProfile);
            setIsDetoxModalOpen(false);
            detoxForm.reset();
            toast.success(`You earned ${points} Clarity Points! Well done.`);
        } catch { toast.error("Failed to log detox time."); }
    };
    
    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const activeEntry = entries[activeIndex];

    // --- FIX: Define the helper components to accept props ---
    const ContentsPage = () => (
        <div className="bg-card p-6 md:p-8 flex flex-col min-h-[600px]" style={{backgroundImage: "url('/paper-texture.png')"}}>
            <h3 className="font-display text-2xl font-bold mb-4 border-b-2 border-primary/20 pb-2">Contents</h3>
            <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-1 font-serif">
                {entries.map((entry, index) => (
                    <button key={entry.id} onClick={() => { setActiveIndex(index); setIsWriting(false); setMobileView('page'); }} className={cn("w-full text-left p-2 rounded-md text-sm transition-colors", activeIndex === index && !isWriting ? "bg-primary/10 text-primary font-bold" : "hover:bg-primary/5")}>
                        {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </button>
                ))}
                {entries.length === 0 && <p className="text-sm text-muted-foreground italic">Your journal is currently empty.</p>}
            </div>
            <Button variant="outline" className="w-full mt-4 border-primary/30" onClick={() => { setIsWriting(true); setMobileView('page'); }}><PlusCircle className="mr-2 h-4 w-4" /> New Entry</Button>
        </div>
    );

    const PageContent = () => (
        <div className="bg-card p-6 md:p-8 flex flex-col min-h-[600px]" style={{backgroundImage: "url('/paper-texture.png')"}}>
            {isWriting ? (
                <><h3 className="font-display text-2xl font-bold mb-4 border-b-2 border-primary/20 pb-2">New Page</h3><Form {...journalForm}><form onSubmit={journalForm.handleSubmit(handleAddEntry)} className="flex flex-col flex-1"><FormField control={journalForm.control} name="content" render={({ field }) => (<FormItem className="flex-1 flex flex-col"><FormControl><Textarea placeholder={journalPrompts} className="flex-1 font-serif text-base resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0" {...field} /></FormControl><FormMessage /></FormItem>)}/><div className="flex justify-end gap-2 mt-4">{entries.length > 0 && <Button type="button" variant="ghost" onClick={() => setIsWriting(false)}>Cancel</Button>}<Button type="submit" disabled={journalForm.formState.isSubmitting}>{journalForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Inscribe Entry</Button></div></form></Form></>
            ) : activeEntry ? (
                <div className="flex-1 flex flex-col font-serif">
                    <div className="flex items-center justify-between border-b-2 border-primary/20 pb-2 mb-4"><h3 className="font-display text-xl font-bold">{new Date(activeEntry.entry_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this page?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEntry(activeEntry.id)} className="bg-destructive hover:bg-destructive/90">Remove Page</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
                    <div className="prose prose-sm max-w-none flex-1 overflow-y-auto prose-p:text-base prose-headings:font-display"><ReactMarkdown>{activeEntry.content}</ReactMarkdown></div>
                </div>
            ) : (<div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground font-serif"><Book className="h-16 w-16 mb-4"/><p>Select an entry from the Contents page to read.</p></div>)}
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-display font-bold tracking-tight">The Scholar's Journal</h2>
                <p className="text-muted-foreground">A chronicle of thoughts, reflections, and progress.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-9">
                    <div className="relative shadow-2xl rounded-lg overflow-hidden border-4 border-primary bg-primary w-full" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4), inset 0 0 10px rgba(0,0,0,0.3)' }}>
                        <div className="hidden md:grid md:grid-cols-2">
                            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-r from-yellow-950 via-yellow-800 to-yellow-950 z-10 hidden md:block" />
                            <ContentsPage />
                            <PageContent />
                        </div>
                        <div className="md:hidden">
                           {mobileView === 'contents' ? <ContentsPage /> : <PageContent />}
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 md:justify-center">
                        <div className="md:hidden">
                            <Button variant="outline" size="sm" onClick={() => setMobileView(mobileView === 'contents' ? 'page' : 'contents')}>
                                {mobileView === 'contents' ? <PenSquare className="h-4 w-4 mr-2"/> : <List className="h-4 w-4 mr-2"/>}
                                {mobileView === 'contents' ? 'View Page' : 'View Contents'}
                            </Button>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <Button variant="outline" size="sm" onClick={() => setActiveIndex(activeIndex - 1)} disabled={activeIndex <= 0 || isWriting}><ChevronLeft className="h-4 w-4 mr-1"/> Prev. Page</Button>
                            <span className="text-sm text-muted-foreground">{entries.length > 0 && !isWriting ? `Page ${activeIndex + 1}` : ''}</span>
                            <Button variant="outline" size="sm" onClick={() => setActiveIndex(activeIndex + 1)} disabled={activeIndex >= entries.length - 1 || isWriting}>Next Page <ChevronRight className="h-4 w-4 ml-1"/></Button>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-3">
                    <Card className="sticky top-24 animate-slide-up-fade" style={{animationDelay: '0.2s'}}>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" />Clarity Rewards</CardTitle><CardDescription>Earn points for your offline focus.</CardDescription></CardHeader>
                        <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div><p className="text-5xl font-bold">{profile?.clarity_points ?? 0}</p><p className="text-sm text-muted-foreground">Total Clarity Points</p></div>
                            <Dialog open={isDetoxModalOpen} onOpenChange={setIsDetoxModalOpen}>
                                <DialogTrigger asChild><Button>Log Offline Time</Button></DialogTrigger>
                                <DialogContent className="bg-card/80 backdrop-blur-sm">
                                    <DialogHeader><DialogTitle>Log Your Offline Time</DialogTitle><DialogDescription>How long were you intentionally offline today?</DialogDescription></DialogHeader>
                                    <Form {...detoxForm}><form onSubmit={detoxForm.handleSubmit(handleLogDetox)} className="space-y-4 pt-4">
                                        <FormField control={detoxForm.control} name="duration" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Duration (in minutes)</FormLabel>
                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <DialogFooter><Button type="submit" disabled={detoxForm.formState.isSubmitting}>Log & Claim Points</Button></DialogFooter>
                                    </form></Form>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
export default JournalPage;