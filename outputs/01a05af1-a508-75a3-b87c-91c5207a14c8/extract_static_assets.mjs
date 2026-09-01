import fs from 'node:fs/promises';

const output = '/Users/project/MSSClaw/outputs/01a05af1-a508-75a3-b87c-91c5207a14c8/static-assets.json';
const skills = await import('/tmp/mss-skills.cjs');
const agents = await import('/tmp/mss-agents.cjs');

await fs.writeFile(
  output,
  JSON.stringify({
    sourceFiles: {
      skills: '/Users/project/MSSClaw/apps/web/src/domain/prototype/skills.ts',
      agents: '/Users/project/MSSClaw/apps/web/src/domain/prototype/agents.ts',
    },
    skills: skills.PROTOTYPE_SKILLS,
    agents: agents.PROTOTYPE_AGENTS,
  }, null, 2),
  'utf8',
);
console.log(JSON.stringify({
  skills: skills.PROTOTYPE_SKILLS.length,
  agents: agents.PROTOTYPE_AGENTS.length,
  output,
}));
