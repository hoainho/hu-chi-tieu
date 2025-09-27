import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg';
  opacity?: number;
  border?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  blur = 'md',
  opacity = 0.1,
  border = true
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg'
  };

  const borderClasses = border
    ? 'border border-white/20'
    : '';

  return (
    <div 
      className={`
        relative rounded-2xl ${blurClasses[blur]} ${borderClasses}
        shadow-xl shadow-black/10 transition-all duration-300
        ${className}
      `}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${opacity})`
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 rounded-2xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
