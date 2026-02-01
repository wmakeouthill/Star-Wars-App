import { useEffect, useRef, useState } from 'react';
import type { CustomSelectProps } from './CustomSelect.types';
import styles from './CustomSelect.module.css';

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  multiple = false,
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fecha dropdown ao pressionar Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const isSelected = (optionValue: string): boolean => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  const getDisplayValue = (): string => {
    if (multiple) {
      const selectedCount = Array.isArray(value) ? value.length : 0;
      if (selectedCount === 0) return placeholder;
      if (selectedCount === 1) {
        const selectedOption = options.find((opt) => opt.value === value[0]);
        return selectedOption?.label || placeholder;
      }
      return `${selectedCount} selecionados`;
    }

    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption?.label || placeholder;
  };

  const renderMultiValueTags = () => {
    if (!multiple || !Array.isArray(value) || value.length === 0) return null;
    if (value.length > 3) return null; // Mostra contador ao invés de tags quando muitos

    return (
      <div className={styles.multiValue}>
        {value.slice(0, 3).map((val) => {
          const option = options.find((opt) => opt.value === val);
          return (
            <span key={val} className={styles.multiValueTag}>
              {option?.label || val}
            </span>
          );
        })}
      </div>
    );
  };

  const displayValue = getDisplayValue();
  const isPlaceholder = displayValue === placeholder;

  return (
    <div ref={selectRef} className={`${styles.select} ${className}`}>
      <button
        type="button"
        className={`${styles.selectButton} ${isOpen ? styles.open : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={isPlaceholder ? styles.placeholder : ''}>
          {multiple && Array.isArray(value) && value.length > 0 && value.length <= 3
            ? renderMultiValueTags()
            : displayValue}
        </span>
        <span className={`${styles.arrow} ${isOpen ? styles.open : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {options.length === 0 ? (
            <div className={styles.emptyState}>Nenhuma opção disponível</div>
          ) : (
            options.map((option) => {
              const selected = isSelected(option.value);
              return (
                <div
                  key={option.value}
                  className={`${styles.option} ${selected ? styles.selected : ''}`}
                  onClick={() => handleOptionClick(option.value)}
                  role="option"
                  aria-selected={selected}
                >
                  {multiple && (
                    <div className={`${styles.checkbox} ${selected ? styles.checked : ''}`} />
                  )}
                  <span>{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
