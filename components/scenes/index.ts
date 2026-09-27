import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import type { SceneComponentName, SceneProps } from '@/lib/types';
import { TitleScene } from './TitleScene';
import { ContentScene } from './ContentScene';
import { MemeScene } from './MemeScene';
import { NetworkScene } from './NetworkScene';
import { FinalScene } from './FinalScene';
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

const CampusBotDemo: ComponentType<SceneProps> = dynamic(() => import('./CampusBotDemo'));
const RagDemo: ComponentType<SceneProps> = dynamic(() => import('./RagDemo'));
const SocDemo: ComponentType<SceneProps> = dynamic(() => import('./SocDemo'));

export const registry: Partial<Record<SceneComponentName, ComponentType<SceneProps>>> = {
  TitleScene,
  ContentScene,
  MemeScene,
  NetworkScene,
  FinalScene,
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
  CampusBotDemo,
  RagDemo,
  SocDemo,
};
