

---

# **AGENT.md**

```md
# AGENT Instructions — ModelSnapper.ai

You are a Cursor agent responsible for implementing the entire MVP of ModelSnapper.ai using the PRD, boilerplate, and project guidelines.

---

## 1. Understand the Boilerplate First
Before writing code:

- Read the full file structure  
- Understand existing patterns  
- Understand server vs client components  
- Understand DB patterns  
- Inspect Clerk integration  
- Inspect Stripe integration  
- Inspect existing utility functions  

Do not implement anything until you fully understand the project skeleton.

---

## 2. Engineering Rules

### 2.1 No Code Duplication
- Use utilities  
- Reuse shared logic  
- Abstract common patterns  

### 2.2 Strict Type Safety
- Use TypeScript everywhere  
- No `any` unless absolutely required  
- Use defined interfaces and types  

### 2.3 Component-Based Architecture
- Use isolated reusable components  
- Keep files clean and maintainable  
- Avoid monolithic components  

### 2.4 Correct Use of Next.js App Router
Follow official Next.js documentation:

- Use server components by default  
- Use client components only when necessary  
- Use server actions for mutations  
- Use loading.tsx for skeletons  
- Follow layout → page → component conventions strictly  

### 2.5 Server Component Priority
Only use client components for:
- Upload UI  
- Motion animations  
- Browser-only features  
- Forms requiring client-side interactions  

### 2.6 Testing
For every UI component:
- Create Playwright component tests  
- Create integration flows  
- Use Playwright MCP for automation  

---

## 3. Stay Updated with Web Research
Before implementing new features:
- Run a web search  
- Confirm best practices for each technology  
- Adhere to versions defined in `package.json`  
- Do not upgrade anything without explicit instruction  

---

## 4. CI/CD
Implement:
- GitHub Actions for linting, type checking, tests  
- Automatic deployments to Vercel  
- Preview deployments per pull request  

---

## 5. Update ROADMAP.md Continuously
Every time you:
- Start a task  
- Finish a task  
- Hit a blocker  
- Change direction  

→ Update `ROADMAP.md`.

The roadmap must always reflect real-time project status.

---

## 6. Rendering Pipeline (Fashn.ai API)
Rendering must follow this pipeline:

1. Check user credits (server-side)  
2. Validate outfit upload  
3. Call Fashn.ai API with required parameters  
4. Deduct credits  
5. Save render info + image URLs to MongoDB  
6. Return results to UI  

No rendering logic should run on the client.

---

## 7. Stripe Early Access Flow
- Implement checkout using boilerplate patterns  
- Store Stripe customer + payment details  
- Auto-assign initial credits  
- Send welcome email via Resend  
- Provide access to Stripe customer portal  

---

## 8. High Visual Fidelity
UI must follow:
- Brand theme  
- Clean spacing  
- Professional layout  
- Placeholder avatars and outfits  
- Minimalistic fashion-tech styling  

---

## 9. Goals
Your task is to produce:
- A working MVP  
- Clean code  
- Fully tested flows  
- Production-grade structure  
- Exportable, maintainable components  
- Maximum performance using Next.js  

