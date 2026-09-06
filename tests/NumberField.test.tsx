// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumberField } from '../src/components/NumberField';

afterEach(cleanup);

// Controlled wrapper so the component receives updated value props (mirrors App.tsx usage).
function Controlled({ initial, onChange }: { initial: number; onChange?: (v: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      label="Test field"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

function getInput(container: HTMLElement) {
  return within(container).getByRole('textbox');
}

describe('NumberField', () => {
  it('renders the initial value', () => {
    const { container } = render(<Controlled initial={850} />);
    expect(getInput(container)).toHaveValue('850');
  });

  it('updates display as user types', async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled initial={850} />);
    const input = getInput(container);
    await user.clear(input);
    await user.type(input, '900');
    expect(input).toHaveValue('900');
  });

  it('does not show a leading zero when typing after clearing', async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled initial={32} />);
    const input = getInput(container);
    await user.clear(input);
    await user.type(input, '4');
    expect(input).toHaveValue('4');
  });

  it('does not show a leading zero when cursor is at end of "0" and user types a digit', async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled initial={0} />);
    const input = getInput(container);
    await user.click(input);
    await user.keyboard('{End}5');
    expect(input).toHaveValue('5');
  });

  it('fires onChange with the parsed number, not a zero-prefixed string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Controlled initial={0} onChange={onChange} />);
    const input = getInput(container);
    await user.click(input);
    await user.keyboard('{End}5');
    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(typeof lastCall).toBe('number');
    expect(lastCall).toBe(5);
  });

  it('restores previous value on blur if field is left empty', async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled initial={850} />);
    const input = getInput(container);
    await user.clear(input);
    expect(input).toHaveValue('');
    await user.tab();
    expect(input).toHaveValue('850');
  });

  it('deleting digit by digit never produces a leading zero mid-sequence', async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled initial={850} />);
    const input = getInput(container);
    await user.click(input);
    await user.keyboard('{End}');
    await user.keyboard('{Backspace}'); // 85
    expect(input).toHaveValue('85');
    await user.keyboard('{Backspace}'); // 8
    expect(input).toHaveValue('8');
    await user.keyboard('{Backspace}'); // empty
    expect(input).toHaveValue('');
    await user.keyboard('5'); // should be "5", not "05"
    expect(input).toHaveValue('5');
    await user.keyboard('0'); // 50
    expect(input).toHaveValue('50');
  });
});

// Controlled wrapper with min/max for range tests
function BoundedField({
  initial,
  min,
  max,
  onChange,
}: {
  initial: number;
  min: number;
  max: number;
  onChange?: (v: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      label="Bounded field"
      value={value}
      min={min}
      max={max}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('NumberField — range enforcement', () => {
  it('shows error state and message when value exceeds max', async () => {
    const user = userEvent.setup();
    const { container } = render(<BoundedField initial={32} min={18} max={70} />);
    const input = within(container).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '99');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(container.textContent).toContain('Enter a value between 18 and 70');
  });

  it('shows error state and message when value is below min', async () => {
    const user = userEvent.setup();
    const { container } = render(<BoundedField initial={32} min={18} max={70} />);
    const input = within(container).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(container.textContent).toContain('Enter a value between 18 and 70');
  });

  it('clamps to max on blur and clears the error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <BoundedField initial={32} min={18} max={70} onChange={onChange} />
    );
    const input = within(container).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '99');
    await user.tab(); // blur → clamps to 70
    expect(input).toHaveValue('70');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenLastCalledWith(70);
  });

  it('clamps to min on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <BoundedField initial={32} min={18} max={70} onChange={onChange} />
    );
    const input = within(container).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5');
    await user.tab();
    expect(input).toHaveValue('18');
    expect(onChange).toHaveBeenLastCalledWith(18);
  });

  it('shows no error for an in-range value', async () => {
    const user = userEvent.setup();
    const { container } = render(<BoundedField initial={32} min={18} max={70} />);
    const input = within(container).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '45');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(container.textContent).not.toContain('Maximum');
    expect(container.textContent).not.toContain('Minimum');
  });
});
