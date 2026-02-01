export interface CustomSelectOption {
    value: string;
    label: string;
}

export interface CustomSelectProps {
    value: string | string[];
    onChange: (value: string | string[]) => void;
    options: CustomSelectOption[];
    placeholder?: string;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
}
