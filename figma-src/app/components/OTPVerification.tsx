import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Shield, Mail, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";

interface OTPVerificationProps {
  contactType: 'email' | 'phone';
  contact: string;
  onBack: () => void;
  onVerified: () => void;
}

export function OTPVerification({ contactType, contact, onBack, onVerified }: OTPVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value) {
      const fullOtp = [...newOtp.slice(0, 5), value].join("");
      handleVerify(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    
    // Only process if it's 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join("");
    
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API verification
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock verification - in real app, this would verify with backend
    // For demo, accept "123456" or any 6 digits
    const isValid = /^\d{6}$/.test(code);

    setIsLoading(false);

    if (isValid) {
      onVerified();
    } else {
      setError("Invalid verification code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setOtp(["", "", "", "", "", ""]);
    setError("");

    // Simulate sending new OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    inputRefs.current[0]?.focus();
    
    // In a real app, this would trigger the backend to send a new OTP
    console.log("New OTP sent to:", contact);
  };

  const maskedContact = contactType === 'email' 
    ? contact.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : contact.replace(/(\d{2})(\d+)(\d{2})/, '$1***$3');

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
            <h2>Verify Your {contactType === 'email' ? 'Email' : 'Phone'}</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Icon */}
          <div className="text-center">
            <div className="size-20 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
              {contactType === 'email' ? (
                <Mail className="size-10 text-blue-600 dark:text-blue-400" />
              ) : (
                <Smartphone className="size-10 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <h3>Enter Verification Code</h3>
            <p className="text-sm text-muted-foreground mt-2">
              We've sent a 6-digit code to
            </p>
            <p className="text-sm mt-1">
              {maskedContact}
            </p>
          </div>

          {/* OTP Input */}
          <div className="space-y-4">
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`size-12 text-center text-xl ${error ? "border-red-500" : ""}`}
                  disabled={isLoading}
                />
              ))}
            </div>

            {error && (
              <Card className="p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </Card>
            )}

            {isLoading && (
              <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                  Verifying code...
                </p>
              </Card>
            )}
          </div>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            {canResend ? (
              <Button 
                variant="link" 
                className="text-sm h-auto p-0 mt-1"
                onClick={handleResend}
              >
                Resend Code
              </Button>
            ) : (
              <p className="text-sm mt-1">
                Resend in {resendTimer}s
              </p>
            )}
          </div>

          {/* Manual Verify Button (optional) */}
          <Button 
            className="w-full h-12"
            onClick={() => handleVerify()}
            disabled={isLoading || otp.join("").length !== 6}
          >
            Verify
          </Button>

          {/* Info */}
          <Card className="p-4 bg-muted/50">
            <p className="text-xs text-center text-muted-foreground">
              For demo purposes, enter any 6-digit code to proceed
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
