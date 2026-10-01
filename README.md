# Sway: Cycle-Synced Empathy for Two

Sway is a privacy-first, dual-OS biological engine that splits the traditional period tracker in two. She gets a secure, premium health dashboard. He gets a daily Empathy Brief, Conflict Radar, and Micro-Missions telling him exactly how to support her based on her current phase.

🏆 **Built for the Shipathon Next Gen Award**

## 🚀 Try It Out
**[Download the Android APK Here](https://expo.dev/accounts/jidne24/projects/sway/builds/fe7f22d2-a79d-463a-b345-5c3dd79dbbda)**

*Note: Because Sway utilizes highly customized native modules for local push notifications, RevenueCat monetization, and native blur views, it is not compatible with the standard Expo Go app. Please use the APK above to test the full experience.*

## ✨ Core Features
- **Dual-OS Architecture:** Two entirely different UIs (Her OS and Partner OS) living in one codebase, gated by onboarding role selection.
- **True Data Sovereignty:** Powered by PostgreSQL Row Level Security (RLS). When she taps "Revoke Access," her partner is instantly disconnected via Supabase Realtime, and his database read permissions are cryptographically revoked.
- **The Biological Engine:** Translates raw menstrual phases (Follicular, Ovulatory, Luteal, Menstrual) into actionable empathy briefs for the partner.
- **Premium Monetization:** Fully integrated RevenueCat paywall locking the Partner's "Conflict Radar" and Her "Do's & Don'ts" behind the Couple's Pass.
- **Premium UX:** Built with React Native Reanimated and Lottie for fluid, Apple-Health-inspired micro-interactions.

## 🛠 Tech Stack
- **Frontend:** React Native, Expo (SDK 57), TypeScript, Zustand
- **Backend:** Supabase (PostgreSQL, Realtime, Anonymous Auth)
- **Monetization:** RevenueCat (`react-native-purchases`)
- **UI/UX:** `react-native-reanimated`, `lottie-react-native`, `lucide-react-native`

## 💻 Local Development
If you wish to compile the application from source, you must build a custom Development Client. 

1. **Clone and Install:**
   ```bash
   git clone https://github.com/jidne24/sway.git
   cd sway
   npm install
   
2. **Environment Setup:**
Rename .env.example to .env and supply your own Supabase and RevenueCat keys.

3. **Database Migration:** 
Apply the migrations located in supabase/migrations/ to your Supabase SQL editor to enable Anonymous Auth and the Realtime Access triggers.

4. **Compile Native Dev Client:** 
   ```bash
   npx eas-cli build --platform android --profile development
  
5. **Run the Server:**
   ```bash
   npx expo start --dev-client
