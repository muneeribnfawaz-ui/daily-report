import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
import React from 'react';

describe('Card components', () => {
  it('renders Card composite correctly', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>My Title</CardTitle>
          <CardDescription>My Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">
          <p>Main Content</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Description')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('applies custom classes to Card elements', () => {
    render(
      <Card className="custom-card">
        <CardTitle className="custom-title">Title</CardTitle>
      </Card>
    );

    const card = screen.getByText('Title').parentElement;
    expect(card).toHaveClass('custom-card');
    expect(screen.getByText('Title')).toHaveClass('custom-title');
  });
});
