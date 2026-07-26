import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

export function useIsFocused() {
    const [isFocused, setIsFocused] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);
            return () => {
                setIsFocused(false);
            };
        }, [])
    );

    return isFocused;
}
