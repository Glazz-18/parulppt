import type { ComponentType } from 'react';
import type { SceneComponentName, SceneProps } from '@/lib/types';

export const registry: Partial<Record<SceneComponentName, ComponentType<SceneProps>>> = {};
