CONTEXT
- Current onboarding is boring: two static cards (“I’m a Business” and “I’m a Model”).
- We are focusing on Businesses now (AI model + product model image generations).
- “Model” path should be a secondary option that leads to a WAITLIST (upcoming human model marketplace), already in the database when selection model path it creates the model profile.
- I already generated background images and want onboarding to feel premium and fashion-focused.
- Already have the onboarding api to create the business profile and model profile. existing format should not change. additionally we should add the collected data from this onboarding flow. 

GOALS
1) Replace current onboarding UI with a modern interactive onboarding:
   - Full-screen hero with premium background image + overlay
   - Primary CTA = “Start Creating” (business path)
   - Secondary CTA = “Become a Model” (waitlist path)
2) Business onboarding should be a 3-step interactive flow:
   Step 1: “What do you sell?” (select category chips/cards)

- Tops
- Bottoms
- Dresses
- Outerwear
- Footwear
- Accessories
- Activewear
- Swimwear
- Intimates

WHAT TO CHANGE
1) Locate the onboarding flow component (likely `components/onboarding/OnboardingFlow.tsx` or wherever Step 1 categories are defined).
2) Replace the current category list/config with the new buckets above.
3) Ensure the UI still uses IMAGE-BASED SELECTABLE CARDS (not chips), same hover/selected behavior.

CATEGORY VALUES (use these exact slugs)
- tops
- bottoms
- dresses
- outerwear
- footwear
- accessories
- activewear
- swimwear
- intimates

IMAGE ASSETS (I will add these)
Use this path convention for Step 1 cards:
- /public/onboarding/categories/<slug>.jpg

Expected files:
- /public/onboarding/categories/tops.png
- /public/onboarding/categories/bottoms.png
- /public/onboarding/categories/dresses.png
- /public/onboarding/categories/outerwear.png
- /public/onboarding/categories/footwear.png
- /public/onboarding/categories/accessories.png
- /public/onboarding/categories/activewear.png
- /public/onboarding/categories/swimwear.png
- /public/onboarding/categories/intimates.png

FALLBACK BEHAVIOR (must implement)
If an image is missing, the card should NOT break.
- Render a neutral fallback background (e.g., gradient/solid) and still show the label.
- Do not throw errors.
- Do not show broken image icons.

LAYOUT REQUIREMENTS
- Desktop: 3 columns grid, auto rows
- Mobile: 2 columns
- Cards must remain equal size with consistent aspect ratio (1:1 or 4:5).
- Keep dark overlay over image for readability.
- Keep hover scale (subtle) and selected ring + check icon.

STATE + STORAGE
- Keep the same selection requirement (must pick one to continue).
- Ensure localStorage payload and redirect query params use the NEW category slugs (category=tops, etc).

COPY
Step title remains: "What do you sell?"

ACCEPTANCE CRITERIA
- Step 1 shows exactly 9 category cards with the new bucket labels.
- Clicking selects a card with clear selected styling.
- Next button only enabled after selection.
- Missing images degrade gracefully.
- No TypeScript errors and no broken imports.

OUTPUT
Make the code changes directly and summarize which files you modified.
     - We are currently provide the 

   (2) STEP 2 — WHAT DO YOU NEED?
Title: "What do you need?"
Selectable intent cards (smaller than step 1).

Intents (value → label + short description):
- "generate_photos" → "Generate model photos" → "Create on-model images from product photos"
- "change_background" → "Change background" → "Swap studio / lifestyle backgrounds"
- "image_to_video" → "Image to video" → "Turn product shots into short motion clips"
- "bulk_catalog" → "Bulk catalog generation" → "Generate consistent listings at scale"

Interactions:
- Hover + selected states consistent with Step 1.
- Require selection to continue.

Navigation:
- Back to Step 1
- Next enabled only when intent selected.

(3) STEP 3 — CONFIRM & FINISH (NO UPLOAD / NO SAMPLE)
Title: "You're ready."
Body: "Finish onboarding to unlock 3 free credits in Studio."
Show summary cards:
- Category selected (label)
- Feature selected (label)

Buttons:
- Primary: "Finish & Continue"
- Secondary: "Back"

On Finish:
- Store to data in db and direct to dashboard (already implemented in current flow)
3) Model waitlist:
   - Should feel premium, not like a fully launched marketplace.
   - Triggered by "Become a Model"
   - Premium styling (charcoal/dark overlay, clean card)
  - On submit: show success state ("You're on the early access list.") and and update db and direct to model dashboard.
4) Visual requirements:
   - Use my generated background image(s) in hero.
   - Add subtle overlay gradient so text is readable.
   - Add lightweight micro-interactions (hover, active states, step transitions).
   - Keep it clean and minimal. No heavy animation libs required.
   - Use accessible components (buttons, focus states, aria labels).
5) Keep scope tight:
   - No auth changes.
   - No complicated backend persistence. Use localStorage + query params and a simple API route stub.

ASSETS
- Hero background image file: `/public/onboarding/hero-onboarding.png` (if missing, search in /public/onboarding and pick the closest name; update code accordingly)
- Optional secondary background: `/public/onboarding/hero-onboarding-2.png`

IMPLEMENTATION DETAILS
- Use Next.js App Router patterns.
- use existing route
- Use a simple step state machine:
  state: { step: 0|1|2, role: 'business'|'model', category, intent, productSource, file }
- For navigation/redirect:
  store selections in localStorage under key `modelsnapper_onboarding`
  then redirect to `/studio?category=...&intent=...`
- Provide clear types for selections.
- Ensure mobile responsiveness.

OUTPUT
- Make the code changes directly.
- Provide a short summary of what you changed and which files.