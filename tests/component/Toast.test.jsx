import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../../src/renderer/components/Toast';

describe('Toast', () => {
  let realTimers;

  beforeEach(() => {
    realTimers = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (!realTimers) {
      vi.useRealTimers();
    }
  });

  it('renders toast with message', () => {
    const onDismiss = vi.fn();
    render(<Toast id={1} message="Test message" type="info" onDismiss={onDismiss} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders success toast with correct styling', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <Toast id={1} message="Success!" type="success" onDismiss={onDismiss} />
    );
    const toastElement = container.firstChild;
    expect(toastElement).toHaveClass('bg-success-100');
    expect(toastElement).toHaveClass('text-success-700');
  });

  it('renders error toast with correct styling', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <Toast id={1} message="Error!" type="error" onDismiss={onDismiss} />
    );
    const toastElement = container.firstChild;
    expect(toastElement).toHaveClass('bg-danger-100');
    expect(toastElement).toHaveClass('text-danger-700');
  });

  it('renders info toast with correct styling', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <Toast id={1} message="Info!" type="info" onDismiss={onDismiss} />
    );
    const toastElement = container.firstChild;
    expect(toastElement).toHaveClass('bg-primary-100');
    expect(toastElement).toHaveClass('text-primary-700');
  });

  it('auto-dismisses after 5 seconds', () => {
    realTimers = false;
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast id={1} message="Test" type="info" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(onDismiss).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });

  it('calls onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast id={1} message="Test" type="info" onDismiss={onDismiss} />);

    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find((btn) => btn.textContent === '✕');

    await user.click(closeButton);

    expect(onDismiss).toHaveBeenCalledWith(1);
  });
});
