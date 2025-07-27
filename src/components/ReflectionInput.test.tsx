import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReflectionInput } from './ReflectionInput';

describe('ReflectionInput', () => {
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(
      <ReflectionInput
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('反思总结')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('记录你的专注成果和反思...')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
  });

  it('calls onChange when text is entered', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionInput
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const textarea = screen.getByPlaceholderText('记录你的专注成果和反思...');
    await user.type(textarea, 'Test reflection');

    expect(mockOnChange).toHaveBeenCalledWith('Test reflection');
  });

  it('toggles between edit and preview mode', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionInput
        value="# Test Heading\nThis is a test."
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const toggleButton = screen.getByText('预览');
    await user.click(toggleButton);

    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('Test Heading')).toBeInTheDocument();
    expect(screen.getByText('This is a test.')).toBeInTheDocument();
  });

  it('shows empty preview message when no content', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionInput
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const toggleButton = screen.getByText('预览');
    await user.click(toggleButton);

    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('auto-saves content after delay', async () => {
    vi.useFakeTimers();
    
    render(
      <ReflectionInput
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        autoSave={true}
        autoSaveDelay={1000}
      />
    );

    // Simulate content change
    fireEvent.change(screen.getByPlaceholderText('记录你的专注成果和反思...'), {
      target: { value: 'New content' }
    });

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('New content');
    });

    vi.useRealTimers();
  });

  it('shows manual save button when autoSave is disabled', () => {
    render(
      <ReflectionInput
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        autoSave={false}
      />
    );

    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('calls onSave when manual save button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ReflectionInput
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        autoSave={false}
      />
    );

    const saveButton = screen.getByText('保存');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('Test content');
  });

  it('shows markdown tips', () => {
    render(
      <ReflectionInput
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/支持 Markdown 格式/)).toBeInTheDocument();
  });

  it('shows auto-save indicator when content has changed', async () => {
    vi.useFakeTimers();
    
    render(
      <ReflectionInput
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        autoSave={true}
        autoSaveDelay={2000}
      />
    );

    // Simulate content change
    fireEvent.change(screen.getByPlaceholderText('记录你的专注成果和反思...'), {
      target: { value: 'New content' }
    });

    expect(screen.getByText('正在自动保存...')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders markdown content correctly in preview mode', async () => {
    const user = userEvent.setup();
    const markdownContent = '**Bold text** and *italic text*';
    
    render(
      <ReflectionInput
        value={markdownContent}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const toggleButton = screen.getByText('预览');
    await user.click(toggleButton);

    expect(screen.getByText('Bold text')).toBeInTheDocument();
    expect(screen.getByText('italic text')).toBeInTheDocument();
  });
});