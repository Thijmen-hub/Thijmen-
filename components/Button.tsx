import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, isLoading, className, ...props }) => {
  return (
    <button
      className={`btn-primary ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="spinner"></div>}
      {children}
    </button>
  );
};