import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';
import React from 'react';

describe('Input component', () => {
  it('renders a text input by default', () => {
    render(<Input placeholder="Enter name" />);
    const input = screen.getByPlaceholderText('Enter name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('handles user typing correctly', () => {
    render(<Input placeholder="Type here" />);
    
    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello World' } });
    
    expect(input.value).toBe('Hello World');
  });

  it('calls custom onPointerDown handler', () => {
    const onPointerDownMock = vi.fn();
    render(<Input placeholder="Click me" onPointerDown={onPointerDownMock} />);
    
    const input = screen.getByPlaceholderText('Click me');
    fireEvent.pointerDown(input);
    
    expect(onPointerDownMock).toHaveBeenCalledTimes(1);
  });
});
