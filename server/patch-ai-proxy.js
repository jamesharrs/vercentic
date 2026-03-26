const fs = require('fs');

// 1. Copy proxy route
fs.copyFileSync('server/ai-proxy.js', 'server/routes/ai-proxy.js');
console.log('✅ Copied ai-proxy.js to routes/');

// 2. Add route to index.js
let idx = fs.readFileSync('server/index.js', 'utf8');
if (!idx.includes('ai-proxy')) {
  idx = idx.replace(
    "app.get('/api/health'",
    "app.use('/api/ai', require('./routes/ai-proxy'));\n\napp.get('/api/health'"
  );
  fs.writeFileSync('server/index.js', idx);
  console.log('✅ Added /api/ai route to server');
}

// 3. Patch AI.jsx — replace direct Anthropic fetch with proxy call
let ai = fs.readFileSync('client/src/AI.jsx', 'utf8');
ai = ai.replace(
  `const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemWithContext,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't generate a response. Please try again.";`,
  `const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemWithContext,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const reply = data.content || "Sorry, I couldn't generate a response. Please try again.";`
);
fs.writeFileSync('client/src/AI.jsx', ai);
console.log('✅ Patched AI.jsx to use server proxy');

console.log('\n✅ Done!');
console.log('\nNext steps:');
console.log('1. Set your API key: export ANTHROPIC_API_KEY=sk-ant-...');
console.log('2. Restart server: cd server && node index.js');
console.log('3. Refresh browser');
