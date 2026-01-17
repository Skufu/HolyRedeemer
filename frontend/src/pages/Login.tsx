import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Eye, EyeOff, Loader2, Library } from 'lucide-react';
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

  // Generate floating dust motes
  const dustMotes = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: Math.random() * 15 + 20,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-library-gradient p-4 relative overflow-hidden">
      {/* Animated floating dust motes - like sunlight through library windows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {dustMotes.map((mote) => (
          <div
            key={mote.id}
            className="absolute rounded-full bg-secondary/60 animate-float-dust"
            style={{
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              left: `${mote.left}%`,
              bottom: '-10px',
              opacity: mote.opacity,
              animationDelay: `${mote.delay}s`,
              animationDuration: `${mote.duration}s`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
        
        {/* Warm light rays from top-right corner */}
        <div className="absolute -top-20 -right-20 w-[600px] h-[600px] opacity-[0.07]">
          <div className="absolute inset-0 bg-gradient-conic from-secondary via-transparent to-transparent animate-slow-spin" 
               style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} />
        </div>
        
        {/* Book spine pattern on left */}
        <div className="absolute left-0 top-0 bottom-0 w-32 opacity-[0.03] book-spine-pattern" />
        {/* Warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.05]" />
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary/[0.08] blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/[0.06] blur-3xl animate-pulse-slow" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and School Name */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm mb-5 shadow-warm-lg relative overflow-hidden border border-primary/20">
            <img src="/logo.png" alt="Holy Redeemer School Logo" className="w-full h-full object-contain p-2" />
            {/* Gold accent ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-secondary/30 pointer-events-none" />
          </div>
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
            Holy Redeemer School
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Library Management System</p>
        </div>

        <Card className="shadow-warm-lg border-0 animate-fade-in-up gold-border-top overflow-hidden" style={{ animationDelay: '0.1s' }}>
          {/* Decorative header pattern */}
          <div className="h-1 bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />
          
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-display text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the library system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11 bg-background/50 border-border/60 focus:border-secondary focus:ring-secondary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 pr-10 bg-background/50 border-border/60 focus:border-secondary focus:ring-secondary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-muted-foreground">
                    Remember me
                  </Label>
                </div>
                <Button variant="link" className="px-0 text-sm text-primary hover:text-primary/80">
                  Forgot password?
                </Button>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-warm transition-all hover:shadow-warm-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground tracking-wider">Demo Accounts</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoCredentials('admin')}
                className="text-xs border-border/60 hover:bg-secondary/10 hover:border-secondary/50 hover:text-secondary-foreground transition-all"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoCredentials('librarian')}
                className="text-xs border-border/60 hover:bg-secondary/10 hover:border-secondary/50 hover:text-secondary-foreground transition-all"
              >
                Librarian
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoCredentials('student')}
                className="text-xs border-border/60 hover:bg-secondary/10 hover:border-secondary/50 hover:text-secondary-foreground transition-all"
              >
                Student
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Click a role above to auto-fill demo credentials
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Holy Redeemer School of Cabuyao © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
