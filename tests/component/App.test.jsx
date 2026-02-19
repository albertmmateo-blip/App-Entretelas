import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/renderer/App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('App-Entretelas')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<App />);
    expect(
      screen.getByText(/Desktop business-manager application built with Electron/)
    ).toBeInTheDocument();
  });
});
