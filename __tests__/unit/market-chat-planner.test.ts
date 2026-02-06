import { researchPlanSchema, type ResearchPlan } from '../../app/lib/market-chat/planner';

describe('MarketChat — Planner', () => {
  describe('researchPlanSchema', () => {
    it('should validate a well-formed research plan', () => {
      const validPlan: ResearchPlan = {
        reasoning: 'Need to check latest polling data and expert analysis',
        subtasks: [
          {
            id: 'search-1',
            type: 'search',
            description: 'Find latest polling data',
            params: { query: 'latest polls 2026', depth: 'basic', maxResults: 5 },
            dependsOn: [],
          },
          {
            id: 'search-2',
            type: 'search',
            description: 'Expert analysis on market',
            params: { query: 'expert analysis prediction market', depth: 'basic' },
            dependsOn: [],
          },
          {
            id: 'synth-1',
            type: 'synthesize',
            description: 'Combine findings into recommendation',
            params: {},
            dependsOn: ['search-1', 'search-2'],
          },
        ],
        estimatedTimeSeconds: 15,
      };

      const result = researchPlanSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    it('should reject plans with more than 7 subtasks', () => {
      const tooManyTasks: ResearchPlan = {
        reasoning: 'test',
        subtasks: Array.from({ length: 8 }, (_, i) => ({
          id: `task-${i}`,
          type: 'search' as const,
          description: `Task ${i}`,
          params: {},
          dependsOn: [],
        })),
        estimatedTimeSeconds: 60,
      };

      const result = researchPlanSchema.safeParse(tooManyTasks);
      expect(result.success).toBe(false);
    });

    it('should require at least one subtask', () => {
      const emptyPlan = {
        reasoning: 'test',
        subtasks: [],
        estimatedTimeSeconds: 5,
      };

      const result = researchPlanSchema.safeParse(emptyPlan);
      expect(result.success).toBe(false);
    });

    it('should validate subtask types', () => {
      const validTypes = ['search', 'calculate', 'extract', 'synthesize'];
      for (const type of validTypes) {
        const plan = {
          reasoning: 'test',
          subtasks: [{
            id: 'task-1',
            type,
            description: 'test task',
            params: {},
            dependsOn: [],
          }],
          estimatedTimeSeconds: 5,
        };
        const result = researchPlanSchema.safeParse(plan);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid subtask types', () => {
      const plan = {
        reasoning: 'test',
        subtasks: [{
          id: 'task-1',
          type: 'hack_the_planet',
          description: 'test task',
          params: {},
          dependsOn: [],
        }],
        estimatedTimeSeconds: 5,
      };
      const result = researchPlanSchema.safeParse(plan);
      expect(result.success).toBe(false);
    });
  });
});
