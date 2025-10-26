import { useState, useCallback } from 'react';

// Validation rules interface
export interface ValidationRule<T> {
  validate: (value: T) => boolean | string;
  message: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Form state interface
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string[]>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Hook for form validation
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>,
  onSubmit: (values: T) => void | Promise<void>
) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    isSubmitting: false,
    isValid: true,
  });

  // Validate a single field
  const validateField = useCallback(
    (fieldName: keyof T, value: T[keyof T]): string[] => {
      const rules = validationRules[fieldName];
      if (!rules) return [];

      const fieldErrors: string[] = [];
      for (const rule of rules) {
        const result = rule.validate(value);
        if (typeof result === 'string') {
          fieldErrors.push(result);
        } else if (!result) {
          fieldErrors.push(rule.message);
        }
      }
      return fieldErrors;
    },
    [validationRules]
  );

  // Validate all fields
  const validateAll = useCallback((): ValidationResult => {
    const allErrors: Partial<Record<keyof T, string[]>> = {};
    let isFormValid = true;

    for (const fieldName in validationRules) {
      if (validationRules.hasOwnProperty(fieldName)) {
        const fieldErrors = validateField(
          fieldName,
          formState.values[fieldName]
        );
        if (fieldErrors.length > 0) {
          allErrors[fieldName] = fieldErrors;
          isFormValid = false;
        }
      }
    }

    return { isValid: isFormValid, errors: Object.values(allErrors).flat() };
  }, [formState.values, validateField, validationRules]);

  // Handle input change
  const handleChange = useCallback(
    (fieldName: keyof T, value: T[keyof T]) => {
      setFormState((prevState) => {
        const newValues = { ...prevState.values, [fieldName]: value };
        const fieldErrors = validateField(fieldName, value);
        
        const newErrors = { ...prevState.errors };
        if (fieldErrors.length > 0) {
          newErrors[fieldName] = fieldErrors;
        } else {
          delete newErrors[fieldName];
        }

        const validation = validateAll();
        return {
          values: newValues,
          errors: newErrors,
          isSubmitting: prevState.isSubmitting,
          isValid: validation.isValid,
        };
      });
    },
    [validateField, validateAll]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      const validation = validateAll();
      if (!validation.isValid) {
        setFormState((prevState) => ({
          ...prevState,
          errors: { ...prevState.errors }, // This triggers re-render with errors
        }));
        return;
      }

      setFormState((prevState) => ({
        ...prevState,
        isSubmitting: true,
      }));

      try {
        await onSubmit(formState.values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setFormState((prevState) => ({
          ...prevState,
          isSubmitting: false,
        }));
      }
    },
    [formState.values, onSubmit, validateAll]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      isSubmitting: false,
      isValid: true,
    });
  }, [initialValues]);

  return {
    ...formState,
    handleChange,
    handleSubmit,
    resetForm,
    validateField,
  };
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule<any> => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    },
    message,
  }),
  
  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Let required rule handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),
  
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Let required rule handle empty values
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters long`,
  }),
  
  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Let required rule handle empty values
      return value.length <= max;
    },
    message: message || `Must be no more than ${max} characters long`,
  }),
  
  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (value == null) return true; // Let required rule handle null/undefined
      return value >= min;
    },
    message: message || `Must be at least ${min}`,
  }),
  
  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (value == null) return true; // Let required rule handle null/undefined
      return value <= max;
    },
    message: message || `Must be no more than ${max}`,
  }),
  
  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Let required rule handle empty values
      return regex.test(value);
    },
    message,
  }),
  
  numeric: (message = 'Must be a number'): ValidationRule<any> => ({
    validate: (value) => {
      if (value === null || value === undefined) return true; // Let required rule handle empty values
      const num = Number(value);
      return !isNaN(num) && isFinite(num);
    },
    message,
  }),
  
  positive: (message = 'Must be a positive number'): ValidationRule<number> => ({
    validate: (value) => {
      if (value == null) return true; // Let required rule handle null/undefined
      return value > 0;
    },
    message,
  }),
};