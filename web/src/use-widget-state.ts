/*
 *  Copyright 2025 Curity AB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { useOpenAiGlobal } from './use-openai-global';
import type { UnknownObject } from './types';

export function useWidgetState<T extends UnknownObject>(
    defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
    defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
    defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
    const widgetStateFromWindow = useOpenAiGlobal("widgetState") as T;

    const [widgetState, _setWidgetState] = useState<T | null>(() => {
        if (widgetStateFromWindow != null) {
            return widgetStateFromWindow;
        }

        return typeof defaultState === "function"
            ? defaultState()
            : defaultState ?? null;
    });

    useEffect(() => {
        _setWidgetState(widgetStateFromWindow);
    }, [widgetStateFromWindow]);

    const setWidgetState = useCallback(
        (state: SetStateAction<T | null>) => {
            _setWidgetState((prevState) => {
                const newState = typeof state === "function" ? state(prevState) : state;

                if (newState != null) {
                    window.openai.setWidgetState(newState);
                }

                return newState;
            });
        },
        [window.openai.setWidgetState]
    );

    return [widgetState, setWidgetState] as const;
}
