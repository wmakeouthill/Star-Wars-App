import { CustomSelect, type CustomSelectOption } from '@/shared/components';
import { useFilmOptions } from '@/shared/hooks/useFilmOptions';

export interface FilmFilterProps {
  value: string;
  onChange: (filmId: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Componente de filtro de filmes reutilizável.
 * Usado em todas as páginas para filtrar por filme.
 */
export function FilmFilter({
  value,
  onChange,
  placeholder = 'Filtrar por filme',
  className,
}: FilmFilterProps) {
  const { options, isLoading } = useFilmOptions();

  // Adiciona opção "Todos" no início
  const allOptions: CustomSelectOption[] = [
    { value: '', label: 'Todos os filmes' },
    ...options,
  ];

  return (
    <CustomSelect
      value={value}
      onChange={(newValue) => onChange(newValue as string)}
      options={allOptions}
      placeholder={isLoading ? 'Carregando filmes...' : placeholder}
      disabled={isLoading}
      className={className}
    />
  );
}
