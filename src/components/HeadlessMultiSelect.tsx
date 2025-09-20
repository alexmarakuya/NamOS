import React, { useState, Fragment } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/20/solid';

export interface MultiSelectOption {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  color?: string;
  disabled?: boolean;
}

interface HeadlessMultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: MultiSelectOption[];
  onChange: (options: MultiSelectOption[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  maxDisplay?: number;
}

const HeadlessMultiSelect: React.FC<HeadlessMultiSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select options",
  disabled = false,
  error = false,
  className = "",
  maxDisplay = 3
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getAvatarColor = (color?: string, id?: string) => {
    if (color) return color;
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const index = id ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    return colors[index % colors.length];
  };

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.find(selected => selected.id === option.id)
  );


  const removeOption = (optionId: string) => {
    onChange(value.filter(selected => selected.id !== optionId));
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1 font-dm-sans">
          {label}
        </label>
      )}
      
      <Listbox value={value} onChange={onChange} disabled={disabled} multiple>
        <div className="relative">
          <Listbox.Button className={`
            relative w-full cursor-default rounded-md bg-white py-1.5 pl-2 pr-8 text-left text-sm
            border focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent
            font-dm-sans transition-colors min-h-[32px]
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400'}
          `}>
            <div className="flex flex-wrap items-center gap-1">
              {value.length === 0 ? (
                <span className="text-gray-500">{placeholder}</span>
              ) : (
                <>
                  {value.slice(0, maxDisplay).map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-1 bg-gray-100 rounded-md px-1.5 py-0.5 text-xs"
                    >
                      {option.avatar ? (
                        <img
                          src={option.avatar}
                          alt=""
                          className="h-3 w-3 flex-shrink-0 rounded-full"
                        />
                      ) : option.initials ? (
                        <div className={`h-3 w-3 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(option.color, option.id)}`}>
                          {option.initials}
                        </div>
                      ) : null}
                      <span className="font-dm-sans text-gray-700">{option.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOption(option.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 ml-0.5"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {value.length > maxDisplay && (
                    <span className="text-xs text-gray-500 font-dm-sans">
                      +{value.length - maxDisplay} more
                    </span>
                  )}
                </>
              )}
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Listbox.Options className="absolute z-50 mt-1 max-h-48 w-full overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-xs border-0 focus:ring-0 font-dm-sans placeholder-gray-400"
                autoFocus
              />
            </div>

            {/* Selected Options */}
            {value.length > 0 && (
              <div className="p-2 bg-gray-50 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1 font-dm-sans">SELECTED</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {value.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-2 p-1.5 rounded-md bg-white border border-gray-200"
                    >
                      {option.avatar ? (
                        <img
                          src={option.avatar}
                          alt=""
                          className="h-4 w-4 flex-shrink-0 rounded-full"
                        />
                      ) : option.initials ? (
                        <div className={`h-4 w-4 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(option.color, option.id)}`}>
                          {option.initials}
                        </div>
                      ) : null}
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900 font-dm-sans">
                          {option.name}
                        </div>
                      </div>
                      <button
                        onClick={() => removeOption(option.id)}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Options */}
            <div className="max-h-32 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-center text-gray-500 text-xs font-dm-sans">
                  {searchTerm ? 'No options found' : 'All options selected'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredOptions.map((option) => (
                    <Listbox.Option
                      key={option.id}
                      value={option}
                      disabled={option.disabled}
                      className={({ active }) =>
                        `relative cursor-default select-none py-1.5 pl-2 pr-8 transition-colors ${
                          active ? 'bg-orange-50 text-orange-900' : 'text-gray-900'
                        } ${
                          option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <div className="flex items-center">
                            {option.avatar ? (
                              <img
                                src={option.avatar}
                                alt=""
                                className="h-4 w-4 flex-shrink-0 rounded-full"
                              />
                            ) : option.initials ? (
                              <div className={`h-4 w-4 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(option.color, option.id)}`}>
                                {option.initials}
                              </div>
                            ) : null}
                            <span className={`block truncate font-dm-sans ${option.avatar || option.initials ? 'ml-2' : ''} ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}>
                              {option.name}
                            </span>
                          </div>
                          {selected ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-orange-600">
                              <CheckIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </div>
              )}
            </div>
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
};

export default HeadlessMultiSelect;
