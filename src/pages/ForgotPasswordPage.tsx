import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Wand } from "lucide-react";

const formSchema = z.object({
  // Add .trim() for good data hygiene
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
});

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const handlePasswordReset = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setAuthError(null);
    setSuccess(false);
    try {
      // Best Practice: Let Supabase use the Site URL you configured in the dashboard.
      // This makes your code more portable between local, preview, and production environments.
      const { error } = await supabase.auth.resetPasswordForEmail(values.email);

      if (error) throw error;
      setSuccess(true);
      form.reset(); // Clear the form on success
    } catch (error: any) {
      setAuthError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4 animate-fade-in">
      <Card className="w-full max-w-sm animate-slide-up-fade">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Wand className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display font-bold">Forgot Your Incantation?</CardTitle>
          <CardDescription>Enter your email to receive a restoration spell.</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Spell Failed</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-500 text-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Missive Sent!</AlertTitle>
              <AlertDescription>A scroll with a restoration link has been sent to your email.</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scribe's Email</FormLabel>
                    <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
              <Button type="submit" className="w-full" disabled={loading || success}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Restoration Link
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Remembered the Incantation? Log In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;