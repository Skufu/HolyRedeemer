import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

describe('NotFound Page', () => {
  it('renders 404 page', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-route']}>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/oops! page not found/i)).toBeInTheDocument();
    expect(screen.getByText(/return to home/i)).toBeInTheDocument();
  });

  it('has correct link to home', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-route']}>
        <NotFound />
      </MemoryRouter>
    );

    const homeLink = screen.getByText(/return to home/i).closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
