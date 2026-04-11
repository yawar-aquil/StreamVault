import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
    id: string;
    message: string;
    [key: string]: any;
}

// Cache translations to avoid re-translating the same text
const translationCache = new Map<string, string>();

function getCacheKey(text: string, lang: string): string {
    return `${lang}:${text}`;
}

export function useChatTranslation(messages: ChatMessage[]) {
    const { i18n } = useTranslation();
    const currentLang = i18n.language;
    const [translatedMessages, setTranslatedMessages] = useState<Map<string, string>>(new Map());
    const pendingRef = useRef<Set<string>>(new Set());
    const lastLangRef = useRef(currentLang);

    // Clear translations when language changes
    useEffect(() => {
        if (lastLangRef.current !== currentLang) {
            lastLangRef.current = currentLang;
            setTranslatedMessages(new Map());
            pendingRef.current.clear();
        }
    }, [currentLang]);

    // Translate new messages
    useEffect(() => {
        // Skip if language is English (source language)
        if (currentLang === 'en' || !currentLang) return;

        const untranslated = messages.filter(msg => {
            if (msg.username === 'System') return false;
            const cacheKey = getCacheKey(msg.message, currentLang);
            // Skip if already translated or pending
            if (translationCache.has(cacheKey)) return false;
            if (pendingRef.current.has(msg.id)) return false;
            if (translatedMessages.has(msg.id)) return false;
            // Skip media-only messages
            if (msg.message.startsWith('[ATTACHMENT:') || msg.message.startsWith('http')) return false;
            return true;
        });

        if (untranslated.length === 0) {
            // Check cache for any messages we already translated in a previous session
            let hasUpdates = false;
            const updates = new Map(translatedMessages);
            messages.forEach(msg => {
                const cacheKey = getCacheKey(msg.message, currentLang);
                if (translationCache.has(cacheKey) && !updates.has(msg.id)) {
                    updates.set(msg.id, translationCache.get(cacheKey)!);
                    hasUpdates = true;
                }
            });
            if (hasUpdates) setTranslatedMessages(updates);
            return;
        }

        // Mark as pending
        untranslated.forEach(msg => pendingRef.current.add(msg.id));

        // Batch translate
        const textsToTranslate = untranslated.map(msg => msg.message);

        fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: textsToTranslate, targetLang: currentLang }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.translated && Array.isArray(data.translated)) {
                    setTranslatedMessages(prev => {
                        const next = new Map(prev);
                        untranslated.forEach((msg, i) => {
                            const translated = data.translated[i];
                            if (translated && translated !== msg.message) {
                                next.set(msg.id, translated);
                                translationCache.set(getCacheKey(msg.message, currentLang), translated);
                            }
                            pendingRef.current.delete(msg.id);
                        });
                        return next;
                    });
                }
            })
            .catch(err => {
                console.error('Chat translation error:', err);
                untranslated.forEach(msg => pendingRef.current.delete(msg.id));
            });
    }, [messages, currentLang, translatedMessages]);

    // Get translated text for a message, falling back to original
    const getTranslatedMessage = useCallback((msg: ChatMessage): string => {
        if (currentLang === 'en' || !currentLang) return msg.message;

        // Check live state first
        if (translatedMessages.has(msg.id)) return translatedMessages.get(msg.id)!;

        // Check cache
        const cacheKey = getCacheKey(msg.message, currentLang);
        if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;

        return msg.message;
    }, [currentLang, translatedMessages]);

    const isTranslating = currentLang !== 'en' && pendingRef.current.size > 0;

    return { getTranslatedMessage, isTranslating, isTranslationActive: currentLang !== 'en' };
}
