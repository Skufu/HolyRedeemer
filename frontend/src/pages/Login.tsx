import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Shield,
  Book,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await login(username, password);

    if (result.success) {
      toast({
        title: 'Welcome!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Login Failed',
        description: result.error || 'Invalid credentials',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  const fillDemoCredentials = (user: 'admin' | 'librarian' | 'student') => {
    const credentials = {
      admin: { username: 'admin', password: 'admin123' },
      librarian: { username: 'librarian', password: 'lib123' },
      student: { username: 'student001', password: 'student123' },
    };
    setUsername(credentials[user].username);
    setPassword(credentials[user].password);
  };

  const backgroundUrl = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000";

  return (
    <div className="min-h-screen w-full relative font-serif bg-[#1a1a1a]">
      {/* Background with Blur - Fixed position */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${backgroundUrl})`,
          filter: 'blur(8px)',
          transform: 'scale(1.1)'
        }}
      />

      {/* Main Container - Scrollable */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center overflow-y-auto p-4 md:p-6">

        {/* Login Card */}
        <div className="w-full max-w-[400px] bg-white md:glass-card rounded-[28px] p-6 md:p-8 shadow-2xl animate-fade-in-up flex flex-col my-auto">

          {/* Logo Badge */}
          <div className="flex justify-center mb-5 shrink-0">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#6B1528]/10 transform hover:scale-105 transition-transform duration-300 overflow-hidden">
              <img src="/logo.png" alt="Holy Redeemer School Logo" className="w-14 h-14 object-contain" />
            </div>
          </div>

          <div className="text-center mb-6 shrink-0">
            <span className="text-[#6B1528] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block opacity-80">Holy Redeemer School</span>
            <h2 className="text-xl md:text-2xl font-bold text-[#1A1A1A] mb-1.5 leading-tight tracking-tight">
              Welcome Back
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-sans px-2">
              Enter your credentials to access your library account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div className="space-y-1">
              <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Username</Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-[#6B1528] transition-colors" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Student ID or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-11 pl-10 rounded-xl input-scholarly border-none shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1 mb-1">
                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
                <button type="button" className="text-[10px] sm:text-xs font-bold text-[#6B1528] hover:underline uppercase tracking-widest transition-colors min-h-[44px] sm:min-h-0 flex items-center">Forgot?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-[#6B1528] transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pl-10 pr-10 rounded-xl input-scholarly border-none shadow-sm text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-all min-w-[44px] min-h-[44px] flex items-center justify-center p-0"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-1 min-h-[44px] sm:min-h-0">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="w-5 h-5 sm:w-4 sm:h-4 rounded-full border-muted-foreground/30 data-[state=checked]:bg-[#6B1528] data-[state=checked]:border-[#6B1528]"
              />
              <Label htmlFor="remember" className="text-xs sm:text-sm font-semibold text-muted-foreground cursor-pointer select-none">
                Keep me signed in
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl btn-maroon text-sm font-bold flex items-center justify-center gap-2 shadow-xl"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-border/10 shrink-0">
            <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 mb-3 sm:mb-4 font-sans">Quick Demo Access</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin')}
                className="btn-demo h-12 sm:h-9 w-full sm:w-auto px-4 sm:px-3 rounded-xl sm:rounded-full flex items-center justify-center gap-2 text-xs sm:text-[10px] font-bold"
              >
                <Shield className="w-4 h-4 sm:w-3 sm:h-3 text-red-600" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('librarian')}
                className="btn-demo h-12 sm:h-9 w-full sm:w-auto px-4 sm:px-3 rounded-xl sm:rounded-full flex items-center justify-center gap-2 text-xs sm:text-[10px] font-bold"
              >
                <Book className="w-4 h-4 sm:w-3 sm:h-3 text-amber-600" />
                Librarian
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('student')}
                className="btn-demo h-12 sm:h-9 w-full sm:w-auto px-4 sm:px-3 rounded-xl sm:rounded-full flex items-center justify-center gap-2 text-xs sm:text-[10px] font-bold"
              >
                <GraduationCap className="w-4 h-4 sm:w-3 sm:h-3 text-rose-600" />
                Student
              </button>
            </div>

            <p className="text-center text-[10px] sm:text-xs text-muted-foreground/60 mt-4 sm:mt-6 font-sans">
              Need help? <button className="font-bold text-[#1A1A1A] hover:underline min-h-[44px] sm:min-h-0 px-2 sm:px-0 inline-flex items-center">Contact Librarian</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
