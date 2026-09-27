import type { ComponentType } from 'react';
import type { SceneComponentName, SceneProps } from '@/lib/types';
import { TitleScene } from './TitleScene';
import { ContentScene } from './ContentScene';
import { MemeScene } from './MemeScene';
import { RolePathScene } from './RolePathScene';

export const registry: Partial<Record<SceneComponentName, ComponentType<SceneProps>>> = {
  TitleScene,
  ContentScene,
  MemeScene,
  RolePathScene,
};
