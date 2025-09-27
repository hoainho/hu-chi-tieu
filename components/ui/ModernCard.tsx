import React from 'react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  glow?: boolean;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className = '',
  gradient = false,
  glow = false,
  hover = true,
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `
    relative overflow-hidden rounded-2xl border backdrop-blur-sm
    transition-all duration-300 ease-out
    ${paddingClasses[padding]}
  `;

  const gradientClasses = gradient
    ? 'bg-gradient-to-br from-white/90 via-white/80 to-white/70 border-white/20'
    : 'bg-white/80 border-gray-200/50';

  const glowClasses = glow
    ? 'shadow-2xl shadow-blue-500/10'
    : 'shadow-lg shadow-black/5';

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 hover:scale-[1.02]'
    : '';

  return (
    <div className={`${baseClasses} ${gradientClasses} ${glowClasses} ${hoverClasses} ${className}`}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ModernCard;
