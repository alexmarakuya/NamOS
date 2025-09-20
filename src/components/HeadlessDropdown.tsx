import React from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';

export interface DropdownOption {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  color?: string;
  disabled?: boolean;
}

interface HeadlessDropdownProps {
  label?: string;
  options: DropdownOption[];
  value: DropdownOption | null;
  onChange: (option: DropdownOption) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const HeadlessDropdown: React.FC<HeadlessDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  error = false,
  className = ""
}) => {
  const getAvatarColor = (color?: string) => {
    if (color) return color;
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1 font-dm-sans">
          {label}
        </label>
      )}
      
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button className={`
            relative w-full cursor-default rounded-md bg-white py-1.5 pl-2 pr-8 text-left text-sm
            border focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent
            font-dm-sans transition-colors
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400'}
          `}>
            <span className="flex items-center">
              {value ? (
                <>
                  {value.avatar ? (
                    <img
                      src={value.avatar}
                      alt=""
                      className="h-4 w-4 flex-shrink-0 rounded-full"
                    />
                  ) : value.initials ? (
                    <div className={`h-4 w-4 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(value.color)}`}>
                      {value.initials}
                    </div>
                  ) : null}
                  <span className={`block truncate ${value.avatar || value.initials ? 'ml-2' : ''}`}>
                    {value.name}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Listbox.Options className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.id}
                value={option}
                disabled={option.disabled}
                className={({ active, selected }) =>
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
                        <div className={`h-4 w-4 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(option.color)}`}>
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
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
};

export default HeadlessDropdown;
