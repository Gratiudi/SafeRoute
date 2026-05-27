import { Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface LandingPageProps {
  onLogin: () => void;
  onSignUp: () => void;
}

export function LandingPage({ onLogin, onSignUp }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="size-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Shield className="size-12 text-white" />
          </div>
          <div>
            <h1 className="text-blue-600 dark:text-blue-400">SafeRoute</h1>
            <p className="text-muted-foreground mt-2">
              Your safety companion for every journey
            </p>
          </div>
        </div>

        {/* Features */}
        <Card className="p-6 space-y-4">
          <h3 className="text-center">Stay Protected With</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="size-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm">Safe route navigation with real-time safety scores</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="size-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm">Real-time location sharing with trusted contacts</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="size-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm">Emergency SOS with automatic evidence recording</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="size-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm">Delayed alert system for uncertain situations</p>
              </div>
            </li>
          </ul>
        </Card>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={onSignUp}
          >
            Create Account
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 text-base"
            onClick={onLogin}
          >
            Login
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
