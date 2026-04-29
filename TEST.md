To secure full marks for system testing, you need to verify all three components: the Backend API, the CLI tool, and the Web Portal. Since you are on Linux, curl and terminal testing are your best friends.
Here is the complete testing suite for Stage 3.
------------------------------
## 🧠 Part 1: Backend API Tests
Run these in your terminal. You must replace <ACCESS_TOKEN> with a valid JWT generated from your login flow.
1. Test Version Header (Must return 400 if missing or wrong)

curl -i -X GET "http://localhost:3000/api/profiles"

Expected: 400 Bad Request with message "API version header required"
2. Test Authentication (Must return 401 without token)

curl -i -X GET "http://localhost:3000/api/profiles" \
     -H "X-API-Version: 1"

Expected: 401 Unauthorized
3. Test Successful Fetch (As Analyst or Admin)

curl -X GET "http://localhost:3000/api/profiles?page=1&limit=5" \
     -H "X-API-Version: 1" \
     -H "Authorization: Bearer <ACCESS_TOKEN>"

Expected: 200 OK with the updated pagination shape (total_pages, has_next, etc.)
4. Test Role-Based Access Control (RBAC)
If you are logged in as an Analyst, this must fail:

curl -i -X DELETE "http://localhost:3000/api/profiles/some-uuid" \
     -H "X-API-Version: 1" \
     -H "Authorization: Bearer <ANALYST_TOKEN>"

Expected: 403 Forbidden with message "Forbidden: Admin access required"
5. Test Token Refresh (Immediate Invalidation)
Hit this endpoint with a refresh token. The first time will succeed; the second time with the same token must fail.

curl -X POST "http://localhost:3000/api/auth/refresh" \
     -H "Content-Type: application/json" \
     -d '{"refresh_token": "<REFRESH_TOKEN>"}'

------------------------------
## 💻 Part 2: CLI Tool Tests
Move to your insighta-cli folder and run these commands.
1. Test Global Install

npm run build
npm link
insighta --version

Expected: Output 1.0.0
2. Test Login (PKCE Flow)

insighta login

Expected: Browser opens your backend auth page automatically.
3. Test Local Credential Storage
After logging in, verify the file exists on your computer:

cat ~/.insighta/credentials.json

Expected: A JSON object containing access_token and refresh_token.
4. Test Fetching via CLI

insighta profiles --page 1

Expected: A clean terminal table displaying your profile data.
------------------------------
## 🌐 Part 3: Web Portal Tests
Open your browser and test the UI.
1. Inspect Cookies (HTTP-Only check)

   1. Log into your Web Portal.
   2. Open Chrome Developer Tools (F12 or Ctrl+Shift+I).
   3. Go to Application -> Storage -> Cookies.
   4. Find access_token. Verify that the HttpOnly checkbox is checked (you shouldn't be able to read it with JavaScript in the console using document.cookie).

2. Test CSRF Protection
Try to simulate a cross-site attack by sending a POST request to your web portal from your terminal without the cookie or the custom CSRF header:

curl -i -X POST "http://localhost:3001/api/auth/login"

Expected: 403 Forbidden or unauthorized, blocking requests that do not originate from your secured forms.
------------------------------
## 📊 Final Check Before 29th April Deadline

* Are all 3 repositories pushed to GitHub?
* Do your Readmes contain the required architectural diagrams and NLP rules?
* Did you confirm your deployment handles multiple bot requests without timing out?

Should we write out the required "System Architecture" markdown section for your backend Readme now?

