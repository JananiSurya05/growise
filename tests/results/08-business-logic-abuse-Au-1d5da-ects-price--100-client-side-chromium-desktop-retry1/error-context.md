# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 08-business-logic-abuse.spec.ts >> Authenticated business logic abuse — requires session >> Farmer addCrop form rejects price = -100 client-side
- Location: tests\e2e\08-business-logic-abuse.spec.ts:158:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: 🌿
        - generic [ref=e6]: GroWise
      - generic [ref=e7]: Farmer Portal
      - generic [ref=e8]:
        - generic [ref=e9]: T
        - generic [ref=e10]: Test
        - generic [ref=e11]: ● Online · Farmer
      - navigation [ref=e12]:
        - link "⚡ Dashboard" [ref=e13] [cursor=pointer]:
          - /url: /farmer
          - generic [ref=e14]:
            - generic [ref=e15]: ⚡
            - generic [ref=e16]: Dashboard
        - link "🌱 My Crops" [ref=e17] [cursor=pointer]:
          - /url: /farmer/crops
          - generic [ref=e18]:
            - generic [ref=e19]: 🌱
            - generic [ref=e20]: My Crops
        - link "🤖 AI Advisor" [ref=e21] [cursor=pointer]:
          - /url: /farmer/advisor
          - generic [ref=e22]:
            - generic [ref=e23]: 🤖
            - generic [ref=e24]: AI Advisor
        - link "📸 Disease Scan" [ref=e25] [cursor=pointer]:
          - /url: /farmer/disease
          - generic [ref=e26]:
            - generic [ref=e27]: 📸
            - generic [ref=e28]: Disease Scan
        - link "🌤️ Weather" [ref=e29] [cursor=pointer]:
          - /url: /farmer/weather
          - generic [ref=e30]:
            - generic [ref=e31]: 🌤️
            - generic [ref=e32]: Weather
        - link "💰 Income" [ref=e33] [cursor=pointer]:
          - /url: /farmer/income
          - generic [ref=e34]:
            - generic [ref=e35]: 💰
            - generic [ref=e36]: Income
        - link "📊 Sales" [ref=e37] [cursor=pointer]:
          - /url: /farmer/sales
          - generic [ref=e38]:
            - generic [ref=e39]: 📊
            - generic [ref=e40]: Sales
      - button "🚪 Logout" [ref=e41] [cursor=pointer]:
        - generic [ref=e42]:
          - generic [ref=e43]: 🚪
          - generic [ref=e44]: Logout
    - generic [ref=e45]:
      - generic [ref=e46]:
        - generic [ref=e47]:
          - generic [ref=e50]: LIVE · 0 CROPS IN DATABASE
          - heading "My Crop Marketplace" [level=1] [ref=e51]
        - button "+ List New Crop" [ref=e52] [cursor=pointer]
      - generic [ref=e53]:
        - img "revenue" [ref=e54]
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: YOUR LIVE GROWISE LISTINGS
            - generic [ref=e59]: 0 crops listed on marketplace
          - generic [ref=e60]:
            - generic [ref=e61]:
              - generic [ref=e62]: "0"
              - generic [ref=e63]: Total Crops
            - generic [ref=e64]:
              - generic [ref=e65]: "0"
              - generic [ref=e66]: Active
            - generic [ref=e67]:
              - generic [ref=e68]: ₹0
              - generic [ref=e69]: Platform Fee
      - generic [ref=e71]:
        - generic [ref=e72]: 🌱
        - generic [ref=e73]: No crops listed yet
        - generic [ref=e74]: Click "+ List New Crop" to add your first crop!
  - button "Open Next.js Dev Tools" [ref=e80] [cursor=pointer]:
    - img [ref=e81]
  - alert [ref=e84]
```