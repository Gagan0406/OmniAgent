# Frontend Rules (frontend/)

Applies when Claude accesses any file under `frontend/`.

- TypeScript strict mode — no `any` without justification comment
- Functional components only, hooks for all state
- Tailwind CSS for all styling — no CSS modules, no styled-components, no inline styles
- Named exports only (no `export default`)
- Use Vercel AI SDK hooks (`useChat`, `useCompletion`) for streaming
- Every component that does async work handles loading + error + empty states
- Use `next/image` for all images
- Environment variables for the client must have `NEXT_PUBLIC_` prefix
- Test with React Testing Library — test behavior, not implementation
