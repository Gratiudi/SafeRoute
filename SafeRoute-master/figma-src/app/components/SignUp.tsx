import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Shield, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";

interface SignUpProps {
  onBack: () => void;
  onSignUpComplete: (userData: { name: string; contact: string; password: string; contactType: 'email' | 'phone' }) => void;
}

export function SignUp({ onBack, onSignUpComplete }: SignUpProps) {
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    contact?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Validation functions
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    // Accepts formats like: +1234567890, (123) 456-7890, 123-456-7890
    return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(phone.replace(/\s/g, ''));
  };

  const getContactType = (contact: string): 'email' | 'phone' | null => {
    if (isValidEmail(contact)) return 'email';
    if (isValidPhone(contact)) return 'phone';
    return null;
  };

  const validatePassword = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
    return requirements;
  };

  const passwordRequirements = validatePassword(password);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate all fields
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (!contact.trim()) {
      newErrors.contact = "Email or phone number is required";
    } else {
      const contactType = getContactType(contact);
      if (!contactType) {
        newErrors.contact = "Please enter a valid email address or phone number";
      } else {
        // Check for existing account (mock)
        const existingUsers = JSON.parse(localStorage.getItem('safetravel_users') || '[]');
        const userExists = existingUsers.some((user: any) => 
          user.contact.toLowerCase() === contact.toLowerCase()
        );
        if (userExists) {
          newErrors.contact = "An account with this email/phone already exists";
        }
      }
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isPasswordValid) {
      newErrors.password = "Password does not meet all requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    
    const contactType = getContactType(contact)!;
    onSignUpComplete({ 
      name: fullName, 
      contact, 
      password, 
      contactType 
    });
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
            <h2>Create Account</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Join SafeRoute to protect yourself on every journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={errors.fullName ? "border-red-500" : ""}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email or Phone */}
            <div className="space-y-2">
              <Label htmlFor="contact">Email Address or Phone Number</Label>
              <Input
                id="contact"
                type="text"
                placeholder="email@example.com or +1 (555) 123-4567"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className={errors.contact ? "border-red-500" : ""}
              />
              {errors.contact && (
                <p className="text-sm text-red-600">{errors.contact}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Password Requirements */}
            {password && (
              <Card className="p-3 bg-muted/50">
                <p className="text-sm mb-2">Password must contain:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    {passwordRequirements.length ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <X className="size-4 text-red-600" />
                    )}
                    <span className={passwordRequirements.length ? "text-green-600" : "text-muted-foreground"}>
                      At least 8 characters
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    {passwordRequirements.uppercase ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <X className="size-4 text-red-600" />
                    )}
                    <span className={passwordRequirements.uppercase ? "text-green-600" : "text-muted-foreground"}>
                      One uppercase letter
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    {passwordRequirements.lowercase ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <X className="size-4 text-red-600" />
                    )}
                    <span className={passwordRequirements.lowercase ? "text-green-600" : "text-muted-foreground"}>
                      One lowercase letter
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    {passwordRequirements.number ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <X className="size-4 text-red-600" />
                    )}
                    <span className={passwordRequirements.number ? "text-green-600" : "text-muted-foreground"}>
                      One number
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    {passwordRequirements.special ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <X className="size-4 text-red-600" />
                    )}
                    <span className={passwordRequirements.special ? "text-green-600" : "text-muted-foreground"}>
                      One special character
                    </span>
                  </li>
                </ul>
              </Card>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <Card className="p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Continue"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
