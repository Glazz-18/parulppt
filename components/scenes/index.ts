import type { ComponentType } from 'react';
import type { SceneComponentName, SceneProps } from '@/lib/types';
import { TitleScene } from './TitleScene';
import { ContentScene } from './ContentScene';
import { MemeScene } from './MemeScene';
import { NetworkScene } from './NetworkScene';
import { RolePathScene } from './RolePathScene';
import { TimelineScene } from './TimelineScene';
import { RagFlowScene } from './RagFlowScene';
import { AgentLoopScene } from './AgentLoopScene';
import { SupplyChainScene } from './SupplyChainScene';
import { AiWritesBugScene } from './AiWritesBugScene';
import { AiFixesBugScene } from './AiFixesBugScene';
import { ProblemProductScene } from './ProblemProductScene';
import { GovernanceCurveScene } from './GovernanceCurveScene';
import { ProgrammeScene } from './ProgrammeScene';

export const registry: Partial<Record<SceneComponentName, ComponentType<SceneProps>>> = {
  TitleScene,
  ContentScene,
  MemeScene,
  NetworkScene,
  RolePathScene,
  TimelineScene,
  RagFlowScene,
  AgentLoopScene,
  SupplyChainScene,
  AiWritesBugScene,
  AiFixesBugScene,
  ProblemProductScene,
  GovernanceCurveScene,
  ProgrammeScene,
};
