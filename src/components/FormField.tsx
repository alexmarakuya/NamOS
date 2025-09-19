import React from 'react';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  children,
  className = ""
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1 font-dm-sans">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 font-dm-sans">{error}</p>
      )}
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ error, className = "", ...props }) => {
  return (
    <input
      {...props}
      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent font-dm-sans ${
        error ? 'border-red-500' : ''
      } ${className}`}
    />
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ error, className = "", ...props }) => {
  return (
    <textarea
      {...props}
      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent font-dm-sans resize-none ${
        error ? 'border-red-500' : ''
      } ${className}`}
    />
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select: React.FC<SelectProps> = ({ error, className = "", children, ...props }) => {
  return (
    <select
      {...props}
      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent font-dm-sans bg-white ${
        error ? 'border-red-500' : ''
      } ${className}`}
    >
      {children}
    </select>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'sm',
  className = "", 
  children, 
  ...props 
}) => {
  const baseClasses = "font-dm-sans font-medium rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm"
  };
  
  const variantClasses = {
    primary: "bg-orange-500 text-white hover:bg-orange-600",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100"
  };
  
  return (
    <button
      {...props}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
