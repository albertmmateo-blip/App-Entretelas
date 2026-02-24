import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryForm from '../../src/renderer/components/EntryForm';
import ConfirmDialog from '../../src/renderer/components/ConfirmDialog';

describe('Keyboard navigation for entry flows', () => {
  it('submits EntryForm with Enter on input fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EntryForm
        fields={[{ name: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 255 }]}
        initialValues={{ nombre: '' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Nombre *'), '  Nota test  ');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({ nombre: 'Nota test' });
  });

  it('does not submit EntryForm with Enter inside textarea', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EntryForm
        fields={[
          {
            name: 'descripcion',
            label: 'Descripción',
            type: 'textarea',
            required: false,
            maxLength: 5000,
          },
        ]}
        initialValues={{ descripcion: '' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Descripción'), 'línea 1{Enter}línea 2');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels EntryForm with Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <EntryForm
        fields={[
          { name: 'nombre', label: 'Nombre', type: 'text', required: false, maxLength: 255 },
        ]}
        initialValues={{ nombre: '' }}
        onSubmit={vi.fn().mockResolvedValue(true)}
        onCancel={onCancel}
      />
    );

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('handles Enter and Escape in ConfirmDialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <ConfirmDialog
        title="Confirmar"
        message="Mensaje"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        title="Confirmar"
        message="Mensaje"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
