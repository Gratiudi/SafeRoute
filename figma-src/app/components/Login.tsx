import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";

interface LoginProps {
  onBack: () => void;
  onLoginSuccess: (userData: { name: string; contact: string }) => void;
}

export function Login({ onBack, onLoginSuccess }: LoginProps) {
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact.trim()) {
      setError("Please enter your email or phone number");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock authentication - check localStorage for registered users
    const users = JSON.parse(localStorage.getItem('safetravel_users') || '[]');
    const user = users.find((u: any) => 
      u.contact.toLowerCase() === contact.toLowerCase() && 
      u.password === password
    );

    setIsLoading(false);

    if (user) {
      // Store current user session
      localStorage.setItem('safetravel_current_user', JSON.stringify({
        name: user.name,
        contact: user.contact
      }));
      onLoginSuccess({ name: user.name, contact: user.contact });
    } else {
      setError("Invalid email/phone or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="size-4 text-white" />
            </div>
            <h2>Login</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h3>Welcome Back</h3>
            <p className="text-muted-foreground mt-2">
              Sign in to continue protecting your journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Phone */}
            <div className="space-y-2">
              <Label htmlFor="contact">Email Address or Phone Number</Label>
              <Input
                id="contact"
                type="text"
                placeholder="email@example.com or +1 (555) 123-4567"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button 
                  type="button"
                  variant="link" 
                  className="text-sm h-auto p-0"
                  onClick={() => alert("Password reset functionality would be implemented here")}
                >
                  Forgot?
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Card className="p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Login"}
            </Button>
          </form>

          {/* Demo Info */}
          <Card className="p-4 bg-muted/50">
            <p className="text-xs text-center text-muted-foreground">
              <strong>Demo:</strong> Create an account first, or use any previously created credentials
            </p>
          </Card>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button 
                type="button"
                variant="link" 
                className="text-sm h-auto p-0"
                onClick={onBack}
              >
                Create Account
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
