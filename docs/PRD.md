
**Key Variables:**  
- Model ethnicity: Sri Lankan / Global 
- Body type: slim / medium / plus-size  
- Pose: front-facing studio pose  
- Lighting: soft studio  
- Background: white  

**Integration Notes:**  
- Use **FASHN Virtual Try-On API** → zero setup, handles masking, warping, fitting  
- Pre-generated avatars for Sri Lankan context  
- Hackathon-ready, consistent output, fast integration  

---

## 7. Architecture & Tech Stack

**Frontend:**  
- Next.js 15 (App Router)  
- React Server + Client Components (optimize performance)  
- Tailwind CSS  
- Motion (animations)  

**Backend:**  
- Node.js  
- MongoDB  
- FASHN API integration for AI clothing renders  
- AWS S3 for image store

**Authentication:**  
- Clerk  

**Payments:**  
- LemonSqueeze  

**Email:**  
- Resend (transactional notifications)  

**Deployment:**  
- Vercel (production & staging)  
- CI/CD via GitHub Actions → Vercel  

**Development Best Practices:**  
- Component-based structure  
- Utility functions for reusability  
- TypeScript type safety  
- Playwright tests for UI components  
- Step tracking for implementation roadmap  

---

## 8. Main Views

| View | Description |
|------|------------|
| Landing Page | Full functional MVP with hero carousel, gallery hover try-on preview, early access payment flow |
| Business Owner View | Upload, AI render, download, history |
| Human Model Marketplace | Create profile | See the concents request | Approve coonsent requests
| Admin Dashboard | User list, subscription updates, simple bank transfer workflow |

---

## 9. Risks & Limitations

- AI struggles with complex clothing (e.g., sarees, layers) → start with T-shirts, dresses, hoodies  
- Sellers using stolen model photos → ethical consent workflow needed later  
- Payment friction → provide LKR bank transfer alternative  

---

## 10. Strategic Differentiators

- First **Sri Lanka AI + Human Model Marketplace for Fashion Brands**  
- Local skin tones & body types  
- Ethical consent workflow   
- Affordable pricing  
- Pose packs relevant to local fashion  

---

## 11. CI/CD & Performance Guidelines

- Use **Next.js client/server components** wisely for optimal performance  
- Component-based design, reusable utilities  
- GitHub Actions for CI/CD → auto deploy to Vercel  
- Step tracking file for roadmap & current tasks  
- Type safety patterns enforced across app  

---

## 12. References

- FASHN API: [https://fashn.ai/products/api](https://fashn.ai/products/api)  
- Clerk Quickstart (Next.js App Router): [https://clerk.com/docs](https://clerk.com/docs)  
- Next.js App Router patterns: [https://nextjs.org/docs/app/building-your-application/routing](https://nextjs.org/docs/app/building-your-application/routing)  
- Motion  
- Brand Fonts: Inter (headings), IBM Plex Sans (body), Sora/Mulish (accent)

---

## 13. Next Steps

1. Setup **Next.js + Tailwind + Clerk + Stripe + MongoDB + Resend** boilerplate  
2. Pre-generate Sri Lankan AI avatars via FASHN API  
3. Implement **landing page MVP**: hero carousel, gallery hover preview, early access payment  
4. Implement **business owner flow**: upload, AI render, download  
5. Add **admin dashboard** for subscription management (bank transfer & Stripe)  
6. Optional **skeleton human model marketplace**  
7. CI/CD pipeline setup via GitHub → Vercel  
8. Write **Playwright tests** for all UI components  
9. Track implementation roadmap & update progress file  

---

**End of PRD**
