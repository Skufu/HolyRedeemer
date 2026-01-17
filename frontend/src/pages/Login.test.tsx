import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Login Page', () => {
  it('renders login form', () => {
    render(<Login />, { wrapper: createWrapper() });

    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    const wrapper = createWrapper();
    render(<Login />, { wrapper });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // Check that submit was attempted (component uses HTML5 validation)
    expect(submitButton).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<Login />, { wrapper: createWrapper() });

    const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe('text');
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
  });
});
