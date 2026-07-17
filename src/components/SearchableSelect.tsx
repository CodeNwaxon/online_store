import { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaSearch } from 'react-icons/fa';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Select...", disabled = false, required = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (options.length <= 15) {
    return (
      <select
        required={required}
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-3 rounded-md border border-border bg-background text-sm disabled:bg-muted"
      >
        <option value="">{placeholder}</option>
        {options.map((opt, index) => <option key={`${opt}-${index}`} value={opt}>{opt}</option>)}
      </select>
    );
  }

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Hidden input for HTML5 required validation */}
      {required && (
        <input 
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}
          value={value}
          onChange={() => {}}
          required={required}
        />
      )}
      <div 
        className={`w-full p-3 rounded-md border border-border bg-background text-sm flex justify-between items-center cursor-pointer ${disabled ? 'bg-muted opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
        <FaChevronDown className="text-muted-foreground text-xs" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-60 flex flex-col">
          <div className="p-2 border-b border-border bg-muted/30 sticky top-0">
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-2.5 text-muted-foreground text-xs" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-border bg-background focus:outline-none focus:border-primary"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1 custom-scrollbar">
            <div 
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted rounded ${!value ? 'bg-primary/10 font-bold' : ''}`}
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
            >
              {placeholder}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground italic text-center">No results found</div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={`${opt}-${index}`}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted rounded ${value === opt ? 'bg-primary/10 font-bold text-primary' : ''}`}
                  onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
