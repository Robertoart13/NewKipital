import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpButton } from './KpButton';

describe('KpButton', () => {
  it('renders with kp-button class', () => {
    const { container } = render(<KpButton>Guardar</KpButton>);
    expect(container.querySelector('.kp-button')).toBeInTheDocument();
  });

  it('renders children text correctly', () => {
    render(<KpButton>Crear Empleado</KpButton>);
    expect(screen.getByText('Crear Empleado')).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is passed', () => {
    const { container } = render(<KpButton disabled>Guardar</KpButton>);
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('calls onClick handler when clicked', () => {
    const onClick = vi.fn();
    render(<KpButton onClick={onClick}>Click</KpButton>);
    screen.getByText('Click').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders primary type correctly', () => {
    const { container } = render(<KpButton type="primary">Primario</KpButton>);
    expect(container.querySelector('.ant-btn-primary')).toBeInTheDocument();
  });

  it('renders danger variant correctly', () => {
    const { container } = render(<KpButton danger>Eliminar</KpButton>);
    expect(container.querySelector('.ant-btn-dangerous')).toBeInTheDocument();
  });
});
