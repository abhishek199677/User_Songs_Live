require("dotenv").config({ path: ".env.local" });
const fetch = require("node-fetch"); 
// wait, fetch is built-in to node 18+

async function test() {
  const res = await fetch("http://localhost:3000/api/admin/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello", identifier: "admin" }) // assume user is admin
  });
  const text = await res.text();
  console.log(text);
}
test();
