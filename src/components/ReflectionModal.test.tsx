import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReflectionModal } from './ReflectionModal';

describe('ReflectionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('反思总结')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('记录你的专注成果和反思...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ReflectionModal
        isOpen={false}
        onClose={mockOnClose}
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('反思总结')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const closeButton = screen.getByTitle('关闭');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('toggles between edit and preview mode', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value="# Test Heading"
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const toggleButton = screen.getByText('预览');
    await user.click(toggleButton);

    expect(screen.getByText('编辑')).toBeInTheDocument();
  });

  it('can be minimized and expanded', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const minimizeButton = screen.getByTitle('最小化');
    await user.click(minimizeButton);

    expect(screen.getByTitle('展开')).toBeInTheDocument();
  });

  it('calls onChange when text is entered', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByPlaceholderText('记录你的专注成果和反思...');
    await user.type(textarea, 'Test content');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('shows manual save button when autoSave is disabled', () => {
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        autoSave={false}
      />
    );

    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('shows markdown tips', () => {
    render(
      <ReflectionModal
        isOpen={true}
        onClose={mockOnClose}
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/支持 Markdown 格式/)).toBeInTheDocument();
  });
});