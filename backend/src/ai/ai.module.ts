import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { GuardrailsService } from './guardrails/guardrails.service';
import { ResponseValidatorService } from './guardrails/response-validator.service';
import { RiskClassifierService } from './risk/risk-classifier.service';
import { PromptRegistry } from './prompts/prompt-registry';
import { LlmProvider } from './llm/llm.provider';
import { EscalationService } from './escalation/escalation.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [KnowledgeModule],
  controllers: [AiController],
  providers: [
    AiOrchestratorService,
    GuardrailsService,
    ResponseValidatorService,
    RiskClassifierService,
    PromptRegistry,
    LlmProvider,
    EscalationService,
  ],
  exports: [AiOrchestratorService, EscalationService, RiskClassifierService],
})
export class AiModule {}
