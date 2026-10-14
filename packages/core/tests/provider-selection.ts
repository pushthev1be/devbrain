import { getProvider, resetProvider, extractKnowledge, getEmbedding } from '../src/backend';
import { GeminiProvider } from '../src/providers/geminiProvider';
import { NvidiaProvider } from '../src/providers/nvidiaProvider';

async function runTests() {
  console.log('Running AI backend provider tests...');

  // Enable mock mode
  process.env.DEVBRAIN_MOCK = 'true';

  // Test 1: Gemini Selection (default)
  console.log('\nTest 1: Testing default provider selection (should be Gemini)...');
  delete process.env.DEVBRAIN_AI_BACKEND;
  resetProvider();
  let provider = getProvider();
  if (!(provider instanceof GeminiProvider)) {
    throw new Error('Default provider should be GeminiProvider');
  }
  console.log('✓ Default provider is GeminiProvider');

  // Test 2: Explicit Gemini Selection
  console.log('\nTest 2: Testing explicit Gemini provider selection...');
  process.env.DEVBRAIN_AI_BACKEND = 'gemini';
  resetProvider();
  provider = getProvider();
  if (!(provider instanceof GeminiProvider)) {
    throw new Error('Explicitly selected provider should be GeminiProvider');
  }
  console.log('✓ Explicitly selected provider is GeminiProvider');

  // Test 3: Nvidia Selection
  console.log('\nTest 3: Testing Nvidia provider selection...');
  process.env.DEVBRAIN_AI_BACKEND = 'nvidia';
  resetProvider();
  provider = getProvider();
  if (!(provider instanceof NvidiaProvider)) {
    throw new Error('Selected provider should be NvidiaProvider');
  }
  console.log('✓ Selected provider is NvidiaProvider');

  // Test 4: Gemini Mock Execution
  console.log('\nTest 4: Testing Gemini mock execution...');
  process.env.DEVBRAIN_AI_BACKEND = 'gemini';
  resetProvider();
  const geminiKnowledge = await extractKnowledge('diff text', 'feat: add status monitor dashboard');
  const geminiEmbed = await getEmbedding('some query');
  if (!geminiKnowledge || geminiKnowledge.problem !== 'Initial status monitor system dashboard component') {
    throw new Error('Gemini mock extractKnowledge failed');
  }
  if (!geminiEmbed || geminiEmbed.length !== 3072) {
    throw new Error('Gemini mock getEmbedding failed');
  }
  console.log('✓ Gemini mock execution succeeded');

  // Test 5: Nvidia Mock Execution
  console.log('\nTest 5: Testing Nvidia mock execution...');
  process.env.DEVBRAIN_AI_BACKEND = 'nvidia';
  resetProvider();
  const nvidiaKnowledge = await extractKnowledge('diff text', 'feat: add status monitor dashboard');
  const nvidiaEmbed = await getEmbedding('some query');
  if (!nvidiaKnowledge || nvidiaKnowledge.problem !== 'Initial status monitor system dashboard component') {
    throw new Error('Nvidia mock extractKnowledge failed');
  }
  if (!nvidiaEmbed || nvidiaEmbed.length !== 3072) {
    throw new Error('Nvidia mock getEmbedding failed');
  }
  console.log('✓ Nvidia mock execution succeeded');

  console.log('\n🎉 All tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
