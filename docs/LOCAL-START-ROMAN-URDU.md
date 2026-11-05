# Farmeri locally kaise chalani hai

1. ZIP extract karo aur `farmeri` folder VS Code mein kholo.
2. Node.js 24 LTS install hona chahiye.
3. Terminal mein `npm install`, phir `npm run install:all` chalao.
4. `server/.env.example` ki copy `server/.env` banao. `client/.env.example` ki copy `client/.env` banao.
5. README ke command se random JWT secret generate karke server `.env` mein lagao.
6. MongoDB Atlas development URI lagao, ya README ke mutabiq local replica set banao. Sirf Compass install hona database server chalne ke barabar nahi hai. Checkout ke liye replica set zaroori hai.
7. Server `.env` mein apna `ADMIN_EMAIL` aur 12+ characters ka `ADMIN_PASSWORD` set karo.
8. Root terminal mein `npm run seed` chalao. Sample products aur admin create honge.
9. `npm run dev` chalao.
10. Browser mein `http://localhost:5173` kholo.
11. `/login` par apne seeded admin se login karo, phir `/admin` kholo.
12. Product images Cloudinary credentials ke baad admin se upload kar sakte ho. Abhi local placeholder images lagi hain.

Currency filhaal INR aur address India ka hai, kyunki supplied brief mein yehi tha. Pakistan ke liye country, phone/PIN validation, currency aur payment integration ek saath update karne honge.

SMTP ke baghair email inbox mein nahi ayegi; message database ke `emailjobs` collection mein queue hoga. Local testing mein Compass se `text` field ka verification/reset link khol sakte ho. Razorpay keys ke baghair COD use karo.

Is delivery mein website live nahi ki gayi. Original video aur final assets milne ke baad visual matching aur launch checks complete karne hain.
