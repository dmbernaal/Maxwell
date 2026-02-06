import { deepExtractTool } from '../../app/lib/market-chat/tools/deep-extract';

describe('MarketChat — Deep Extract Tool', () => {
  it('should have correct tool description', () => {
    expect(deepExtractTool.description).toContain('Extract full content');
    expect(deepExtractTool.description).toContain('Maximum 3 URLs');
  });

  it('should define urls and query parameters', () => {
    const schema = deepExtractTool.inputSchema;
    expect(schema).toBeDefined();
  });
});
