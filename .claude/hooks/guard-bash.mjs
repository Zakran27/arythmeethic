// Hook PreToolUse (Bash) : transforme deux règles du CLAUDE.md en garde-fous.
// 1. Refuse les `git add` en masse (-A, --all, .) : les PDF des familles (NIR…) ne doivent jamais être commités.
// 2. Avant un `git push` (= déploiement Vercel) : typecheck + auto-tests, push bloqué si ça échoue.
// Exit 2 = commande bloquée, stderr renvoyé à Claude. Fail-open si l'entrée est illisible.
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

let cmd = ''
try {
  cmd = JSON.parse(await new Promise((r) => {
    let s = ''
    process.stdin.on('data', (c) => (s += c)).on('end', () => r(s))
  })).tool_input?.command ?? ''
} catch {
  process.exit(0)
}

if (/\bgit\s+add\b[^;&|]*\s(-A|--all|\.)(\s|$|;|&|\|)/.test(cmd)) {
  console.error('Bloqué : `git add` en masse interdit. Ajoute les fichiers un par un (git add chemin/fichier).')
  process.exit(2)
}

if (/\bgit\s+push\b/.test(cmd)) {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const checks = [
    'npx tsc --noEmit -p .',
    ...readdirSync(`${root}/lib`).filter((f) => f.endsWith('.check.mjs')).map((f) => `node lib/${f}`),
  ]
  for (const c of checks) {
    try {
      execSync(c, { cwd: root, stdio: 'pipe' })
    } catch (e) {
      console.error(`Push bloqué : \`${c}\` a échoué.\n${String(e.stdout || '')}${String(e.stderr || '')}`.slice(0, 4000))
      process.exit(2)
    }
  }
}
