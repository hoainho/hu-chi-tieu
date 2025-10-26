import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, validationRules } from '../hooks/useFormValidation';

// Mock form data
interface TestForm {
  name: string;
  email: string;
  age: number;
}

describe('useFormValidation', () => {
  const initialValues: TestForm = {
    name: '',
    email: '',
    age: 0,
  };

  const validationRulesConfig = {
    name: [validationRules.required('Name is required'), validationRules.minLength(2, 'Name must be at least 2 characters')],
    email: [validationRules.required('Email is required'), validationRules.email('Invalid email format')],
    age: [validationRules.required('Age is required'), validationRules.min(18, 'Must be at least 18 years old'), validationRules.positive('Age must be positive')],
  };

  const mockSubmit = vi.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('initializes with correct form state', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isValid).toBe(true); // Initially considered valid (before validation)
  });

  it('updates values when handleChange is called', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    act(() => {
      result.current.handleChange('name', 'John Doe');
    });

    expect(result.current.values.name).toBe('John Doe');
  });

  it('validates fields correctly', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    // Test invalid name
    act(() => {
      result.current.handleChange('name', 'A'); // Too short
    });

    expect(result.current.errors.name).toContain('Name must be at least 2 characters');

    // Test valid name
    act(() => {
      result.current.handleChange('name', 'John');
    });

    expect(result.current.errors.name).toBeUndefined();
  });

  it('validates email format', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    // Test invalid email
    act(() => {
      result.current.handleChange('email', 'invalid-email');
    });

    expect(result.current.errors.email).toContain('Invalid email format');

    // Test valid email
    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('validates age constraints', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    // Test age under 18
    act(() => {
      result.current.handleChange('age', 16);
    });

    expect(result.current.errors.age).toContain('Must be at least 18 years old');

    // Test valid age
    act(() => {
      result.current.handleChange('age', 25);
    });

    expect(result.current.errors.age).toBeUndefined();
  });

  it('submits form when all validations pass', async () => {
    const validValues: TestForm = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
    };

    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    // Fill in valid values
    act(() => {
      result.current.handleChange('name', validValues.name);
      result.current.handleChange('email', validValues.email);
      result.current.handleChange('age', validValues.age);
    });

    // Submit the form
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(mockSubmit).toHaveBeenCalledWith(validValues);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does not submit when validation fails', async () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    // Try to submit without filling required fields
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('resets form to initial values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRulesConfig, mockSubmit)
    );

    // Change some values
    act(() => {
      result.current.handleChange('name', 'Test Name');
      result.current.handleChange('email', 'test@example.com');
    });

    // Reset the form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(true);
  });
});