import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';
import React from 'react';

describe('Badge component', () => {
  it('renders default variant correctly', () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('border-primary');
    expect(badge).toHaveClass('bg-primary');
  });

  it('renders outline variant correctly', () => {
    render(<Badge variant="outline">Outline Badge</Badge>);
    const badge = screen.getByText('Outline Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-card');
  });

  it('renders soft variant correctly', () => {
    render(<Badge variant="soft">Soft Badge</Badge>);
    const badge = screen.getByText('Soft Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('border-transparent');
    expect(badge).toHaveClass('bg-muted');
  });

  it('applies custom classes', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-badge');
  });
});
