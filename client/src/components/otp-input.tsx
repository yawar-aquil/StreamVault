import { useRef, useState, useCallback, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    autoFocus?: boolean;
}

export function OTPInput({ length = 6, value, onChange, autoFocus = false }: OTPInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

    useEffect(() => {
        if (autoFocus && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [autoFocus]);

    const focusInput = (index: number) => {
        if (index >= 0 && index < length && inputRefs.current[index]) {
            inputRefs.current[index]!.focus();
            inputRefs.current[index]!.select();
        }
    };

    const handleChange = useCallback((index: number, char: string) => {
        if (!/^\d$/.test(char)) return;
        const newValue = digits.slice();
        newValue[index] = char;
        const joined = newValue.join('').replace(/[^\d]/g, '').slice(0, length);
        onChange(joined);
        if (index < length - 1) {
            focusInput(index + 1);
        }
    }, [digits, length, onChange]);

    const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const newValue = digits.slice();
            if (digits[index]) {
                newValue[index] = '';
                onChange(newValue.join('').replace(/[^\d]/g, ''));
            } else if (index > 0) {
                newValue[index - 1] = '';
                onChange(newValue.join('').replace(/[^\d]/g, ''));
                focusInput(index - 1);
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            focusInput(index - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            focusInput(index + 1);
        }
    }, [digits, length, onChange]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (pastedData) {
            onChange(pastedData);
            focusInput(Math.min(pastedData.length, length - 1));
        }
    }, [length, onChange]);

    return (
        <div className="flex gap-3 justify-center">
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value.slice(-1))}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#e60a15] focus:border-transparent outline-none transition-all caret-transparent selection:bg-transparent"
                    aria-label={`Digit ${i + 1}`}
                />
            ))}
        </div>
    );
}
