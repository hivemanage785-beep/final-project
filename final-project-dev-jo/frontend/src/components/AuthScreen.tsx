import React from 'react';
import { Hexagon } from 'lucide-react';

interface AuthScreenProps {
  onSignIn: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn }) => {
  return (
    <div className="flex bg-gray-50 items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-[#5D0623] text-white rounded-2xl flex items-center justify-center mb-4">
          <Hexagon size={36} fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buzz-Off</h1>
        <p className="text-gray-600 mb-8">Find the best location for your beehives.</p>
        
        <button 
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
