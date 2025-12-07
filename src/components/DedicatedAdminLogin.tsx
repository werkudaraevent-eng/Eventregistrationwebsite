/**
 * DedicatedAdminLogin - Professional Admin Authentication Page
 * 
 * A dedicated, secure admin login page completely separate from registration flow.
 * Accessible via #/admin route
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Shield, Lock, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface DedicatedAdminLoginProps {
  onAuthenticated: (accessToken: string) => void;
  onBackToHome?: () => void;
}

export function DedicatedAdminLogin({ onAuthenticated, onBackToHome }: DedicatedAdminLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (loginError || !data.session) {
        throw new Error(loginError?.message || 'Login failed');
      }

      onAuthenticated(data.session.access_token);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-sky-50 to-cyan-50"></div>
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-primary-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Back to Home Link */}
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-3 py-2 bg-white/60 backdrop-blur-sm"
            aria-label="Go back to home page"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        )}

        <Card className="shadow-xl border-0 glass-effect">
          <CardHeader className="space-y-6 pb-6">
            {/* Logo/Icon - Modern Gradient Style */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-md">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold text-primary-700">Admin Portal</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Sign in to manage events and registrations
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-11"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="h-11"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-base gradient-primary hover:opacity-90 shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 border-t pt-6">
            <div className="w-full p-4 gradient-primary-soft border border-primary-200 rounded-xl">
              <p className="text-sm text-primary-900 text-center">
                <span className="font-semibold">First time?</span> Contact your system administrator to set up your account.
              </p>
            </div>
            <p className="text-xs text-center text-gray-500">
              🔒 This is a secure admin-only area. Unauthorized access is prohibited.
            </p>
          </CardFooter>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
            Event Registration Management System
          </p>
        </div>
      </div>
    </div>
  );
}
