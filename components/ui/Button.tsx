
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 focus-ring';

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 text-white shadow-md hover:shadow-lg',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-md hover:shadow-lg',
    outline: 'border-2 border-gray-300 hover:border-gray-400 focus:ring-gray-500 text-gray-700 bg-white hover:bg-gray-50',
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      {...props}
      onMouseDown={(e) => {
        e.currentTarget.classList.add('animate-button-pulse');
        props.onMouseDown?.(e);
      }}
      onAnimationEnd={(e) => {
        e.currentTarget.classList.remove('animate-button-pulse');
      }}
    >
      {children}
    </button>
  );
};

export default Button;
