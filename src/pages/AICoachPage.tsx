import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { TypeAnimation } from 'react-type-animation';

import sageAnimation from '../../public/Nostradamus.json'; 

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { useDataStore } from '../stores/useDataStore';

const ANIMATION_SEGMENTS = {
    IDLE_LOOP: [0, 120],
    THINKING_LOOP: [121, 200],
    TALKING: [221, 300],
};

type CoachState = 'idle' | 'thinking' | 'talking';

const AICoachPage: React.FC = () => {
    const [coachState, setCoachState] = useState<CoachState>('idle');
    const [currentMessage, setCurrentMessage] = useState<string>("Hello! I am the Clarity Sage. How can I help you find focus today?");
    const [inputValue, setInputValue] = useState("");
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const { triggerRoutinesRefresh } = useDataStore();

    useEffect(() => {
        const lottie = lottieRef.current;
        if (!lottie) return;
        
        if (coachState === 'thinking') {
            lottie.playSegments(ANIMATION_SEGMENTS.THINKING_LOOP, true);
        } else {
            lottie.playSegments(ANIMATION_SEGMENTS.IDLE_LOOP, true);
        }
    }, [coachState]);

    const handleSendMessage = async (prompt: string) => {
        if (!prompt.trim() || coachState !== 'idle') return;
        setCoachState('thinking');
        setCurrentMessage("Let me ponder on that for a moment...");
        setInputValue("");
        try {
            const { data, error } = await supabase.functions.invoke('ai-coach', { body: { prompt } });
            if (error) throw error;
            if (!data.response) throw new Error("The sage seems to be lost in thought...");
            lottieRef.current?.playSegments(ANIMATION_SEGMENTS.TALKING, false);
            setCoachState('talking');
            setCurrentMessage(data.response);
        } catch (error: any) {
            toast.error("The sage's crystal ball seems cloudy.");
            setCurrentMessage("My apologies, my thoughts are unclear. Please ask again.");
            setCoachState('talking');
        }
    };
    
    const handleRoutineAction = async (timeOfDay: 'morning' | 'evening') => {
        if (coachState !== 'idle') return;
        setCoachState('thinking');
        setCurrentMessage(`Crafting a ${timeOfDay} routine for you...`);
        try {
            const { data, error } = await supabase.functions.invoke('generate-routine', { body: { timeOfDay } });
            if (error) throw error;
            lottieRef.current?.playSegments(ANIMATION_SEGMENTS.TALKING, false);
            setCoachState('talking');
            setCurrentMessage(data.message);
            toast.success("Routine updated!", { description: `New habits have been added to your ${timeOfDay} routine page.` });
            triggerRoutinesRefresh();
        } catch(error: any) {
            toast.error(error.message || `Failed to generate ${timeOfDay} routine.`);
            setCurrentMessage("I seem to have misplaced my quill. Could you ask again?");
            setCoachState('talking');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
            {/* --- RESPONSIVE LAYOUT CONTAINER --- */}
            {/* On desktop (lg), it's a centered container. On mobile, it's a full column. */}
            <div className="relative flex-1 w-full flex flex-col items-center justify-center lg:justify-start">
                
                {/* Wizard Animation (size changes on mobile) */}
                <Lottie 
                    lottieRef={lottieRef}
                    animationData={sageAnimation}
                    loop={true} 
                    autoplay={true}
                    className="h-[280px] w-[280px] md:h-[350px] md:w-[350px] lg:h-[450px] lg:w-[450px]"
                    onComplete={() => {
                        if (coachState === 'talking') {
                            setCoachState('idle');
                        }
                    }}
                />
                
                {/* Speech Bubble (position changes on mobile) */}
                {currentMessage && (
                    <div 
                        key={currentMessage}
                        className={cn(
                            "w-full max-w-md p-4 rounded-lg shadow-xl bg-card border animate-fade-in",
                            // Desktop positioning: absolute, floating above
                            "lg:absolute lg:top-1/4 lg:left-1/2 lg:w-80",
                            // Desktop speech bubble pointer
                            "lg:before:content-[''] lg:before:absolute lg:before:w-0 lg:before:h-0 lg:before:border-[10px]",
                            "lg:before:border-t-card lg:before:border-r-transparent lg:before:border-b-transparent lg:before:border-l-transparent",
                            "lg:before:-bottom-5 lg:before:left-1/2 lg:before:-translate-x-1/2",
                            // Mobile positioning: static, below the animation
                            "mt-[-40px] lg:mt-0", 
                            coachState === 'thinking' && "opacity-80 italic"
                        )}
                    >
                        <div className="prose prose-sm text-card-foreground prose-p:my-1 text-center lg:text-left">
                            {coachState === 'talking' ? (
                                <TypeAnimation
                                    sequence={[currentMessage]}
                                    wrapper="p"
                                    speed={60}
                                    cursor={true}
                                />
                            ) : (
                                <p>{currentMessage}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Input and Actions Area */}
            <div className="mt-auto space-y-4 pt-4 border-t">
                <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleRoutineAction('morning')} disabled={coachState !== 'idle'}>
                        {coachState === 'thinking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Sparkles className="mr-2 h-4 w-4"/>Suggest Morning Routine
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRoutineAction('evening')} disabled={coachState !== 'idle'}>
                        {coachState === 'thinking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Sparkles className="mr-2 h-4 w-4"/>Suggest Evening Routine
                    </Button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex w-full max-w-lg mx-auto items-center space-x-2">
                    <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Speak your mind to the sage..." className="flex-1" disabled={coachState !== 'idle'}/>
                    <Button type="submit" size="icon" disabled={coachState !== 'idle' || !inputValue.trim()}><Send className="h-4 w-4"/></Button>
                </form>
            </div>
        </div>
    );
};

export default AICoachPage;