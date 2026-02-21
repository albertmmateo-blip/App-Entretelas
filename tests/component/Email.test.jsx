import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Email from '../../src/renderer/pages/Email';

describe('Email page', () => {
  it('renders a Gmail webview with required security attributes', () => {
    render(<Email />);

    const webview = document.querySelector('webview');

    expect(webview).toBeInTheDocument();
    expect(webview).toHaveAttribute('src', 'https://mail.google.com');
    expect(webview).toHaveAttribute('partition', 'persist:gmail');
    expect(webview).toHaveAttribute('allowpopups', 'false');
    expect(webview).toHaveAttribute('disablewebsecurity', 'false');
    expect(webview).toHaveAttribute('nodeintegration', 'false');
  });
});
