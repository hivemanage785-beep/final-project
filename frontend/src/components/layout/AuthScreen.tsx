import React from 'react';
import { Hexagon, Loader2 } from 'lucide-react';

/**
 * AuthScreen Component
 * 
 * Displays the login screen with Google Sign-In functionality.
 * This is the entry point for unauthenticated users.
 * 
 * Props:
 * - onSignIn: Callback function triggered when user clicks sign-in button
 * - loading: Boolean indicating if authentication is in progress
 * - error: Error message to display to user, if any
 */
interface AuthScreenProps {
  onSignIn: () => void;
  loading?: boolean;
  error?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  loading = false,
  error = null,
}) => {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo Container */}
        <div className="auth-logo">
          <Hexagon size={32} color="#fff" fill="#fff" />
        </div>

        {/* Branding */}
        <h1 className="auth-title">HiveOps</h1>
        <p className="auth-subtitle">
          Precision beekeeping intelligence
          <br />
          for Tamil Nadu apiaries.
        </p>

        {/* Error Message (Conditional) */}
        {error && <ErrorAlert message={error} />}

        {/* Sign-In Button */}
        <SignInButton onClick={onSignIn} isLoading={loading} />

        {/* Terms of Service */}
        <p className="auth-terms">
          By signing in you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
};

/**
 * ErrorAlert Component
 * Displays authentication errors in a prominent alert box.
 */
interface ErrorAlertProps {
  message: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => (
  <div className="auth-error-alert" role="alert">
    {message}
  </div>
);

/**
 * SignInButton Component
 * Google Sign-In button with loading state handling.
 */
interface SignInButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const SignInButton: React.FC<SignInButtonProps> = ({ onClick, isLoading }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="auth-signin-btn"
    aria-label={isLoading ? 'Authenticating' : 'Sign in with Google'}
  >
    {isLoading ? (
      <Loader2 size={18} className="auth-signin-loader" aria-hidden="true" />
    ) : (
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt=""
        className="auth-signin-icon"
      />
    )}
    <span>{isLoading ? 'Authenticating...' : 'Continue with Google'}</span>
  </button>
);